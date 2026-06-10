# Halls Depth Gallery — Full-Fidelity Rebuild (warm-luxury Gamos skin)

**Status:** approved
**Category:** features
**Created:** 2026-06-10
**Author agent:** main (Plan-mode research + 3 Explore + 1 Plan sub-agents)
**Related:** `CLAUDE.md` §2.1 (halls sub-app exception), §4 (RTL+Hebrew+typography), §4.1 (texture-text canon), §5 (palette), §8 (perf budget), §9 (a11y), §13 (mobile). Reference: `github.com/houmahani/codrops-depth-gallery` · `tympanus.net/Tutorials/DepthGallery/` · Codrops article `?p=111409`. Prior creative brief (superseded for these two pages): `PLANS/next-steps/2026-06-09_halls-creative-brief.md`.

> **הוראת ביצוע (`/goal` + `/loop`):** התוכנית עצמאית. סוכן טרי שמקבל רק את הקובץ הזה + ה-repo
> יכול לבצע גל-אחר-גל. סמן צ'קבוקסים תוך כדי. אל תתחיל גל לפני שהגל הקודם (התלוי) הושלם.
> כל הקוד חי **רק** תחת `halls/` (Constitution §2.1) — אסור bleed ל-`/index.html`, `/js/`, `/css/`.

---

## 1. הקשר ומטרה

שני דפי האולמות — `/halls/dist/oasis/` (אולם) ו-`/halls/dist/lumina/` (ריזורט) — כבר עברו
ב-2026-06-09 פורט **מפושט** של Codrops "Atmospheric Depth Gallery". המשתמש רוצה **בנייה מחדש
מאפס, נאמנה ככל האפשר למקור** (ה-repo + הדמו החי), ואז **re-skin "יוקרה חמה של Gamos"** —
כלומר *מכניקה* נאמנה למקור, *מיתוג* של Gamos. זה "adapt, don't copy".

המקור נקרא **במלואו** (כל קובץ ב-`src/Experience/` + שני ה-GLSL + `galleryData.js`). המקור
**עשיר בהרבה** מהפורט הנוכחי. ארבע מערכות חתימה חסרות/סוטות בפורט הנוכחי:

