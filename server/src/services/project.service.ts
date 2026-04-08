import { Sequelize } from 'sequelize';
import { Project, Issue } from '../models';
import { ApiError } from '../utils/api-error';
import { cacheGet, cacheSet, cacheInvalidate, hashKey } from '../utils/cache';

export class ProjectService {
  async findAll(page?: number, pageSize?: number) {
    const cacheKey = hashKey('sprintly:projects:list', { page, pageSize });
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const baseOptions: any = {
      order: [['createdAt', 'DESC']],
      attributes: {
        include: [
          [Sequelize.literal('(SELECT COUNT(*) FROM issues WHERE issues.project_id = "Project"."id")'), 'issueCount'],
        ],
      },
    };

    let result: any;
    if (page && page > 0 && pageSize && pageSize > 0) {
      const limit = Math.min(pageSize, 100);
      const offset = (page - 1) * limit;
      const { rows, count } = await Project.findAndCountAll({
        ...baseOptions,
        limit,
        offset,
      });
      result = { data: rows, total: count, page, pageSize: limit };
    } else {
      result = await Project.findAll(baseOptions);
    }

    await cacheSet(cacheKey, result, 300);
    return result;
  }

  async findById(id: string) {
    const cacheKey = `sprintly:projects:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const project = await Project.findByPk(id, {
      attributes: {
        include: [
          [Sequelize.literal('(SELECT COUNT(*) FROM issues WHERE issues.project_id = "Project"."id")'), 'issueCount'],
        ],
      },
    });
    if (!project) throw ApiError.notFound('Project not found');

    await cacheSet(cacheKey, project.toJSON(), 300);
    return project;
  }

  async create(data: { name: string; identifier: string; description?: string }) {
    const project = await Project.create({
      name: data.name,
      identifier: data.identifier.toUpperCase(),
      description: data.description || null,
    });
    await cacheInvalidate('sprintly:projects:*');
    await cacheInvalidate('sprintly:analytics:*');
    return project;
  }

  async update(id: string, data: Partial<{ name: string; description: string }>) {
    const project = await Project.findByPk(id);
    if (!project) throw ApiError.notFound('Project not found');
    const updated = await project.update(data);
    await cacheInvalidate('sprintly:projects:*');
    await cacheInvalidate('sprintly:analytics:*');
    return updated;
  }

  async delete(id: string) {
    const project = await Project.findByPk(id);
    if (!project) throw ApiError.notFound('Project not found');
    await project.destroy();
    await cacheInvalidate('sprintly:projects:*');
    await cacheInvalidate('sprintly:issues:*');
    await cacheInvalidate('sprintly:analytics:*');
  }
}

export const projectService = new ProjectService();
