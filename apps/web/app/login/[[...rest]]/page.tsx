import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { AuthLoading } from "@/components/auth-loading";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Mon Petit Hero to manage your storybooks.",
};

export default function LoginPage() {
  return (
    <div
      data-auth-page
      className="grid min-h-screen place-items-center bg-paper px-4 py-10 pt-[7rem]"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-violet-deep">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue your stories.
          </p>
        </div>
        <ClerkLoading>
          <AuthLoading />
        </ClerkLoading>
        <ClerkLoaded>
          <div className="flex justify-center overflow-hidden rounded-3xl border border-border bg-white p-1 shadow-[0_18px_40px_-22px_rgba(31,22,54,.45)]">
            <SignIn
              fallbackRedirectUrl="/storybook/dashboard"
              signUpUrl="/sign-up"
              appearance={{
                variables: {
                  colorPrimary: "#5b3bd4",
                  colorBackground: "#ffffff",
                  colorText: "#1f1636",
                  borderRadius: "0.9rem",
                },
                elements: {
                  cardBox: "w-full",
                  card: "w-full",
                },
              }}
            />
          </div>
        </ClerkLoaded>
      </div>
    </div>
  );
}