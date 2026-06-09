"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  UserCog,
} from "lucide-react";

interface SidebarProps {
  userRole: "admin" | "employee";
}

const mainItems = [
  { href: "/", label: "Dashboard", exact: true, icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
];

const adminItems = [
  { href: "/admin/verticales", label: "Verticales", icon: LayoutGrid },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCog },
];

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="w-56 border-r border-border px-3 py-4 flex flex-col gap-0.5 flex-shrink-0 bg-background">
      {mainItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5",
              isActive(item.href, item.exact)
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}

      {userRole === "admin" && (
        <div className="pt-3">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Configuración
          </p>
          {adminItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5",
                  isActive(item.href)
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
