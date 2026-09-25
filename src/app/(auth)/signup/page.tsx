import { SignupForm } from "../auth-forms";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, email } = await searchParams;
  const n = typeof next === "string" ? next : undefined;
  // Coming from an invitation link: create just the user, the invite page adds the membership.
  const fromInvite = !!n?.startsWith("/invite/");
  return <SignupForm next={n} withCompany={!fromInvite} email={typeof email === "string" ? email : undefined} />;
}
