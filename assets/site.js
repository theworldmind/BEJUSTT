/* Bejustt — interactions
   Sounds are generated with Web Audio (no files), Apple clock-wheel style. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const t = (k) => { const L = document.documentElement.lang; return (window.BJ_I18N?.[L] || {})[k] ?? window.BJ_I18N?.en?.[k] ?? ""; };

  /* ---------- Sound engine ---------- */
  let AC = null, NOISE = null, acted = false, lastTick = 0, tickN = 0;
  const soundOn = () => store.get("bj-snd") !== "0";
  ["pointerdown", "keydown", "touchstart", "wheel"].forEach((n) =>
    addEventListener(n, () => { acted = true; }, { once: true, passive: true, capture: true }));
  const ctx = () => {
    AC ||= new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume?.().catch?.(() => {});
    return AC;
  };
  const haptic = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
  const noise = (A) => {
    if (NOISE) return NOISE;
    const n = Math.round(A.sampleRate * 0.004);
    NOISE = A.createBuffer(1, n, A.sampleRate);
    const d = NOISE.getChannelData(0);
    for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 4);
    return NOISE;
  };
  function blip({ f = 2200, f2 = 0, body = 0, vol = 0.1, dur = 0.014, nz = 0.5, hp = 2500 } = {}) {
    if (!soundOn() || !acted) return;
    try {
      const A = ctx(), tt = A.currentTime, out = A.createGain();
      out.gain.value = vol; out.connect(A.destination);
      if (nz) {
        const s = A.createBufferSource(), h = A.createBiquadFilter(), g = A.createGain();
        s.buffer = noise(A); h.type = "highpass"; h.frequency.value = hp; g.gain.value = nz;
        s.connect(h).connect(g).connect(out); s.start(tt);
      }
      const o = A.createOscillator(), g = A.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f2 || f * 0.82, tt + dur);
      g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(1, tt + 0.0008); g.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
      o.connect(g).connect(out); o.start(tt); o.stop(tt + dur + 0.01);
      if (body) {
        const b = A.createOscillator(), bg = A.createGain();
        b.type = "triangle"; b.frequency.setValueAtTime(body, tt);
        bg.gain.setValueAtTime(0.0001, tt); bg.gain.linearRampToValueAtTime(0.55, tt + 0.0006); bg.gain.exponentialRampToValueAtTime(0.0001, tt + dur * 0.7);
        b.connect(bg).connect(out); b.start(tt); b.stop(tt + dur);
      }
    } catch {}
  }
  // Picker tick: a soft, short wooden "tk" — felt more than heard, like the iOS date picker
  function tick(speed = 0) {
    const now = performance.now();
    if (now - lastTick < 28) return;
    lastTick = now; haptic(2);
    if (!soundOn() || !acted) return;
    try {
      const A = ctx(), tt = A.currentTime, out = A.createGain(), j = 1 + ((tickN++ % 4) - 1.5) * 0.006;
      out.gain.value = 0.085 * (1 - speed * 0.45); out.connect(A.destination);
      const ns = A.createBufferSource(), bp = A.createBiquadFilter(), lp = A.createBiquadFilter(), ng = A.createGain();
      ns.buffer = noise(A); bp.type = "bandpass"; bp.frequency.value = 2600 * j; bp.Q.value = 1.6; lp.type = "lowpass"; lp.frequency.value = 5200;
      ng.gain.setValueAtTime(0.0001, tt); ng.gain.linearRampToValueAtTime(0.7, tt + 0.0004); ng.gain.exponentialRampToValueAtTime(0.0001, tt + 0.006);
      ns.connect(bp).connect(lp).connect(ng).connect(out); ns.start(tt); ns.stop(tt + 0.01);
      const o = A.createOscillator(), g = A.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(1150 * j, tt); o.frequency.exponentialRampToValueAtTime(980 * j, tt + 0.012);
      g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.32, tt + 0.0006); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.014);
      o.connect(g).connect(out); o.start(tt); o.stop(tt + 0.02);
    } catch {}
  }
  const snd = {
    tap() { blip({ f: 1900, f2: 1500, body: 760, vol: 0.045, dur: 0.011, nz: 0.45, hp: 2400 }); haptic(2); },
    sel() { blip({ f: 2500, f2: 2100, body: 0, vol: 0.06, dur: 0.01, nz: 0.4, hp: 3500 }); haptic(4); },
    on() { blip({ f: 1650, f2: 1500, body: 820, vol: 0.09, dur: 0.022, nz: 0.35, hp: 2200 }); haptic(5); },
    off() { blip({ f: 1150, f2: 1000, body: 600, vol: 0.08, dur: 0.022, nz: 0.3, hp: 1800 }); haptic(5); },
    open() { blip({ f: 1400, f2: 1250, body: 640, vol: 0.06, dur: 0.018, nz: 0.35, hp: 2000 }); haptic(4); },
    ok() { blip({ f: 1320, f2: 1300, vol: 0.07, dur: 0.07, nz: 0 }); setTimeout(() => blip({ f: 1980, f2: 1960, vol: 0.06, dur: 0.11, nz: 0 }), 85); haptic(8); },
    drop() { blip({ f: 520, f2: 380, body: 260, vol: 0.12, dur: 0.06, nz: 0.4, hp: 1200 }); haptic(8); },
  };
  addEventListener("touchstart", () => { try { ctx(); } catch {} }, { once: true, passive: true });
  window.BJ_snd = snd; window.BJ_tick = tick;
  document.addEventListener("click", (e) => { if (e.target.closest(".btn, .nav-links a, .nav-logo, .footer nav a, .a-back")) snd.tap(); });

  /* ---------- Sections far off screen rest: their looping animations pause until you come near ---------- */
  if ("IntersectionObserver" in window) {
    const rest = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("at-rest", !e.isIntersecting)), { rootMargin: "300px 0px" });
    document.addEventListener("DOMContentLoaded", () => $$("main > section, main > div, .footer").forEach((el) => rest.observe(el)));
    if (document.readyState !== "loading") $$("main > section, main > div, .footer").forEach((el) => rest.observe(el));
  }

  /* ---------- One scroll pass per frame for everything that listens ---------- */
  const scrollFns = []; let sQueued = false;
  addEventListener("scroll", () => { if (sQueued) return; sQueued = true; requestAnimationFrame(() => { sQueued = false; for (const f of scrollFns) f(); }); }, { passive: true });
  const onS = (f) => scrollFns.push(f);

  /* ---------- Language (applied before anything renders text-dependent) ---------- */
  let lang = window.BJ_setLang ? BJ_setLang(BJ_initialLang(), { silent: true }) : "en";

  /* ---------- Intro moment (once per visit) ---------- */
  const intro = $(".intro");
  if (intro) {
    let seen = false; try { seen = sessionStorage.getItem("bj-intro") === "1"; sessionStorage.setItem("bj-intro", "1"); } catch {}
    if (seen || reduce) intro.remove(); else setTimeout(() => intro.remove(), 2200);
  }

  /* ---------- Wheel engine: a real 3D drum with its own physics (iOS picker) ----------
     Position is a float index. Drag, flick, wheel or keys move it; a spring settles it on an item.
     Every item boundary that crosses the lens fires exactly one tick, so sound and motion stay in sync. */
  function makeWheel(wheel, { itemH, onChange, onSettle, ticks = true }) {
    const ul = $("ul", wheel);
    let items = $$("li", wheel), pos = 0, vel = 0, target = null, cur = -1, user = false, raf = 0, drag = null, moved = 0, lastTickIdx = null;
    const STEP = 19, R = () => itemH / (STEP * Math.PI / 180); // drum radius from item height
    wheel.classList.add("drum");
    const n = () => items.length;
    const lim = (p) => clamp(p, -0.45, n() - 0.55);
    const render = () => {
      const r = R();
      for (let i = 0; i < items.length; i++) {
        const li = items[i], d = i - pos, ad = Math.abs(d);
        if (ad > 4.6) { if (li._v !== 0) { li.style.visibility = "hidden"; li._v = 0; } continue; }
        if (li._v !== 1) { li.style.visibility = ""; li._v = 1; }
        const ang = clamp(d * STEP, -88, 88) * Math.PI / 180;
        const y = Math.sin(ang) * r, z = (Math.cos(ang) - 1) * r;
        li.style.transform = `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${(-ang * 180 / Math.PI).toFixed(2)}deg)`;
        li.style.opacity = clamp(1 - ad * 0.24, 0.06, 1).toFixed(3);
      }
      const i = clamp(Math.round(pos), 0, n() - 1);
      if (i !== cur) {
        items[cur]?.classList.remove("on"); items[cur]?.setAttribute("aria-selected", "false");
        items[i].classList.add("on"); items[i].setAttribute("aria-selected", "true");
        cur = i; onChange?.(i, user);
      }
      // one tick per boundary crossed at the lens
      const ti = Math.round(pos);
      if (lastTickIdx !== null && ti !== lastTickIdx && user && ticks && ti >= 0 && ti < n()) tick(Math.min(1, Math.abs(vel) * 6));
      lastTickIdx = ti;
    };
    const loop = () => {
      raf = 0;
      if (!drag) {
        if (target === null && Math.abs(vel) > 0.002) { pos += vel; vel *= 0.93; if (pos < -0.45 || pos > n() - 0.55) vel *= 0.5; }
        else {
          if (target === null) target = clamp(Math.round(pos), 0, n() - 1);
          const f = (target - pos) * 0.16; vel = vel * 0.62 + f; pos += vel;
          if (Math.abs(target - pos) < 0.0015 && Math.abs(vel) < 0.0015) {
            pos = target; vel = 0; target = null; render(); onSettle?.(cur, user); return;
          }
        }
      }
      render(); raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const goTo = (i, smooth = true) => { target = clamp(i, 0, n() - 1); if (!smooth || reduce) { pos = target; vel = 0; target = null; render(); onSettle?.(cur, user); } else kick(); };
    // pointer: drag + flick (works for touch and mouse alike)
    let samples = [];
    wheel.style.touchAction = "none";
    wheel.addEventListener("pointerdown", (e) => {
      user = true; acted = true; drag = { y: e.clientY, p: pos }; moved = 0; target = null; vel = 0; samples = [[e.clientY, performance.now()]];
      wheel.setPointerCapture(e.pointerId); wheel.classList.add("grabbing"); kick();
    });
    wheel.addEventListener("pointermove", (e) => {
      if (!drag) return; const dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dy));
      let p = drag.p - dy / itemH; if (p < -0.45) p = -0.45 + (p + 0.45) * 0.35; if (p > n() - 0.55) p = n() - 0.55 + (p - n() + 0.55) * 0.35;
      pos = p; samples.push([e.clientY, performance.now()]); if (samples.length > 6) samples.shift(); kick();
    });
    const up = (e) => {
      if (!drag) return; drag = null; wheel.classList.remove("grabbing");
      const a = samples[0], b = samples[samples.length - 1], dt = Math.max(16, b[1] - a[1]);
      vel = clamp(-((b[0] - a[0]) / itemH) / (dt / 16.7), -1.2, 1.2);
      if (moved < 4) { const li = e.target.closest?.("li"); vel = 0; if (li) goTo(items.indexOf(li)); else goTo(Math.round(pos)); return; }
      // aim the flick at the item where it would come to rest, so the spring takes over smoothly
      const rest = pos + vel / (1 - 0.93); target = Math.abs(vel) < 0.05 ? clamp(Math.round(pos), 0, n() - 1) : null;
      if (target === null && (rest < 0 || rest > n() - 1)) target = clamp(Math.round(rest), 0, n() - 1);
      kick();
    };
    wheel.addEventListener("pointerup", up); wheel.addEventListener("pointercancel", up);
    let wheelT = 0;
    wheel.addEventListener("wheel", (e) => {
      e.preventDefault(); user = true; acted = true; target = null;
      pos = lim(pos + e.deltaY / (itemH * 2.2)); vel = 0; kick();
      clearTimeout(wheelT); wheelT = setTimeout(() => goTo(Math.round(pos)), 90);
    }, { passive: false });
    wheel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); user = true; goTo(Math.min(cur + 1, n() - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); user = true; goTo(Math.max(cur - 1, 0)); }
    });
    render();
    return {
      set(i, smooth = false) { user = false; goTo(i, smooth); },
      refresh() { items = $$("li", wheel); render(); },
      get index() { return cur; },
    };
  }

  // Justice wheel
  const jw = $(".jwheel");
  if (jw) {
    $$(".l", jw).forEach((l) => (l.textContent = l.textContent.toLocaleUpperCase(l.closest("li").lang || "en")));
    const w = makeWheel(jw, { itemH: 72 });
    const start = $$("li", jw).findIndex((li) => li.dataset.start !== undefined);
    w.set(start < 0 ? 0 : start);
  }

  /* ---------- Language wheel sheet ---------- */
  const sheet = $(".lang-sheet"), scrim = $(".lang-scrim"), lbtn = $(".lang-btn"), lw = $(".lwheel");
  if (sheet && lbtn && lw && window.BJ_LANGS) {
    $("ul", lw).innerHTML = BJ_LANGS.map((l) =>
      `<li role="option" lang="${l.code}" data-code="${l.code}"><span class="w">${l.name}</span><span class="l">${l.code.toUpperCase()}</span></li>`).join("");
    const codes = BJ_LANGS.map((l) => l.code);
    const label = () => { $(".lang-code", lbtn).textContent = lang.toUpperCase(); };
    label();
    const apply = (code) => {
      if (code === lang) return;
      lang = code; label();
      document.body.classList.add("lang-switching");
      setTimeout(() => { BJ_setLang(code); requestAnimationFrame(() => document.body.classList.remove("lang-switching")); }, reduce ? 0 : 240);
    };
    const wheel = makeWheel(lw, { itemH: 46, onSettle: (i, user) => { if (user && isOpen()) { snd.sel(); apply(codes[i]); } } });
    const isOpen = () => document.body.classList.contains("lang-open");
    const open = () => {
      $(".nav")?.classList.remove("open");
      document.body.classList.add("lang-open"); lbtn.setAttribute("aria-expanded", "true"); snd.open();
      requestAnimationFrame(() => { wheel.set(codes.indexOf(lang)); lw.focus({ preventScroll: true }); });
    };
    const close = () => {
      if (!isOpen()) return;
      apply(codes[wheel.index]);
      document.body.classList.remove("lang-open"); lbtn.setAttribute("aria-expanded", "false");
    };
    lbtn.addEventListener("click", () => (isOpen() ? close() : open()));
    scrim.addEventListener("click", close);
    $(".lang-done", sheet).addEventListener("click", () => { snd.tap(); close(); lbtn.focus({ preventScroll: true }); });
    addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); close(); lbtn.focus({ preventScroll: true }); }
    });
    document.addEventListener("click", (e) => { if (isOpen() && !e.target.closest(".lang-sheet, .lang-btn")) close(); });
    // Swipe the sheet down to close (mobile)
    let sy = null;
    $(".grabber", sheet).parentElement.addEventListener("touchstart", (e) => { if (e.target.closest(".lwheel")) return; sy = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener("touchmove", (e) => { if (sy !== null && e.touches[0].clientY - sy > 60) { sy = null; close(); } }, { passive: true });
    sheet.addEventListener("touchend", () => (sy = null));
    document.addEventListener("bj:lang", (e) => { lang = e.detail; label(); });
  }

  /* ---------- Appearance (Dark / Light / Auto) ---------- */
  const seg = $(".seg");
  if (seg) {
    const btns = $$("button", seg), thumb = $(".seg-thumb", seg), mq = matchMedia("(prefers-color-scheme: light)");
    const resolve = (m) => (m === "auto" ? (mq.matches ? "light" : "dark") : m);
    const sync = () => {
      const m = store.get("bj-theme") || "dark";
      btns.forEach((b) => b.setAttribute("aria-checked", b.dataset.themeSet === m ? "true" : "false"));
      const on = btns.find((b) => b.dataset.themeSet === m) || btns[0];
      thumb.style.setProperty("--w", on.offsetWidth + "px"); thumb.style.setProperty("--x", on.offsetLeft - 3 + "px");
      document.documentElement.dataset.theme = resolve(m);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolve(m) === "light" ? "#f4f6fb" : "#050a16");
    };
    btns.forEach((b) => b.addEventListener("click", () => { store.set("bj-theme", b.dataset.themeSet); acted = true; snd.sel(); sync(); }));
    mq.addEventListener?.("change", sync);
    document.addEventListener("bj:lang", () => requestAnimationFrame(sync));
    requestAnimationFrame(sync);
  }

  /* ---------- Sound switch ---------- */
  $$(".switch").forEach((sw) => {
    const sync = () => sw.setAttribute("aria-checked", soundOn() ? "true" : "false");
    sync();
    sw.setAttribute("aria-label", "Sounds");
    sw.addEventListener("click", () => {
      const on = !soundOn(); store.set("bj-snd", on ? "1" : "0"); sync();
      acted = true; on ? snd.on() : haptic(5);
    });
  });

  /* ---------- Navigation ---------- */
  const nav = $(".nav"), toggle = $(".nav-toggle");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open); snd.tap();
  });
  $$(".nav-links a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));
  const onScroll = () => nav?.classList.toggle("scrolled", scrollY > 10);
  onScroll(); onS(onScroll);

  /* ---------- Smooth anchor scrolling ---------- */
  const glide = (y) => {
    if (reduce) { scrollTo(0, y); return; }
    const y0 = scrollY, dy = y - y0, dur = clamp(Math.abs(dy) / 2.2, 500, 1100), t0 = performance.now();
    const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now) => { const p = clamp((now - t0) / dur); scrollTo(0, y0 + dy * io(p)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented) return;
    const u = new URL(a.href, location.href);
    if (u.pathname !== location.pathname || !u.hash) return;
    const el = document.getElementById(decodeURIComponent(u.hash.slice(1)));
    if (!el) return;
    e.preventDefault(); history.pushState(null, "", u.hash);
    glide(el.getBoundingClientRect().top + scrollY - 70);
  });

  /* ---------- Page transitions (fallback when View Transitions are unsupported) ---------- */
  if (!("onpagereveal" in window) && !reduce) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.defaultPrevented) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
      e.preventDefault(); document.body.classList.add("leaving");
      setTimeout(() => (location.href = u.href), 200);
    });
    addEventListener("pageshow", () => document.body.classList.remove("leaving"));
  }

  /* ---------- Magnetic buttons + glass spotlight (desktop) ---------- */
  if (fine && !reduce) {
    $$(".magnet").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty("--tx", ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px");
        b.style.setProperty("--ty", ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + "px");
      });
      b.addEventListener("pointerleave", () => { b.style.setProperty("--tx", "0px"); b.style.setProperty("--ty", "0px"); });
    });
    $$(".spot").forEach((c) => c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px");
    }));
  }

  /* ---------- Continuous tilt (pointer / device tilt) + scroll depth ---------- */
  const tiltEls = $$("[data-tilt]"), depthEls = $$("[data-depth]");
  if ((tiltEls.length || depthEls.length) && !reduce) {
    const live = new Set();
    const vis = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? live.add(e.target) : live.delete(e.target))), { rootMargin: "80px" });
    [...tiltEls, ...depthEls].forEach((el) => { el._t = { rx: 0, ry: 0 }; vis.observe(el); });
    let px = innerWidth / 2, py = innerHeight / 2, gx = 0, gy = 0, gyro = false;
    addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { px = e.clientX; py = e.clientY; } }, { passive: true });
    const onGyro = (e) => {
      if (e.gamma == null) return; gyro = true;
      gx = clamp((e.gamma || 0) / 28, -1, 1); gy = clamp(((e.beta || 45) - 45) / 28, -1, 1);
    };
    if (!fine && "DeviceOrientationEvent" in window) {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        addEventListener("touchend", function ask() {
          removeEventListener("touchend", ask);
          DeviceOrientationEvent.requestPermission().then((r) => { if (r === "granted") addEventListener("deviceorientation", onGyro); }).catch(() => {});
        }, { once: true });
      } else addEventListener("deviceorientation", onGyro);
    }
    // one read pass, then one write pass (no layout ping-pong), and nothing is written unless it visibly changed
    const setv = (el, k, v) => { const c = el._v || (el._v = {}); if (c[k] !== v) { c[k] = v; el.style.setProperty(k, v); } };
    const frame = () => {
      const vh = innerHeight, list = [...live], rects = list.map((el) => el.getBoundingClientRect()), tt = performance.now() / 1000;
      list.forEach((el, i) => {
        const r = rects[i], cxE = r.left + r.width / 2, cyE = r.top + r.height / 2;
        if (el.dataset.tilt) {
          const max = parseFloat(el.dataset.tilt) || 6;
          let nx, ny;
          if (el._touch) { nx = clamp((el._touch[0] - cxE) / (r.width * 0.5), -1, 1); ny = clamp((el._touch[1] - cyE) / (r.height * 0.5), -1, 1); }
          else if (fine) { nx = clamp((px - cxE) / (innerWidth * 0.5), -1, 1); ny = clamp((py - cyE) / (vh * 0.5), -1, 1); }
          else if (gyro) { nx = gx; ny = gy; }
          else { nx = Math.sin(tt * 0.5 + cyE * 0.01) * 0.35; ny = Math.cos(tt * 0.4) * 0.25; }
          const st = el._t, k = el._touch ? 0.22 : 0.08, mm = el._touch ? max * 1.4 : max;
          st.ry += (nx * mm - st.ry) * k; st.rx += (-ny * mm - st.rx) * k;
          const q = (x, st2) => (Math.round(x / st2) * st2).toFixed(2);
          setv(el, "--ry", q(st.ry, 0.05) + "deg"); setv(el, "--rx", q(st.rx, 0.05) + "deg");
          // inner layers drift with the tilt: written straight onto the few layers that move,
          // so the rest of the card is never restyled
          const kids = el._kids || (el._kids = [...el.children].map((c) => [c, c.matches(".poster-sm") ? 26 : c.matches(".art") ? 20 : c.matches(".t-icon, .chip, .plat-ic, .t-btn") ? 15 : c.matches("h3, p, ol") ? 7 : 0]).filter((k) => k[1]));
          const tx = +q(st.ry / max, 0.02), ty = +q(-st.rx / max, 0.02);
          if (el._txy !== tx + "," + ty) { el._txy = tx + "," + ty; for (const [c, f] of kids) c.style.translate = `${(tx * f).toFixed(1)}px ${(ty * f).toFixed(1)}px`; }
          if (el._glare ?? (el._glare = !!el.querySelector(".p-glare"))) { setv(el, "--gx", (50 + nx * 40).toFixed(0) + "%"); setv(el, "--gy", (40 + ny * 35).toFixed(0) + "%"); }
        }
        if (el.dataset.depth) {
          const d = parseFloat(el.dataset.depth) || 0, v = `0 ${((cyE - vh / 2) * -d).toFixed(1)}px`;
          if (el._dv !== v) { el._dv = v; el.style.translate = v; }
        }
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Endless touch: every tap presses, ripples, sounds ---------- */
  const TOUCH = ".tile:not(.still), .glass-xl, .step, .rcard, .group .row, .feat, .plat, .wheel-card, .poster, .btn, .hero-pill, .roles span, .ice-hint";
  $$(TOUCH).forEach((el) => el.classList.add("touchable"));
  const ripple = (el, x, y) => {
    const r = el.getBoundingClientRect(), sp = document.createElement("span");
    sp.className = "ripple"; sp.style.setProperty("--x", x - r.left + "px"); sp.style.setProperty("--y", y - r.top + "px");
    sp.style.setProperty("--r", (Math.max(r.width, r.height) / 4).toFixed(0));
    const host = el.matches(".poster") ? el : el; host.appendChild(sp); setTimeout(() => sp.remove(), 950);
  };
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(TOUCH); if (!el) return;
    if (!el.matches(".btn, .poster")) ripple(el, e.clientX, e.clientY);
    if (e.pointerType !== "mouse") {
      el.classList.add("pressing"); el._touch = [e.clientX, e.clientY];
      if (!el.matches(".btn, .poster")) { acted = true; snd.tap(); }
    }
  }, { passive: true });
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") return;
    const el = e.target.closest(TOUCH); if (el && el._touch) el._touch = [e.clientX, e.clientY];
  }, { passive: true });
  const release = () => $$(".pressing").forEach((el) => { el.classList.remove("pressing"); el._touch = null; });
  ["pointerup", "pointercancel", "touchend", "scroll"].forEach((n) => addEventListener(n, release, { passive: true }));

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Manifesto: words light up as you read ---------- */
  const st = $(".manifesto .statement");
  if (st) {
    let sp = [];
    const build = () => {
      const raw = (st.dataset.raw || st.textContent).trim();
      st.innerHTML = raw.split(/\s+/).map((w) => {
        const red = w.includes("*"); w = w.replace(/\*/g, "");
        return `<span${red ? ' class="r"' : ""}>${w}</span>`;
      }).join(" ");
      sp = $$("span", st);
    };
    const sec = st.closest(".manifesto");
    const light = () => {
      const r = sec.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? 1 : clamp(-r.top / Math.max(1, r.height - vh));
      const words = clamp(p / 0.72), n = words * sp.length;
      sp.forEach((s, i) => { const k = clamp(n - i); s.style.setProperty("--k", k.toFixed(3)); s.classList.toggle("lit", k > 0.5); });
      sec.style.setProperty("--mp", p.toFixed(3));
      sec.style.setProperty("--ms", clamp((p - 0.72) / 0.18).toFixed(3));
    };
    build(); light();
    document.addEventListener("bj:lang", () => { build(); light(); });
    onS(light);
  }

  /* ---------- Ice crackle (shared) ---------- */
  let lastCrack = 0;
  const crackle = (k = 1) => {
    const now = performance.now(); if (now - lastCrack < 70) return; lastCrack = now; haptic(3);
    if (!soundOn() || !acted) return;
    try {
      const A = ctx(), t = A.currentTime, n = Math.round(A.sampleRate * 0.035), buf = A.createBuffer(1, n, A.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() < 0.07 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.12) * Math.pow(1 - i / n, 3);
      const src = A.createBufferSource(), hp = A.createBiquadFilter(), g = A.createGain();
      src.buffer = buf; hp.type = "highpass"; hp.frequency.value = 3200 + Math.random() * 2600; g.gain.value = 0.05 * k;
      src.connect(hp).connect(g).connect(A.destination); src.start(t);
    } catch {}
  };

  /* ---------- Call for writers: three steps arrive from the depth ---------- */
  const wd = $(".write-deep");
  if (wd) {
    const steps = $$(".wd-step", wd), rail = $$(".wd-rail i", wd); let lastF = -1; const last = steps.length - 1;
    const run = () => {
      const r = wd.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? last : clamp(-r.top / Math.max(1, r.height - vh)) * (last + 0.1);
      steps.forEach((el, i) => {
        const d = p - i, dz = i === last ? Math.min(d, 0.08) : d;
        const op = d < 0 ? clamp(1 + d * 1.15) : (i === last ? 1 : clamp(1 - Math.max(0, d - 0.22) * 2.6));
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translate3d(0, ${(-dz * 46).toFixed(1)}px, ${(dz * 680).toFixed(1)}px)`;
        el.style.pointerEvents = Math.abs(d) < 0.4 ? "auto" : "none";
        el.style.setProperty("--f", clamp(1 - Math.abs(dz) * 2.2).toFixed(3));
      });
      const f = Math.min(last, Math.max(0, Math.round(p)));
      rail.forEach((x, i) => x.classList.toggle("on", i <= f));
      if (f !== lastF && lastF !== -1) tick();
      lastF = f;
      wd.style.setProperty("--hp", clamp(p / 1.2).toFixed(3));
    };
    run(); onS(run); addEventListener("resize", run);
  }

  /* ---------- Interviews: a voice memo recording ----------
     Like the iOS Voice Memos recorder: rounded bars are born at the playhead and travel left,
     their heights following the rhythm of real speech (syllables, words, pauses). */
  const vf = $(".voice-field");
  if (vf) {
    const g = vf.getContext("2d"); let W = 0, H = 0, D = 1, vis = false, raf = 0, last = performance.now();
    const BW = 2.6, GAP = 3.4, STEP = BW + GAP, SPEED = 34;       // px per second, like the real recorder
    let bars = [], acc = 0, tt = 0, phrase = 0, word = 0, syl = 0, env = 0, t0 = performance.now();
    // speech-like amplitude: syllables inside words, words inside phrases, breaths between
    const speak = (dt) => {
      tt += dt; syl -= dt; word -= dt; phrase -= dt;
      if (phrase <= 0) phrase = 2.2 + Math.random() * 2.6;
      const inBreath = phrase < 0.45;
      if (word <= 0) word = inBreath ? 0.45 : 0.28 + Math.random() * 0.5;
      if (syl <= 0) syl = 0.11 + Math.random() * 0.09;
      const target = inBreath ? 0.02 : (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * (1 - syl / 0.2)), 2)) * (word > 0.08 ? 1 : 0.15) * (0.55 + Math.random() * 0.45);
      env += (target - env) * Math.min(1, dt * 22);
      return Math.max(0.035, Math.min(1, env));
    };
    const size = () => {
      D = Math.min(devicePixelRatio || 1, 2); W = vf.clientWidth; H = vf.clientHeight; vf.width = W * D; vf.height = H * D;
      // the recording is already under way when you arrive: fill the past with speech
      const need = Math.ceil((W * 0.62) / STEP) + 2;
      if (bars.length < need) { const pre = []; for (let i = bars.length; i < need; i++) pre.push(speak(STEP / SPEED)); bars = pre.concat(bars); t0 = Math.min(t0, performance.now() - (need * STEP / SPEED) * 1000); }
    };
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const draw = (now) => {
      if (!vis) { raf = 0; return; }
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!W) return;
      const px = W * 0.62, mid = H * 0.5, maxH = H * 0.78;
      // new bars appear at the playhead at a steady rhythm
      acc += dt * SPEED; while (acc >= STEP) { acc -= STEP; bars.push(speak(STEP / SPEED)); }
      const n = Math.ceil(px / STEP) + 2; if (bars.length > n) bars.splice(0, bars.length - n);
      g.setTransform(D, 0, 0, D, 0, 0); g.clearRect(0, 0, W, H);
      const light = document.documentElement.dataset.theme === "light", ink = light ? "11,20,38" : "255,255,255";
      // the future: a quiet dotted line to the right of the playhead
      g.fillStyle = `rgba(${ink},.22)`;
      for (let x = px + STEP; x < W - 6; x += STEP) { g.beginPath(); g.arc(x, mid, 1.1, 0, 6.283); g.fill(); }
      // the recorded past: bars sliding left, fading into the distance
      for (let i = bars.length - 1, k = 0; i >= 0; i--, k++) {
        const x = px - (k + acc / STEP) * STEP - BW; if (x < -BW) break;
        const h = Math.max(BW, bars[i] * maxH), fade = Math.min(1, x / (W * 0.28));
        g.fillStyle = `rgba(${ink},${(0.92 * fade).toFixed(3)})`; rr(x, mid - h / 2, BW, h, BW / 2); g.fill();
      }
      // the playhead
      g.fillStyle = `rgba(${ink},.95)`; g.fillRect(px - 0.75, mid - maxH / 2 - 10, 1.5, maxH + 20);
      g.beginPath(); g.arc(px, mid - maxH / 2 - 12, 3.4, 0, 6.283); g.fill(); g.beginPath(); g.arc(px, mid + maxH / 2 + 12, 3.4, 0, 6.283); g.fill();
      // time, like the recorder
      const sec = Math.floor((now - t0) / 1000), tm = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")},${String(Math.floor(((now - t0) % 1000) / 10)).padStart(2, "0")}`;
      g.font = "600 13px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.fillStyle = `rgba(${ink},.55)`;
      for (let i = 0, x = 8; i < tm.length; i++) { const ch = tm[i], w = ch === ":" || ch === "," ? 5 : 8.4; g.fillText(ch, x + w / 2, 16); x += w; }  // fixed-width digits
    };
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf) { last = performance.now(); raf = requestAnimationFrame(draw); } }).observe(vf);
    size(); addEventListener("resize", size);
  }

  /* ---------- Manifesto: touch a word, it answers ---------- */
  const stm = $(".manifesto .statement");
  if (stm) {
    const pop = (e) => { const w = e.target.closest("span"); if (!w || !stm.contains(w)) return; w.classList.remove("pop"); void w.offsetWidth; w.classList.add("pop"); if (e.type === "pointerdown") { acted = true; snd.tap(); } };
    stm.addEventListener("pointerdown", pop); if (fine) stm.addEventListener("pointerover", pop);
  }

  /* ---------- Big Bang: the oneside star swallows everything, then gives birth to it again ----------
     0–1.5s collapse: the page and the sky are drawn into the star · 1.5–2.0s singularity: darkness, one point
     2.0s the bang · 2.0–4.6s expansion: the universe is flung out, stars lighting from near to far
     4.4–6.2s rebirth: the page opens back out of the star. Only transform/opacity on the page; the sky is GPU. */
  const big = $(".os-hero");
  if (big) {
    const upd = () => { const r = big.getBoundingClientRect(); big.style.setProperty("--k", clamp(1 - Math.abs((r.top + r.height / 2) / innerHeight - 0.5) * 1.4).toFixed(3)); };
    upd(); onS(upd);
    let busy = false, timers = [], anims = [], finish = null;
    // one sound only, at the bang: a soft crystalline bloom that opens and fades into a long, wide tail
    let verb = null;
    const bloom = () => {
      if (!soundOn() || !acted) return;
      try {
        const A = ctx(), t0 = A.currentTime + 0.01;
        if (!verb) { const len = A.sampleRate * 3.6, ir = A.createBuffer(2, len, A.sampleRate);
          for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
          verb = A.createConvolver(); verb.buffer = ir; }
        const out = A.createGain(); out.gain.value = 0.1; out.connect(A.destination);
        const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200; lp.connect(out);
        const wet = A.createGain(); wet.gain.value = 0.55; verb.connect(wet).connect(lp);
        const dry = A.createGain(); dry.gain.value = 0.6; dry.connect(lp);
        [[293.66, .5, 0], [440, .42, .04], [587.33, .36, .08], [880, .26, .14], [1174.66, .16, .22], [1760, .09, .32]].forEach(([f, v, dl]) => {
          const o = A.createOscillator(), g = A.createGain(); o.type = "sine"; o.frequency.value = f;
          const s0 = t0 + dl; g.gain.setValueAtTime(0.0001, s0); g.gain.linearRampToValueAtTime(v, s0 + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 3.2);
          o.connect(g); g.connect(dry); g.connect(verb); o.start(s0); o.stop(s0 + 3.4);
        });
      } catch {}
    };
    // everything visible on the page takes part; the largest heading comes apart letter by letter
    const ATOMS = "h1,h2,h3,h4,p,li,a,button,img,svg,canvas,label,input,textarea,.chip,.tile,.glass,.glass-xl,.wheel-card,.poster,.map-stage,.eyebrow,.handle,.roles span,.by-oneside";
    const collect = () => {
      const vw = innerWidth, vh = innerHeight, out = [];
      const inView = (r) => r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      const nav = $(".nav"); if (nav) out.push(nav);
      $$("main, .footer").forEach((root) => $$(ATOMS, root).forEach((el) => {
        if (el.closest(".os-hero") || out.some((o) => o.contains(el))) return;
        const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return;
        if (inView(el.getBoundingClientRect())) out.push(el);
      }));
      return out.filter((el, i) => !out.some((o, j) => j !== i && o !== el && o.contains(el)));
    };
    const splitLetters = (h) => {
      const html = h.innerHTML, letters = [];
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return; if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
            const word = document.createElement("span"); word.style.whiteSpace = "nowrap";
            [...w].forEach((ch) => { const l = document.createElement("span"); l.className = "bh-l"; l.textContent = ch; word.appendChild(l); letters.push(l); });
            frag.appendChild(word);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
      walk(h); h.classList.add("bh-split"); return { letters, restore: () => { h.innerHTML = html; h.classList.remove("bh-split"); } };
    };
    // a liquid path: each piece slides along a soft curve, stretches into a drop as it speeds up,
    // and thins into a thread of light as it pours into the star. Reversed, it pours back out and settles.
    const flow = (cx, cy, sx, sy, inward, side) => {
      const dx = sx - cx, dy = sy - cy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const bend = Math.min(160, L * 0.18) * side, mx = dx / 2 + nx * bend, my = dy / 2 + ny * bend;
      const T = [0, .2, .4, .56, .7, .8, .88, .94, 1], kf = [];
      for (const t of T) {
        const u = t, px = 2 * (1 - u) * u * mx + u * u * dx, py = 2 * (1 - u) * u * my + u * u * dy;
        const vx = 2 * (1 - u) * mx + 2 * u * (dx - mx), vy = 2 * (1 - u) * my + 2 * u * (dy - my);
        const deg = (Math.atan2(vy, vx) * 180 / Math.PI).toFixed(1);
        const drop = Math.pow(t, 1.6), size = Math.max(0.04, 1 - Math.pow(t, 1.3) * 0.96);
        kf.push({ transform: `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${deg}deg) scale(${(size * (1 + drop * 1.8)).toFixed(3)}, ${(size * (1 - drop * 0.7)).toFixed(3)}) rotate(${-deg}deg)`,
          opacity: t < 0.8 ? 1 : t < 0.94 ? 0.7 : 0, offset: t });
      }
      if (inward) return kf;
      const out = kf.slice().reverse().map((k) => ({ ...k, offset: +(1 - k.offset).toFixed(3) }));
      // landing: like a drop of liquid settling into shape
      out[out.length - 1].offset = 0.82;
      out.push({ transform: "translate(0px, 0px) scale(1.05, .95)", opacity: 1, offset: 0.9 }, { transform: "translate(0px, 0px) scale(.985, 1.015)", opacity: 1, offset: 0.96 }, { transform: "translate(0px, 0px) scale(1, 1)", opacity: 1, offset: 1 });
      return out;
    };
    const bang = () => {
      if (busy) return; busy = true; acted = true;
      const root = document.documentElement, star = $(".os-big", big), r = star.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      // the star stays, alone, above everything
      const lone = document.createElement("div"); lone.className = "bang-star";
      lone.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      lone.innerHTML = '<i class="os-big"></i>'; document.body.appendChild(lone);
      big.style.visibility = "hidden";
      const flash = document.createElement("div"); flash.className = "bang-flash"; flash.style.setProperty("--x", sx + "px"); flash.style.setProperty("--y", sy + "px"); document.body.appendChild(flash);
      const dark = document.createElement("div"); dark.className = "bang-dark"; dark.style.setProperty("--x", sx + "px"); dark.style.setProperty("--y", sy + "px"); document.body.appendChild(dark);
      root.classList.add("banging");
      const lockY = scrollY, lock = () => scrollTo(0, lockY); addEventListener("scroll", lock);
      window.BJ_bang?.(sx, sy);
      // pieces: the biggest heading in view comes apart letter by letter
      let parts = collect(), split = null;
      const heads = parts.filter((el) => /^H[12]$/.test(el.tagName)).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
      if (heads[0] && heads[0].textContent.length < 60 && parts.length < 60) { split = splitLetters(heads[0]); parts = parts.filter((p) => p !== heads[0]).concat(split.letters); }
      const geo = parts.map((el) => { const b = el.getBoundingClientRect(); return { el, cx: b.left + b.width / 2, cy: b.top + b.height / 2, d: Math.hypot(b.left + b.width / 2 - sx, b.top + b.height / 2 - sy) }; });
      const maxD = Math.max(...geo.map((g) => g.d), 1);
      let lastRipple = 0;
      const ripple = () => { const now = performance.now(); if (now - lastRipple < 140) return; lastRipple = now;
        const rp = document.createElement("span"); rp.className = "bang-ripple"; lone.appendChild(rp); setTimeout(() => rp.remove(), 900); };
      anims = geo.map((g) => {
        const k = g.d / maxD, delay = reduce ? 0 : Math.pow(k, 0.9) * 750, dur = reduce ? 500 : 1250 + k * 350;
        g.side = (g.cx < sx ? 1 : -1) * (g.cy < sy ? 1 : -1);
        g.el.style.willChange = "transform, opacity";
        const an = g.el.animate(flow(g.cx, g.cy, sx, sy, true, g.side), { duration: dur, delay, easing: "cubic-bezier(.5,0,.75,.35)", fill: "both" });
        timers.push(setTimeout(ripple, delay + dur * 0.9));
        return an;
      });
      dark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 2400, easing: "ease-in", fill: "forwards" });
      // the star drinks it all in: it swells and brightens, then holds its breath
      lone.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.16)", filter: "brightness(1.5) drop-shadow(0 0 24px rgba(255,255,255,.8))", offset: .8 }, { transform: "scale(.9)", filter: "brightness(.8)" }],
        { duration: 2900, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
      const at = (ms, f) => timers.push(setTimeout(f, reduce ? Math.min(ms, 900) : ms));
      // the void: everything is gone, only the star remains — and it waits for you
      let waiting = false, hint = null;
      at(2400, () => {
        waiting = true;
        lone.animate([{ transform: "scale(.9)", filter: "brightness(.8)" }, { transform: "scale(.96)", filter: "brightness(1.15)" }, { transform: "scale(.9)", filter: "brightness(.8)" }], { duration: 2600, iterations: Infinity, easing: "ease-in-out" });
      });
      at(3800, () => {   // after a moment of stillness, a quiet sign that the universe waits for a touch
        if (!waiting) return;
        hint = document.createElement("div"); hint.className = "bang-hint";
        hint.style.cssText = `left:${sx}px;top:${sy}px`;
        hint.innerHTML = `<i></i><i></i><span>${t("bang.touch")}</span>`;
        document.body.appendChild(hint);
      });
      const go = () => {   // the bang
        if (!waiting) return; waiting = false;
        removeEventListener("pointerdown", go); removeEventListener("keydown", key);
        hint?.remove(); lone.getAnimations().forEach((a) => a.cancel());
        window.BJ_bangGo?.(); bloom(); haptic(12);
        flash.animate([{ opacity: 0 }, { opacity: 1, offset: .07 }, { opacity: .3, offset: .32 }, { opacity: 0 }], { duration: 2000, easing: "ease-out", fill: "forwards" });
        lone.animate([{ transform: "scale(.9)", filter: "brightness(2.6) drop-shadow(0 0 40px #fff)" }, { transform: "scale(1.08)", filter: "brightness(1.5) drop-shadow(0 0 26px #fff)", offset: .3 }, { transform: "scale(1)", filter: "brightness(1)" }],
          { duration: 2400, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
        dark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 2000, easing: "ease-out", fill: "forwards" });
        setTimeout(() => {   // everything pours back out of the star and settles into place, nearest first
          anims.forEach((a) => a.cancel());
          anims = geo.map((g) => { const k = g.d / maxD;
            return g.el.animate(flow(g.cx, g.cy, sx, sy, false, -g.side), { duration: 1150 + k * 250, delay: k * 380, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" }); });
        }, reduce ? 200 : 1400);
        setTimeout(() => finish && finish(), reduce ? 900 : 3400);
      };
      const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
      setTimeout(() => { addEventListener("pointerdown", go); addEventListener("keydown", key); }, 400);
      // nothing may scroll the page away while the universe is being reborn
      const stopScroll = (e) => e.preventDefault();
      addEventListener("wheel", stopScroll, { passive: false }); addEventListener("touchmove", stopScroll, { passive: false });
      const stopKeys = (e) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key) || (e.key === " " && !waiting)) e.preventDefault(); };
      addEventListener("keydown", stopKeys);
      finish = () => {
        timers.forEach(clearTimeout); timers = []; anims.forEach((a) => a.cancel()); anims = [];
        parts.forEach((el) => (el.style.willChange = "")); split?.restore();
        window.BJ_bangEnd?.(); removeEventListener("scroll", lock);
        lone.remove(); flash.remove(); dark.remove(); hint?.remove(); big.style.visibility = "";
        removeEventListener("pointerdown", go); removeEventListener("keydown", key); removeEventListener("keydown", stopKeys);
        removeEventListener("wheel", stopScroll); removeEventListener("touchmove", stopScroll);
        root.classList.remove("banging"); busy = false; finish = null;
      };
    };
    big.addEventListener("click", bang);
    big.setAttribute("role", "button"); big.setAttribute("tabindex", "0"); big.setAttribute("aria-label", "oneside");
    big.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bang(); } });
  }

  /* ---------- Hero: dive through as you scroll ---------- */
  const heroIn = $(".hero:not(.nf) > .wrap");
  const cue = $(".scroll-cue");
  if (heroIn && !reduce) {
    const dive = () => {
      const h = clamp(scrollY / innerHeight);
      heroIn.style.transform = `translateY(${(-h * 70).toFixed(1)}px) scale(${(1 + h * 0.22).toFixed(4)})`;
      heroIn.style.opacity = clamp(1 - h * 1.35).toFixed(3);
      heroIn.style.filter = h > 0.01 ? `blur(${(h * 12).toFixed(1)}px)` : "none";
      if (cue) cue.style.opacity = h > 0.02 ? String(clamp(1 - h * 4)) : "";
    };
    dive(); onS(dive);
  }

  /* ---------- FAQ sounds ---------- */
  $$(".faq details").forEach((d) => d.addEventListener("toggle", () => (d.open ? snd.open() : snd.tap())));
  $$(".choice input").forEach((i) => i.addEventListener("change", () => snd.sel()));

  /* ---------- Application form ---------- */
  const form = $(".form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(form), need = ["name", "uni", "country"];
      const bad = need.filter((k) => !String(f.get(k) || "").trim());
      need.forEach((k) => form.elements[k].classList.toggle("bad", bad.includes(k)));
      $(".form-err", form).hidden = !bad.length;
      if (bad.length) { form.elements[bad[0]].focus(); haptic([8, 40, 8]); return; }
      const msg = [
        `Hi Bejustt! I'd like to apply as ${f.get("role")}.`, "",
        `Name: ${f.get("name").trim()}`, `University: ${f.get("uni").trim()}`, `Country: ${f.get("country").trim()}`,
        String(f.get("msg") || "").trim() ? "\n" + String(f.get("msg")).trim() : "",
      ].join("\n").trim();
      try { await navigator.clipboard.writeText(msg); } catch {}
      $(".form-preview", form).textContent = msg;
      $(".form-done", form).hidden = false; form.classList.add("sent"); snd.ok();
      form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
    form.addEventListener("input", (e) => e.target.classList.remove("bad"));
  }

  /* ---------- Reading progress (articles) ---------- */
  const prog = $(".progress i");
  if (prog) {
    const upd = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.setProperty("--p", h > 0 ? clamp(scrollY / h) : 0); };
    upd(); onS(upd);
  }

  /* ---------- Installable app: service worker + one-tap install ---------- */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const mf = document.querySelector('link[rel="manifest"]');
    // the installed app keeps itself current: check for a new version on open and whenever it comes back,
    // and when one is ready, swap it in quietly (only while nothing is being touched)
    addEventListener("load", () => navigator.serviceWorker.register(new URL("sw.js", mf ? mf.href : location.href), { updateViaCache: "none" }).then((reg) => {
      const check = () => reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);
      if (reg.waiting) reg.waiting.postMessage("skip");
      reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) w.postMessage("skip"); }); });
    }).catch(() => {}));
    let hadCtl = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadCtl) { hadCtl = true; return; }
      if (reloaded) return; reloaded = true;
      const go = () => location.reload();
      if (document.hidden) go(); else { document.addEventListener("visibilitychange", function v() { if (document.hidden) { document.removeEventListener("visibilitychange", v); go(); } }); setTimeout(() => { if (!document.documentElement.classList.contains("banging")) go(); }, 1500); }
    });
  }
  let deferred = null; const waiters = [];
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; document.documentElement.classList.add("can-install"); waiters.splice(0).forEach((f) => f(e)); });
  const ib = $(".install-btn");
  if (ib) {
    const status = $(".app-status"), ua = navigator.userAgent, label = $(".gb-t", ib);
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const say = (k) => { status.dataset.i18n = k; status.textContent = t(k); };
    const state = (st) => {
      ib.classList.remove("is-installing", "is-installed"); if (st) ib.classList.add("is-" + st);
      const k = st === "installing" ? "app.installing" : st === "installed" ? "app.installed" : "app.btn";
      label.dataset.i18n = k; label.textContent = t(k); ib.disabled = st === "installed";
    };
    $$(".plat").forEach((p) => p.classList.toggle("here", p.dataset.plat === (ios ? "ios" : android ? "android" : "desktop")));
    if (standalone) { say("app.using"); state("installed"); }
    const sheetEl = $(".ios-sheet");
    const openIOS = () => { sheetEl.hidden = false; sheetEl.classList.toggle("ipad", /iPad/.test(ua) || navigator.maxTouchPoints > 1 && !/iPhone/.test(ua)); snd.open(); $(".ios-close", sheetEl).focus(); };
    sheetEl?.addEventListener("click", (e) => { if (e.target === sheetEl || e.target.closest(".ios-close")) { sheetEl.hidden = true; snd.tap(); } });
    const waitPrompt = (ms) => new Promise((res) => { if (deferred) return res(deferred); waiters.push(res); setTimeout(() => res(null), ms); });
    ib.addEventListener("click", async () => {
      if (ib.classList.contains("is-installed")) return;
      if (ios) { openIOS(); return; }
      state("installing");
      const ev = deferred || await waitPrompt(2600);
      if (ev) {
        ev.prompt(); const r = await ev.userChoice.catch(() => null); deferred = null;
        if (r && r.outcome === "accepted") { setTimeout(() => { if (!ib.classList.contains("is-installed")) { state("installed"); say("app.done"); snd.ok(); } }, 2200); }
        else state("");
      } else { state(""); say("app.other"); document.getElementById("how")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
    });
    addEventListener("appinstalled", () => { state("installed"); say("app.done"); snd.ok(); });
    document.addEventListener("bj:lang", () => { const k = label.dataset.i18n; if (k) label.textContent = t(k); });
    const ai = $(".ai3d"), stageI = $(".app-icon-stage");
    if (ai) {
      let rx = 10, ry = -16, vx = 0, vy = 0, drag = null, tx = 10, ty = -16, last = performance.now();
      stageI.addEventListener("pointerdown", (e) => { drag = [e.clientX, e.clientY]; vx = vy = 0; stageI.setPointerCapture(e.pointerId); stageI.classList.add("grab"); acted = true; snd.tap(); });
      stageI.addEventListener("pointermove", (e) => {
        if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; drag = [e.clientX, e.clientY];
        vy = dx * 0.45; vx = -dy * 0.35; ry += vy; rx = clamp(rx + vx, -40, 40);
      });
      const up = () => { if (drag) { drag = null; stageI.classList.remove("grab"); } };
      stageI.addEventListener("pointerup", up); stageI.addEventListener("pointercancel", up);
      if (fine) addEventListener("pointermove", (e) => {
        const r = stageI.getBoundingClientRect();
        ty = ((e.clientX - (r.left + r.width / 2)) / innerWidth) * 46; tx = (-(e.clientY - (r.top + r.height / 2)) / innerHeight) * 34;
      }, { passive: true });
      const spin = (now) => {
        const dt = Math.min(50, now - last) / 16.7; last = now; const tt = now / 1000;
        if (!drag) {
          ry += vy * dt; rx += vx * dt; vy *= 0.94; vx *= 0.94;
          const wy = ((ry % 360) + 540) % 360 - 180; // nearest resting angle
          const restY = (fine ? ty : Math.sin(tt * 0.5) * 14) + (ry - wy);
          const restX = fine ? tx : 8 + Math.cos(tt * 0.4) * 7;
          if (Math.abs(vy) < 2) ry += (restY - ry) * 0.05 * dt;
          if (Math.abs(vx) < 2) rx += (restX - rx) * 0.05 * dt;
        }
        ai.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        const ny = Math.sin(ry * Math.PI / 180), nx = Math.sin(rx * Math.PI / 180);
        ai.style.setProperty("--sx", (50 - ny * 70).toFixed(1) + "%"); ai.style.setProperty("--sy", (30 + nx * 70).toFixed(1) + "%");
        if (!reduce) requestAnimationFrame(spin);
      };
      requestAnimationFrame(spin);
    }
  }

  /* ---------- Join dock (Instagram) ---------- */
  const dock = $(".join-dock");
  if (dock) {
    let closed = false; try { closed = sessionStorage.getItem("bj-dock") === "0"; } catch {}
    const foot = $(".footer"); let footIn = false;
    if (foot) new IntersectionObserver(([e]) => { footIn = e.isIntersecting; upd(); }).observe(foot);
    let joinIn = false; const jsec = $("#join, .wd-end");
    if (jsec) new IntersectionObserver(([e]) => { joinIn = e.isIntersecting; upd(); }, { threshold: 0.25 }).observe(jsec);
    const upd = () => dock.classList.toggle("on", !closed && !footIn && !joinIn && scrollY > innerHeight * 0.7 && !document.body.classList.contains("lang-open"));
    onS(upd); upd();
    $(".jd-x", dock).addEventListener("click", () => { closed = true; try { sessionStorage.setItem("bj-dock", "0"); } catch {} upd(); snd.tap(); });
    $("a", dock).addEventListener("click", () => snd.tap());
  }

  /* ---------- Creative touches ---------- */
  // the light on the BEJUSTT logo follows your finger / pointer
  const stageL = $(".logo-stage"), sheen = $(".logo-stage .sheen");
  if (stageL && sheen && !reduce) {
    let idleT = 0;
    const follow = (e) => {
      const r = stageL.getBoundingClientRect(), rel = clamp((e.clientX - r.left) / r.width);
      sheen.style.animation = "none"; sheen.style.backgroundPosition = `${(140 - rel * 180).toFixed(1)}% 0`;
      clearTimeout(idleT); idleT = setTimeout(() => { sheen.style.animation = ""; sheen.style.backgroundPosition = ""; }, 2600);
    };
    $(".hero")?.addEventListener("pointermove", follow, { passive: true });
  }
  // a soft breath of light follows the pointer across glass panels
  let lastB = 0;
  $$(".glass-xl").forEach((p) => p.addEventListener("pointermove", (e) => {
    const now = performance.now(); if (now - lastB < 45 || reduce) return; lastB = now;
    const r = p.getBoundingClientRect(), b = document.createElement("span");
    b.className = "breath"; b.style.setProperty("--x", e.clientX - r.left + "px"); b.style.setProperty("--y", e.clientY - r.top + "px");
    p.appendChild(b); setTimeout(() => b.remove(), 1850);
  }, { passive: true }));
  // the oneside star sparkles when touched
  $$(".by-oneside img, .by-block img").forEach((img) => img.addEventListener("pointerdown", () => {
    img.classList.remove("twinkle"); void img.offsetWidth; img.classList.add("twinkle"); acted = true; snd.sel();
  }));

  /* ---------- Year ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
