import { factoryResetEnabled } from "@/lib/factory-reset";
import { LoginForm } from "../auth-forms";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reset, factory } = await searchParams;
  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      reset={reset === "1"}
      factory={factory === "1"}
      canFactoryReset={factoryResetEnabled()}
    />
  );
}
