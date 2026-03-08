/**
 * Utilitários para validação WCAG e cálculo automático de cores
 */

// Converter hex para RGB
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Converter RGB para hex
export function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

// Calcular luminância relativa (WCAG)
export function calculateLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calcular razão de contraste WCAG
export function calculateContrastRatio(bgHex, fgHex) {
  const bgLum = calculateLuminance(bgHex);
  const fgLum = calculateLuminance(fgHex);

  const lighter = Math.max(bgLum, fgLum);
  const darker = Math.min(bgLum, fgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

// Validar se contraste atende WCAG AA (4.5:1 para texto pequeno, 3:1 para grande)
export function isContrastValid(bgHex, fgHex, level = "AA") {
  const ratio = calculateContrastRatio(bgHex, fgHex);
  // AA: 4.5:1 (small text), 3:1 (large text)
  // AAA: 7:1 (small), 4.5:1 (large)
  const minRatio = level === "AAA" ? 7 : 4.5;
  return ratio >= minRatio;
}

// Determinar cor de texto automática (preto ou branco)
export function getAutoTextColor(bgHex) {
  const lum = calculateLuminance(bgHex);
  // Se luminância > 0.5 (claro), usar preto; senão branco
  return lum > 0.5 ? "#000000" : "#FFFFFF";
}

// Encontrar cor legível mais próxima (ajustar para atender contraste)
export function findClosestLegibleColor(bgHex, preferredHex, level = "AA") {
  const minRatio = level === "AAA" ? 7 : 4.5;
  const preferred = hexToRgb(preferredHex);
  if (!preferred) return getAutoTextColor(bgHex);

  // Tentar cor preferida
  if (isContrastValid(bgHex, preferredHex, level)) {
    return preferredHex;
  }

  // Senão, usar preto ou branco
  const black = "#000000";
  const white = "#FFFFFF";

  const contrastBlack = calculateContrastRatio(bgHex, black);
  const contrastWhite = calculateContrastRatio(bgHex, white);

  // Preferir o que tiver mais contraste
  return contrastWhite >= contrastBlack ? white : black;
}

// Gerar mensagem de aviso de contraste
export function getContrastMessage(ratio, level = "AA") {
  const minRatio = level === "AAA" ? 7 : 4.5;
  const percent = Math.round((ratio / minRatio) * 100);
  if (ratio >= minRatio) return null;
  return `Contraste insuficiente (${percent}% de ${level}). Será ajustado automaticamente.`;
}