import type * as React from "react";

export interface ToastProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  variant?: "default" | "destructive";
}

export type ToastActionElement = React.ReactElement;