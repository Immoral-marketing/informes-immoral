"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { searchClients } from "@/app/(panel)/clientes/actions";

export function ClientAutocomplete({
  onSelect,
  onNoMatch,
  placeholder = "Buscar cliente...",
}: {
  onSelect: (c: { id: string; name: string }) => void;
  onNoMatch?: (query: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setClients([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    const timeoutId = setTimeout(() => {
      searchClients(trimmed).then((data) => {
        setClients(data);
        setIsOpen(true);
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        placeholder={placeholder}
        className="rounded-xl"
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-xl border border-border shadow-md py-1 max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-muted-foreground text-center">Buscando...</div>
          ) : clients.length > 0 ? (
            clients.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setIsOpen(false);
                  onSelect(c);
                  setQuery("");
                }}
              >
                {c.name}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-center flex flex-col gap-2">
              <span className="text-muted-foreground">No se encontraron clientes.</span>
              {onNoMatch && (
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => {
                    setIsOpen(false);
                    onNoMatch(query);
                  }}
                >
                  Crear cliente &laquo;{query}&raquo;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
