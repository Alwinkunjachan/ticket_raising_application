import app from './app';
import { env } from './config/environment';
import { sequelize } from './models';
import redis from './config/redis';
import { setRedisAvailable, cacheInvalidate } from './utils/cache';

async function bootstrap() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Connect Redis (optional — app works without it)
    try {
      await redis.connect();
      setRedisAvailable(true);
      console.log('Redis connected successfully.');
    } catch (err) {
      console.warn('Redis unavailable — running without cache.', (err as Error).message);
      setRedisAvailable(false);
    }

    // Seed Alwin as admin if no members exist
    const { Member } = await import('./models');
    const bcrypt = await import('bcryptjs');

    const memberCount = await Member.count();
    if (memberCount === 0) {
      const defaultPasswordHash = await bcrypt.hash('password123', 12);
      await Member.create({
        name: 'Alwin Kunjachan', email: 'alwin.kunjachan@zeronorth.com', passwordHash: defaultPasswordHash, provider: 'local', role: 'admin',
      });
      console.log('Default admin member seeded (password: password123).');
    }

    // Check for expired cycles on startup
    const { cycleService } = await import('./services/cycle.service');
    const expired = await cycleService.checkExpiredCycles();
    if (expired > 0) {
      console.log(`Auto-completed ${expired} expired cycle(s).`);
      await cacheInvalidate('sprintly:issues:*');
      await cacheInvalidate('sprintly:cycles:*');
      await cacheInvalidate('sprintly:analytics:*');
    }

    // Check every hour
    setInterval(async () => {
      const count = await cycleService.checkExpiredCycles();
      if (count > 0) {
        console.log(`Auto-completed ${count} expired cycle(s).`);
        await cacheInvalidate('sprintly:issues:*');
        await cacheInvalidate('sprintly:cycles:*');
        await cacheInvalidate('sprintly:analytics:*');
      }
    }, 60 * 60 * 1000);

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
