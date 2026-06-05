"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, LayoutGrid, UserCog, ShieldCheck, LayoutDashboard, UserPlus, FilePlus } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { NewClientWithVerticalDialog } from "@/components/clients/NewClientWithVerticalDialog";
import { NewReportFlow } from "./NewReportFlow";
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
  const router = useRouter();
  const [newClient, setNewClient] = useState(false);
  const [newReport, setNewReport] = useState(false);
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
      <div className="container mx-auto max-w-[1400px] px-4 sm:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/immoral-logo-negro.png" alt="Immoral" width={182} height={50} className="dark:invert object-contain" />
          <span className="text-xs font-medium hidden sm:block text-muted-foreground">Informes</span>
        </Link>

        {newClient && (
          <NewClientWithVerticalDialog
            onClose={() => setNewClient(false)}
            onCreated={(r) => {
              setNewClient(false);
              router.push(`/espacios/${r.spaceId}`);
            }}
          />
        )}
        {newReport && <NewReportFlow onClose={() => setNewReport(false)} />}
        {changePin && <ChangePinModal onClose={() => setChangePin(false)} />}

        <div className="flex items-center gap-4">
          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
            <Link href="/clientes" className="hover:text-primary transition-colors">Clientes</Link>
            {userRole === "admin" && (
              <>
                <Link href="/admin/verticales" className="hover:text-primary transition-colors">Verticales</Link>
                <Link href="/admin/usuarios" className="hover:text-primary transition-colors">Usuarios</Link>
              </>
            )}
          </nav>

          {/* Quick create buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewClient(true)} className="hidden sm:flex rounded-xl">
              Nuevo cliente
            </Button>
            <Button size="icon" variant="outline" onClick={() => setNewClient(true)} title="Nuevo cliente" className="sm:hidden">
              <UserPlus className="w-4 h-4" />
            </Button>

            <Button size="sm" onClick={() => setNewReport(true)} className="hidden sm:flex rounded-xl">
              Nuevo informe
            </Button>
            <Button size="icon" onClick={() => setNewReport(true)} title="Nuevo informe" className="sm:hidden">
              <FilePlus className="w-4 h-4" />
            </Button>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Avatar className="w-9 h-9 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
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
              <Link href="/" className="w-full">
                <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </DropdownMenuItem>
              </Link>
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
