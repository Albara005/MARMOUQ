"use client";

import { catchError, type ErrorInfo } from "next/error";

/** A section that fails to render disappears instead of taking the page down with it. */
function SkipBlock({ type }: { type: string }, { error }: ErrorInfo) {
  if (process.env.NODE_ENV !== "production") console.error(`[blocks] "${type}" section failed to render`, error);
  return null;
}

export const BlockBoundary = catchError(SkipBlock);
