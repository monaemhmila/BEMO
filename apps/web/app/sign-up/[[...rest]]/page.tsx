import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

import { AuthLoading } from "@/components/auth-loading";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your free Mon Petit Hero account.",
};

export default function SignUpPage() {
  return (
    <div
      data-auth-page
      className="grid min-h-screen place-items-center bg-paper px-4 py-10 pt-[7rem]"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-violet-deep">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every new account starts with free story generations.
          </p>
        </div>
        <ClerkLoading>
          <AuthLoading />
        </ClerkLoading>
        <ClerkLoaded>
          <div className="flex justify-center overflow-hidden rounded-3xl border border-border bg-white p-1 shadow-[0_18px_40px_-22px_rgba(31,22,54,.45)]">
            <SignUp
              fallbackRedirectUrl="/welcome"
              signInUrl="/login"
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