"use client";

import * as React from "react";

import {
  ColumnDef,
  flexRender,
  SortingState,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function SPRecommendation<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

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


//   console.log("this is the recommedation data of last page: ", data)

  return (
    <div className="rounded-md border">
      <table className="w-full text-center">
        <thead className="">
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} className={`p-4`}>
                      <div
                        className={`bg-blueShade dark:bg-indigo p-2 rounded-sm text-center flex justify-center`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>

        <tbody className="">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`${
                row.getValue("_id") === "Total" &&
                "bg-blueShade dark:bg-indigo py-3 font-bold text-[18px]"
              }`}
            >
              {row.getVisibleCells().map((cell) => {
                return (
                  <td
                    key={cell.id}
                    className={`text-indigo dark:text-white/70 border-darkGrey p-3 border-b-2 border-dotted`}
                  >
                    <div
                      className={`${
                        cell.column.id === "_id"
                          ? "bg-lightGreen dark:bg-darkGreen rounded-3xl py-3"
                          : "text-[25px] font-bold"
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
