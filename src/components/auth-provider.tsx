"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      redirectTo="/profile"
      emailOTP
      defaultTheme="light"
      social={{ providers: ["google"] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
