import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StudyPilot — Your study plan adapts to you",
    template: "%s · StudyPilot",
  },
  description:
    "StudyPilot continuously adjusts your study recommendations based on your real progress, topic difficulty, memory strength, and the time you actually have available.",
};

/**
 * Root layout.
 *
 * `children` is typed explicitly rather than with Next's generated
 * `LayoutProps<"/">` global. That global is written into `.next/types/` and
 * only exists *after* a build has run, so relying on it makes a standalone
 * `tsc --noEmit` fail on a clean checkout. The explicit type is equivalent
 * and works in every state.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
