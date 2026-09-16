import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Appbar } from "@/components/Appbar";
import { Providers } from "../app/providers/Providers";

import { ClerkProvider } from '@clerk/nextjs'
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Tales.ai - Personalized AI Storybooks for Kids",
    template: "%s | Tales.ai",
  },
  description:
    "Turn your child's photos into beautifully illustrated, AI-powered bedtime stories. Pick from 9 ready-to-personalize storybooks or create one from scratch.",
  keywords: ["AI storybook", "personalized children's books", "bedtime stories", "AI illustrations"],
  openGraph: {
    title: "Tales.ai - Personalized AI Storybooks for Kids",
    description:
      "Turn your child's photos into beautifully illustrated, AI-powered bedtime stories.",
    type: "website",
  },
};

// layout.tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://images.unsplash.com" />
          <link rel="preconnect" href="https://api.dicebear.com" crossOrigin="anonymous" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="https://images.unsplash.com/photo-1512820790803-83ca734da794?w=180&q=80&auto=format&fit=crop"
          />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#faf9f6]`}>
          <Providers>
          <Appbar />
          {/* Removed fixed pt-24 to let Hero handle spacing if needed, or keep minimal */}
          <main className="min-h-full">
            {children}
          </main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
