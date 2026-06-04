"use client";

import { useEffect, useState } from "react";
import { getVerticalsForSelect } from "@/app/(panel)/clientes/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function VerticalSelect({ required = true }: { required?: boolean }) {
  const [verticals, setVerticals] = useState<Array<{ id: string; name: string; color_hex: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerticalsForSelect().then((data) => {
      setVerticals(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Vertical *</Label>
      <Select name="vertical_id" required={required} disabled={loading}>
        <SelectTrigger className="rounded-xl">
          <SelectValue placeholder={loading ? "Cargando..." : "Selecciona una vertical"} />
        </SelectTrigger>
        <SelectContent>
          {verticals.length === 0 && !loading ? (
            <div className="p-2 text-sm text-muted-foreground text-center">No hay verticales disponibles</div>
          ) : (
            verticals.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color_hex }} />
                  <span className="truncate">{v.name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
