// BookEngine · the book, its pages, the drag gesture and every way of turning a page.
//
// Built on StPageFlip 2.0.7 (MIT) without modifying it. StPageFlip's own input handling has two
// behaviours we replace:
//   1. Flip.stopMove() only completes a turn when the fold has crossed the spine (pos.x <= 0).
//      On a phone (portrait, one page) that means dragging ~100% of the page width.
//   2. UI.onTouchStart() waits 250 ms before following the finger; anything faster is a "swipe"
//      that flips immediately. So the outcome depended on the speed of the gesture.
// Here StPageFlip runs with useMouseEvents:false and this adapter drives it through its own
// methods (Flip.fold, Flip.animateFlippingTo): the sheet follows the finger 1:1 and the decision
// is taken only on release, from the final position, normalised to the page's travel.

const FORWARD = 0; // StPageFlip FlipDirection (const enum)
const BACK = 1;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createBookEngine({ stage, pages, config, motion, onChange }) {
  const settings = config.gesture;
  const pageCount = pages.elements.length;
  const stash = document.createDocumentFragment();

  let pageFlip = null;
  let host = null;
  let layout = null;
  let current = 0;
  let gesture = null;
  let suppressClicksUntil = 0;
  let resizeTimer = null;
  let lastGesture = null;
  let destroyed = false;

  /* ---------- Layout ---------- */

  function measure() {
    const rect = stage.getBoundingClientRect();
    return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
  }

  function layoutFor(size) {
    const spread = size.width >= config.layout.spreadMinWidth && size.width / size.height >= config.layout.spreadMinAspect;

    if (spread) {
      // Facing pages with a magazine proportion, as large as the stage allows.
      const pageHeight = size.height;
      const pageWidth = Math.min(Math.floor(size.width / 2), Math.floor(pageHeight * 0.72));
      return { spread, pageWidth, pageHeight, size };
    }

    return { spread, pageWidth: size.width, pageHeight: size.height, size };
  }

  function needsRebuild(next) {
    if (!layout) {
      return true;
    }
    return (
      next.spread !== layout.spread ||
      Math.abs(next.size.width - layout.size.width) > 2 ||
      Math.abs(next.size.height - layout.size.height) > 24
    );
  }

  /* ---------- Build / rebuild ---------- */

  function build(startPage) {
    layout = layoutFor(measure());
    host = document.createElement("div");
    host.className = "book";
    stage.append(host);
    stage.classList.toggle("is-spread", layout.spread);

    pageFlip = new window.St.PageFlip(host, {
      width: layout.pageWidth,
      height: layout.pageHeight,
      size: "stretch",
      minWidth: layout.spread ? Math.floor(layout.pageWidth / 2) : Math.ceil(layout.size.width * 0.6),
      maxWidth: layout.pageWidth,
      minHeight: 120,
      maxHeight: layout.pageHeight,
      showCover: true,
      usePortrait: true,
      autoSize: true,
      drawShadow: true,
      maxShadowOpacity: 0.42,
      flippingTime: motion.reduced ? 260 : config.motion.flippingTime,
      startPage,
      startZIndex: 1,
      useMouseEvents: false, // input is handled below
      mobileScrollSupport: false,
      showPageCorners: false,
      // Library input is off, so this flag has no user-facing effect; left true it would also
      // block flipPrev() in portrait (its synthetic point is not on a corner).
      disableFlipByClick: false,
    });

    pageFlip.loadFromHTML(pages.elements);
    current = pageFlip.getCurrentPageIndex();
    pageFlip.on("flip", (event) => {
      current = event.data;
      onChange?.(current);
    });
  }

  function rebuild() {
    if (!pageFlip || destroyed) {
      return;
    }

    const page = pageFlip.getCurrentPageIndex();
    cancelGesture();
    pages.elements.forEach((element) => {
      element.removeAttribute("style");
      stash.append(element);
    });
    pageFlip.destroy();
    build(page);
    onChange?.(current);
  }

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (needsRebuild(layoutFor(measure()))) {
        rebuild();
      }
    }, 180);
  }

  /* ---------- Gesture adapter ---------- */

  const flipController = () => pageFlip.getFlipController();
  const isIdle = () => pageFlip && pageFlip.getState() === "read";

  /** Page-space point -> StPageFlip "global" point (relative to its block element). */
  function toGlobal(rect, direction, x, y) {
    return {
      x: direction === FORWARD ? x + rect.left + rect.width / 2 : rect.width / 2 - x + rect.left,
      y: y + rect.top,
    };
  }

  function onPointerDown(event) {
    if (!pageFlip) {
      return;
    }

    // A second finger during a drag interrupts it: the sheet goes back, nothing turns by accident.
    if (gesture?.phase === "drag" && event.pointerId !== gesture.id) {
      cancelGesture();
      return;
    }

    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0) || !isIdle()) {
      return;
    }

    gesture = { id: event.pointerId, x0: event.clientX, y0: event.clientY, phase: "pending", distance: 0 };
  }

  function beginDrag(direction, event) {
    const render = pageFlip.getRender();
    const rect = render.getRect();
    const portrait = render.getOrientation() === "portrait";
    const block = pageFlip.getUI().getDistElement().getBoundingClientRect();
    const corner = gesture.y0 - block.top - rect.top < rect.height / 2 ? "top" : "bottom";

    Object.assign(gesture, {
      phase: "drag",
      direction,
      flipDirection: direction === "next" ? FORWARD : BACK,
      // In portrait the previous page enters from the left edge of the visible page (the spine).
      startX: portrait && direction === "prev" ? 0 : rect.pageWidth - 1,
      travel: portrait ? rect.pageWidth : rect.pageWidth * 2,
      rect,
      cornerY: corner === "top" ? 1 : rect.height - 1,
    });

    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events in tests have no capturable pointer; dragging still works.
    }

    stage.classList.add("is-dragging");
    gesture.blocked = !canTurn(direction);
    followFinger(event);
  }

  function followFinger(event) {
    if (gesture.blocked) {
      return; // first or last page in this direction: nothing to turn
    }

    const { rect, direction, flipDirection, startX, travel, cornerY } = gesture;
    const distance = direction === "next" ? gesture.x0 - event.clientX : event.clientX - gesture.x0;
    gesture.distance = distance;

    // The sheet tracks the finger 1:1; going back past the start simply lays it flat again.
    const visual = clamp(distance, 0, travel - 2);
    const x = Math.max(startX - visual, -rect.pageWidth + 1);
    const y = clamp(cornerY + (event.clientY - gesture.y0) * 0.35, 1, rect.height - 1);

    flipController().fold(toGlobal(rect, flipDirection, x, y));

    // StPageFlip re-detects the direction from the point on every fold until a turn has started.
    // If the first fold could not start (book boundary), stop here so a long drag can't be
    // re-interpreted as a turn the other way.
    if (!flipController().getCalculation()) {
      gesture.blocked = true;
      // fold() switched the library to "user_fold" before failing to start; put it back,
      // otherwise the book would never be idle again.
      flipController().setState?.("read");
    }
  }

  function canTurn(direction) {
    const index = pageFlip.getCurrentPageIndex();
    return direction === "next" ? index < pageFlip.getPageCount() - 1 : index >= 1;
  }

  function onPointerMove(event) {
    if (!gesture || event.pointerId !== gesture.id) {
      return;
    }

    if (gesture.phase === "pending") {
      const dx = event.clientX - gesture.x0;
      const dy = event.clientY - gesture.y0;

      if (Math.abs(dy) > settings.slop && Math.abs(dy) >= Math.abs(dx)) {
        gesture = null; // vertical intent: not ours
        return;
      }

      if (Math.abs(dx) > settings.slop && Math.abs(dx) > Math.abs(dy) * settings.verticalBias) {
        beginDrag(dx < 0 ? "next" : "prev", event);
      }
      return;
    }

    followFinger(event);
  }

  function release(commitAllowed) {
    const active = gesture;
    gesture = null;
    stage.classList.remove("is-dragging");

    if (!active || active.phase !== "drag") {
      return;
    }

    suppressClicksUntil = performance.now() + 400;
    const calc = flipController().getCalculation();
    const progress = active.distance / active.travel;
    const commit = commitAllowed && progress >= settings.threshold;
    lastGesture = { direction: active.direction, progress, commit, blocked: !calc };

    if (!calc) {
      return; // first/last page: there was nothing to turn
    }

    const rect = active.rect;
    const from = calc.getPosition();
    const y = calc.getCorner() === "bottom" ? rect.height : 0;
    flipController().animateFlippingTo(from, { x: commit ? -rect.pageWidth : rect.pageWidth, y }, commit);
  }

  function cancelGesture() {
    if (gesture?.phase === "drag") {
      release(false);
    }
    gesture = null;
  }

  function onPointerUp(event) {
    if (gesture && event.pointerId === gesture.id) {
      release(true);
    }
  }

  function onPointerCancel(event) {
    if (gesture && event.pointerId === gesture.id) {
      cancelGesture();
    }
  }

  // A drag that ends over a product must not open it.
  function onClickCapture(event) {
    if (performance.now() < suppressClicksUntil) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  /* ---------- Programmatic turns ---------- */

  function next() {
    if (pageFlip && isIdle()) {
      pageFlip.flipNext("bottom");
    }
  }

  function prev() {
    if (pageFlip && isIdle()) {
      pageFlip.flipPrev("bottom");
    }
  }

  function goTo(index) {
    if (!pageFlip) {
      return;
    }
    const target = clamp(index, 0, pageCount - 1);
    if (motion.reduced || !isIdle()) {
      pageFlip.turnToPage(target);
      current = pageFlip.getCurrentPageIndex();
      onChange?.(current);
      return;
    }
    pageFlip.flip(target, "bottom");
  }

  /** Lift the page corner once so people see the page can be turned. */
  function peek() {
    if (!pageFlip || motion.reduced || !isIdle() || current !== 0) {
      return;
    }

    const flip = flipController();
    const render = pageFlip.getRender();
    const rect = render.getRect();
    const from = { x: rect.pageWidth - 1, y: rect.height - 1 };
    flip.fold(toGlobal(rect, FORWARD, from.x, from.y));
    if (!flip.getCalculation()) {
      return;
    }
    const lift = { x: rect.pageWidth * 0.86, y: rect.height - rect.pageWidth * 0.1 };
    flip.animateFlippingTo(from, lift, false, false);
    window.setTimeout(() => {
      const calc = flip.getCalculation();
      if (calc && !gesture) {
        flip.animateFlippingTo(calc.getPosition(), { x: rect.pageWidth, y: rect.height }, false, true);
      }
    }, 650);
  }

  /* ---------- Lifecycle ---------- */

  function onKey(event) {
    if (event.defaultPrevented || event.target.closest?.("input, textarea, [contenteditable]")) {
      return;
    }
    if (event.key === "ArrowRight") {
      next();
    } else if (event.key === "ArrowLeft") {
      prev();
    }
  }

  build(0);
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerCancel);
  stage.addEventListener("lostpointercapture", onPointerCancel);
  stage.addEventListener("click", onClickCapture, true);
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKey);

  return {
    next,
    prev,
    goTo,
    peek,
    get current() {
      return current;
    },
    get count() {
      return pageCount;
    },
    get spread() {
      return layout.spread;
    },
    isIdle,
    destroy() {
      destroyed = true;
      cancelGesture();
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerCancel);
      stage.removeEventListener("lostpointercapture", onPointerCancel);
      stage.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      pageFlip?.destroy();
      pageFlip = null;
    },
    /** Read-only state for the test runner. */
    debug: {
      get state() {
        return pageFlip?.getState();
      },
      get lastGesture() {
        return lastGesture;
      },
      get orientation() {
        return pageFlip?.getOrientation();
      },
      get pageRect() {
        const rect = pageFlip.getRender().getRect();
        const block = pageFlip.getUI().getDistElement().getBoundingClientRect();
        const portrait = pageFlip.getOrientation() === "portrait";
        const left = block.left + rect.left + (portrait ? rect.pageWidth : 0);
        return { left, top: block.top + rect.top, width: portrait ? rect.pageWidth : rect.pageWidth * 2, height: rect.height, pageWidth: rect.pageWidth };
      },
    },
  };
}
