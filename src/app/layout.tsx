import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SettingsButton } from "@/components/settings-dialog";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./login/actions";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Homecraft",
  description: "AI agents design furnished 3D houses you can walk through and redesign together.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="flex h-[49px] shrink-0 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
          <Link href="/" className="font-semibold">Homecraft</Link>
          {user && (
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-neutral-500">{user.email}</span>
              <SettingsButton />
              <form action={signOut}>
                <button className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">Sign out</button>
              </form>
            </div>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
