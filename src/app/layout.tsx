import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavLink } from "@/components/ui/nav-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alertlogic AlertLogic AWS Lambda Dashboard",
  description: "Alertlogic AlertLogic AWS Lambda Dashboard",
};

// Removed, now imported from client component

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <nav className="w-full bg-stone-900 text-white px-6 py-3 flex items-center justify-between shadow">
          <div className="flex gap-6 items-center">
            <NavLink href="/" label="Home" />
            <NavLink href="/zip-update" label="Zip Update" />
          </div>
        </nav>
        <main className="px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
