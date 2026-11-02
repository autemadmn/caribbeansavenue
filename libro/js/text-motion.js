// TextMotion · the only typographic effects in the menu, all built on GSAP + transforms.
// Principles taken from "focus blur" and "word reveal" text effects (Motion Text Kit / React Bits
// were studied for behaviour only; no code copied). Rules:
// - text is never hidden by CSS: if motion is off or GSAP is missing, it is simply there;
// - transforms / opacity / a light blur only, so layout never shifts;
// - each reveal runs once per session per key, never in a loop.

import { DURATION, EASE_OUT } from "./motion.js";

const seen = new Set();

function splitWords(element) {
  if (element.dataset.split === "words") {
    return [...element.querySelectorAll(".tm-word")];
  }

  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) {
            return;
          }
          if (/^\s+$/.test(part)) {
            fragment.append(part);
            return;
          }
          const span = document.createElement("span");
          span.className = "tm-word";
          span.textContent = part;
          words.push(span);
          fragment.append(span);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };

  walk(element);
  element.dataset.split = "words";
  return words;
}

export function createTextMotion(motion) {
  return {
    /** Words rise a few pixels out of a soft blur, one after another. */
    words(element, { timeline, at = 0, stagger = 0.045, key } = {}) {
      // Never split or animate text that isn't rendered (see main.js revealHeading).
      if (!element || !motion.enabled || (key && seen.has(key)) || element.getClientRects().length === 0) {
        return timeline;
      }
      if (key) {
        seen.add(key);
      }

      const words = splitWords(element);
      const tl = timeline || motion.gsap.timeline();
      tl.fromTo(
        words,
        { opacity: 0, yPercent: 38, filter: "blur(6px)" },
        { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: DURATION.text * 1.25, ease: EASE_OUT, stagger, clearProps: "filter,transform,opacity" },
        at,
      );
      return tl;
    },

    /** The whole line resolves from a light blur. Used for product names. */
    focus(element, { timeline, at = 0, key } = {}) {
      if (!element || !motion.enabled || (key && seen.has(key))) {
        return timeline;
      }
      if (key) {
        seen.add(key);
      }

      const tl = timeline || motion.gsap.timeline();
      tl.fromTo(
        element,
        { opacity: 0, filter: "blur(8px)", letterSpacing: "0.02em" },
        { opacity: 1, filter: "blur(0px)", letterSpacing: "0em", duration: DURATION.text, ease: EASE_OUT, clearProps: "filter,opacity,letterSpacing" },
        at,
      );
      return tl;
    },

    /** Items fade up in sequence (ingredients, list rows). */
    sequence(elements, { timeline, at = 0, stagger = 0.07, distance = 10 } = {}) {
      if (!elements?.length || !motion.enabled) {
        return timeline;
      }

      const tl = timeline || motion.gsap.timeline();
      tl.fromTo(
        elements,
        { opacity: 0, y: distance },
        { opacity: 1, y: 0, duration: DURATION.text, ease: EASE_OUT, stagger, clearProps: "transform,opacity" },
        at,
      );
      return tl;
    },

    hasSeen(key) {
      return seen.has(key);
    },
  };
}
