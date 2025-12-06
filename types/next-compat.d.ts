// types/next-compat.d.ts
// Shim for older packages that still import deprecated types from "next/types.js"
// Next.js 15/16 removed these, but this keeps TypeScript happy.

declare module "next/types.js" {
    export type ResolvingMetadata = unknown;
    export type ResolvingViewport = unknown;
  }
  