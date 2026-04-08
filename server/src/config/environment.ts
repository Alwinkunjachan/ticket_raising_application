import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value && isProduction) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'sprintly',
    user: process.env.DB_USER || 'postgres',
    password: isProduction ? requireEnv('DB_PASSWORD') : (process.env.DB_PASSWORD || ''),
  },
  jwt: {
    accessSecret: isProduction ? requireEnv('JWT_ACCESS_SECRET') : (process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me'),
    refreshSecret: isProduction ? requireEnv('JWT_REFRESH_SECRET') : (process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
  },
  session: {
    secret: isProduction ? requireEnv('SESSION_SECRET') : (process.env.SESSION_SECRET || 'dev-session-secret'),
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
