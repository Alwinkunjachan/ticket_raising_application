import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAdmin } from '../middleware/admin';

const router = Router();

router.get('/dashboard', requireAdmin, (req, res, next) => analyticsController.getDashboard(req, res, next));

export default router;
