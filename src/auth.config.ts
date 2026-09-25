import type { NextAuthConfig } from "next-auth";

// Edge-safe part of the auth config (no DB / bcrypt), shared with proxy.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
