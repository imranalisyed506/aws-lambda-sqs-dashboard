import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  uiSize?: "sm" | "md" | "lg";
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, uiSize = "md", ...props }, ref) => {
    const base = "block w-full rounded-md border border-stone-300 bg-white text-stone-900 shadow-sm focus:border-stone-500 focus:ring-stone-500 focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const sizes = {
      sm: "px-2 py-1 text-sm",
      md: "px-3 py-2 text-base",
      lg: "px-4 py-3 text-lg",
    };
    return (
      <select
        ref={ref}
        className={cn(base, sizes[uiSize], className)}
        {...props}
      />
    );
  }
);
Select.displayName = "Select";
