import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { upsertUser } from "./queries";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (profile?.login) {
        upsertUser(
          String(profile.id),
          profile.login as string,
          user.image ?? null
        );
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        (session as any).githubId = token.sub;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = String(profile.id);
      }
      return token;
    },
  },
});
