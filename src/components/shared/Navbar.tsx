"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Users, LayoutGrid, UserCog, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import QuickCreateModal from "./QuickCreateModal";
import ChangePinModal from "./ChangePinModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  userEmail: string;
  userName: string;
  userRole: "admin" | "employee";
}

export default function Navbar({ userEmail, userName, userRole }: NavbarProps) {
  const [quickCreate, setQuickCreate] = useState(false);
  const [changePin, setChangePin] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      window.location.href = "/login";
    });
  }

  const initial = (userName || userEmail).charAt(0).toUpperCase();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/immoral-logo-negro.png" alt="Immoral" width={140} height={38} className="dark:invert object-contain" />
          <span className="text-xs font-medium hidden sm:block text-muted-foreground">Informes</span>
        </Link>

        {quickCreate && <QuickCreateModal onClose={() => setQuickCreate(false)} />}
        {changePin && <ChangePinModal onClose={() => setChangePin(false)} />}

        <div className="flex items-center gap-4">
          {/* Nav links */}
          {/* Nav links (moved to dropdown) */}

          {/* Quick create */}
          <Button size="icon" onClick={() => setQuickCreate(true)} title="Crear nuevo">
            <Plus className="w-4 h-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 px-4 py-2">
                <p className="text-sm font-medium leading-none truncate">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                {userRole === "admin" && (
                  <div className="mt-2">
                    <span className="flex items-center gap-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded px-2 py-1 text-xs font-semibold w-max">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {userRole}
                    </span>
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <Link href="/clientes" className="w-full">
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Clientes
                </DropdownMenuItem>
              </Link>
              {userRole === "admin" && (
                <>
                  <Link href="/admin/verticales" className="w-full">
                    <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      Verticales
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/admin/usuarios" className="w-full">
                    <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      Usuarios
                    </DropdownMenuItem>
                  </Link>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setChangePin(true);
                }}
                className="cursor-pointer"
              >
                Cambiar PIN
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isPending}
                onSelect={(e) => {
                  e.preventDefault();
                  handleSignOut();
                }}
                className="text-destructive focus:bg-destructive/10 cursor-pointer"
              >
                {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
