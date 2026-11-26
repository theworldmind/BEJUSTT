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
    const frame = () => {
      const vh = innerHeight;
      for (const el of live) {
        const r = el.getBoundingClientRect(), cxE = r.left + r.width / 2, cyE = r.top + r.height / 2;
        if (el.dataset.tilt) {
          const max = parseFloat(el.dataset.tilt) || 6;
          let nx, ny;
          if (el._touch) { nx = clamp((el._touch[0] - cxE) / (r.width * 0.5), -1, 1); ny = clamp((el._touch[1] - cyE) / (r.height * 0.5), -1, 1); }
          else if (fine) { nx = clamp((px - cxE) / (innerWidth * 0.5), -1, 1); ny = clamp((py - cyE) / (vh * 0.5), -1, 1); }
          else if (gyro) { nx = gx; ny = gy; }
          else { const tt = performance.now() / 1000; nx = Math.sin(tt * 0.5 + cyE * 0.01) * 0.35; ny = Math.cos(tt * 0.4) * 0.25; }
          const s = el._t, k = el._touch ? 0.22 : 0.08, mm = el._touch ? max * 1.4 : max;
          s.ry += (nx * mm - s.ry) * k; s.rx += (-ny * mm - s.rx) * k;
          el.style.setProperty("--ry", s.ry.toFixed(2) + "deg"); el.style.setProperty("--rx", s.rx.toFixed(2) + "deg");
          el.style.setProperty("--tx", (s.ry / max).toFixed(3)); el.style.setProperty("--ty", (-s.rx / max).toFixed(3));
          el.style.setProperty("--gx", (50 + nx * 40).toFixed(1) + "%"); el.style.setProperty("--gy", (40 + ny * 35).toFixed(1) + "%");
        }
        if (el.dataset.depth) {
          const d = parseFloat(el.dataset.depth) || 0;
          el.style.translate = `0 ${((cyE - vh / 2) * -d).toFixed(1)}px`;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Endless touch: every tap presses, ripples, sounds ---------- */
  const TOUCH = ".tile, .glass-xl, .step, .rcard, .group .row, .feat, .plat, .wheel-card, .poster, .btn, .hero-pill, .roles span, .ice-hint";
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

  /* ---------- Interviews: calm, perfect waves of voice — touch bends them, never breaks them ---------- */
  const vf = $(".voice-field");
  if (vf) {
    const g = vf.getContext("2d"); let W = 0, H = 0, D = 1, vis = false;
    let amp = 1, ampT = 1, bx = 0.5, tbx = 0.5, bump = 0, bumpT = 0, swell = 0, phase = 0, last = performance.now(), holding = false;
    const size = () => { D = Math.min(devicePixelRatio || 1, 2); W = vf.clientWidth; H = vf.clientHeight; vf.width = W * D; vf.height = H * D; };
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(vf);
    const host = vf.closest(".tile");
    const pos = (e) => { const r = vf.getBoundingClientRect(); tbx = clamp((e.clientX - r.left) / r.width); };
    host.addEventListener("pointermove", (e) => { pos(e); bumpT = 1; }, { passive: true });
    host.addEventListener("pointerleave", () => { bumpT = 0; holding = false; });
    host.addEventListener("pointerdown", (e) => { pos(e); bumpT = 1; holding = true; swell = Math.min(1.4, swell + 0.8); acted = true; snd.sel(); }, { passive: true });
    addEventListener("pointerup", () => { holding = false; if (!fine) bumpT = 0; });
    // five voices at five depths; frequencies in simple ratios so they always stay in harmony
    const V = [
      { k: 1.0, w: 1.15, ph: 0.0, z: 0, a: 1.0 },
      { k: 1.5, w: 1.45, ph: 1.9, z: 1, a: 0.82 },
      { k: 2.0, w: 0.95, ph: 3.6, z: 2, a: 0.66 },
      { k: 1.25, w: 1.7, ph: 5.1, z: 3, a: 0.52 },
      { k: 2.5, w: 1.25, ph: 0.8, z: 4, a: 0.4 },
    ];
    const draw = (now) => {
      requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!vis || !W) return;
      ampT = holding ? 1.75 : 1; amp += (ampT - amp) * 0.045; swell *= 0.965;
      bump += (bumpT - bump) * 0.05; bx += (tbx - bx) * 0.07;
      phase += dt * (reduce ? 0 : 1) * (1 + swell * 0.35);
      g.setTransform(D, 0, 0, D, 0, 0); g.clearRect(0, 0, W, H);
      const light = document.documentElement.dataset.theme === "light", col = light ? "11,20,38" : "255,255,255";
      const tx = parseFloat(host.style.getPropertyValue("--tx")) || 0;
      g.lineCap = "round";
      for (let vi = V.length - 1; vi >= 0; vi--) {
        const v = V[vi], depth = 1 / (1 + v.z * 0.22), cy = H * 0.52 - v.z * H * 0.035, ox = tx * 9 * v.z;
        const N = 140, pts = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, xw = u * 2 - 1, env = Math.pow(Math.cos(xw * Math.PI / 2), 2.2);
          const lift = 1 + bump * 0.9 * Math.exp(-Math.pow((u - bx) / 0.17, 2)) + swell * 0.6;
          const y = cy + Math.sin(xw * Math.PI * 2.2 * v.k - phase * v.w * 2 + v.ph) * env * H * 0.24 * v.a * depth * amp * lift;
          pts.push(W * 0.04 + u * W * 0.92 + ox, y);
        }
        const path = () => { g.beginPath(); g.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length - 2; i += 2) { const mx = (pts[i] + pts[i + 2]) / 2, my = (pts[i + 1] + pts[i + 3]) / 2; g.quadraticCurveTo(pts[i], pts[i + 1], mx, my); }
          g.lineTo(pts[pts.length - 2], pts[pts.length - 1]); };
        const lg = g.createLinearGradient(0, 0, W, 0), al = (0.95 - v.z * 0.17) * (light ? 0.8 : 1);
        lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.2, `rgba(${col},${al * 0.55})`); lg.addColorStop(0.5, `rgba(${col},${al})`); lg.addColorStop(0.8, `rgba(${col},${al * 0.55})`); lg.addColorStop(1, `rgba(${col},0)`);
        if (!light) { path(); g.strokeStyle = lg; g.globalAlpha = 0.16; g.lineWidth = (10 - v.z * 1.6) * (0.9 + swell * 0.3); g.stroke(); }
        path(); g.globalAlpha = 1; g.strokeStyle = lg; g.lineWidth = (2.2 - v.z * 0.32); g.stroke();
      }
      g.globalAlpha = 1;
    };
    size(); addEventListener("resize", size); requestAnimationFrame(draw);
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
    const boom = () => {
      if (!soundOn() || !acted) return;
      try {
        const A = ctx(), t0 = A.currentTime, out = A.createGain(); out.gain.value = 0.22; out.connect(A.destination);
        const o = A.createOscillator(), g = A.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + 1.6);
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.9, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
        o.connect(g).connect(out); o.start(t0); o.stop(t0 + 2.5);
        const ns = A.createBufferSource(), lp = A.createBiquadFilter(), ng = A.createGain(); ns.buffer = noise(A); ns.loop = true;
        lp.type = "lowpass"; lp.frequency.setValueAtTime(3000, t0); lp.frequency.exponentialRampToValueAtTime(140, t0 + 2.2);
        ng.gain.setValueAtTime(0.0001, t0); ng.gain.linearRampToValueAtTime(0.35, t0 + 0.015); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
        ns.connect(lp).connect(ng).connect(out); ns.start(t0); ns.stop(t0 + 2.3);
        [523.3, 784, 1046.5, 1568].forEach((f, i) => { const s2 = A.createOscillator(), sg = A.createGain(); s2.type = "sine"; s2.frequency.value = f;
          sg.gain.setValueAtTime(0.0001, t0 + 0.25 + i * 0.12); sg.gain.linearRampToValueAtTime(0.03 / (i + 1), t0 + 0.4 + i * 0.12); sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3 + i * 0.2);
          s2.connect(sg).connect(out); s2.start(t0 + 0.2 + i * 0.12); s2.stop(t0 + 3.4 + i * 0.2); });
      } catch {}
    };
    const bang = () => {
      if (busy) return; busy = true; acted = true;
      const root = document.documentElement, star = $(".os-big", big), r = star.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      // the star leaves the page and stays, alone, in front of the sky
      const lone = document.createElement("div"); lone.className = "bang-star";
      lone.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
      lone.innerHTML = '<i class="os-big"></i>'; document.body.appendChild(lone);
      big.style.visibility = "hidden";
      const flash = document.createElement("div"); flash.className = "bang-flash"; flash.style.setProperty("--x", sx + "px"); flash.style.setProperty("--y", sy + "px"); document.body.appendChild(flash);
      const dark = document.createElement("div"); dark.className = "bang-dark"; document.body.appendChild(dark);
      root.classList.add("banging");
      const lockY = scrollY, lock = () => scrollTo(0, lockY); addEventListener("scroll", lock);
      window.BJ_bang?.(sx, sy);
      // the page is drawn into the star, every part from where it stands
      const parts = [$(".nav"), $("main"), $(".footer"), $(".join-dock")].filter((el) => el && el.offsetParent !== null || el?.matches?.(".nav"));
      const origin = (el) => { const b = el.getBoundingClientRect(); return `${(sx - b.left).toFixed(1)}px ${(sy - b.top).toFixed(1)}px`; };
      anims = parts.map((el) => { el.style.transformOrigin = origin(el); return el.animate(
        [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.86)", opacity: .85, offset: .35 }, { transform: "scale(.004)", opacity: 0 }],
        { duration: reduce ? 400 : 1500, easing: "cubic-bezier(.6,0,.9,.4)", fill: "forwards" }); });
      dark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1500, easing: "ease-in", fill: "forwards" });
      lone.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(.82)", filter: "brightness(.55)", offset: .8 }, { transform: "scale(.6)", filter: "brightness(.35)" }],
        { duration: 2000, easing: "cubic-bezier(.5,0,.8,.3)", fill: "forwards" });
      const at = (ms, f) => timers.push(setTimeout(f, reduce ? Math.min(ms, 600) : ms));
      at(2000, () => {   // the bang
        boom(); haptic([18, 30, 10]);
        flash.animate([{ opacity: 0 }, { opacity: 1, offset: .06 }, { opacity: .35, offset: .3 }, { opacity: 0 }], { duration: 2200, easing: "ease-out", fill: "forwards" });
        lone.animate([{ transform: "scale(.6)", filter: "brightness(3) drop-shadow(0 0 40px #fff)" }, { transform: "scale(1.08)", filter: "brightness(1.6) drop-shadow(0 0 30px #fff)", offset: .25 }, { transform: "scale(1)", filter: "brightness(1)" }],
          { duration: 2600, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
        dark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 2400, easing: "ease-out", fill: "forwards" });
      });
      at(4400, () => {   // rebirth: the page opens back out of the star
        anims.forEach((a) => a.cancel());
        anims = parts.map((el) => { el.style.transformOrigin = origin(el); return el.animate(
          [{ transform: "scale(.004)", opacity: 0 }, { transform: "scale(1.012)", opacity: 1, offset: .7 }, { transform: "scale(1)", opacity: 1 }],
          { duration: 1500, easing: "cubic-bezier(.16,1,.3,1)" }); });
        root.classList.add("reborn");
      });
      finish = () => {
        timers.forEach(clearTimeout); timers = []; anims.forEach((a) => a.cancel()); anims = [];
        parts.forEach((el) => (el.style.transformOrigin = ""));
        window.BJ_bangEnd?.(); removeEventListener("scroll", lock);
        lone.remove(); flash.remove(); dark.remove(); big.style.visibility = "";
        root.classList.remove("banging", "reborn"); busy = false; finish = null;
      };
      at(6000, () => finish && finish());
      // a second touch ends it at once
      setTimeout(() => addEventListener("pointerdown", function skip() { removeEventListener("pointerdown", skip); finish && finish(); }), 350);
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
    addEventListener("load", () => navigator.serviceWorker.register(new URL("sw.js", mf ? mf.href : location.href)).catch(() => {}));
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
