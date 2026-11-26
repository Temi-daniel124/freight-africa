import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<Row> = { key: string; header: string; cell: (row: Row) => ReactNode; numeric?: boolean };

type DataTableProps<Row> = { columns: Column<Row>[]; rows: Row[]; rowKey: (row: Row) => string; dense?: boolean; caption: string; empty?: ReactNode };

/**
 * Tables (mockup .tbl, and the console's dense .tbl.d): uppercase headers on #FAFAF8, 1 px row lines,
 * figures in tabular numbers and right-aligned. Wide tables scroll sideways inside their card.
 */
export function DataTable<Row>({ columns, rows, rowKey, dense = false, caption, empty }: DataTableProps<Row>) {
  const pad = dense ? "px-3" : "px-5";
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "bg-table-head font-semibold tracking-[0.04em] whitespace-nowrap text-ink-3 uppercase",
                  pad,
                  dense ? "py-2.5 text-micro" : "py-3.5 text-caption",
                  column.numeric ? "text-right" : "text-left",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "border-t border-line-soft",
                      pad,
                      dense ? "py-2.75 text-[13px] whitespace-nowrap" : "py-4 text-body-sm font-normal",
                      column.numeric && "tabular text-right",
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
