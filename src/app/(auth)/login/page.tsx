import { factoryResetEnabled } from "@/lib/factory-reset";
import { signupOpen } from "@/lib/signup";
import { LoginForm } from "../auth-forms";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reset, factory } = await searchParams;
  const n = typeof next === "string" ? next : undefined;
  return (
    <LoginForm
      next={n}
      reset={reset === "1"}
      factory={factory === "1"}
      canFactoryReset={factoryResetEnabled()}
      canSignUp={!!n?.startsWith("/invite/") || (await signupOpen())}
    />
  );
}
