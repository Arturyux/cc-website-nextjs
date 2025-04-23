// src/env.mjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // Specify your server-side environment variables schema here.
  // This way you can ensure the app isn't built with invalid env vars.
  server: {
    CLERK_SECRET_KEY: z.string().min(1), // Clerk Secret Key is server-side only
  },

  // Specify your client-side environment variables schema here.
  // This way you can ensure the app isn't built with invalid env vars.
  // To expose them to the client, prefix them with `NEXT_PUBLIC_`.
  client: {
    // Existing variables
    NEXT_PUBLIC_FETCHPICTURE_URL: z.string().url(),
    NEXT_PUBLIC_FETCHTREELINK_URL: z.string().url(),

    // Clerk variables
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Optional: Add Clerk redirect URLs if you want to validate them
    // If you rely on Clerk Dashboard settings or defaults, you can omit these
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().min(1).optional(),
  },

  // You need to manually map these variables to `process.env`
  // Field is required for both server and client environments, even if
  // the schema is specified in only one of the server or client configs.
  runtimeEnv: {
    // Existing variables
    NEXT_PUBLIC_FETCHTREELINK_URL: process.env.NEXT_PUBLIC_FETCHTREELINK_URL,
    NEXT_PUBLIC_FETCHPICTURE_URL: process.env.NEXT_PUBLIC_FETCHPICTURE_URL,

    // Clerk variables
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY, // Server-side
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, // Client-side
    // Optional redirect URLs
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  },

  // Whether to skip validation of environment variables.
  // Useful in CI environments or when you don't need runtime validation.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  // By default, T3 Env throws if you access `process.env` directly.
  // Let Clerk's SDK access it directly as it expects specific `process.env` vars.
  // experimental__runtimeEnv: process.env, // <-- Might be needed if Clerk SDK strictly needs process.env

  // Makes it so that empty strings are treated as undefined.
  // Useful for deploying environments without certain variables.
  emptyStringAsUndefined: true,
});
