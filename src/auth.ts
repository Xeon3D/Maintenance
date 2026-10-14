import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { addressFrom, loginBlocked, recordLoginFailure, recordLoginSuccess } from "@/lib/login-limit";
import { auditUser } from "@/lib/audit";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

/** Too many failed attempts for this account or address; surfaced as `auth.tooManyAttempts`. */
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const address = addressFrom(request.headers);
        // Attempts on existing accounts go to the audit log of each of the account's companies.
        const ip = address === "unknown" ? null : address;
        if (loginBlocked(email, address)) {
          const blocked = await prisma.user.findUnique({ where: { email }, select: { id: true } });
          if (blocked) await auditUser(blocked.id, "auth.signInBlocked", undefined, ip);
          throw new TooManyAttempts();
        }
        const user = await prisma.user.findUnique({ where: { email } });
        const ok = !!user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
        if (!ok || !user) {
          recordLoginFailure(email, address);
          if (user) await auditUser(user.id, "auth.signInFailed", undefined, ip);
          return null;
        }
        recordLoginSuccess(email);
        await auditUser(user.id, "auth.signIn", undefined, ip);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
