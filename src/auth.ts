import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { verifyPassword } from "@/lib/password";
import { findWorkspaceUserByEmail, findWorkspaceUserSessionVersion } from "@/lib/workspaceUsers";
import { clearLoginFailures, loginAllowed, loginBuckets, recordLoginFailure } from "@/lib/loginThrottle";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  pages: {
    signIn: "/workspace/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const buckets = loginBuckets(email, request);
        if (!(await loginAllowed(buckets))) return null;

        const user = await findWorkspaceUserByEmail(email);

        if (!user || !verifyPassword(password, user.passwordHash)) {
          await recordLoginFailure(buckets);
          return null;
        }

        await clearLoginFailures(buckets);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sessionVersion = (user as typeof user & { sessionVersion: number }).sessionVersion;
      } else if (typeof token.userId === "string") {
        const currentVersion = await findWorkspaceUserSessionVersion(token.userId);
        if (currentVersion === null || currentVersion !== token.sessionVersion) {
          delete token.userId;
          delete token.sessionVersion;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      return session;
    },
  },
});
