# Motion Language

> השפה הוויזואלית של תנועה באתר. כל אנימציה משרתת את הסיפור.
> Cinematic = Choreographed.

---

## עקרונות

1. **Purposeful** — כל תנועה משרתת היררכיה / focus / סיפור. לא דקורציה.
2. **Cinematic pace** — אסור bouncing, אסור spring overshoot על אלמנטים גדולים.
3. **Reduced-motion First** — `prefers-reduced-motion: reduce` תמיד מקבל replacement
   סטטי. אסור פשוט להשבית — צריך final state.
4. **Mobile = restraint** — נייד מקבל פחות תנועה, scrub כבוי, parallax כבוי.

---

## Reveal Patterns

### `.reveal-fade-up`
```
opacity: 0 → 1
transform: translateY(24px) → translateY(0)
duration: var(--dur-deluxe) (600ms)
easing: var(--ease-out-cinema)
trigger: ScrollTrigger start "top 75%"
```

### `.reveal-fade`
```
opacity: 0 → 1
duration: var(--dur-slow) (360ms)
easing: var(--ease-out-cinema)
```

### `.reveal-mask` (כותרות גדולות)
```
clip-path: inset(0 0 100% 0) → inset(0 0 0% 0)
duration: var(--dur-cinema) (1000ms)
easing: var(--ease-out-cinema)
```

### `.reveal-scale`
```
transform: scale(0.94) → scale(1)
opacity: 0 → 1
duration: var(--dur-deluxe)
easing: var(--ease-out-cinema)
```

### Stagger
```
delay-step: 80ms בין children
max children with stagger: 8 (אחרת מרגיש לוטה)
```

---

## Parallax

- **רק בדסקטופ** (`min-width: 768px`) — disable on mobile + reduced-motion.
- **scroll velocity:** 0.2-0.3 max (לא יותר מ-30% מהירות יחסית לscroll).
- **layered:** רקע 0.2x, mid-ground 0.5x, foreground 1.0x (native).
- אסור על טקסט גוף, רק על תמונות / אלמנטים גרפיים.

---

## Scroll Behavior

- **Lenis** desktop only, `lerp: 0.1`, `smoothTouch: false`.
- **Native scroll** במובייל (תמיד).
- **Snap** רק על portals expand-and-transition (לא על גלילה רגילה).

---

## Hero Scrub Specifics

- ראה `video-scrub-spec.md`.
- Fixed pace: scroll → frame mapping ליניארי (אין easing).
- **לא** להריץ reveals במקביל ל-scrub — מבלבל.

---

## Portal Bubbles Animation

- ראה `portal-bubbles-spec.md`.
- Reveal: scale 0 → 1 + opacity 0 → 1, stagger של 120ms בין שתי הבועות.
- Hover: scale 1 → 1.06, brass ring intensifies.
- Click → expand: scale 1 → 6 + clip-path circle משתחרר → fade to hall.

---

## Easing Library (פירוט)

| Token              | curve                              | שימוש |
|--------------------|------------------------------------|---|
| `--ease-out-cinema`| `cubic-bezier(.2, .8, .2, 1)`      | כניסות |
| `--ease-in-cinema` | `cubic-bezier(.7, 0, .84, 0)`      | יציאות |
| `--ease-out-back`  | `cubic-bezier(.34, 1.56, .64, 1)`  | playful entrances (זהירות) |
| `--ease-linear`    | `linear`                           | scroll-bound, video scrub |

---

## Forbidden

- ❌ `ease-in-out` ברירת מחדל — שטוח ולא קולנועי.
- ❌ Bouncing aggressive על hero/halls.
- ❌ Shimmer animations על טקסט גוף — רק על מבטאים גרפיים.
- ❌ Wrap של scroll events (Motion.dev `scroll()` נכשל בעבר — לא לחזור).