| פיצ'ר במקור | הפורט הנוכחי | פעולה |
|---|---|---|
| **GLSL background** — "blobs" רכים מונפשים בצבעי mood של כל תמונה + film grain + velocity luminance-lift, כסצנת WebGL אורתוגרפית שנייה מאחורי המישורים | `<div>` DOM שטוח עם color-lerp | **לבנות מחדש** כסצנת GLSL |
| **Velocity → motion** — מהירות הגלילה מניעה "breath" (tilt+scale-pulse) + "drift" (Y) למישורים + pointer parallax | velocity נמדד אבל **לא בשימוש** | **להוסיף** (הפיצ'ר שהמשתמש רוצה במפורש) |
| **שובל זוהר + חלקיקי נצנוץ** — צינור Catmull-Rom שמתפתל בעומק על מסלול סינוס מסונכרן לגלילה + ראש 18 חלקיקים | **נעדר לחלוטין** | **להוסיף** (מלא, נאמן) |
| **תווית color-chip עריכתית** — אינדקס + מילה + כרטיס מפרט | כותרת/תת-כותרת React רגילה | **להתאים** למפרט אולם (מיקום/שנה), לשמר קומפוזיציה עריכתית |
| crossfade מישורים ב-**opacity טהור** (MeshBasicMaterial) | הוסיף **desaturation** לאפור (סטייה) | **לחזור** ל-opacity טהור כמו המקור |

הפורט הנוכחי *הוסיף* 3 דברים טובים שהמקור חסר ושנשמרים (Constitution דורש): keyboard nav,
`prefers-reduced-motion`, RAF-pause כשמחוץ למסך.

**החלטות שננעלו עם המשתמש (Q&A בעברית):**
- **תווית:** עריכתי נאמן — אינדקס + כותרת texture-text + כרטיס מפרט, אבל **מיקום+שנה במקום CMYK/PMS**.
- **שובל:** מלא, נאמן למקור (צינור זוהר + חלקיקי נצנוץ).
- **אסתטיקה:** יוקרה חמה של Gamos (שנהב/פליז/קקאו, texture-text עברית, רציף עם האתר).
- **שיפורים:** velocity→atmosphere + טיפוגרפיית מותג + יותר תמונות אמיתיות.
- **קופי:** זמני — נשאר כמו שהוא, המשתמש יספק טקסט מקורי בקרוב.

**שימור scaffold:** ה"בנייה מאפס" = **מנוע החוויה** נכתב מחדש 1:1 מול המקור. ה-scaffold של
React/Vite/build **נשמר** (Constitution מחייב React רק כאן, וזה ה-mount harness הנכון).

---

## 2. תוצאה רצויה (Definition of Done)

- שני הדפים מציגים גלריית עומק נאמנה: גלילה מזיזה מצלמה דרך ~8 תמונות אולם שעושות crossfade.
- **GLSL background** עם blobs בצבעי mood חמים שנושמים ומתעצמים עם מהירות הגלילה.
- **שובל פליז זוהר** מתפתל בעומק עם ראש חלקיקים.
- **תווית עריכתית** (אינדקס `01 / 08` + כותרת texture-text עברית + מיקום/שנה) שמתחלפת ב-midpoint
  של ה-crossfade ונשארת קריאה מעל תמונות בהירות (`data-frame-dark`).
- מעבר אולם + כפתור Home עובדים; RTL תקין; `prefers-reduced-motion` מכבה breath/drift/trail-particles/blob-anim ומקפיא scroll.
- `cd halls && npx tsc --noEmit` ⇒ 0 שגיאות; `npm run build` ⇒ `dist/oasis/index.html` + `dist/lumina/index.html` עם `data-initial-hall` + `dir="rtl"` + prefix `/halls/dist/`.
- `grep -rn "halls/src" js/ css/ index.html` ⇒ 0 (אין bleed).
- דסקטופ ~60fps; mobile + `(pointer:coarse)` ≥30fps עם downscale פעיל; אין צמיחת geometry per-frame ב-Memory timeline.

---

## 3. אילוצים מה-Constitution

- **§2.1** — כל הקוד תחת `halls/` בלבד. React/Vite/Tailwind/Motion/Lucide/Three.js מותרים **רק** כאן. Build → `halls/dist/`. שני entrypoints (`index.html`=oasis, `lumina.html`=lumina) עם `<html data-initial-hall dir="rtl">`. `vite.config.ts` base `/halls/dist/`. ניווט בין דפים דרך `window.location` בלבד. **אסור** מודלי 3D (GLB/GLTF/וכו') — מותר shaders + תמונות 2D בלבד (השובל הוא tube geometry פרוצדורלי, לא מודל — מותר).
- **§4 / §4.1** — RTL Hebrew, logical properties בלבד. טיפוגרפיה מ-texture-text canon: `assets/images/brand/typo-on-{light,dark}.webp` דרך `background-clip:text`.
- **§5** — פלטה: `--brass #CFAE83`, `--brass-deep #8B6F46`, `--cocoa #534133`, `--ivory #F5EFE6`, `--ink-deep #1A1410`, `--accent-rose #B8576F`, `--mist #E8DFD3`. מקס' 5 צבעים פעילים, accent יחיד.
- **§8** — LCP ≤2.5s, 60fps desktop / ≥30fps mobile, `prefers-reduced-motion` מכבה אנימציות גדולות.
- **§9** — focus rings 3px brass, skip-link, alt עברי, ARIA, keyboard reachability.
- **§13** — תיקוני מובייל ייעודיים; אבל פה הכל בתוך `halls/` (sub-app), לא ב-`/mobile/` של האתר הראשי.

---

## 4. רפרנס — המקור (עובדות מוטמעות, כדי שהקובץ יהיה עצמאי)

> קלון זמני שנקרא במלואו היה ב-`$CLAUDE_JOB_DIR/tmp/depth-ref/` — **לא להניח שהוא קיים בריצה עתידית.**
> אם צריך שוב: `git clone --depth 1 https://github.com/houmahani/codrops-depth-gallery`.
> Stack מקור: vanilla JS ESM + Vite + `three@^0.183` + `tweakpane` (debug) + `vite-plugin-glsl`.

**ארכיטקטורה:** singleton `world = new Experience()`; `Engine` מחזיק canvas/renderer/camera/scroll/RAF.

- **`Engine.js`** — `PerspectiveCamera(45°, z=6)`, `WebGLRenderer({antialias, autoClear:false})`, `pixelRatio min(dpr,2)`, SRGB. לולאת RAF: `scroll.update()` → `experience.update(time, camera, scroll)` → `renderer.clear()` → `background.render(renderer)` (סצנה אורתו נפרדת) → `renderer.clearDepth()` → `renderer.render(scene, camera)` → `label.render()` (no-op). Preload כל הטקסטורות ב-`Promise.all` לפני init. Stats + 'D' debug toggle.
- **`Experience (index.js)`** — מחזיק `gallery/label/background/trailController/debug`. `update()`: trailController.update → gallery.update → label.update → מחשב planeBlendData + moodBlendData + depthProgress + velocityIntensity (מיוצב ע"י `smoothstep` על מרחק-blend-מ-center) → background.setMoodBlend + setMotionResponse → background.update. מחליף `body.frame-text-dark` כש-nearest index < 2.
- **`Gallery.js`** — `PlaneGeometry(3,3)`, `MeshBasicMaterial(transparent, depthWrite:false, DoubleSide)`. Layout `position.set(basePos.x * xSpread, basePos.y, -index*planeGap)`, **planeGap=5**. Crossfade **opacity טהור** בין שני מישורים סמוכים (`1-blend` / `blend`), lerp 0.14 — **אין desaturation**. Velocity-driven **breath** (tilt+scale-pulse מ-`|velocity|`), **drift** (Y מ-velocity חתום), **pointer parallax** (pointermove→offset X/Y לכל מישור × opacity×depthInfluence). Mobile: planeScale **0.65**, xSpread **0.25**, breakpoint **768**. parallaxAmountX 0.16 / Y 0.08 / smoothing 0.08; breathTilt 0.045 / breathScale 0.03 / smoothing 0.14 / gain 1.1; gestureParallaxY 0.05.
- **`Scroll.js`** — wheel (`passive:false`, preventDefault) + touch ל-**window**. scrollSmoothing **0.08**, scrollToWorldFactor **0.01**, wheelSpeed 1, touchSpeed 1.8. velocity: `rawVelocity=current-previous`, lerp **0.12**, clamp **±1.5**, **בשימוש מלא**. Bounds: `maxCameraZ=nearestZ+5`, `minCameraZ=deepestZ+5`. DOM velocity visualizer (debug בלבד).
- **`Background/index.js` + GLSL** — `THREE.Scene` נפרדת + `OrthographicCamera(-1,1,1,-1,0,1)` + fullscreen `ShaderMaterial(depthTest:false, depthWrite:false)`. **Fragment:** `uBackgroundColor` שטוח + שני blobs רכים מונפשים (`uBlob1Color`/`uBlob2Color`, centers מונפשים ב-`uTime` sin/cos, radii `uBlobRadius`/`uBlobRadiusSecondary`, מרוככים 35% לכיוון bg) + velocity lift (`color += uVelocityIntensity * 0.10`) + film grain (`random(vUv*vec2(1387.13,947.91)) * uNoiseStrength`). Motion response: depthProgress→blobRadius (+0.08), velocityIntensity→blobStrength (+0.1), שניהם lerp 0.1. setMoodBlend עושה lerp ל-bg/blob1/blob2 בין current+next. ערכי ברירת מחדל מקור: bg `#FBE8CD`, blob1 `#FFD56D`, blob2 `#5D816A`, baseBlobRadius 0.65, secondaryRatio 0.78, baseBlobStrength 0.9, noiseStrength 0.04.
- **`Label.js`** — DOM `<section class="plane-label-overlay">`: בלוק שמאל (אינדקס + מילה + chip צבע) + `<article>` ימין עם שורות CMYK/RGB/HEX/PMS. target plane דרך `getPlaneBlendData` (**blend≥0.5 ? next : current**), opacity fade 0/1.
- **`Trail.js`** — צינור Catmull-Rom (`MeshStandardMaterial`, emissive glow, `depthTest:false`, `renderOrder:1200`, radius ראש 0.012→זנב 0.003 taper `pow(t,1.5)`, radialSegments 8). minDistance 0.006, curveTension ~0.67, `CatmullRomCurve3(points, false, 'centripetal', tension)`.
- **`TrailController.js`** — head position על מסלול סינוס בעומק מסונכרן לגלילה progress. קבועים מקור: startX -0.96, startY -1.05, horizontalWidth 3, horizontalCycles **1.85**, verticalAmplitude 0.78, verticalCycles **2.1**, distanceAhead 1.65, baseDepthOffset 4.78, depthSpan 6.52. maxPoints lerp **14→220** לפי progress; minimumPoints 14; trimPerFrame forward 4 / reverse 32; seed 10 נקודות; טיפול ב-direction-reversal reset + edge-fade opacity (baseOpacity 0.51). Mobile: widthScale 0.35, startXOffset 0.35.
- **`TrailHeadParticles.js`** — pool **18** ספירות emissive (`SphereGeometry(1,5,4)`, `renderOrder:1300`), spawn 20/sec ב-radius 0.52 סביב הראש, drift+fade, חיים 0.25–0.6s, גודל 0.007–0.02, drag 0.94.
- **`data/galleryData.js`** — מערך `{fallbackColor, accentColor, textureSrc, position{x,y}, backgroundColor, blob1Color, blob2Color, label{word,pms,color}}`. ה-`position.x` מתחלף ±0.7..1.0 (zig-zag).

**GLSL fragment (background) — להטמיע 1:1, עם `precision highp float;`:**
```glsl
precision highp float;
varying vec2 vUv;
uniform vec3 uBackgroundColor; uniform vec3 uBlob1Color; uniform vec3 uBlob2Color;
uniform float uNoiseStrength; uniform float uBlobRadius; uniform float uBlobRadiusSecondary;
uniform float uBlobStrength; uniform float uTime; uniform float uVelocityIntensity;
float random(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453123); }
void main(){
  vec3 color = uBackgroundColor;
  float t = uTime * 0.00028;
  vec2 b1 = vec2(0.50+sin(t*1.0)*0.13+sin(t*1.618)*0.05, 0.48+cos(t*0.794)*0.09+cos(t*1.272)*0.03);
  vec2 b2 = vec2(0.35+cos(t*0.927)*0.11+cos(t*1.414)*0.04, 0.55+sin(t*1.175)*0.07+sin(t*0.618)*0.03);
  float blob1 = smoothstep(uBlobRadius, 0.0, distance(vUv,b1));
  float blob2 = smoothstep(uBlobRadiusSecondary, 0.0, distance(vUv,b2));
  vec3 c1 = mix(uBlob1Color, uBackgroundColor, 0.35);
  vec3 c2 = mix(uBlob2Color, uBackgroundColor, 0.35);
  color = mix(color, c1, blob1*uBlobStrength);
  color = mix(color, c2, blob2*uBlobStrength);
  color += uVelocityIntensity * 0.10;
  color += (random(vUv*vec2(1387.13,947.91))-0.5) * uNoiseStrength;
  gl_FragColor = vec4(clamp(color,0.0,1.0), 1.0);
}
```
Vertex (fullscreen): `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`

---

## 5. הפורט הנוכחי (מצב פתיחה) — `halls/src/`

- `depth-gallery/Engine.ts` — render סצנה-בודדת עם clear שקוף מעל div DOM; IntersectionObserver מקפיא RAF; ResizeObserver; pixelRatio 1.75; `setActivePlaneCallback`. **אין** dual-scene, אין Stats/debug. `autoClear` ברירת מחדל (true).
- `depth-gallery/Gallery.ts` — מישורים ב-`z=-i*5`, PLANE_GAP=5; opacity falloff על 7.5 יח' **+ shader desaturation לאפור** (`shaders.ts` — סטייה). **אין** breath/drift/parallax. יש getMoodBlendData.
- `depth-gallery/Scroll.ts` — wheel+touch+**keyboard** (arrows/PgUp/Dn/Home/End) ל-**wrapper** (לא window); lerp 0.08; velocity **נמדד אבל לא בשימוש**; reduced-motion snaps.
- `depth-gallery/Background.ts` — `<div>` DOM עם `background-color` lerp בין mood colors (**לא** GLSL); reduced-motion snaps.
- `depth-gallery/DepthGallery.tsx` — React; per-MOUNT יוצר Engine/Gallery/Scroll/Background (לא singleton), inject ב-setters, `engine.start()`, focus wrapper, cleanup `engine.dispose()`. wrapper `tabIndex=0 role=region id="hall-canvas"`; canvas `fixed inset-0 z-10`.
- `depth-gallery/utils.ts` — `lerp, clamp, hexToRgb, RGB` (helpers משותפים — לשמר).
- `depth-gallery/shaders.ts` — `planeVert/planeFrag` עם `precision mediump float;` (desaturation — **לפרוש**).
- `App.tsx` — `useState(() => getProjectsByHall(initialHall)[0])` lazy; מרנדר `<DepthGallery hallId onActiveChange={setActiveProject}/>` + `<HallChrome hallId activeProject/>`.
- `components/HallChrome.tsx` — skip-link, Home `<a href="/">`, hall switcher (`/halls/dist/${other}/`), תווית title+subtitle אנימטיבית (Motion AnimatePresence, key=`display?.id`), `aria-live="polite"` + `useReducedMotion` + logical props (`inset-inline-*`, `ps-/pe-`). `HALL_LABEL_HE = {oasis:"אולם", lumina:"ריזורט"}`.
- `types.ts` — `Project {id, hallId, number, title, subtitle, label, location, year, image}`; `ExtractedColors {background, blob1, blob2}`; `ProjectWithColors`.
- `projectsData.ts` — 6 oasis + 6 lumina (קופי עברי+אנגלי זמני); `getProjectsByHall` ממפה כל `image`→entry ב-`extractedColors.json`, `FALLBACK_COLORS` = פלטת מותג.
- `scripts/extract-colors.mjs` — node-vibrant + sharp → `src/data/extractedColors.json` keyed by image, עם `{background:DarkMuted, blob1:Muted, blob2:DarkVibrant}`. **כבר מחלץ blob1+blob2** (לא בשימוש כיום ע"י ה-DOM bg!).
- `scripts/post-build.mjs` — מראה `dist/index.html`→`dist/oasis/index.html`, `dist/lumina.html`→`dist/lumina/index.html`.
- `vite.config.ts` — base `/halls/dist/`, dual-entry, react + tailwindcss. **אין** vite-plugin-glsl (נשתמש ב-template strings).
- `index.css` — Tailwind v4 `@theme` עם צבעי מותג + fonts (Heebo/Rubik/Cinzel); `body overflow:hidden`, רקע כהה `#0d0d0d`.
- תמונות: `halls/public/images/projects/oasis-01..10.webp` (10, רק 6 מחווטים) + `lumina-01..06.webp` (6).
- מאסטרים אמיתיים: `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\אולם 3\` (24) + `…\ריזורט 1\` (1000+).
- pipeline אנקודינג ראשי: `scripts/encode-images.mjs` בשורש ה-repo.
- מותג לשימוש חוזר: `css/tokens.css` (הקסים §3) + `css/components/texture-text.css` (background-clip:text דרך `assets/images/brand/typo-on-{light,dark}.webp`).

---

## 6. ארכיטקטורת היעד (מאומתת ע"י Plan agent)

1. **לשקף את חלוקת המודולים של המקור בתוך `halls/src/depth-gallery/` (הכל TS):**
   - **חדש** `Experience.ts` — orchestrator **per-instance (לא singleton!)** — מחזיק gallery/background/trailController + נתוני label; `init/update/dispose`. (singleton ידלוף state בין ניווטי אולם + ישבר ב-StrictMode double-mount.)
   - **שכתוב** `Background.ts` → סצנת GLSL אורתו (מחליף את ה-div). `setMoodBlend` + `setMotionResponse`.
   - **חדש** `backgroundShaders.ts` — vertex+fragment כ-template strings (אותו pattern כמו `shaders.ts` הקיים; **בלי vite-plugin-glsl**). Fragment עם `precision highp float;` (ה-`random()` hash + `uTime` ארוך-טווח עושים banding ב-mediump). `uTime` בשניות, wrap למחזור.
   - **חדש** `Trail.ts` — **BufferGeometry pre-allocated** (capacity = maxPoints×radialSegments); עדכון attributes + `drawRange` כל פריים; **לעולם לא** `new Geometry()` בלולאה (סיכון #1).
   - **חדש** `TrailController.ts` — מסלול סינוס (קבועים מ-§4) + seed/reset/edge-fade.
   - **חדש** `TrailHeadParticles.ts` — pool 18 ספירות.
   - **שכתוב** `Engine.ts` — `autoClear=false`; רצף `clear() → background.render() → clearDepth() → render(scene,camera) → label-update`. **Experience מחזיק את ה-sub-modules**, Engine מחזיק רק `experience`+`renderer` (dispose owner יחיד). לשמר IO-pause + ResizeObserver. מקור ה-active-index לתווית = **blend-aware** (`getPlaneBlendData`, `blend≥0.5?next:current`) ולא nearest-plane.
   - **שכתוב** `Gallery.ts` — `MeshBasicMaterial` opacity crossfade טהור (**למחוק** את ה-desaturation; לפרוש `shaders.ts`). להוסיף breath/drift/pointer-parallax מ-velocity. raw `clientX/Y` — **לא** RTL-negate.
   - **שכתוב** `Scroll.ts` — לצרוך velocity מלא + bounds מקור. **לשמר** keyboard/wrapper-binding/reduced-motion. RTL: ArrowLeft/Right = no-op לציר עומק; PgUp/Dn/Home/End מניעים.
2. **Mount React:** `DepthGallery.tsx` יוצר `Engine` + `Experience` per-instance ב-`useEffect([hallId])`, dispose ב-cleanup. כל אולם הוא document טרי (ניווט `window.location`) → context WebGL טרי כל פעם → אין סיכון context-loss בין אולמות; הסיכון היחיד הוא StrictMode double-mount בתוך document.
3. **תווית — לקפל לתוך `HallChrome.tsx` (React/Motion), לא Label.ts DOM.** HallChrome כבר עושה בדיוק את זה (AnimatePresence + aria-live + reduced-motion + logical props). להרחיב: אינדקס `01 / 08`, כותרת **texture-text** עברית, בלוק מפרט עם **location + year** (מחליף CMYK/PMS). לשמר היסטרזיס blend≥0.5. `frame-text-dark` → flag `data-frame-dark` (nearest index < 2) שמחליף וריאנט texture-text (`typo-on-light` ↔ `typo-on-dark`) לקריאות מעל תמונות בהירות. **למחוק** את התוכנית ל-Label.ts.
4. **Mood/blob colors:** לשמש את `extractedColors.json` כמו שהוא (כבר עם background/blob1/blob2) להזנת uniforms של ה-GLSL bg. להטות `FALLBACK_COLORS` + base לטונים חמים של המותג.
5. **Warm-luxury skin:** base tone = ivory/warm; blobs מטונים חמים של התמונות; trail glow = **brass** (לא `#7fd5ff`/`#f6f9ff` הקרים של המקור); **normal alpha blending, לא additive** (אחרת הפליז מתפוצץ ללבן מעל הרקע הבהיר — סיכון #2); label texture-text.
6. **יותר תמונות:** להרחיב כל אולם 6→~8 מישורים ממאסטרים אמיתיים; entries חדשים מקבלים קופי זמני בקול הקיים.
7. **Mobile/perf:** לשמר IO-pause; downscale ladder (סיכון #5); reduced-motion master switch.

---

## 7. צעדים (גלים — סמן תוך כדי)

> רצף נקבע ע"י תחרות על קבצים משותפים: `Engine.ts`, `Experience.ts`, `Gallery.ts`, `index.css`, `projectsData.ts`, `extractedColors.json`, `DepthGallery.tsx`. אל תקביל שני גלים שנוגעים באותו קובץ.

### גל 0 — נכסים ודאטה (מקבילי, ראשון; לא נוגע בקוד אפליקציה)
- [ ] לבחור ~8 תמונות אמיתיות לכל אולם ממאסטרי `GAMOS-DOCS\…\אולם 3\` + `…\ריזורט 1\` (סינון לפי גיוון ויזואלי; להעדיף תמונה אחת חזקה על שש בינוניות).
- [ ] לאנקד דרך `scripts/encode-images.mjs` → `halls/public/images/projects/{oasis,lumina}-NN.webp`.
- [ ] להריץ `cd halls && node scripts/extract-colors.mjs` → לחדש `src/data/extractedColors.json` עם background/blob1/blob2 לתמונות החדשות.
- [ ] להרחיב `halls/src/projectsData.ts` ל-~8 entries/אולם (קופי זמני בקול הקיים, location/year אמיתיים אם ידועים).

### גל 1 — Engine pipeline + Experience skeleton (סדרתי, נתיב קריטי)
- [ ] לשכתב `Engine.ts`: `autoClear=false` + רצף dual-scene + refactor בעלות ל-`Experience` (Engine מחזיק רק experience+renderer). לשמר IO-pause/ResizeObserver. active-index = blend-aware.
- [ ] ליצור `Experience.ts` (per-instance; init/update/dispose; owner של dispose chain).
- [ ] לשכתב `Background.ts` → סצנת GLSL אורתו + ליצור `backgroundShaders.ts` (fragment עם `precision highp float;`, uTime בשניות+wrap).
- [ ] לעדכן `DepthGallery.tsx` לבנות Engine + Experience per-instance בלבד; dispose ב-cleanup.
- [ ] בדיקת ביניים: `npx tsc --noEmit` נקי; רקע GLSL מצויר עם blobs מונפשים.

### גל 2 — Gallery fidelity (סדרתי על Gallery/Scroll, אחרי גל 1)
- [ ] לשכתב `Gallery.ts`: `MeshBasicMaterial` opacity crossfade טהור; **למחוק** desaturation; להוסיף breath/drift/pointer-parallax מ-velocity (קבועי §4). לפרוש `shaders.ts`.
- [ ] לשכתב `Scroll.ts`: לצרוך velocity מלא + bounds מקור; לשמר keyboard/wrapper/reduced-motion; RTL arrows no-op.
- [ ] בדיקה: מהירות גלילה משנה breath + עוצמת רקע; crossfade חלק בלי הבהוב.

### גל 3 — Trail subsystem (מקבילי עם גל 4, אחרי גל 1)
- [ ] ליצור `Trail.ts` (BufferGeometry pre-allocated, drawRange per-frame, dispose בשרשרת Experience).
- [ ] ליצור `TrailController.ts` (מסלול סינוס §4) + `TrailHeadParticles.ts` (pool 18).
- [ ] לחבר ל-`Experience.update()`.
- [ ] בדיקה: שובל מתפתל בעומק לפי גלילה; Memory timeline — אין צמיחת geometry per-frame.

### גל 4 — Label/chrome (מקבילי עם גל 3, אחרי גל 0+1)
- [ ] להרחיב `HallChrome.tsx`: קומפוזיציה עריכתית (אינדקס `01 / 08` + כותרת texture-text + location/year), היסטרזיס blend≥0.5, `data-frame-dark` מחליף וריאנט texture-text.
- [ ] להוסיף classes/vars של texture-text ל-`index.css`.
- [ ] בדיקה: התווית מתחלפת ב-midpoint; קריאה מעל תמונות בהירות וכהות.

### גל 5 — Warm-luxury skin (אחרי 1–4)
- [ ] base רקע ivory/warm; צבעי blob מוטים חם; trail glow = brass + **normal blending**; וריאנטי texture-text לתווית; להטות `FALLBACK_COLORS`.
- [ ] בדיקה ויזואלית: הפליז לא מתפוצץ ללבן; תחושת יוקרה חמה רציפה עם האתר.

### גל 6 — Mobile/perf + reduced-motion (אחרון)
- [ ] downscale ladder: `radialSegments 8→4`, `maxPoints 220→~80`, לכבות head-particles ב-`(pointer:coarse)`, אחרון — לכבות שובל; `MeshBasicMaterial` לשובל במובייל; pixelRatio desktop ≤2 / mobile ≤1.5.
- [ ] reduced-motion master switch: לכבות breath/drift/trail-particles/blob-anim; להקפיא scroll+crossfade.
- [ ] profiling מול §8: ~60fps desktop, ≥30fps mobile.

---

## 8. סיכוני עיצוב / רגרסיות (מדורגים, עם מיטיגציה)

1. **Trail geometry per-frame → דליפת GPU / GC jank.** *מיטיגציה:* BufferGeometry יחיד pre-allocated, עדכון attributes + drawRange; dispose ב-`Experience.dispose()`.
2. **Trail/blobs פליז מתפוצצים ללבן מעל ivory.** *מיטיגציה:* normal (לא additive) blending; להחליש blob-mix + את ה-`uVelocityIntensity*0.10` ל-base בהיר; לאמת על מכשיר.
3. **Dual-scene + StrictMode dispose ordering.** *מיטיגציה:* dispose owner יחיד (Experience מחזיק sub-modules, Engine מחזיק experience+renderer); guard `disposed` אידמפוטנטי; לשחרר GPU resources במודולים לפני `renderer.dispose()`; לבדוק double-mount ב-dev.
4. **GLSL precision/uTime banding במובייל.** *מיטיגציה:* `precision highp float;` ל-bg fragment; uTime בשניות + wrap למחזור.
5. **Mobile ≥30fps עם שובל + blobs + 8 מישורים.** *מיטיגציה:* downscale ladder (גל 6); MeshBasicMaterial לשובל; IO-pause; pixelRatio cap.
6. **תווית מתחלפת ברגע שגוי.** *מיטיגציה:* active-index מ-`getPlaneBlendData` (blend≥0.5), לא nearest-plane.
7. **`frame-text-dark` נשמט → תווית לא קריאה מעל תמונות בהירות.** *מיטיגציה:* `data-frame-dark` מחליף וריאנט texture-text (חשוב יותר בעור ivory מאשר במקור הכהה).

---

## 9. אישור משתמש נדרש?

- **לא** — הכיוון, האסתטיקה, התווית והשובל אושרו ב-Q&A (2026-06-10). הקופי זמני באישור.
- **כן, נקודתית** — כשהמשתמש יספק את הטקסט המקורי לאולמות (יחליף את הקופי הזמני ב-`projectsData.ts`).
- בחירת ~8 התמונות הסופיות לכל אולם — אם יש ספק על תמונה ספציפית, להציג למשתמש לפני נעילה (§7 גל 0).

---

## 10. אימות (End-to-End)

- **Build:** `cd halls && npx tsc --noEmit` (0 שגיאות) → `npm run build` → לאמת `dist/oasis/index.html` + `dist/lumina/index.html` עם `data-initial-hall` + `dir="rtl"` + prefix `/halls/dist/`; `post-build.mjs` רץ (HTMLs ממורארים).
- **Serve & visual:** משורש ה-repo `npx serve`, לפתוח `/halls/dist/oasis/` + `/halls/dist/lumina/`. לאמת: גלילה מזיזה מצלמה דרך ~8 תמונות שעושות crossfade; blobs GLSL בצבעי mood חמים נושמים+מתעצמים עם מהירות; שובל פליז זוהר עם ראש חלקיקים; תווית עריכתית (אינדקס + כותרת texture-text עברית + מיקום/שנה) מתחלפת ב-midpoint וקריאה מעל תמונות בהירות; hall-switch + Home עובדים.
- **No-bleed:** `grep -rn "halls/src" js/ css/ index.html` ⇒ 0.
- **A11y/RTL:** Tab → skip-link → focus גלריה; PgDn/Up/Home/End מניעים עומק; ArrowLeft/Right no-op; `prefers-reduced-motion: reduce` מכבה breath/drift/trail-particles/blob-anim ומקפיא scroll.
- **Perf:** DevTools Performance — desktop ~60fps; throttle mobile + `(pointer:coarse)` ≥30fps עם downscale; Memory timeline — אין צמיחת geometry per-frame.
- **Leak/StrictMode:** ב-`npm run dev` (StrictMode), mount/unmount ⇒ אין אזהרת WebGL context, אין צמיחת geometry/texture count.

---

## 11. עדכון Constitution אחרי השלמה

בסיום, להוסיף שורת Maintenance Log ל-`CLAUDE.md` §12 המתעדת את הבנייה מחדש (קבצים חדשים/משונים תחת
`halls/src/depth-gallery/`, ה-GLSL background, מערכת השובל, התווית העריכתית, ועור היוקרה החמה).
לשקול הוספת §2.1 הבהרה ש-tube-geometry פרוצדורלי (השובל) מותר (לא מודל 3D).
