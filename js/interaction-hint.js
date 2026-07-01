/**
 * interaction-hint.js — brass affordance cues for non-obvious gestures.
 *
 * Constitution §10.3 (ESM init()/destroy(), module-scoped, no globals, safe to
 * call with the nodes missing), §9 (a11y — cues are aria-hidden decoration; the
 * real aria-label lives on the interactive element), §8 (reduced motion).
 *
 * Markup contract:
 *   <div class="ix-hint ix-hint--drag" data-ix-hint
 *        data-ix-target="[data-lounge-stage]" aria-hidden="true">
 *     <span class="ix-hint__icon">…svg…</span>
 *     <span class="ix-hint__text">גררו לסיבוב</span>
 *   </div>
 *
 * Attributes:
 *   data-ix-dismiss : "pointerdown" (default, space-separated event list) | "auto"
 *   data-ix-target  : selector whose gesture dismisses the cue (default: closest
 *                     <section>). Ignored when dismiss="auto".
 *   data-ix-delay   : ms before an "auto" cue fades once it scrolls into view
 *                     (default 5000).
 *
 * An "auto" cue starts its fade timer only after it enters the viewport, so a
 * cue far down the page doesn't expire before the visitor reaches it. Under
 * prefers-reduced-motion an "auto" cue stays visible (no timer); CSS freezes
 * the loops.
 */

const records = [];

function dismiss(rec) {
  if (rec.done) return;
  rec.done = true;
  rec.el.setAttribute("data-dismissed", "");
  for (const off of rec.offs) off();
  rec.offs.length = 0;
}

export function init() {
  if (typeof document === "undefined") return;
  const reduce = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  for (const el of document.querySelectorAll("[data-ix-hint]")) {
    const rec = { el, done: false, offs: [] };
    records.push(rec);
    const mode = (el.getAttribute("data-ix-dismiss") || "pointerdown").trim();

    if (mode === "auto") {
      if (reduce) continue;                       // stay visible, static
      const delay = parseInt(el.getAttribute("data-ix-delay") || "5000", 10);
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = window.setTimeout(() => dismiss(rec), delay);
          rec.offs.push(() => window.clearTimeout(id));
          io.disconnect();
        }
      }, { threshold: 0.6 });
      io.observe(el);
      rec.offs.push(() => io.disconnect());
      continue;
    }

    // Gesture mode: dismiss on the first matching event on the target.
    const sel = el.getAttribute("data-ix-target");
    const target = sel ? document.querySelector(sel) : el.closest("section");
    if (!target) continue;
    const onGesture = () => dismiss(rec);
    for (const evt of mode.split(/\s+/)) {
      target.addEventListener(evt, onGesture, { passive: true });
      rec.offs.push(() => target.removeEventListener(evt, onGesture));
    }
  }
}

export function destroy() {
  for (const rec of records) for (const off of rec.offs) off();
  records.length = 0;
}
