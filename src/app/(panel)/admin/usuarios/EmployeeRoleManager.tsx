"use client";

import { useState } from "react";
import { updateRole } from "./actions";

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

export default function EmployeeRoleManager({ employees: initial, currentUserId }: EmployeeRoleManagerProps) {
  const [employees, setEmployees] = useState(initial);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleRoleChange(id: string, role: "admin" | "employee") {
    setUpdatingId(id);
    const result = await updateRole(id, role);
    setUpdatingId(null);
    if ("error" in result) {
      setFeedback(result.error);
    } else {
      setFeedback(null);
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, role } : e))
      );
    }
  }

  return (
    <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <h2 className="font-bold text-foreground">Empleados</h2>

      {feedback && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{feedback}</p>
      )}

      <ul className="flex flex-col gap-2">
        {employees.map((emp) => (
          <li key={emp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium text-foreground">
              {emp.full_name ?? "—"}
            </span>
            <select
              value={emp.role}
              disabled={emp.id === currentUserId || updatingId === emp.id}
              onChange={(e) => handleRoleChange(emp.id, e.target.value as "admin" | "employee")}
              className="text-sm border border-border rounded-lg px-2 py-1 bg-background focus:outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="employee">employee</option>
              <option value="admin">admin</option>
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}
