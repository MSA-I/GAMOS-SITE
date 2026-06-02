/**
 * rooms-gallery.js — Hover/focus-swap room gallery for #rooms (חדרי אירוח).
 *
 * Interaction (vanilla port of a React "name list → shared image stage" pattern):
 *   A vertical list of room NAMES (right side in RTL) controls a single shared
 *   image stage. Hovering, focusing, tapping, or keyboard-navigating a name sets
 *   the active index; the matching panel image is revealed (CSS clip-path wipe),
 *   all others clipped/hidden. One image visible at a time.
 *
 * Markup contract (authored in index.html, see report):
 *   <section id="rooms" data-rooms-stage>
 *     <div class="rooms__list" role="tablist">
 *       <button class="rooms__trigger" data-rooms-trigger data-rooms-index="0"
 *               role="tab" aria-controls="rooms-panel-0">…</button>
 *       …
 *     </div>
 *     <div class="rooms__stage">
 *       <figure class="rooms__panel" data-rooms-panel data-rooms-index="0"
 *               id="rooms-panel-0" role="tabpanel"> <picture>…</picture> </figure>
 *       …
 *     </div>
 *   </section>
 *
 * Behavior:
 *   - mouseenter / focus / click on a [data-rooms-trigger] → activate its index.
 *   - Keyboard ArrowUp = previous, ArrowDown = next (vertical list, RTL-neutral),
 *     Home/End jump to first/last. All wrap around. Movement also moves DOM focus.
 *   - Active trigger gets .is-active + aria-selected="true"; active panel gets
 *     .is-active (the clip-path animation lives in CSS). aria-current="true" on
 *     the active trigger as a redundant hook.
 *   - Default active index = 0.
 *
 * Constitution refs: §3 (hall sections), §4 (RTL), §8/§9 (reduced motion is a
 * CSS concern here; keyboard + ARIA), §10.3 (ESM init/destroy, idempotent, no
 * globals).
 */

const instances = new WeakMap();

function createRoomsInstance(root) {
  const triggers = Array.from(root.querySelectorAll("[data-rooms-trigger]"));
  const panels = Array.from(root.querySelectorAll("[data-rooms-panel]"));

  if (triggers.length === 0 || panels.length === 0) {
    return { destroy: () => {} };
  }

  // Index a panel by its data-rooms-index for robust pairing (order-independent).
  const panelByIndex = new Map();
  panels.forEach((panel) => {
    const idx = parseInt(panel.getAttribute("data-rooms-index") || "-1", 10);
    if (idx >= 0) panelByIndex.set(idx, panel);
  });

  let activeIndex = -1;
  const listeners = [];

  function on(el, type, handler, opts) {
    el.addEventListener(type, handler, opts);
    listeners.push(() => el.removeEventListener(type, handler, opts));
  }

  function indexOfTrigger(trigger) {
    return parseInt(trigger.getAttribute("data-rooms-index") || "-1", 10);
  }

  function setActive(index, { moveFocus = false } = {}) {
    if (index === activeIndex) {
      if (moveFocus) focusTrigger(index);
      return;
    }
    activeIndex = index;

    triggers.forEach((trigger) => {
      const isActive = indexOfTrigger(trigger) === index;
      trigger.classList.toggle("is-active", isActive);
      trigger.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        trigger.setAttribute("aria-current", "true");
      } else {
        trigger.removeAttribute("aria-current");
      }
      // Roving tabindex: only the active name is in the Tab order.
      trigger.tabIndex = isActive ? 0 : -1;
    });

    panelByIndex.forEach((panel, panelIndex) => {
      const isActive = panelIndex === index;
      panel.classList.toggle("is-active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    if (moveFocus) focusTrigger(index);
  }

  function focusTrigger(index) {
    const trigger = triggers.find((t) => indexOfTrigger(t) === index);
    if (trigger) trigger.focus();
  }

  function step(currentIndex, delta) {
    const count = triggers.length;
    // Wrap-around. triggers are in DOM order, indices may not be 0..n-1 sorted,
    // so navigate by position in the triggers array, not by numeric index.
    const positions = triggers.map(indexOfTrigger);
    const currentPos = positions.indexOf(currentIndex);
    const nextPos = (currentPos + delta + count) % count;
    return positions[nextPos];
  }

  function onTriggerActivate(event) {
    const index = indexOfTrigger(event.currentTarget);
    if (index >= 0) setActive(index);
  }

  function onTriggerClick(event) {
    const index = indexOfTrigger(event.currentTarget);
    if (index >= 0) {
      event.preventDefault();
      setActive(index, { moveFocus: true });
    }
  }

  function onKeyDown(event) {
    let handled = false;
    if (event.key === "ArrowDown") {
      setActive(step(activeIndex, 1), { moveFocus: true });
      handled = true;
    } else if (event.key === "ArrowUp") {
      setActive(step(activeIndex, -1), { moveFocus: true });
      handled = true;
    } else if (event.key === "Home") {
      setActive(indexOfTrigger(triggers[0]), { moveFocus: true });
      handled = true;
    } else if (event.key === "End") {
      setActive(indexOfTrigger(triggers[triggers.length - 1]), { moveFocus: true });
      handled = true;
    }
    if (handled) event.preventDefault();
  }

  // Wire each trigger.
  triggers.forEach((trigger) => {
    on(trigger, "mouseenter", onTriggerActivate);
    on(trigger, "focus", onTriggerActivate);
    on(trigger, "click", onTriggerClick);
  });
  on(root, "keydown", onKeyDown);

  // Default active = the trigger at numeric index 0 if present, else first DOM trigger.
  const defaultIndex = panelByIndex.has(0) ? 0 : indexOfTrigger(triggers[0]);
  setActive(defaultIndex);

  function destroy() {
    listeners.forEach((off) => off());
    listeners.length = 0;
    triggers.forEach((trigger) => {
      trigger.classList.remove("is-active");
      trigger.removeAttribute("aria-selected");
      trigger.removeAttribute("aria-current");
      trigger.removeAttribute("tabindex");
    });
    panelByIndex.forEach((panel) => {
      panel.classList.remove("is-active");
      panel.removeAttribute("aria-hidden");
    });
  }

  return { destroy, setActive };
}

/**
 * Resolve the gallery root. Prefer [data-rooms-stage]; fall back to #rooms.
 */
function resolveRoot() {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector("[data-rooms-stage]") ||
    document.getElementById("rooms")
  );
}

export function init() {
  const root = resolveRoot();
  if (!root) return () => {};            // no-op when section absent
  if (instances.has(root)) return () => {}; // idempotent

  const instance = createRoomsInstance(root);
  instances.set(root, instance);

  return function destroyThis() {
    instance.destroy();
    instances.delete(root);
  };
}

export function destroy() {
  const root = resolveRoot();
  if (!root) return;
  const instance = instances.get(root);
  if (instance) {
    instance.destroy();
    instances.delete(root);
  }
}

export default { init, destroy };
