"use client";

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
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
import ApproveWithdrawal from "./ApproveWithdrawal";
import ProcessWithdrawal from "./ProcessWithDrawal";
import PaymentDetails from "./PaymentDetails";
import Link from "next/link";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  type?: string;
}

export function WithdrawalDataTable<TData, TValue>({
  columns,
  data,
  type,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                if (header.id === "_id" || header.id === "spId") {
                  return;
                }

                if (
                  type !== "pending" &&
                  type !== "approved" &&
                  (header.id === "actions" || header.id === "accDetails")
                ) {
                  return;
                }

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
                  if (cell.column.id === "_id" || cell.column.id === "spId") {
                    return;
                  }

                  if (type === "pending" && cell.column.id === "actions") {
                    return (
                      <TableCell key={cell.id}>
                        <ApproveWithdrawal
                          name={row.getValue("name")}
                          id={row.getValue("_id")}
                        />
                      </TableCell>
                    );
                  }

                  if (type === "approved" && cell.column.id === "actions") {
                    return (
                      <TableCell key={cell.id}>
                        <ProcessWithdrawal
                          name={row.getValue("name")}
                          id={row.getValue("_id")}
                        />
                      </TableCell>
                    );
                  }

                  if (type !== "processed" && cell.column.id === "accDetails") {
                    return (
                      <TableCell key={cell.id}>
                        <PaymentDetails id={row.getValue("spId")} />
                      </TableCell>
                    );
                  }

                  if (cell.column.id === "wallet") {
                    return (
                      <TableCell key={cell.id}>
                        <Link
                          className="cursor-pointer"
                          href={`/dashboard/admin/serviceproviderapproval/${row.getValue(
                            "spId"
                          )}/wallet`}
                        >
                          Open Wallet
                        </Link>
                      </TableCell>
                    );
                  }

                  if (
                    type !== "pending" &&
                    type !== "approved" &&
                    (cell.column.id === "actions" ||
                      cell.column.id === "accDetails")
                  ) {
                    return;
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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
