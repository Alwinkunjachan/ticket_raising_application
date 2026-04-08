import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { Member, MemberAttributes } from '../models/member.model';
import { ApiError } from '../utils/api-error';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { cacheInvalidate } from '../utils/cache';

type SafeMember = Omit<MemberAttributes, 'passwordHash'>;

class AuthService {
  private sanitizeMember(member: Member): SafeMember {
    const json = member.toJSON() as any;
    const { passwordHash, ...safe } = json;
    return safe;
  }

  private generateTokens(member: Member) {
    const payload = { sub: member.id, email: member.email };
    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  async register(data: { name: string; email: string; password: string }) {
    const existingEmail = await Member.findOne({ where: { email: data.email } });
    if (existingEmail) {
      throw ApiError.conflict('Email already registered');
    }

    const existingName = await Member.findOne({
      where: { name: { [Op.iLike]: data.name.trim() } },
    });
    if (existingName) {
      throw ApiError.conflict('A user already exists with the same first name and last name');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const member = await Member.create({
      name: data.name,
      email: data.email,
      passwordHash,
      provider: 'local',
    });

    await cacheInvalidate('sprintly:members:*');

    const tokens = this.generateTokens(member);
    return { member: this.sanitizeMember(member), ...tokens };
  }

  async login(member: Member) {
    const tokens = this.generateTokens(member);
    return { member: this.sanitizeMember(member), ...tokens };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const member = await Member.findByPk(payload.sub);
    if (!member) {
      throw ApiError.unauthorized('Member not found');
    }
    return this.generateTokens(member);
  }

  async getProfile(memberId: string) {
    const member = await Member.findByPk(memberId);
    if (!member) {
      throw ApiError.notFound('Member not found');
    }
    return this.sanitizeMember(member);
  }
}

export const authService = new AuthService();
