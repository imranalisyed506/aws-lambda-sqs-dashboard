import * as React from "react"
import { cn } from "@/lib/utils"

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
}

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ className, open, onClose, children, ...props }, ref) => {
    if (!open) return null
    return (
      <div ref={ref} className={cn("shadcn-dialog", className)} {...props}>
        <div className="shadcn-dialog-overlay" onClick={onClose} />
        <div className="shadcn-dialog-content">
          {children}
        </div>
      </div>
    )
  }
)
Dialog.displayName = "Dialog"
