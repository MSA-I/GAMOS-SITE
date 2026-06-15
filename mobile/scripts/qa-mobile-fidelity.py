#!/usr/bin/env python3
"""
qa-mobile-fidelity.py — Playwright QA for the 2026-06-11 mobile-fidelity pass.

Verifies mobile now runs the IDENTICAL desktop experiences (not flat fallbacks)
across iPhone 12 / Galaxy S22 / iPhone SE, plus a desktop no-regression pass and
a reduced-motion pass. Server must already be running on :5050.

Run (server managed separately, already up):
    python mobile/scripts/qa-mobile-fidelity.py
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5050"
MOBILE = [("iPhone12", 390, 844), ("GalaxyS22", 360, 780), ("iPhoneSE", 375, 667)]
results = []


def log(tag, ok, detail=""):
    mark = "PASS" if ok else "FAIL"
    results.append((mark, tag, detail))
    print(f"  [{mark}] {tag}{(' — ' + detail) if detail else ''}")


def settle(page):
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)


def test_home(page, label, w, reduced=False):
    print(f"\n=== HOME @ {label} ({w}px){' [reduced-motion]' if reduced else ''} ===")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    settle(page)

    # --- HERO: real 5-layer composition, bitmaps visible (not pills), tap overlays ---
    layers = page.evaluate("""() => {
      const q = s => document.querySelector(s);
      const ev = q('.hero-static__layer--events > img');
      const rs = q('.hero-static__layer--resort > img');
      const cs = el => el ? getComputedStyle(el) : null;
      const evc = cs(ev), rsc = cs(rs);
      return {
        base: !!q('.hero-static__layer--base'),
        gamos: !!q('.hero-static__layer--gamos'),
        eventsImg: ev ? parseFloat(evc.opacity) : -1,
        eventsW: ev ? ev.getBoundingClientRect().width : 0,
        resortImg: rs ? parseFloat(rsc.opacity) : -1,
        desert: !!q('.hero-static__layer--desert'),
        tapEvents: !!q('.hero-static__tap--events'),
        tapResort: !!q('.hero-static__tap--resort'),
        pill: (() => { const l = q('.hero-static__cta-label');
          if (!l) return 'none'; const c = getComputedStyle(l);
          return (c.position === 'absolute' && parseInt(c.width) <= 2) ? 'sr-only' : 'VISIBLE-PILL'; })(),
      };
    }""")
    log(f"hero/5-layers/{label}", layers["base"] and layers["gamos"] and layers["desert"],
        f"base+gamos+desert present")
    log(f"hero/events-bitmap-visible/{label}", layers["eventsImg"] == 1 and layers["eventsW"] > 10,
        f"events img opacity={layers['eventsImg']} w={round(layers['eventsW'])}")
    log(f"hero/resort-bitmap-visible/{label}", layers["resortImg"] == 1,
        f"resort img opacity={layers['resortImg']}")
    log(f"hero/no-pill/{label}", layers["pill"] == "sr-only", f"cta-label={layers['pill']}")
    if w <= 768:
        tap = page.evaluate("""() => {
          const t = document.querySelector('.hero-static__tap--events');
          if (!t) return {ok:false};
          const r = t.getBoundingClientRect(); const c = getComputedStyle(t);
          return {ok:true, w:r.width, h:r.height, href:t.getAttribute('href'),
                  z:c.zIndex, bg:c.backgroundColor};
        }""")
        log(f"hero/tap-overlay-≥48px/{label}", tap.get("ok") and tap["w"] >= 48 and tap["h"] >= 48,
            f"w={round(tap.get('w',0))} h={round(tap.get('h',0))} href={tap.get('href')} z={tap.get('z')}")

    # --- no horizontal overflow anywhere on the page (lounge ring fit etc.) ---
    ov = page.evaluate("() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})")
    log(f"no-h-overflow/{label}", ov["sw"] <= ov["cw"] + 2, f"scrollWidth={ov['sw']} clientWidth={ov['cw']}")

    # --- LOUNGE: real 3D ring (rotateY transform on ring, perspective on stage) ---
    page.evaluate("() => document.querySelector('#lounge')?.scrollIntoView()")
    page.wait_for_timeout(700)
    lounge = page.evaluate("""() => {
      const ring = document.querySelector('[data-lounge-ring]');
      const stage = document.querySelector('[data-lounge-stage]');
      if (!ring || !stage) return {ok:false};
      return {ok:true, ringT: getComputedStyle(ring).transform,
              persp: getComputedStyle(stage).perspective,
              stageT: getComputedStyle(stage).transform};
    }""")
    if reduced:
        # RM → core grid: ring transform should be none (JS short-circuits)
        log(f"lounge/RM-grid/{label}", lounge.get("ok") and lounge["ringT"] in ("none", "matrix(1, 0, 0, 1, 0, 0)"),
            f"ringT={lounge.get('ringT')}")
    else:
        has_rotate = lounge.get("ok") and ("matrix3d" in lounge["ringT"] or "matrix" in lounge["ringT"]) and lounge["ringT"] != "none"
        persp_on = lounge.get("ok") and lounge["persp"] != "none"
        log(f"lounge/3D-ring-live/{label}", has_rotate and persp_on,
            f"ringT={lounge.get('ringT','?')[:28]} persp={lounge.get('persp')}")
        if w <= 768:
            log(f"lounge/stage-scaled/{label}", "matrix" in (lounge.get("stageT") or ""),
                f"stageT={lounge.get('stageT','none')[:28]}")

    # --- CULINARY: mobile manifest active on phones ---
    if w <= 768:
        man = page.evaluate("""() => {
          const c = document.querySelector('.culinary canvas[data-manifest-url]');
          return c ? c.dataset.manifestUrl : 'no-canvas';
        }""")
        log(f"culinary/mobile-manifest/{label}", "culinary-mobile" in (man or ""), f"manifest={man}")

    # --- SHABBAT: layout NOT display:contents (pin survives) ---
    shab = page.evaluate("""() => {
      const lay = document.querySelector('.shabbat__layout');
      const stg = document.querySelector('.shabbat__stage');
      return {layD: lay ? getComputedStyle(lay).display : 'none',
              stgD: stg ? getComputedStyle(stg).display : 'none'};
    }""")
    log(f"shabbat/not-flattened/{label}", shab["layD"] != "contents" and shab["stgD"] != "contents",
        f"layout.display={shab['layD']} stage.display={shab['stgD']}")


def test_press(page, label):
    print(f"\n=== PRESS @ {label} ===")
    page.goto(BASE + "/press/", wait_until="domcontentloaded")
    settle(page)
    pr = page.evaluate("""() => {
      const host = document.querySelector('[data-press-shader]');
      const canvases = host ? host.querySelectorAll('canvas').length : 0;
      const rows = document.querySelectorAll('.press-card, [data-stagger] > *').length;
      return {host: !!host, canvases, rows};
    }""")
    log(f"press/shader-mounts/{label}", pr["host"] and pr["canvases"] >= 1,
        f"host={pr['host']} canvases={pr['canvases']}")
    log(f"press/rows/{label}", pr["rows"] > 0, f"rows={pr['rows']}")


def test_halls(page, label):
    print(f"\n=== HALLS events @ {label} (touch) ===")
    page.goto(BASE + "/halls/dist/events/", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    h = page.evaluate("""() => {
      const c = document.querySelector('canvas');
      return {canvas: !!c, w: c ? c.width : 0, h: c ? c.height : 0,
              err: window.__lastError || null};
    }""")
    log(f"halls/webgl-canvas/{label}", h["canvas"] and h["w"] > 0, f"canvas {h['w']}x{h['h']}")


def test_rooms(page, label):
    print(f"\n=== ROOMS wall @ {label} (touch) ===")
    page.goto(BASE + "/rooms/dist/", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    r = page.evaluate("""() => {
      const c = document.querySelector('canvas');
      return {canvas: !!c, w: c ? c.width : 0};
    }""")
    log(f"rooms/wall-canvas/{label}", r["canvas"] and r["w"] > 0, f"canvas w={r['w']}")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Mobile matrix (touch + coarse pointer)
    for (label, w, hgt) in MOBILE:
        ctx = browser.new_context(viewport={"width": w, "height": hgt},
                                  is_mobile=True, has_touch=True, device_scale_factor=2)
        page = ctx.new_page()
        test_home(page, label, w)
        if label == "iPhone12":
            test_press(page, label)
            test_halls(page, label)
            test_rooms(page, label)
        ctx.close()

    # Desktop no-regression
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    test_home(page, "Desktop1440", 1440)
    ctx.close()

    # Reduced-motion (mobile)
    ctx = browser.new_context(viewport={"width": 390, "height": 844},
                              is_mobile=True, has_touch=True, reduced_motion="reduce")
    page = ctx.new_page()
    test_home(page, "iPhone12-RM", 390, reduced=True)
    ctx.close()

    browser.close()

print("\n" + "=" * 60)
passed = sum(1 for r in results if r[0] == "PASS")
failed = [r for r in results if r[0] == "FAIL"]
print(f"TOTAL: {passed}/{len(results)} passed")
if failed:
    print("\nFAILURES:")
    for _, tag, detail in failed:
        print(f"  FAIL {tag} — {detail}")
else:
    print("ALL CHECKS PASSED")
