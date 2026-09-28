import { LoginForm } from "../auth-forms";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, reset } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} reset={reset === "1"} />;
}
