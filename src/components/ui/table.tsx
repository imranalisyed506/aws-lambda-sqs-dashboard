import * as React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-stone-200 shadow-sm bg-white">
        <table
          className={cn(
            "min-w-full divide-y divide-stone-200 text-xs text-stone-900 whitespace-nowrap [&>tbody>tr:nth-child(even)]:bg-stone-100 dark:[&>tbody>tr:nth-child(even)]:bg-stone-800",
            className
          )}
          {...props}
        >
          {props.children}
        </table>
    </div>
  );
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-2 py-2 bg-stone-50 text-left font-semibold text-stone-700 uppercase tracking-wider border-b border-stone-200 text-xs",
        className
      )}
      {...props}
    />
  );
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr className={cn("hover:bg-stone-100 transition-colors", className)} {...props} />
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}
export function TableCell({ className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "px-2 py-2 border-b border-stone-100 text-stone-800 text-xs",
        className
      )}
      {...props}
    />
  );
}
