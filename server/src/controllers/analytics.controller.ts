import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

class AnalyticsController {
  async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboard();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
