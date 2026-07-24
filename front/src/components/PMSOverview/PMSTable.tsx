import {
  useReactTable,
  ColumnDef,
  getCoreRowModel,
  SortingState,
  flexRender,
  getSortedRowModel,
} from "@tanstack/react-table";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import Image from "next/image";
import { buildProductUrl } from "@/lib/customDomain";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
};

export default function PMSTable<TData, TValue>({
  columns,
  data,
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
    <div className="md:w-full sm:w-[95%] xs:w-[80%] w-[65%] sm:text-[15px] ss:text-[14px] text-[13px] mx-auto mt-10 border-darkGrey border rounded-3xl relative">
      <div className="bg-blueShade/20 dark:bg-indigo/30 p-5 rounded-t-3xl text-indigo dark:text-blueShade justify-around font-medium flex">
        <div>
          PMS Investment <br className=" xs:hidden flex" /> approach(s)
        </div>
        <div>Returns</div>
      </div>
      <div className="max-h-[350px] overflow-y-auto overflow-auto">
        <table className="">
          <thead className="sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (
                      header.id === "id" ||
                      header.id === "authorName" ||
                      header.id === "profileImg"
                    )
                      return;

                    return (
                      <th
                        key={header.id}
                        className={`
                      bg-lightGreen
                      dark:bg-darkGreen

                      dark:text-white/80
             
                      text-darkGreen
                      ${
                        header.id === "title"
                          ? "py-5 sm:px-24 px-5 border-darkGrey border-t"
                          : header.id === "fiveyears"
                          ? "border-darkGrey border-l border-t p-5"
                          : "p-5 border-darkGrey border"
                      }
                      relative
                    `}
                      >
                        {header.id === "onemonth" && (
                          <div className="absolute -left-[1px] h-full top-[-65px] border-l border-darkGrey">
                            <div></div>
                          </div>
                        )}
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    );
                  })}
                </tr>
              );
            })}
          </thead>

          <tbody className="max-h-[300px] overflow-y-auto">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  if (
                    cell.column.id === `id` ||
                    cell.column.id === "authorName" ||
                    cell.column.id === "profileImg"
                  )
                    return;

                  return (
                    <td
                      key={cell.id}
                      className={`text-indigo dark:text-white/70 border-darkGrey  border-t ${
                        cell.column.id === "title"
                          ? "font-medium pl-5 md:pr-40 pr-5 "
                          : "p-5 border-l"
                      } `}
                    >
                      {cell.column.id === "title" ? (
                        <Link href={buildProductUrl("services", row.getValue("id") as string, (row.original as any)?.authorData)}>
                          <div className="flex items-center gap-2 leading-none">
                            <Avatar className="h-10 w-10 cursor-pointer z-0">
                              <AvatarImage
                                src={row.getValue("profileImg")}
                                alt="profile-avatar"
                              />

                              <AvatarFallback>
                                <Image
                                  src={"/images/avatar/avatar.jpg"}
                                  alt="avatar"
                                  width={480}
                                  height={480}
                                />
                              </AvatarFallback>
                            </Avatar>

                            <div>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                              <div className="text-[10px] mt-1">
                                {row.getValue("authorName")}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
