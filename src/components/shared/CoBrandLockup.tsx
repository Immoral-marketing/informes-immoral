"use client";

import Image from "next/image";

export interface CoBrandLockupProps {
  clientLogoUrl: string | null;
  titleText?: string;
  variant?: "viewer" | "modal" | "loader" | "header";
  theme?: "dark" | "light";
}

export function CoBrandLockup({ clientLogoUrl, titleText, variant = "viewer", theme = "dark" }: CoBrandLockupProps) {
  const isDark = theme === "dark";
  const crossColor = isDark ? "#404040" : "var(--border)";
  const textColor = isDark ? "text-white" : "text-foreground";

  let immoralSize = { width: 110, height: 30 };
  let clientSize = "h-7 sm:h-8"; 
  let textSize = "text-sm sm:text-base";
  let gap = "gap-3 sm:gap-4";

  if (variant === "modal" || variant === "loader") {
    immoralSize = { width: 120, height: 34 };
    clientSize = "h-8";
    textSize = "text-base";
    gap = "gap-4";
  } else if (variant === "header") {
    immoralSize = { width: 120, height: 32 };
    clientSize = "h-8 sm:h-10";
    textSize = "text-base sm:text-lg";
    gap = "gap-4";
  }

  const immoralLogo = isDark 
    ? "/immoral-logo-blanco.png" 
    : (variant === "loader" || variant === "modal" ? "/ISO-Negro.png" : "/immoral-logo-negro.png");

  if (!isDark && (variant === "loader" || variant === "modal")) {
     immoralSize = { width: 96, height: 96 };
     clientSize = "h-12"; 
  }

  return (
    <div className={`flex items-center ${gap} min-w-0`}>
      <div className="shrink-0 flex items-center">
        <Image
          src={immoralLogo}
          alt="Immoral"
          width={immoralSize.width}
          height={immoralSize.height}
          className="object-contain"
          priority={variant === "loader" || variant === "viewer"}
        />
      </div>

      {clientLogoUrl ? (
        <>
          <span className="shrink-0 font-light text-xl" style={{ color: crossColor }}>×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clientLogoUrl}
            alt={titleText || "Cliente"}
            className={`shrink-0 object-contain ${clientSize} max-w-[120px] sm:max-w-[160px]`}
          />
          {variant === "viewer" && titleText && (
            <>
              <span className="shrink-0 text-xs" style={{ color: crossColor }}>|</span>
              <span className={`font-medium truncate ${textColor} ${textSize}`}>{titleText}</span>
            </>
          )}
        </>
      ) : variant === "viewer" && titleText ? (
        <>
          <span className="shrink-0 text-xs" style={{ color: crossColor }}>|</span>
          <span className={`font-medium truncate ${textColor} ${textSize}`}>{titleText}</span>
        </>
      ) : null}
    </div>
  );
}
