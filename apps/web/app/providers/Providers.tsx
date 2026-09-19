"use client";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/components/language-provider";
import { TrackingProvider } from "@/components/tracking-provider";

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
          {children}
          <Toaster position="bottom-right" />
        </TrackingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}