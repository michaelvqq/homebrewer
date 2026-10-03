import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { NewHouseForm } from "./new-house-form";

// createHouse runs the agents via after(); give them room.
export const maxDuration = 300;

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-5 p-8">
        <h1 className="text-4xl font-semibold tracking-tight">Describe a home. Agents build it. Friends redesign it.</h1>
        <p className="text-lg text-neutral-500">
          An architect agent and an interior designer agent turn your prompt into a furnished 3D house you can walk
          through. Share it, and when you approve a visitor&apos;s suggestion, the agents redesign it live for everyone in the room.
        </p>
        <Link href="/login" className="w-fit rounded-md bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-white dark:text-neutral-900">
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight">What should we build?</h1>
        <p className="mb-6 text-center text-neutral-500">
          Describe a home. An architect agent and an interior designer agent will build it in 3D.
        </p>
        <NewHouseForm />
      </div>
    </div>
  );
}
