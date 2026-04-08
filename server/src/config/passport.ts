import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { Member } from '../models';
import { env } from './environment';
import { cacheInvalidate, cacheDel } from '../utils/cache';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Local Strategy (email + password)
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const member = await Member.scope('withPassword').findOne({ where: { email } });
        if (!member) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if blocked
        if (member.blocked) {
          // Auto-unlock after 30 min for attempt-based locks
          if (
            member.blockedReason === 'max_attempts' &&
            member.blockedAt &&
            Date.now() - new Date(member.blockedAt).getTime() > LOCKOUT_DURATION_MS
          ) {
            await member.update({
              blocked: false,
              failedLoginAttempts: 0,
              blockedReason: null,
              blockedAt: null,
            });
          } else if (member.blockedReason === 'max_attempts') {
            return done(null, false, {
              message: 'Your account has been locked due to too many failed attempts. Contact an administrator.',
            });
          } else {
            return done(null, false, {
              message: 'Your account has been blocked. Contact an administrator.',
            });
          }
        }

        if (!member.passwordHash) {
          return done(null, false, { message: 'This account uses Google sign-in' });
        }

        const isMatch = await bcrypt.compare(password, member.passwordHash);
        if (!isMatch) {
          const attempts = member.failedLoginAttempts + 1;
          if (attempts >= MAX_LOGIN_ATTEMPTS) {
            await member.update({
              failedLoginAttempts: attempts,
              blocked: true,
              blockedReason: 'max_attempts',
              blockedAt: new Date(),
            });
            return done(null, false, {
              message: 'Your account has been locked due to too many failed attempts. Contact an administrator.',
            });
          } else {
            await member.update({ failedLoginAttempts: attempts });
            return done(null, false, {
              message: `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - attempts} attempt(s) remaining.`,
            });
          }
        }

        // Successful login — reset attempts
        if (member.failedLoginAttempts > 0) {
          await member.update({ failedLoginAttempts: 0 });
        }

        return done(null, member);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google Strategy (conditional — only if credentials are configured)
if (env.google.clientId && env.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, { message: 'No email provided by Google' });
          }

          // Check if member exists by googleId first, then by email
          let member = await Member.scope('withPassword').findOne({
            where: { googleId: profile.id },
          });

          if (!member) {
            member = await Member.scope('withPassword').findOne({ where: { email } });
            if (member) {
              // Link existing local account to Google
              await member.update({
                googleId: profile.id,
                avatarUrl: member.avatarUrl || profile.photos?.[0]?.value || null,
              });
              await cacheDel(`sprintly:member:${member.id}`);
              await cacheInvalidate('sprintly:members:*');
            } else {
              // Create new member from Google profile
              member = await Member.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                provider: 'google',
                avatarUrl: profile.photos?.[0]?.value || null,
              });
              await cacheInvalidate('sprintly:members:*');
            }
          }

          if (member.blocked) {
            return done(null, false, { message: 'Your account has been blocked. Contact an administrator.' });
          }

          return done(null, member);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

// Serialize/deserialize for OAuth redirect flow
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const member = await Member.findByPk(id);
    done(null, member);
  } catch (err) {
    done(err);
  }
});

export default passport;
