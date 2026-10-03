import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Homebrewer",
  description: "AI agents design furnished 3D houses you can walk through and redesign together.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        {user ? (
          <div className="flex h-screen">
            <AppSidebar user={user} />
            <main className="flex min-w-0 flex-1 flex-col overflow-auto">{children}</main>
          </div>
        ) : (
          <div className="flex h-screen flex-col">
            <header className="flex h-12 shrink-0 items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
              <Link href="/" className="font-semibold tracking-tight">Homebrewer</Link>
              <Link href="/login" className="ml-auto text-sm font-medium">Sign in</Link>
            </header>
            <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
