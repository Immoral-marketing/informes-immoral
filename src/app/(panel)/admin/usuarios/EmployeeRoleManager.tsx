"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateRole } from "./actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: string;
  full_name: string | null;
  role: "admin" | "employee";
  created_at: string;
}

interface EmployeeRoleManagerProps {
  employees: Employee[];
  currentUserId: string;
}

const ROLE_LABELS: Record<"admin" | "employee", string> = {
  admin: "Administrador",
  employee: "Empleado",
};

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export default function EmployeeRoleManager({
  employees: initial,
  currentUserId,
}: EmployeeRoleManagerProps) {
  const [employees, setEmployees] = useState(initial);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleRoleChange(id: string, role: "admin" | "employee") {
    const emp = employees.find((e) => e.id === id);
    if (!emp || emp.role === role) return;

    setUpdatingId(id);
    const result = await updateRole(id, role);
    setUpdatingId(null);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, role } : e)));
      toast.success(
        `Rol de ${emp.full_name ?? "usuario"} cambiado a ${ROLE_LABELS[role]}`
      );
    }
  }

  return (
    <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
      <div>
        <h2 className="font-bold text-foreground text-base">Equipo</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestiona los roles de acceso de cada miembro.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {employees.map((emp, i) => {
          const isSelf = emp.id === currentUserId;
          const isUpdating = updatingId === emp.id;
          const isAdmin = emp.role === "admin";

          const initials = (emp.full_name ?? "?")
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <li
              key={emp.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              style={{
                animation: `fadeSlideIn 260ms ${EASE_OUT} ${i * 45}ms both`,
                opacity: isUpdating ? 0.55 : 1,
                transition: `opacity 200ms ${EASE_OUT}`,
              }}
            >
              {/* Avatar */}
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    backgroundColor: isAdmin ? "var(--primary)" : "var(--muted)",
                    color: isAdmin ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    transition: `background-color 320ms ${EASE_OUT}, color 320ms ${EASE_OUT}`,
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">
                    {emp.full_name ?? "—"}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5 leading-none">
                      Tú
                    </span>
                  )}
                </div>
                <p
                  className="text-xs mt-0.5 font-medium"
                  style={{
                    color: isUpdating
                      ? "var(--muted-foreground)"
                      : isAdmin
                      ? "#d97706" /* amber-600 */
                      : "var(--muted-foreground)",
                    transition: `color 320ms ${EASE_OUT}`,
                  }}
                >
                  {isUpdating ? "Actualizando…" : ROLE_LABELS[emp.role]}
                </p>
              </div>

              {/* Role selector */}
              <Select
                value={emp.role}
                disabled={isSelf || isUpdating}
                onValueChange={(value) =>
                  handleRoleChange(emp.id, value as "admin" | "employee")
                }
              >
                <SelectTrigger className="w-[148px] h-8 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee" className="text-xs cursor-pointer">
                    Empleado
                  </SelectItem>
                  <SelectItem value="admin" className="text-xs cursor-pointer">
                    Administrador
                  </SelectItem>
                </SelectContent>
              </Select>
            </li>
          );
        })}

        {employees.length === 0 && (
          <li className="py-8 text-sm text-muted-foreground text-center">
            No hay usuarios en el equipo todavía.
          </li>
        )}
      </ul>
    </section>
  );
}
