import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ADMIN_EMAILS, parseSemesterFromEmail } from "./constants";
import { env } from "./env";

if (!env.googleClientId || !env.googleClientSecret) {
  throw new Error(
    'Google OAuth credentials are not configured. ' +
    'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local file.'
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Verify email domain or admin status
      const isAuthorized = user.email.endsWith('@sode-edu.in') || 
                          ADMIN_EMAILS.includes(user.email);
      
      if (!isAuthorized) {
        console.warn(`❌ Unauthorized login attempt: ${user.email}`);
        return false;
      }

      console.log(`✅ User authorized: ${user.email}`);
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        (session.user as any).isAdmin = ADMIN_EMAILS.includes(session.user.email);
        (session.user as any).semester = parseSemesterFromEmail(session.user.email);
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  secret: env.nextAuthSecret,
  debug: process.env.NODE_ENV === 'development',
};
