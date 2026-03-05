import React, { useMemo, useState } from "react";

// Presets de fundo
export const CHAT_BG_PRESETS = [
  { id: "default", label: "Padrão", type: "default", value: "" },
  { id: "neutro", label: "Neutro", type: "solid", value: "#E5E7EB" },
  { id: "azul-suave", label: "Azul Suave", type: "gradient", value: "linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 100%)" },
  { id: "verde-suave", label: "Verde Suave", type: "gradient", value: "linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)" },
  { id: "lavanda", label: "Lavanda", type: "gradient", value: "linear-gradient(135deg, #EDE9FE 0%, #FCE7F3 100%)" },
  { id: "midnight", label: "Midnight", type: "gradient", value: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)" },
  { id: "sunset", label: "Sunset", type: "gradient", value: "linear-gradient(135deg, #FDE68A 0%, #FBBF24 50%, #F97316 100%)" },
  { id: "oceano", label: "Oceano", type: "gradient", value: "linear-gradient(135deg, #0EA5E9 0%, #2563EB 50%, #7C3AED 100%)" },
];

export default function ChatBackground({ conversation }) {
  const [imgError, setImgError] = useState(false);

  const themeType = conversation?.theme_type || "default";
  const themeValue = conversation?.theme_value || "";
  const themeOpacity = conversation?.theme_opacity ?? 0.15;
  const themeBlur = conversation?.theme_blur ?? 0;
  const themeDim = conversation?.theme_dim ?? true;

  const bgStyle = useMemo(() => {
    if (themeType === "default" || !themeValue) return null;

    const base = {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      zIndex: 0,
    };

    if (themeType === "solid") {
      return { ...base, backgroundColor: themeValue, opacity: themeOpacity };
    }

    if (themeType === "gradient") {
      return { ...base, background: themeValue, opacity: themeOpacity };
    }

    if (themeType === "image" && !imgError) {
      return {
        ...base,
        backgroundImage: `url(${themeValue})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: themeOpacity,
        filter: themeBlur > 0 ? `blur(${themeBlur}px)` : undefined,
        // Expand slightly to cover blur edges
        ...(themeBlur > 0 ? { inset: `-${themeBlur}px` } : {}),
      };
    }

    return null;
  }, [themeType, themeValue, themeOpacity, themeBlur, imgError]);

  if (!bgStyle) return null;

  return (
    <>
      {/* Background layer */}
      <div style={bgStyle}>
        {/* Preload image to detect errors */}
        {themeType === "image" && !imgError && (
          <img
            src={themeValue}
            alt=""
            className="hidden"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Dim overlay for readability */}
      {themeDim && themeType !== "default" && themeValue && (
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            backgroundColor: "hsl(var(--background))",
            opacity: themeType === "image" ? 0.5 : 0.3,
          }}
        />
      )}
    </>
  );
}