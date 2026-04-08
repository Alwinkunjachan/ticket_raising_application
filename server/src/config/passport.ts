import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { Member } from '../models';
import { env } from './environment';

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
        if (!member.passwordHash) {
          return done(null, false, { message: 'This account uses Google sign-in' });
        }
        const isMatch = await bcrypt.compare(password, member.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
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
            } else {
              // Create new member from Google profile
              member = await Member.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                provider: 'google',
                avatarUrl: profile.photos?.[0]?.value || null,
              });
            }
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
