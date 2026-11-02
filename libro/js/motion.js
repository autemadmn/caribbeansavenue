// MotionController · one place that decides whether and how things move.
// - Knows reduced-motion and the configured intensity.
// - Owns the GSAP instance (if it failed to load, everything still works, just without motion).
// - Keeps one timeline per "channel" so two animations never fight over the same element.

export const EASE_OUT = "power3.out"; // matches --ed-ease-out
export const EASE_IN = "power2.in"; // matches --ed-ease-in; also our gravity curve

export const DURATION = {
  micro: 0.16,
  text: 0.36,
  open: 0.42,
  close: 0.32,
};

export function createMotion(config) {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const channels = new Map();

  const motion = {
    get gsap() {
      return window.gsap || null;
    },

    /** true when designed motion should run */
    get enabled() {
      return Boolean(window.gsap) && !reducedQuery.matches && config.motion.intensity > 0;
    },

    get reduced() {
      return reducedQuery.matches || config.motion.intensity <= 0;
    },

    /**
     * Run a timeline on a named channel. Starting a new one on the same channel
     * jumps the previous one to its end first, so nothing is left half-way.
     */
    timeline(channel, vars = {}) {
      motion.finish(channel);

      if (!motion.enabled) {
        return null;
      }

      const timeline = window.gsap.timeline({
        ...vars,
        onComplete: () => {
          if (channels.get(channel) === timeline) {
            channels.delete(channel);
          }
          vars.onComplete?.();
        },
      });
      channels.set(channel, timeline);
      return timeline;
    },

    finish(channel) {
      const running = channels.get(channel);

      if (running) {
        channels.delete(channel);
        running.progress(1).kill();
      }
    },

    kill(channel) {
      const running = channels.get(channel);

      if (running) {
        channels.delete(channel);
        running.kill();
      }
    },

    isRunning(channel) {
      return channels.has(channel);
    },

    /** the timeline currently owning a channel, or null */
    current(channel) {
      return channels.get(channel) || null;
    },

    onReducedChange(callback) {
      reducedQuery.addEventListener?.("change", callback);
    },
  };

  return motion;
}
