import { Op } from 'sequelize';
import { Cycle, Issue, Project, Member, Label } from '../models';
import { ApiError } from '../utils/api-error';
import { cacheGet, cacheSet, cacheInvalidate, hashKey } from '../utils/cache';

export class CycleService {
  async findAll(projectId?: string) {
    const cacheKey = hashKey('sprintly:cycles:list', { projectId });
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const where = projectId ? { projectId } : {};
    const cycles = await Cycle.findAll({
      where,
      include: [{ model: Project, as: 'project', attributes: ['id', 'name', 'identifier'] }],
      order: [['startDate', 'ASC']],
    });
    await cacheSet(cacheKey, cycles.map((c) => c.toJSON()), 300);
    return cycles;
  }

  async findById(id: string) {
    const cacheKey = `sprintly:cycles:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const cycle = await Cycle.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'identifier'] },
        {
          model: Issue,
          as: 'issues',
          include: [
            { model: Member, as: 'assignee', attributes: ['id', 'name', 'email', 'avatarUrl'] },
            { model: Label, as: 'labels', through: { attributes: [] } },
          ],
        },
      ],
    });
    if (!cycle) throw ApiError.notFound('Cycle not found');
    await cacheSet(cacheKey, cycle.toJSON(), 300);
    return cycle;
  }

  async create(data: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status?: string;
    projectId: string;
  }) {
    const cycle = await Cycle.create({
      name: data.name,
      description: data.description || null,
      startDate: data.startDate,
      endDate: data.endDate,
      status: (data.status as any) || 'upcoming',
      projectId: data.projectId,
    });
    await cacheInvalidate('sprintly:cycles:*');
    await cacheInvalidate('sprintly:analytics:*');
    return cycle;
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; startDate: string; endDate: string; status: string }>
  ) {
    const cycle = await Cycle.findByPk(id);
    if (!cycle) throw ApiError.notFound('Cycle not found');
    const updated = await cycle.update(data as any);
    await cacheInvalidate('sprintly:cycles:*');
    await cacheInvalidate('sprintly:analytics:*');
    return updated;
  }

  async delete(id: string) {
    const cycle = await Cycle.findByPk(id);
    if (!cycle) throw ApiError.notFound('Cycle not found');
    await cycle.destroy();
    await cacheInvalidate('sprintly:cycles:*');
    await cacheInvalidate('sprintly:analytics:*');
  }

  /**
   * Move incomplete issues to backlog when a cycle is marked as completed.
   * Called when cycle status is updated to 'completed' and also by the scheduled check.
   */
  async handleCycleCompletion(cycleId: string) {
    const updated = await Issue.update(
      { status: 'backlog' as any, cycleId: null },
      {
        where: {
          cycleId,
          status: { [Op.notIn]: ['done', 'cancelled'] },
        },
      }
    );
    if (updated[0] > 0) {
      await cacheInvalidate('sprintly:issues:*');
      await cacheInvalidate('sprintly:cycles:*');
      await cacheInvalidate('sprintly:analytics:*');
    }
    return updated[0];
  }

  /**
   * Auto-complete cycles whose end date has passed and move their incomplete issues to backlog.
   */
  async checkExpiredCycles() {
    const today = new Date().toISOString().split('T')[0];
    const expiredCycles = await Cycle.findAll({
      where: {
        endDate: { [Op.lt]: today },
        status: { [Op.ne]: 'completed' },
      },
    });

    for (const cycle of expiredCycles) {
      await this.handleCycleCompletion(cycle.id);
      await cycle.update({ status: 'completed' });
      console.log(`Cycle "${cycle.name}" auto-completed. Incomplete issues moved to backlog.`);
    }

    return expiredCycles.length;
  }
}

export const cycleService = new CycleService();
