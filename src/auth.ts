import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { addressFrom, loginBlocked, recordLoginFailure, recordLoginSuccess } from "@/lib/login-limit";
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
        if (loginBlocked(email, address)) throw new TooManyAttempts();
        const user = await prisma.user.findUnique({ where: { email } });
        const ok = !!user?.passwordHash && (await bcrypt.compare(password, user.passwordHash));
        if (!ok || !user) {
          recordLoginFailure(email, address);
          return null;
        }
        recordLoginSuccess(email);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
