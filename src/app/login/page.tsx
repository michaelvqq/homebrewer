import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? next : undefined;
  if (await getCurrentUser()) redirect(target?.startsWith("/") && !target.startsWith("//") ? target : "/");

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <LoginForm next={target} />
    </main>
  );
}
