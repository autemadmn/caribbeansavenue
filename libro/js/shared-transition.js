// SharedImageTransition · the product row (or its photo) grows into the detail view and folds back.
// Technique adapted from Codrops TooltipTransition (MIT): measure the "from" state, change the layout,
// animate from the measured state (FLIP). Our version needs no Flip plugin: a clip-path opens the
// detail surface from the row's rectangle, the name travels from the row into the title, and,
// when a product has a photo, the photo travels with it.

import { DURATION, EASE_IN, EASE_OUT } from "./motion.js";

const px = (value) => `${Math.round(value)}px`;

function insetFrom(rect) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return `inset(${px(rect.top)} ${px(width - rect.right)} ${px(height - rect.bottom)} ${px(rect.left)})`;
}

function isOnScreen(element) {
  if (!element?.isConnected) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

/** Translate + scale that makes `to` sit exactly over `from` (top-left origin). */
function travel(fromRect, toRect, uniform = false) {
  let scaleX = fromRect.width / toRect.width;
  let scaleY = fromRect.height / toRect.height;
  if (uniform) {
    scaleX = scaleY = Math.max(scaleX, scaleY);
  }
  return { x: fromRect.left - toRect.left, y: fromRect.top - toRect.top, scaleX, scaleY };
}

export function createSharedTransition(motion) {
  return {
    /**
     * @param {object} parts
     * @param {Element} parts.source       the row that was tapped
     * @param {Element} parts.surface      the detail surface (full screen)
     * @param {Element} parts.backdrop     what retreats behind the detail (the book chrome)
     * @param {Element} parts.title        detail title
     * @param {Element} [parts.sourceTitle] the name inside the row
     * @param {Element} [parts.photo]      detail photo, if the product has one
     * @param {Element} [parts.sourcePhoto] the photo inside the row
     * @param {Element[]} parts.rest       everything else, revealed after the surface opens
     */
    open(parts, timeline) {
      const { source, surface, backdrop, title, sourceTitle, photo, sourcePhoto, rest } = parts;
      if (!timeline || !isOnScreen(source)) {
        return fallbackOpen(parts, timeline);
      }

      const from = source.getBoundingClientRect();
      timeline
        .fromTo(surface, { clipPath: insetFrom(from) }, { clipPath: "inset(0px 0px 0px 0px)", duration: DURATION.open, ease: EASE_OUT, clearProps: "clipPath" }, 0)
        .to(backdrop, { scale: 0.965, opacity: 0.4, duration: DURATION.open, ease: EASE_OUT }, 0);

      if (sourceTitle && title) {
        const ratio = parseFloat(getComputedStyle(sourceTitle).fontSize) / parseFloat(getComputedStyle(title).fontSize);
        const a = sourceTitle.getBoundingClientRect();
        const b = title.getBoundingClientRect();
        timeline.fromTo(
          title,
          // the name travels from the row and comes into focus on the way
          { x: a.left - b.left, y: a.top - b.top, scale: ratio, transformOrigin: "0 0", filter: "blur(3px)" },
          { x: 0, y: 0, scale: 1, filter: "blur(0px)", duration: DURATION.open, ease: EASE_OUT, clearProps: "transform,filter" },
          0,
        );
      }

      if (photo && sourcePhoto && isOnScreen(sourcePhoto)) {
        const move = travel(sourcePhoto.getBoundingClientRect(), photo.getBoundingClientRect(), true);
        timeline.fromTo(photo, { ...move, transformOrigin: "0 0" }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: DURATION.open, ease: EASE_OUT, clearProps: "transform" }, 0);
      }

      if (rest.length) {
        timeline.fromTo(rest, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: DURATION.text, ease: EASE_OUT, stagger: 0.05, clearProps: "transform,opacity" }, DURATION.open * 0.45);
      }
      return timeline;
    },

    close(parts, timeline) {
      const { source, surface, backdrop, title, sourceTitle, rest } = parts;
      if (!timeline) {
        return null;
      }

      // Measure the row where it will be once the book is back at full size (same frame, no paint).
      const gsap = motion.gsap;
      const scale = gsap.getProperty(backdrop, "scale");
      const opacity = gsap.getProperty(backdrop, "opacity");
      gsap.set(backdrop, { scale: 1 });
      const visible = isOnScreen(source);
      const to = visible ? source.getBoundingClientRect() : null;
      const a = visible && sourceTitle ? sourceTitle.getBoundingClientRect() : null;
      gsap.set(backdrop, { scale, opacity });

      if (!visible) {
        // The row is gone (language changed, page resized): fold away in place instead.
        return timeline
          .to(surface, { opacity: 0, y: 18, duration: DURATION.close, ease: EASE_IN }, 0)
          .to(backdrop, { scale: 1, opacity: 1, duration: DURATION.close, ease: EASE_OUT, clearProps: "transform,opacity" }, 0.06);
      }

      timeline.to(rest, { opacity: 0, y: 8, duration: DURATION.micro, ease: EASE_IN }, 0);

      if (a && title) {
        const ratio = parseFloat(getComputedStyle(sourceTitle).fontSize) / parseFloat(getComputedStyle(title).fontSize);
        const b = title.getBoundingClientRect();
        timeline.to(title, { x: a.left - b.left, y: a.top - b.top, scale: ratio, transformOrigin: "0 0", duration: DURATION.close, ease: EASE_OUT }, 0.04);
      }

      return timeline
        .to(surface, { clipPath: insetFrom(to), duration: DURATION.close, ease: EASE_OUT }, 0.04)
        .to(backdrop, { scale: 1, opacity: 1, duration: DURATION.close, ease: EASE_OUT, clearProps: "transform,opacity" }, 0.04);
    },
  };

  function fallbackOpen({ surface, backdrop, rest }, timeline) {
    if (!timeline) {
      return null;
    }
    return timeline
      .fromTo(surface, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: DURATION.open, ease: EASE_OUT, clearProps: "transform,opacity" }, 0)
      .to(backdrop, { scale: 0.965, opacity: 0.4, duration: DURATION.open, ease: EASE_OUT }, 0)
      .fromTo(rest, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: DURATION.text, ease: EASE_OUT, stagger: 0.05, clearProps: "transform,opacity" }, 0.15);
  }
}
