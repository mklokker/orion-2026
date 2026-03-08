import { useMemo } from 'react';
import { getAutoTextColor } from './contrastUtils';

/**
 * Hook para aplicar cores de bubbles do UserPresence ao chat
 * Prioridade: preferências do usuário > fallback para tokens do tema
 * 
 * Retorna CSS variables que funcionam em Light/Dark:
 * - Se usuário personalizou: usa cores salvas
 * - Se não personalizou: usa hsl(var(--primary)) etc do CSS
 */
export function useBubbleColors(myPresence) {
  return useMemo(() => {
    const hasCustomization = myPresence?.bubble_my_bg || myPresence?.bubble_other_bg;

    if (!hasCustomization) {
      // Sem personalização — usar tokens do tema (Light/Dark reage automaticamente)
      // Usa var() com fallback para hsl() dos tokens de tema
      return {
        "--bubble-my-bg": "hsl(var(--primary))",
        "--bubble-my-text": "hsl(var(--primary-foreground))",
        "--bubble-other-bg": "hsl(var(--muted))",
        "--bubble-other-text": "hsl(var(--foreground))",
        "--bubble-meta-color": "hsl(var(--muted-foreground))",
      };
    }

    // Com personalização — calcular cores customizadas
    const getMyTextColor = myPresence.bubble_my_text_mode === "auto"
      ? getAutoTextColor(myPresence.bubble_my_bg)
      : (myPresence.bubble_my_text_color || "#FFFFFF");

    const getOtherTextColor = myPresence.bubble_other_text_mode === "auto"
      ? getAutoTextColor(myPresence.bubble_other_bg || "#E5E7EB")
      : (myPresence.bubble_other_text_color || "#000000");

    const getMetaColor = myPresence.bubble_meta_color_mode === "auto"
      ? "#999999"
      : (myPresence.bubble_meta_color || "#999999");

    return {
      "--bubble-my-bg": myPresence.bubble_my_bg || "hsl(var(--primary))",
      "--bubble-my-text": getMyTextColor,
      "--bubble-other-bg": myPresence.bubble_other_bg || "hsl(var(--muted))",
      "--bubble-other-text": getOtherTextColor,
      "--bubble-meta-color": getMetaColor,
    };
  }, [
    myPresence?.bubble_my_bg,
    myPresence?.bubble_my_text_mode,
    myPresence?.bubble_my_text_color,
    myPresence?.bubble_other_bg,
    myPresence?.bubble_other_text_mode,
    myPresence?.bubble_other_text_color,
    myPresence?.bubble_meta_color_mode,
    myPresence?.bubble_meta_color,
  ]);
}