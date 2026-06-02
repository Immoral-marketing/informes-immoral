"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import QuickCreateModal from "./QuickCreateModal";

interface NavbarProps {
  userEmail: string;
  userName: string;
  userRole: "admin" | "employee";
}

export default function Navbar({ userEmail, userName, userRole }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      window.location.href = "/login";
    });
  }

  const initial = (userName || userEmail).charAt(0).toUpperCase();

  return (
    <header
      className="px-4 h-14 flex items-center justify-between"
      style={{ backgroundColor: "#111111", borderBottom: "1px solid #2e2e2e" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <Image src="/immoral-logo-blanco.png" alt="Immoral" width={90} height={26} className="object-contain" />
        <span className="text-xs font-medium hidden sm:block" style={{ color: "#3a3a3a" }}>Informes</span>
      </Link>

      {quickCreate && <QuickCreateModal onClose={() => setQuickCreate(false)} />}

      <div className="flex items-center gap-4">
        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/clientes"
            className="text-sm transition-colors"
            style={{ color: "#5E5E5E" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#5E5E5E"; }}
          >
            Clientes
          </Link>
          {userRole === "admin" && (
            <>
              <Link
                href="/admin/verticales"
                className="text-sm transition-colors"
                style={{ color: "#5E5E5E" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#5E5E5E"; }}
              >
                Verticales
              </Link>
              <Link
                href="/admin/usuarios"
                className="text-sm transition-colors"
                style={{ color: "#5E5E5E" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#5E5E5E"; }}
              >
                Usuarios
              </Link>
            </>
          )}
        </div>

        {/* Quick create */}
        <button
          onClick={() => setQuickCreate(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ backgroundColor: "#3980E4", color: "#ffffff" }}
          title="Crear nuevo"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "#D8D8D8" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: "#3980E4" }}
            >
              {initial}
            </div>
            <span className="hidden sm:block max-w-[140px] truncate">{userName || userEmail}</span>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-10 rounded-xl shadow-xl w-48 py-1 z-50"
              style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
            >
              <div className="px-4 py-2" style={{ borderBottom: "1px solid #2e2e2e" }}>
                <p className="text-white text-xs font-medium truncate">{userName}</p>
                <p className="text-xs truncate" style={{ color: "#5E5E5E" }}>{userEmail}</p>
                <span
                  className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "rgba(57,128,228,0.15)", color: "#3980E4" }}
                >
                  {userRole}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isPending}
                className="w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-50"
                style={{ color: "#5E5E5E" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.backgroundColor = "#242424"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#5E5E5E"; e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
