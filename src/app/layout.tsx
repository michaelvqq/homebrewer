import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <body className="h-full bg-background font-sans text-foreground">
        <TooltipProvider>
          {user ? (
            <div className="flex h-screen">
              <AppSidebar user={user} />
              <main className="flex min-w-0 flex-1 flex-col overflow-auto">{children}</main>
            </div>
          ) : (
            <div className="flex h-screen flex-col">
              <header className="flex h-12 shrink-0 items-center border-b bg-background px-4">
                <Link href="/" className="font-semibold tracking-tight">Homebrewer</Link>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link href="/login">Sign in</Link>
                </Button>
              </header>
              <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
            </div>
          )}
        </TooltipProvider>
      </body>
    </html>
  );
}
