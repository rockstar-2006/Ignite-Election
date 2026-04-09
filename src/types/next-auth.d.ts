import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      isAdmin: boolean;
      semester: string | null;
    } & DefaultSession["user"];
  }
}
