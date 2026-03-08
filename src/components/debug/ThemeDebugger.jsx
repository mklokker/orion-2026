import React, { useState, useEffect } from 'react';

/**
 * ThemeDebugger - Exibe CSS vars reais do tema atual
 * Mostra: data-theme, --primary (em hex), --background (em hex)
 * Usa getComputedStyle para ler valores reais do navegador
 */
export default function ThemeDebugger() {
  const [themeData, setThemeData] = useState(null);

  useEffect(() => {
    const updateThemeData = () => {
      const html = document.documentElement;
      const styles = getComputedStyle(html);

      // Ler valores HSL
      const primaryHSL = styles.getPropertyValue('--primary').trim();
      const backgroundHSL = styles.getPropertyValue('--background').trim();
      const foregroundHSL = styles.getPropertyValue('--foreground').trim();

      // Converter HSL para Hex (aproximado para display)
      const hslToHex = (hsl) => {
        if (!hsl) return '#000000';
        const parts = hsl.split(' ').map(p => parseFloat(p));
        if (parts.length < 3) return '#000000';
        const [h, s, l] = parts;
        const a = s * Math.min(l, 100 - l) / 100;
        const f = (n) => {
          const k = (n + h / 30) % 12;
          const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
          return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
      };

      setThemeData({
        dataTheme: html.getAttribute('data-theme') || 'not-set',
        primaryHSL,
        primaryHex: hslToHex(primaryHSL),
        backgroundHSL,
        backgroundHex: hslToHex(backgroundHSL),
        foregroundHSL,
        foregroundHex: hslToHex(foregroundHSL),
        darkClass: html.classList.contains('dark'),
      });
    };

    updateThemeData();
    // Atualizar ao mudar tema
    const observer = new MutationObserver(updateThemeData);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  if (!themeData) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg p-2 shadow-lg text-xs max-w-xs">
      <div className="font-bold text-foreground mb-2">🎨 Theme Debug</div>
      <div className="space-y-1 text-foreground">
        <div>
          <span className="font-semibold">data-theme:</span> <code className="bg-muted px-1 rounded">{themeData.dataTheme}</code>
        </div>
        <div>
          <span className="font-semibold">primary:</span>{' '}
          <span className="inline-flex items-center gap-1">
            <code className="bg-muted px-1 rounded">{themeData.primaryHex}</code>
            <div
              className="w-4 h-4 rounded border border-border"
              style={{ backgroundColor: themeData.primaryHex }}
            />
          </span>
        </div>
        <div>
          <span className="font-semibold">background:</span>{' '}
          <span className="inline-flex items-center gap-1">
            <code className="bg-muted px-1 rounded">{themeData.backgroundHex}</code>
            <div
              className="w-4 h-4 rounded border border-border"
              style={{ backgroundColor: themeData.backgroundHex }}
            />
          </span>
        </div>
        <div>
          <span className="font-semibold">.dark:</span> <code className="bg-muted px-1 rounded">{themeData.darkClass ? 'true' : 'false'}</code>
        </div>
      </div>
    </div>
  );
}