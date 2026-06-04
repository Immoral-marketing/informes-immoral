"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoBrandLockup } from "./CoBrandLockup";
import BrandLoader from "./BrandLoader";

export function ClientTransitionLink({
  href,
  clientLogoUrl,
  clientName,
  children,
  className,
}: {
  href: string;
  clientLogoUrl: string | null;
  clientName: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  function handleClick(e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    
    e.preventDefault();
    setIsNavigating(true);
    router.push(href);
  }

  return (
    <>
      <a href={href} onClick={handleClick} className={className}>
        {children}
      </a>
      {isNavigating && (
        clientLogoUrl ? (
          <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
            style={{ 
              backgroundColor: "var(--background)",
              animation: "fadeIn 200ms ease-out both"
            }}
          >
            <div style={{ animation: "brandPhraseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both" }}>
              <CoBrandLockup 
                clientLogoUrl={clientLogoUrl} 
                titleText={clientName} 
                variant="loader" 
                theme="light" 
              />
            </div>
            <p
              className="text-sm font-medium px-6 text-center"
              style={{
                color: "var(--muted-foreground)",
                animation: `brandPhraseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both 100ms`,
              }}
            >
              Abriendo espacio de {clientName}…
            </p>
          </div>
        ) : (
          <div className="relative z-[100]">
             <BrandLoader variant="panel" />
          </div>
        )
      )}
    </>
  );
}
