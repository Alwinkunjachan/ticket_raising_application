import { Op } from 'sequelize';
import { Member } from '../models';
import { ApiError } from '../utils/api-error';
import { cacheGet, cacheSet, cacheInvalidate, cacheDel } from '../utils/cache';

export class MemberService {
  async findAll() {
    const cacheKey = 'sprintly:members:all';
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const members = await Member.findAll({ order: [['name', 'ASC']] });
    await cacheSet(cacheKey, members.map((m) => m.toJSON()), 600);
    return members;
  }

  async findNonAdminUsers() {
    const cacheKey = 'sprintly:members:users';
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const members = await Member.findAll({
      where: { role: { [Op.ne]: 'admin' } },
      order: [['name', 'ASC']],
    });
    await cacheSet(cacheKey, members.map((m) => m.toJSON()), 600);
    return members;
  }

  async findById(id: string) {
    const member = await Member.findByPk(id);
    if (!member) throw ApiError.notFound('Member not found');
    return member;
  }

  async create(data: { name: string; email: string; avatarUrl?: string }) {
    const member = await Member.create({
      name: data.name,
      email: data.email,
      avatarUrl: data.avatarUrl || null,
    });
    await cacheInvalidate('sprintly:members:*');
    await cacheInvalidate('sprintly:analytics:*');
    return member;
  }

  async update(id: string, data: Partial<{ name: string; email: string; avatarUrl: string }>) {
    const member = await this.findById(id);
    const updated = await member.update(data);
    await cacheInvalidate('sprintly:members:*');
    await cacheDel(`sprintly:member:${id}`);
    return updated;
  }

  async toggleBlock(id: string) {
    const member = await this.findById(id);
    if (member.role === 'admin') {
      throw ApiError.badRequest('Cannot block an admin user');
    }
    if (member.blocked) {
      await member.update({
        blocked: false,
        failedLoginAttempts: 0,
        blockedReason: null,
        blockedAt: null,
      });
    } else {
      await member.update({
        blocked: true,
        blockedReason: 'admin',
        blockedAt: new Date(),
      });
    }
    await cacheInvalidate('sprintly:members:*');
    await cacheDel(`sprintly:member:${id}`);
    await cacheInvalidate('sprintly:analytics:*');
    return member;
  }
}

export const memberService = new MemberService();
