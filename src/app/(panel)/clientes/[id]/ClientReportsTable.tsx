"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Filter } from "lucide-react";
import Link from "next/link";

import CreateReportModal from "./CreateReportModal";

type ReportRow = {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  vertical_name: string;
  vertical_color: string;
  space_slug: string;
};

interface ClientReportsTableProps {
  clientId: string;
  clientName: string;
  reports: ReportRow[];
  verticals: { id: string; name: string; color_hex: string }[];
  canEdit: boolean;
}

export default function ClientReportsTable({
  clientId,
  clientName,
  reports,
  verticals,
  canEdit,
}: ClientReportsTableProps) {
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchesVertical = verticalFilter === "all" || r.vertical_name === verticalFilter;
      return matchesSearch && matchesVertical;
    });
  }, [reports, search, verticalFilter]);

  // Extract unique verticals from reports for the filter
  const activeVerticalNames = useMemo(() => {
    const names = new Set(reports.map(r => r.vertical_name));
    return Array.from(names).sort();
  }, [reports]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Propuestas</h2>
        
        {canEdit && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors bg-slate-900 text-white hover:bg-slate-800 shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Propuesta</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar propuesta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow"
          />
        </div>
        
        <div className="relative shrink-0 sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={verticalFilter}
            onChange={(e) => setVerticalFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow appearance-none cursor-pointer"
          >
            <option value="all">Todas las verticales</option>
            {activeVerticalNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vertical</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Versión</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actualizado</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No se encontraron propuestas.
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{r.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">/{r.space_slug}/{r.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-white shadow-sm" style={{ borderColor: `${r.vertical_color}30` }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.vertical_color }} />
                        <span style={{ color: r.vertical_color }}>{r.vertical_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      v{r.current_version}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(r.updated_at))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/informes/${r.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateReportModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        clientId={clientId}
        verticals={verticals}
      />
    </div>
  );
}
