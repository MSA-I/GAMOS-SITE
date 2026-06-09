# Portal Bubbles Specification

> שתי בועות-פורטל בסוף ה-hero. רפרנס ויזואלי:
> `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\ריזורט 1\1.5.mp4`
> *(הועבר 2026-06-09 מ-GAMOS-SITE — ראה Constitution §7)*

---

## Concept

ב-progress ≈ 0.92 של ה-hero, שתי בועות עגולות מתגלות בצדדים, כל אחת עם
לולאת וידאו בתוכה. הן מובילות לסקציות `#hall-venue` (אולם) ו-`#hall-resort` (ריזורט).

---

## DOM Structure

```html
<aside class="portals" aria-label="קיצורים לאולם וריזורט">
  <button class="portal portal--venue"
          data-target="#hall-venue"
          aria-label="עבור לאולם האירועים">
    <video class="portal__video" autoplay loop muted playsinline
           src="/assets/video/portal-loop.mp4"></video>
    <span class="portal__ring" aria-hidden="true"></span>
    <span class="portal__label">אולם</span>
  </button>

  <button class="portal portal--resort"
          data-target="#hall-resort"
          aria-label="עבור לריזורט וחדרי האירוח">
    <video class="portal__video" autoplay loop muted playsinline
           src="/assets/video/portal-loop.mp4"></video>
    <span class="portal__ring" aria-hidden="true"></span>
    <span class="portal__label">ריזורט</span>
  </button>
</aside>
```

---

## CSS Spec

```css
.portals {
  position: fixed;
  bottom: var(--space-12);
  inset-inline: 0;
  display: flex;
  justify-content: center;
  gap: var(--space-12);
  z-index: var(--z-overlay);
  pointer-events: none;
}

.portal {
  --size: 280px;
  --ring-thickness: 3px;
  pointer-events: auto;
  position: relative;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  overflow: hidden;
  background: transparent;
  border: 0;
  cursor: pointer;
  transform: scale(0);
  opacity: 0;
  transition: transform var(--dur-base) var(--ease-out-cinema);
}

.portal__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  clip-path: circle(50%);
}

.portal__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: var(--ring-thickness) solid var(--brass);
  box-shadow: 0 0 0 0 var(--brass-glow);
  transition: box-shadow var(--dur-base) var(--ease-out-cinema);
}

.portal__label {
  position: absolute;
  inset-block-end: var(--space-4);
  inset-inline: 0;
  text-align: center;
  font-family: var(--font-display-he);
  font-size: var(--text-xl);
  color: var(--ivory);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}

.portal:hover {
  transform: scale(1.06);
}
.portal:hover .portal__ring {
  box-shadow: 0 0 24px 4px var(--brass-glow);
}
.portal:focus-visible {
  outline: none;
}
.portal:focus-visible .portal__ring {
  border-width: 5px;
}

/* כשנכנס למצב active מ-JS */
.portals.is-active .portal {
  opacity: 1;
  transform: scale(1);
}
.portals.is-active .portal--resort {
  transition-delay: 120ms;
}
```

---

## JS Spec

### Reveal trigger

```js
window.gamosHero.onProgress((p) => {
  if (p > 0.92) document.querySelector(".portals").classList.add("is-active");
  else          document.querySelector(".portals").classList.remove("is-active");
});

// reduced motion: reveal immediately
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelector(".portals").classList.add("is-active");
}
```

### Click → expand timeline (GSAP)

```js
function expandPortal(button) {
  const target = button.dataset.target;
  const tl = gsap.timeline({
    onComplete() {
      document.querySelector(target).scrollIntoView({ behavior: "smooth" });
      // אופציונלי: reset אחרי הגעה
    }
  });

  tl.to(button, {
    scale: 6,
    duration: 1,
    ease: "power3.in"
  });

  tl.to(".portals", {
    opacity: 0,
    duration: 0.3
  }, "-=0.2");

  tl.to(target, {
    opacity: 1,
    duration: 0.5
  }, "-=0.4");
}

document.querySelectorAll(".portal").forEach(b =>
  b.addEventListener("click", () => expandPortal(b))
);
```

### Keyboard support

- `Tab` נכנס לבועה → ring מתחזק (focus-visible).
- `Enter` / `Space` מפעיל את `expandPortal`.

---

## Mobile Variant

- בועות מקבלות `--size: 180px` ב-`max-width: 768px`.
- מסודרות vertical-stacked עם margin בין השתיים.
- ה-reveal מבוסס על `IntersectionObserver` של תחילת סקציה אחרי ה-hero (כי ב-iOS אין scrub).

---

## Done Criteria (Agent 7 deliverable)

1. `js/portals.js` — exports `init({ onHeroProgress, fallbackTrigger })`.
2. `css/sections/portals.css` — full spec implementation.
3. שתי בועות מופיעות אחרי `--hero-progress >= 0.92`.
4. Hover + focus-visible + click + keyboard all working.
5. expand timeline GSAP חלק עם `power3.in` (cinematic).
6. נגישות AA: `<button>` + `aria-label` + Tab reachable + Enter/Space פעיל.
7. Reduced-motion: reveal מיידי, expand מוחלף ב-jump scroll.
