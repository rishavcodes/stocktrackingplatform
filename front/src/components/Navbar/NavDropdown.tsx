"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { useSession } from "next-auth/react";

type NavDropdownProps = {
  title: string;
  list: { title: string; href: string }[];
};

export default function NavDropdown({ title, list }: NavDropdownProps) {

  const session = useSession();

  // if (title === "Services" && session.data?.user?.type !== "Admin") {
  //   return null; // Hide if user is not an Admin
  // }


  return (
    <div>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="text-[15px] hover:bg-transparent">
              {title}
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              {list.map((links, idx) => (
                <Link
                  href={links.href}
                  key={links.title}
                  className={` hover:bg-lightBlue dark:hover:bg-blue/10 px-10 py-1 ${
                    idx === 1 ? "w-[300px]" : "w-auto"
                  }`}
                >
                  {links.title}
                </Link>
              ))}
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
