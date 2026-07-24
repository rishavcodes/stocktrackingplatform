"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import Link from "next/link";
import { Dispatch, useState } from "react";

export default function NavSearch({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [search, setSearch] = useState("");

  const handleLinkClick = () => {
    setOpen(false);  // Close the dialog when a link is clicked
  };

  return (
    <div className="absolute">
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command loop>
          {/* <CommandInput
            placeholder="Type to search..."
            value={search}
            onValueChange={setSearch}
          /> */}
          <CommandList>
            {/* <CommandEmpty>No results found.</CommandEmpty> */}
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <Link onClick={handleLinkClick} href={"/service-providers/PMS"}>Service providers</Link>
              </CommandItem>
              <CommandItem>
                <Link onClick={handleLinkClick} href={"/market-watch/equity/articles"}>Equity</Link>
              </CommandItem>
              <CommandItem>
                <Link onClick={handleLinkClick} href={"/market-watch/commodity/articles"}>Commodity</Link>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            {/* <CommandGroup heading="Others">
              <CommandItem>
                <Link href={"/dashboard/serviceprovider/articles"}>
                  Dashboard
                </Link>
              </CommandItem>
              <CommandItem>
                <Link href={"/dashboard/serviceprovider/myprofile"}>
                  My Profile
                </Link>
              </CommandItem>
              <CommandItem>
                <Link href={"/dashboard/serviceprovider/content/videos"}>
                  Post Video
                </Link>
              </CommandItem>
            </CommandGroup> */}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
