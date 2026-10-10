"use client";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/components/language-provider";
import { TrackingProvider } from "@/components/tracking-provider";
import { MotionConfig } from "framer-motion";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    // dark mode
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <TrackingProvider>
          <MotionConfig reducedMotion="user">
            {children}
            <Toaster position="bottom-right" />
          </MotionConfig>
        </TrackingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
