import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from './config/passport';
import { env } from './config/environment';
import routes from './routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));

// Body parsing with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Global rate limit — 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.', statusCode: 429 } },
}));

// Session
app.use(session({
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (_req, res) => {
  const { getRedisAvailable } = require('./utils/cache');
  res.json({ status: 'ok', redis: getRedisAvailable() ? 'connected' : 'unavailable' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
