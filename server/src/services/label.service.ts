import { Label } from '../models';
import { ApiError } from '../utils/api-error';
import { cacheGet, cacheSet, cacheInvalidate } from '../utils/cache';

export class LabelService {
  async findAll() {
    const cacheKey = 'sprintly:labels:all';
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const labels = await Label.findAll({ order: [['name', 'ASC']] });
    await cacheSet(cacheKey, labels.map((l) => l.toJSON()), 3600);
    return labels;
  }

  async findById(id: string) {
    const label = await Label.findByPk(id);
    if (!label) throw ApiError.notFound('Label not found');
    return label;
  }

  async create(data: { name: string; color: string }) {
    const label = await Label.create(data);
    await cacheInvalidate('sprintly:labels:*');
    return label;
  }

  async update(id: string, data: Partial<{ name: string; color: string }>) {
    const label = await this.findById(id);
    const updated = await label.update(data);
    await cacheInvalidate('sprintly:labels:*');
    await cacheInvalidate('sprintly:issues:*');
    return updated;
  }

  async delete(id: string) {
    const label = await this.findById(id);
    await label.destroy();
    await cacheInvalidate('sprintly:labels:*');
    await cacheInvalidate('sprintly:issues:*');
  }
}

export const labelService = new LabelService();
