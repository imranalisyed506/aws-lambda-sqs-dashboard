import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "error";
}

const variantStyles = {
  info: "bg-stone-50 border-stone-300 text-stone-800",
  success: "bg-green-50 border-green-400 text-green-800",
  warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
  error: "bg-red-50 border-red-400 text-red-800",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", children, ...props }, ref) => {
    const [visible, setVisible] = React.useState(true);
    if (!visible) return null;
    return (
      <div
        ref={ref}
        className={cn(
          "w-full rounded-md border px-4 py-3 text-sm flex items-center gap-2 shadow-sm",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
        {(variant === "success" || variant === "error") && (
          <button
            type="button"
            className="absolute top-2 right-2 text-stone-400 hover:text-stone-700 focus:outline-none"
            aria-label="Close notification"
            onClick={() => setVisible(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

export function AlertTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-bold mb-1">{children}</div>;
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
