import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { Member } from '../models';

// Extend Express Request to include authenticated member
declare global {
  namespace Express {
    interface Request {
      member?: Member;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const member = await Member.findByPk(payload.sub);
    if (!member) {
      throw ApiError.unauthorized('Member not found');
    }

    req.member = member;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    next(ApiError.unauthorized('Invalid token'));
  }
}
