import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/** The signed-in user's saved theme; otherwise the browser's cookie; otherwise follow the device. */
export const getTheme = cache(async (): Promise<Theme> => {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { theme: true } });
    if (user && isTheme(user.theme)) return user.theme;
  }
  const cookie = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(cookie) ? cookie : "system";
});
