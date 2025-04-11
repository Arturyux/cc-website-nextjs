"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function ClerkProviderWrapper({ children }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}