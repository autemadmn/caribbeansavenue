// Caribbean's Avenue · brand intro.
//
//   assembling ──(assembled + menu ready)──▶ opening ──▶ done
//        │                                      ▲
//        └─(>1.7 s)─▶ waiting ──(ready)──────────┘
//        └─(7 s, menu never ready)──▶ failed (link to the classic menu)
//
// - The logo draws itself with CSS (inline styles in index.html) from the first paint, while the
//   menu's scripts, data, fonts and cover photo load in parallel. No artificial delay: the opening
//   starts as soon as both the drawing has finished and the menu says it is ready.
// - Opening: the counter of the C becomes the aperture into the book while the logo flies to
//   its exact place on the cover. At landing the intro is removed and the cover logo, hidden
//   until then, is in the same spot, so it reads as one continuous object.
// - Real-time clock (requestAnimationFrame + performance.now): on a busy phone the opening
//   finishes on time instead of stretching, and it doesn't depend on GSAP having loaded.
// - Once per session. Reduced motion: a still logo that fades.
(() => {
  const html = document.documentElement;
  const root = document.getElementById("intro");
  const api = { active: false, state: "off", ready() {}, done: Promise.resolve() };
  window.EdIntro = api;

  if (!root) {
    return;
  }
  if (!html.classList.contains("intro-active")) {
    root.remove();
    return;
  }

  const SAFETY_MS = 7000;
  const WAIT_HINT_MS = 1700;
  const OPEN_MS = 600;
  const C_CENTER = { x: 138.7 / 1042, y: 139 / 278 }; // centre of the C's counter, in logo units

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const logo = root.querySelector("#introLogo");
  const veil = root.querySelector(".intro-veil");
  const rim = root.querySelector(".intro-rim circle");
  const status = root.querySelector("#introStatus");
  const english = (() => {
    const query = new URLSearchParams(location.search).get("lang");
    let saved = null;
    try {
      saved = localStorage.getItem("ed-locale");
    } catch {
      // ignore
    }
    return (query || saved) === "en";
  })();
  const text = english
    ? { wait: "Preparing the menu…", fail: "This version couldn't load.", link: "Open the classic menu" }
    : { wait: "Preparando la carta…", fail: "No hemos podido cargar esta versión.", link: "Abrir la carta clásica" };

  api.active = true;
  api.state = "assembling";

  let markReady;
  const ready = new Promise((resolve) => {
    markReady = resolve;
  });
  api.ready = () => markReady();

  const assembled = new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };
    if (reduced) {
      setTimeout(finish, 300);
      return;
    }
    root.querySelector(".intro-accent")?.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 900); // in case animations don't run (old browser, background tab)
  });

  const waitHint = setTimeout(() => {
    if (api.state === "assembling") {
      api.state = "waiting";
      status.textContent = text.wait;
      root.classList.add("is-waiting");
    }
  }, WAIT_HINT_MS);

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // power3.inOut
  const easeIn = (t) => t * t; // power2.in: the aperture pulls you in
  const lerp = (a, b, t) => a + (b - a) * t;

  function finish() {
    html.classList.remove("intro-active");
    html.classList.add("intro-done");
    root.remove();
    try {
      sessionStorage.setItem("ed-intro-seen", "1");
    } catch {
      // private mode: it may play again next time, harmless
    }
    api.state = "done";
  }

  function fail() {
    api.state = "failed";
    status.replaceChildren(document.createTextNode(`${text.fail} `));
    const link = document.createElement("a");
    link.href = "../clasica.html";
    link.textContent = text.link;
    status.append(link);
    root.classList.add("is-waiting");
    link.focus({ preventScroll: true });
  }

  /** Measures once, then paints any instant p ∈ [0, 1] of the opening. */
  function prepareOpening() {
    const from = logo.getBoundingClientRect();
    const target = document.querySelector(".cover-logo")?.getBoundingClientRect();
    const lands = Boolean(target && target.width > 0 && target.bottom > 0 && target.top < window.innerHeight);
    const scale = lands ? target.width / from.width : 1.06;
    const dx = lands ? target.left - from.left : -from.width * 0.03;
    const dy = lands ? target.top - from.top : 0;
    const start = { x: from.left + from.width * C_CENTER.x, y: from.top + from.height * C_CENTER.y };
    const end = { x: from.left + dx + from.width * C_CENTER.x * scale, y: from.top + dy + from.height * C_CENTER.y * scale };
    const reach = Math.hypot(Math.max(end.x, window.innerWidth - end.x), Math.max(end.y, window.innerHeight - end.y)) + 24;

    logo.style.transformOrigin = "0 0";
    logo.style.willChange = "transform";
    root.classList.add("is-opening");

    return (p) => {
      const move = easeInOut(p);
      const aperture = easeIn(p);
      logo.style.transform = `translate(${dx * move}px, ${dy * move}px) scale(${lerp(1, scale, move)})`;
      if (!lands) {
        logo.style.opacity = String(1 - Math.max(0, (p - 0.4) / 0.6));
      }
      veil.style.setProperty("--hx", `${lerp(start.x, end.x, move)}px`);
      veil.style.setProperty("--hy", `${lerp(start.y, end.y, move)}px`);
      veil.style.setProperty("--hr", `${aperture * reach}px`);
      if (rim) {
        rim.setAttribute("cx", lerp(start.x, end.x, move).toFixed(1));
        rim.setAttribute("cy", lerp(start.y, end.y, move).toFixed(1));
        rim.setAttribute("r", Math.max(0, aperture * reach - 0.5).toFixed(1));
        // light rises with the opening and is gone before the door is fully open
        rim.style.opacity = String(Math.min(1, p / 0.15) * Math.max(0, 1 - p / 0.85) * 0.75);
      }
    };
  }

  function open() {
    api.state = "opening";
    root.classList.remove("is-waiting");
    status.textContent = "";

    return new Promise((resolve) => {
      const done = () => {
        finish();
        resolve();
      };

      if (reduced) {
        root.style.transition = "opacity 300ms ease";
        root.style.opacity = "0";
        setTimeout(done, 320);
        return;
      }

      const render = prepareOpening();
      const t0 = performance.now();
      const frame = (now) => {
        const p = Math.min(1, (now - t0) / OPEN_MS);
        render(p);
        if (p < 1) {
          requestAnimationFrame(frame);
        } else {
          done();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  api.done = new Promise((resolve) => {
    let settled = false;
    const go = (ok) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(waitHint);
      if (ok) {
        open().then(resolve);
      } else {
        fail();
        resolve();
      }
    };
    if (/[?&]intro=debug(&|$)/.test(location.search)) {
      // design review only: hold the intro and paint chosen instants with EdIntro.preview(p)
      let render = null;
      api.preview = (p) => (render ||= prepareOpening())(p);
      clearTimeout(waitHint);
      // &at=<ms> freezes the drawing; &open=<0..1> paints that instant of the opening (needs the cover)
      const query = new URLSearchParams(location.search);
      const at = Number(query.get("at"));
      const openAt = query.get("open");
      if (query.has("at")) {
        document.getAnimations().forEach((animation) => {
          animation.pause();
          animation.currentTime = at;
        });
      }
      if (openAt !== null) {
        ready.then(() => api.preview(Number(openAt)));
      }
      return;
    }
    Promise.all([ready, assembled]).then(() => go(true));
    setTimeout(() => go(html.dataset.ready === "true"), SAFETY_MS);
  });
})();
