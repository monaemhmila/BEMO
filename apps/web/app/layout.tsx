import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { Appbar } from "@/components/Appbar";
import { Providers } from "../app/providers/Providers";

import { ClerkProvider } from '@clerk/nextjs'

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Personalized Books for Kids | Custom Storybooks - Wonder Wraps",
    template: "%s | Wonder Wraps",
  },
  description:
    "Create unique kids' storybooks with Mon Petit Hero. Upload photos and watch them become part of personalized stories your child will treasure forever.",
  keywords: [
    "personalized storybooks",
    "custom books for kids",
    "personalized children's books",
    "kids storybooks",
  ],
  openGraph: {
    title: "Personalized Books for Kids | Custom Storybooks - Wonder Wraps",
    description:
      "Create unique kids' storybooks with Mon Petit Hero. Upload photos and watch them become part of personalized stories your child will treasure forever.",
    type: "website",
    siteName: "Wonderwraps",
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
      <html
        lang="en"
        className={`${nunito.variable} ${fredoka.variable} h-full`}
        suppressHydrationWarning
      >
        <head>
          <link rel="preconnect" href="https://images.unsplash.com" />
          <link rel="preconnect" href="https://api.dicebear.com" crossOrigin="anonymous" />
          <script
            dangerouslySetInnerHTML={{
              __html: `try{var l=localStorage.getItem("ww_lang");if(l==="fr"||l==="ar"){document.documentElement.lang=l;if(l==="ar")document.documentElement.dir="rtl";}}catch(e){}`,
            }}
          />
        </head>
        <body className="h-full">
          <Providers>
            <Appbar />
            <main className="min-h-full">
              {children}
            </main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}