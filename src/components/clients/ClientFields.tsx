import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ClientFields({
  client,
  defaultName = "",
}: {
  client?: {
    name: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_whatsapp: string | null;
    logo_signed_url?: string | null;
  };
  defaultName?: string;
}) {
  const [logoPreview, setLogoPreview] = useState<string | null>(client?.logo_signed_url ?? null);
  const [removeLogo, setRemoveLogo] = useState(false);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      setRemoveLogo(false);
    } else {
      setLogoPreview(client?.logo_signed_url && !removeLogo ? client.logo_signed_url : null);
    }
  }

  function handleRemoveLogo() {
    setLogoPreview(null);
    setRemoveLogo(true);
    const fileInput = document.getElementById("client-logo-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }

  return (
    <>
      <div className="flex flex-col gap-1.5 mb-2">
        <Label className="text-xs text-muted-foreground">
          Logo de cliente (PNG/SVG, máx. 2MB)
        </Label>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Input
            id="client-logo-input"
            type="file"
            name="logo"
            accept="image/png, image/svg+xml"
            onChange={handleLogoChange}
            className="rounded-xl flex-1 cursor-pointer file:cursor-pointer"
          />
          <input type="hidden" name="remove_logo" value={removeLogo ? "true" : "false"} />
        </div>
        {logoPreview && (
          <div className="mt-2 flex items-center justify-between p-3 rounded-xl border bg-card">
            <div className="h-10 w-24 flex items-center justify-center bg-secondary/50 rounded-lg overflow-hidden p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="Preview" className="max-h-full max-w-full object-contain" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLogo}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
            >
              Quitar
            </Button>
          </div>
        )}
      </div>

      {(["name", "contact_name", "contact_phone", "contact_whatsapp"] as const).map((field) => (
        <div key={field} className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            {field === "name"
              ? "Nombre *"
              : field === "contact_name"
              ? "Persona de contacto"
              : field === "contact_phone"
              ? "Teléfono"
              : "WhatsApp"}
          </Label>
          <Input
            type="text"
            name={field}
            defaultValue={client?.[field] ?? (field === "name" ? defaultName : "")}
            required={field === "name"}
            className="rounded-xl"
          />
        </div>
      ))}
    </>
  );
}
