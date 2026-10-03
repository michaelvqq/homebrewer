import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./login/actions";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold">Supabase Hackathon</h1>
      {user ? (
        <div className="flex items-center gap-4">
          <p className="text-neutral-500">Signed in as {user.email}</p>
          <form action={signOut}>
            <button className="text-sm underline">Sign out</button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="underline">Sign in</Link>
      )}
    </main>
  );
}
