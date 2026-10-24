import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { Appbar } from "@/components/Appbar";
import { Providers } from "../app/providers/Providers";

import { ClerkProvider } from '@clerk/nextjs'
import { SITE_URL } from "@/lib/site";
import { AssistantChat } from "@/components/assistant-chat";

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mon Petit Hero",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo.svg`,
  sameAs: [
    "https://www.facebook.com/MonPetitHero",
    "https://www.instagram.com/monpetithero/",
    "https://www.tiktok.com/@monpetithero.shop",
  ],
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Mon Petit Hero",
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Personalized Books for Kids | Custom Storybooks - mon petit hero",
    template: "%s | mon petit hero",
  },
  description:
    "Create unique kids' storybooks with Mon Petit Hero. Upload photos and watch them become part of personalized stories your child will treasure forever.",
  keywords: [
    "personalized storybooks",
    "custom books for kids",
    "personalized children's books",
    "kids storybooks",
  ],
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  icons: {
    icon: "/brand/logo.svg",
    shortcut: "/brand/logo.svg",
    apple: "/brand/logo.svg",
  },
  openGraph: {
    title: "Personalized Books for Kids | Custom Storybooks - mon petit hero",
    description:
      "Create unique kids' storybooks with Mon Petit Hero. Upload photos and watch them become part of personalized stories your child will treasure forever.",
    type: "website",
    siteName: "Mon Petit Hero",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/brand/social-card.svg",
        width: 1200,
        height: 630,
        alt: "Mon Petit Hero personalised storybooks",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalized Books for Kids | Mon Petit Hero",
    description:
      "Create unique kids' storybooks with your child as the hero.",
    images: ["/brand/social-card.svg"],
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
          <script
            id="brand-structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                ...organizationStructuredData,
                "@id": `${SITE_URL}/#organization`,
              }),
            }}
          />
          <script
            id="website-structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
          />
          <Providers>
            <Appbar />
            <main className="min-h-full">
              {children}
            </main>
            <AssistantChat mode="bubble" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
