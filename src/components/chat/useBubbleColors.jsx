import { useEffect } from "react";
import { getAutoTextColor, isContrastValid, findClosestLegibleColor } from "./contrastUtils";

/**
 * Hook para aplicar cores de bubble personalizadas via CSS variables
 */
export function useBubbleColors(userPresence) {
  useEffect(() => {
    if (!userPresence) return;

    // Defaults
    const defaults = {
      myBg: "#4338CA",
      myText: "#FFFFFF",
      otherBg: "#E5E7EB",
      otherText: "#000000",
      metaColor: "#999999",
    };

    // My bubble
    const myBg = userPresence.bubble_my_bg || defaults.myBg;
    let myText = defaults.myText;

    if (userPresence.bubble_my_text_mode === "auto") {
      myText = getAutoTextColor(myBg);
    } else if (userPresence.bubble_my_text_mode === "custom") {
      myText = userPresence.bubble_my_text_color || defaults.myText;
      // Validar e corrigir se necessário
      if (!isContrastValid(myBg, myText, "AA")) {
        myText = findClosestLegibleColor(myBg, myText, "AA");
      }
    }

    // Other bubble
    const otherBg = userPresence.bubble_other_bg || defaults.otherBg;
    let otherText = defaults.otherText;

    if (userPresence.bubble_other_text_mode === "auto") {
      otherText = getAutoTextColor(otherBg);
    } else if (userPresence.bubble_other_text_mode === "custom") {
      otherText = userPresence.bubble_other_text_color || defaults.otherText;
      // Validar e corrigir se necessário
      if (!isContrastValid(otherBg, otherText, "AA")) {
        otherText = findClosestLegibleColor(otherBg, otherText, "AA");
      }
    }

    // Meta color (hora, ticks)
    let metaColor = defaults.metaColor;
    if (userPresence.bubble_meta_color_mode === "custom") {
      metaColor = userPresence.bubble_meta_color || defaults.metaColor;
    }

    // Aplicar CSS variables no document
    const root = document.documentElement;
    root.style.setProperty("--bubble-my-bg", myBg);
    root.style.setProperty("--bubble-my-text", myText);
    root.style.setProperty("--bubble-other-bg", otherBg);
    root.style.setProperty("--bubble-other-text", otherText);
    root.style.setProperty("--bubble-meta-color", metaColor);

    // Cleanup
    return () => {
      root.style.removeProperty("--bubble-my-bg");
      root.style.removeProperty("--bubble-my-text");
      root.style.removeProperty("--bubble-other-bg");
      root.style.removeProperty("--bubble-other-text");
      root.style.removeProperty("--bubble-meta-color");
    };
  }, [userPresence]);
}