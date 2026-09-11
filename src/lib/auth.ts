import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { ADMIN_EMAILS, parseSemesterFromEmail } from "./constants";
import { env } from "./env";

if (!env.googleClientId || !env.googleClientSecret) {
  console.warn(
    '⚠️ [AUTH WARNING] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in environment.'
  );
}

if (
  env.googleClientSecret === 'YOUR_GOOGLE_CLIENT_SECRET' ||
  env.googleClientSecret === 'YOUR_ACTUAL_SECRET_HERE'
) {
  console.warn(
    '\n⚠️ [AUTH WARNING] GOOGLE_CLIENT_SECRET in .env.local is still using a placeholder value.\n' +
    'Google will reject sign-in attempts with "OAuthCallback" until you provide your real secret.\n' +
    '👉 Get your secret from: https://console.cloud.google.com/apis/credentials\n'
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.googleClientId || 'dummy-google-client-id',
      clientSecret: env.googleClientSecret || 'dummy-google-client-secret',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      const cleanEmail = user.email.toLowerCase().trim();

      // Strict enforcement: Only verified @sode-edu.in accounts are permitted to sign in
      const isAuthorized = cleanEmail.endsWith('@sode-edu.in');
      
      if (!isAuthorized) {
        console.warn(`❌ Access Denied: Attempted login with non-sode domain (${cleanEmail}). Only @sode-edu.in is allowed.`);
        return false;
      }

      console.log(`✅ @sode-edu.in account authorized: ${cleanEmail}`);
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const cleanEmail = session.user.email.toLowerCase().trim();
        (session.user as any).isAdmin = ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(cleanEmail);
        (session.user as any).semester = parseSemesterFromEmail(cleanEmail) || 'All';
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
  logger: {
    error(code, metadata) {
      console.error(`❌ [NextAuth Error] [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`⚠️ [NextAuth Warning] [${code}]`);
    },
    debug(code, metadata) {
      console.log(`ℹ️ [NextAuth Debug] [${code}]:`, metadata);
    },
  },
};
