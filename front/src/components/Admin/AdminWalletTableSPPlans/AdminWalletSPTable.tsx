"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component
import * as XLSX from "xlsx";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function AdminWalletSPTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, "AdminWalletSPData.xlsx");
  };

  return (
    <>
      <div className="flex items-center py-4 gap-5 justify-end mr-5">
        <Input
          placeholder="Purchased By"
          value={
            (table.getColumn("purchasedBy")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("purchasedBy")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />

        <Input
          placeholder="Date"
          value={
            (table.getColumn("createdAt")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("createdAt")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={exportToExcel}>Export to Excel</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  if (header.id === "_id") return;

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === "_id") return;

                    if (cell.column.id === "invoiceLink") {
                      const invoice =
                        (row.getValue("invoiceLink") as string) || "";

                      return (
                        // <TableCell key={cell.id}>
                        //   <Link
                        //     href={`/dashboard/admin/viewinvoice/${invoice.substring(
                        //       invoice.indexOf("://") + "://".length
                        //     )}`}
                        //     rel="noopener noreferrer"
                        //     target="_blank"
                        //   >
                        //     View
                        //   </Link>
                        // </TableCell>
                        <TableCell key={cell.id}>
                          <Link
                            href={`/dashboard/admin/viewinvoice/${invoice.substring(
                              invoice.indexOf("://") + "://".length
                            )}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            View
                          </Link>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
