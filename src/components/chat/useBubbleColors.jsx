import { useMemo } from 'react';
import { getAutoTextColor } from './contrastUtils';

/**
 * Hook para aplicar cores de bubbles do UserPresence ao chat
 * Retorna CSS variables para usar no wrapper do ConversationView
 */
export function useBubbleColors(myPresence) {
  return useMemo(() => {
    if (!myPresence) return {};

    const getMyTextColor = myPresence.bubble_my_text_mode === "auto"
      ? getAutoTextColor(myPresence.bubble_my_bg || "#4338CA")
      : (myPresence.bubble_my_text_color || "#FFFFFF");

    const getOtherTextColor = myPresence.bubble_other_text_mode === "auto"
      ? getAutoTextColor(myPresence.bubble_other_bg || "#E5E7EB")
      : (myPresence.bubble_other_text_color || "#000000");

    const getMetaColor = myPresence.bubble_meta_color_mode === "auto"
      ? "#999999"
      : (myPresence.bubble_meta_color || "#999999");

    return {
      "--bubble-my-bg": myPresence.bubble_my_bg || "#4338CA",
      "--bubble-my-text": getMyTextColor,
      "--bubble-other-bg": myPresence.bubble_other_bg || "#E5E7EB",
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