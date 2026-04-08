import { Op, WhereOptions } from 'sequelize';
import { sequelize, Issue, Project, Member, Label, IssueLabel } from '../models';
import { ApiError } from '../utils/api-error';
import { cacheGet, cacheSet, cacheInvalidate, hashKey } from '../utils/cache';

interface IssueFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  cycleId?: string;
  labelId?: string;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  page?: string;
  pageSize?: string;
}

interface CreateIssueData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId: string;
  assigneeId?: string;
  cycleId?: string;
  labelIds?: string[];
}

export class IssueService {
  private buildQuery(filters: IssueFilters) {
    const where: WhereOptions = {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.cycleId) where.cycleId = filters.cycleId;

    if (filters.status) {
      where.status = { [Op.in]: filters.status.split(',') };
    }
    if (filters.priority) {
      where.priority = { [Op.in]: filters.priority.split(',') };
    }
    if (filters.search) {
      where.title = { [Op.iLike]: `%${filters.search}%` };
    }

    const sortField = filters.sort || 'createdAt';
    const sortOrder = filters.order || 'DESC';

    let includeOptions: any[] = [
      { model: Project, as: 'project', attributes: ['id', 'name', 'identifier'] },
      { model: Member, as: 'assignee', attributes: ['id', 'name', 'email', 'avatarUrl'] },
      { model: Label, as: 'labels', through: { attributes: [] } },
    ];

    if (filters.labelId) {
      includeOptions = includeOptions.map((inc) => {
        if (inc.as === 'labels') {
          return { ...inc, where: { id: filters.labelId } };
        }
        return inc;
      });
    }

    return { where, include: includeOptions, order: [[sortField, sortOrder]] as any };
  }

  async findAll(filters: IssueFilters) {
    const cacheKey = hashKey('sprintly:issues:list', filters);
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const { page, pageSize, ...rest } = filters;
    const query = this.buildQuery(rest);

    const pageNum = Number(page);
    const size = Number(pageSize);

    let result: any;
    if (pageNum > 0 && size > 0) {
      const limit = Math.min(size, 100);
      const offset = (pageNum - 1) * limit;
      const { rows, count } = await Issue.findAndCountAll({
        ...query,
        limit,
        offset,
        distinct: true,
      });
      result = { data: rows, total: count, page: pageNum, pageSize: limit };
    } else {
      result = await Issue.findAll(query);
    }

    await cacheSet(cacheKey, result, 120);
    return result;
  }

  async findById(id: string) {
    const cacheKey = `sprintly:issues:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const issue = await Issue.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'identifier'] },
        { model: Member, as: 'assignee', attributes: ['id', 'name', 'email', 'avatarUrl'] },
        { model: Label, as: 'labels', through: { attributes: [] } },
      ],
    });
    if (!issue) throw ApiError.notFound('Issue not found');

    await cacheSet(cacheKey, issue.toJSON(), 120);
    return issue;
  }

  async create(data: CreateIssueData) {
    const t = await sequelize.transaction();
    try {
      // Atomically increment project counter
      const project = await Project.findByPk(data.projectId, { transaction: t });
      if (!project) {
        await t.rollback();
        throw ApiError.notFound('Project not found');
      }

      await Project.increment('issueCounter', {
        by: 1,
        where: { id: data.projectId },
        transaction: t,
      });

      // Re-read to get updated counter
      await project.reload({ transaction: t });
      const issueNumber = project.issueCounter;
      const identifier = `${project.identifier}-${issueNumber}`;

      const issue = await Issue.create(
        {
          title: data.title,
          description: data.description || null,
          status: (data.status as any) || 'backlog',
          priority: (data.priority as any) || 'none',
          projectId: data.projectId,
          assigneeId: data.assigneeId || null,
          cycleId: data.cycleId || null,
          number: issueNumber,
          identifier,
        },
        { transaction: t }
      );

      // Associate labels
      if (data.labelIds && data.labelIds.length > 0) {
        const labelRecords = data.labelIds.map((labelId) => ({
          issueId: issue.id,
          labelId,
        }));
        await IssueLabel.bulkCreate(labelRecords, { transaction: t });
      }

      await t.commit();
      await cacheInvalidate('sprintly:issues:*');
      await cacheInvalidate('sprintly:projects:*');
      await cacheInvalidate('sprintly:analytics:*');
      return this.findById(issue.id);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async update(id: string, data: Partial<CreateIssueData>) {
    const issue = await Issue.findByPk(id);
    if (!issue) throw ApiError.notFound('Issue not found');

    const { labelIds, ...updateData } = data;
    await issue.update(updateData as any);

    if (labelIds !== undefined) {
      await IssueLabel.destroy({ where: { issueId: id } });
      if (labelIds.length > 0) {
        const labelRecords = labelIds.map((labelId) => ({
          issueId: id,
          labelId,
        }));
        await IssueLabel.bulkCreate(labelRecords);
      }
    }

    await cacheInvalidate('sprintly:issues:*');
    await cacheInvalidate('sprintly:analytics:*');
    return this.findById(id);
  }

  async delete(id: string) {
    const issue = await Issue.findByPk(id);
    if (!issue) throw ApiError.notFound('Issue not found');
    await IssueLabel.destroy({ where: { issueId: id } });
    await issue.destroy();
    await cacheInvalidate('sprintly:issues:*');
    await cacheInvalidate('sprintly:projects:*');
    await cacheInvalidate('sprintly:analytics:*');
  }
}

export const issueService = new IssueService();
