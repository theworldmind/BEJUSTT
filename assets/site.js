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
  // Clock-wheel tick: a crisp 2 ms click + short ringing body (~1.9 kHz)
  function tick() {
    const now = performance.now();
    if (now - lastTick < 34) return;
    const fast = now - lastTick < 90; lastTick = now; haptic(3);
    if (!soundOn() || !acted) return;
    try {
      const A = ctx(), tt = A.currentTime, out = A.createGain(), j = 1 + ((tickN++ % 3) - 1) * 0.008;
      out.gain.value = fast ? 0.09 : 0.13; out.connect(A.destination);
      const ns = A.createBufferSource(), bp = A.createBiquadFilter(), ng = A.createGain();
      ns.buffer = noise(A); bp.type = "bandpass"; bp.frequency.value = 3400 * j; bp.Q.value = 0.9;
      ng.gain.setValueAtTime(0.9, tt); ng.gain.exponentialRampToValueAtTime(0.001, tt + 0.0022);
      ns.connect(bp).connect(ng).connect(out); ns.start(tt); ns.stop(tt + 0.004);
      for (const [f, a, d] of [[1900, 1, 0.007], [3800, 0.32, 0.0035], [5600, 0.12, 0.002]]) {
        const o = A.createOscillator(), g = A.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(f * j * 1.04, tt); o.frequency.exponentialRampToValueAtTime(f * j, tt + d);
        g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(a, tt + 0.0003); g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
        o.connect(g).connect(out); o.start(tt); o.stop(tt + d + 0.004);
      }
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

  /* ---------- Language (applied before anything renders text-dependent) ---------- */
  let lang = window.BJ_setLang ? BJ_setLang(BJ_initialLang(), { silent: true }) : "en";

  /* ---------- Intro moment (once per visit) ---------- */
  const intro = $(".intro");
  if (intro) {
    let seen = false; try { seen = sessionStorage.getItem("bj-intro") === "1"; sessionStorage.setItem("bj-intro", "1"); } catch {}
    if (seen || reduce) intro.remove(); else setTimeout(() => intro.remove(), 2200);
  }

  /* ---------- Wheel engine (iOS picker) ---------- */
  function makeWheel(wheel, { itemH, onChange, onSettle, ticks = true }) {
    const ul = $("ul", wheel);
    let items = $$("li", wheel), cur = -1, user = false, raf = 0, settleT = 0;
    const pad = () => { ul.style.padding = `${(wheel.clientHeight - itemH) / 2}px 0`; };
    const paint = () => {
      raf = 0;
      const c = wheel.scrollTop + wheel.clientHeight / 2, top = parseFloat(ul.style.paddingTop || 0);
      items.forEach((li) => {
        const d = (li.offsetTop + itemH / 2 - c) / itemH, ad = Math.abs(d), w = li.firstElementChild;
        w.style.transform = `rotateX(${clamp(-d * 20, -80, 80)}deg) scale(${1 - Math.min(ad, 3) * 0.1})`;
        w.style.opacity = String(clamp(1 - ad * 0.3, 0.08, 1));
      });
      const i = clamp(Math.round((wheel.scrollTop + top - top) / itemH), 0, items.length - 1);
      if (i !== cur) {
        items[cur]?.classList.remove("on"); items[cur]?.setAttribute("aria-selected", "false");
        items[i].classList.add("on"); items[i].setAttribute("aria-selected", "true");
        if (user && cur !== -1 && ticks) tick();
        cur = i; onChange?.(i, user);
      }
      clearTimeout(settleT);
      settleT = setTimeout(() => onSettle?.(cur, user), 380);
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const goTo = (i, smooth = true) => wheel.scrollTo({ top: i * itemH, behavior: smooth && !reduce ? "smooth" : "auto" });
    const mark = () => { user = true; };
    wheel.addEventListener("scroll", req, { passive: true });
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach((n) => wheel.addEventListener(n, mark, { passive: true }));
    wheel.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li && !moved) { user = true; goTo(items.indexOf(li)); } });
    wheel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); goTo(Math.min(cur + 1, items.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); goTo(Math.max(cur - 1, 0)); }
    });
    // Mouse drag (touch scrolls natively)
    let dragY = null, dragTop = 0, moved = false;
    wheel.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragY = e.clientY; dragTop = wheel.scrollTop; moved = false;
      wheel.style.scrollSnapType = "none"; wheel.style.cursor = "grabbing";
    });
    addEventListener("pointermove", (e) => {
      if (dragY === null) return;
      if (Math.abs(e.clientY - dragY) > 3) moved = true;
      wheel.scrollTop = dragTop - (e.clientY - dragY);
    });
    addEventListener("pointerup", () => {
      if (dragY === null) return;
      dragY = null; wheel.style.cursor = "";
      const c = wheel.scrollTop; wheel.style.scrollSnapType = "";
      goTo(Math.round(c / itemH)); setTimeout(() => (moved = false), 0);
    });
    addEventListener("resize", () => { pad(); goTo(cur, false); req(); });
    pad();
    return {
      set(i, smooth = false) { user = false; pad(); goTo(i, smooth); req(); },
      refresh() { pad(); req(); },
      get index() { return cur; },
    };
  }

  // Justice wheel
  const jw = $(".jwheel");
  if (jw) {
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
  onScroll(); addEventListener("scroll", onScroll, { passive: true });

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
    addEventListener("scroll", light, { passive: true });
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

  /* ---------- Call for writers: frozen steps arrive from the depth and thaw as you move on ---------- */
  const wd = $(".write-deep");
  if (wd) {
    const steps = $$(".wd-step", wd), rail = $$(".wd-rail i", wd); let lastF = -1;
    const vnoise = (gw, gh) => { const g = []; for (let i = 0; i < (gw + 1) * (gh + 1); i++) g.push(Math.random());
      return (u, v) => { const x = u * gw, y = v * gh, i = Math.min(gw - 1, x | 0), j = Math.min(gh - 1, y | 0), fx = x - i, fy = y - j;
        const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), w = gw + 1;
        const a = g[j * w + i], b2 = g[j * w + i + 1], c = g[(j + 1) * w + i], d = g[(j + 1) * w + i + 1];
        return a + (b2 - a) * sx + (c - a) * sy + (a - b2 - c + d) * sx * sy; }; };
    const ices = steps.map((st) => {
      const host = $(".wd-in", st), cv = document.createElement("canvas"); cv.className = "wd-ice"; cv.setAttribute("aria-hidden", "true");
      host.appendChild(cv);
      const o = { st, host, cv, g: cv.getContext("2d"), m: -1, tm: null, W: 0, H: 0, base: null, T: null, beads: [], img: null, lastC: 0, busy: false };
      o.build = () => {
        const r = cv.getBoundingClientRect(); if (!r.width) return;
        const k = Math.min(devicePixelRatio || 1, 2) * 0.55, W = Math.max(40, Math.round(r.width * k)), H = Math.max(30, Math.round(r.height * k));
        o.W = cv.width = W; o.H = cv.height = H; o.k = k;
        const oc = document.createElement("canvas"); oc.width = W; oc.height = H; const g = oc.getContext("2d");
        const lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, "rgba(236,242,252,.30)"); lg.addColorStop(.5, "rgba(214,226,246,.16)"); lg.addColorStop(1, "rgba(236,242,252,.28)");
        g.fillStyle = lg; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 46; i++) { const x = Math.random() * W, y = Math.random() * H, rr = (0.05 + Math.random() * 0.2) * W, rg = g.createRadialGradient(x, y, 0, x, y, rr);
          rg.addColorStop(0, `rgba(255,255,255,${0.06 + Math.random() * 0.16})`); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
        const fern = (x, y, ang, len, depth) => {
          if (depth <= 0 || len < 2) return; const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
          g.strokeStyle = `rgba(255,255,255,${0.32 + depth * 0.13})`; g.lineWidth = 0.5 + depth * 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
          const n = 3 + (Math.random() * 3 | 0);
          for (let i = 1; i <= n; i++) { const t = i / (n + 1), bx = x + (x2 - x) * t, by = y + (y2 - y) * t, bl = len * (0.5 - t * 0.3);
            fern(bx, by, ang + 1.0 + Math.random() * 0.3, bl, depth - 1); fern(bx, by, ang - 1.0 - Math.random() * 0.3, bl, depth - 1); }
          fern(x2, y2, ang + (Math.random() - 0.5) * 0.5, len * 0.62, depth - 1);
        };
        for (let i = 0; i < 26; i++) { const e = Math.random() * 4 | 0, x = e === 0 ? 0 : e === 1 ? W : Math.random() * W, y = e === 2 ? 0 : e === 3 ? H : Math.random() * H;
          fern(x, y, Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.4, (0.12 + Math.random() * 0.16) * Math.min(W, H) * 1.6, 4); }
        for (let i = 0; i < 10; i++) fern(Math.random() * W, Math.random() * H, Math.random() * 6.28, 0.12 * Math.min(W, H), 3);
        const id = g.getImageData(0, 0, W, H), D = id.data, n1 = vnoise(7, 4), n2 = vnoise(22, 10);
        o.T = new Float32Array(W * H); o.tm = new Float32Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, u = x / W, v = y / H, dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
          o.T[i] = Math.min(1, Math.sqrt(dx * dx * 0.8 + dy * dy * 1.2) * 0.62 + n1(u, v) * 0.32 + n2(u, v) * 0.14);
          const gr = (Math.random() - 0.5) * 26, edge = Math.sqrt(dx * dx + dy * dy * 0.9) + (n1(u, v) - 0.5) * 0.5 + (n2(u, v) - 0.5) * 0.22, feather = edge < 0.78 ? 1 : edge > 1.02 ? 0 : 1 - (edge - 0.78) / 0.24;
          D[i * 4] = Math.min(255, D[i * 4] + gr); D[i * 4 + 1] = Math.min(255, D[i * 4 + 1] + gr); D[i * 4 + 2] = Math.min(255, D[i * 4 + 2] + gr);
          D[i * 4 + 3] = Math.min(255, D[i * 4 + 3] * 1.0 + (n2(u, v) > 0.62 ? 26 : 0)) * feather * feather * (3 - 2 * feather);
        }
        o.base = D; o.img = g.createImageData(W, H);
        o.beads = Array.from({ length: 70 }, () => { const x = Math.random() * W, y = Math.random() * H; return { x, y, r: (0.6 + Math.random() * 1.8) * k * 2, t: o.T[(y | 0) * W + (x | 0)] }; });
        o.m = -1; o.render(o.cm || 0);
      };
      o.render = (m) => {
        if (!o.base) return; o.cm = m;
        const { W, H, T, tm, base } = o, D = o.img.data, front = m * 1.22 - 0.06;
        for (let i = 0, n = W * H; i < n; i++) {
          const t = T[i], q = (t - front) / 0.07, f = q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q);
          const band = m > 0.01 ? Math.exp(-((t - front) * (t - front)) / 0.0009) : 0;
          const a = base[i * 4 + 3] * f * (1 - tm[i]) + 120 * band * f;
          const j = i * 4; D[j] = Math.min(255, base[j] + band * 40); D[j + 1] = Math.min(255, base[j + 1] + band * 40); D[j + 2] = 255; D[j + 3] = a;
        }
        const g = o.g; g.putImageData(o.img, 0, 0);
        if (m > 0.01) for (const b of o.beads) {
          const dt = front - b.t; if (dt < -0.03 || dt > 0.35) continue;
          const al = dt < 0 ? 1 + dt / 0.03 : 1 - dt / 0.35, rr = b.r;
          const rg = g.createRadialGradient(b.x - rr * 0.3, b.y - rr * 0.35, 0, b.x, b.y, rr);
          rg.addColorStop(0, `rgba(255,255,255,${0.95 * al})`); rg.addColorStop(0.45, `rgba(200,215,245,${0.35 * al})`); rg.addColorStop(1, `rgba(20,35,80,${0.4 * al})`);
          g.fillStyle = rg; g.beginPath(); g.arc(b.x, b.y, rr, 0, 6.283); g.fill();
        }
        host.style.setProperty("--melt", Math.min(1, Math.max(0, m * 1.1)).toFixed(3));
      };
      // touch the ice: it melts under your finger and slowly frosts over again
      let down = false, regrow = 0;
      const brush = (e) => {
        if (!o.base) return; const r = cv.getBoundingClientRect(), cx = (e.clientX - r.left) * o.k, cy = (e.clientY - r.top) * o.k, R = 34 * o.k;
        for (let y = Math.max(0, cy - R | 0); y < Math.min(o.H, cy + R); y++) for (let x = Math.max(0, cx - R | 0); x < Math.min(o.W, cx + R); x++) {
          const d = Math.hypot(x - cx, y - cy) / R; if (d < 1) { const i = y * o.W + x; o.tm[i] = Math.min(1, o.tm[i] + (1 - d * d) * 0.5); }
        }
        crackle(0.8); o.render(o.cm || 0);
        if (!regrow) regrow = requestAnimationFrame(grow);
      };
      const grow = () => {
        let any = false; for (let i = 0; i < o.tm.length; i++) if (o.tm[i] > 0.002) { o.tm[i] *= 0.988; any = true; } else o.tm[i] = 0;
        o.render(o.cm || 0); regrow = any ? requestAnimationFrame(grow) : 0;
      };
      cv.addEventListener("pointerdown", (e) => { down = true; acted = true; brush(e); });
      cv.addEventListener("pointermove", (e) => { if (down || e.pointerType === "mouse") brush(e); });
      addEventListener("pointerup", () => (down = false));
      return o;
    });
    const buildAll = () => ices.forEach((o) => o.build());
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(buildAll));
    let rT = 0; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(buildAll, 200); });
    document.addEventListener("bj:lang", () => setTimeout(buildAll, 60));
    const last = steps.length - 1;
    const run = () => {
      const r = wd.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? last + 1 : clamp(-r.top / Math.max(1, r.height - vh)) * (last + 0.62);
      steps.forEach((el, i) => {
        const d = p - i, fadeAt = i === last ? 9 : 0.52, dz = i === last ? Math.min(d, 0.12) : d;
        const op = d < 0 ? clamp(1 + d * 1.15) : clamp(1 - Math.max(0, d - fadeAt) * 4);
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translate3d(0, ${(-dz * 46).toFixed(1)}px, ${(dz * 620).toFixed(1)}px)`;
        el.style.filter = `blur(${Math.min(12, d < 0 ? -d * 9 : Math.max(0, d - fadeAt + 0.05) * 9).toFixed(2)}px)`;
        el.style.pointerEvents = d > -0.4 && d < 0.6 ? "auto" : "none";
        const m = clamp((d - 0.1) / 0.42), o = ices[i];
        if (Math.abs(m - o.m) > 0.004 || (m === 0) !== (o.m === 0)) {
          if (m > o.m + 0.05 && o.m >= 0 && m < 1) crackle(0.6);
          o.m = m; o.render(m);
        }
      });
      const f = Math.min(last, Math.max(0, Math.floor(p + 0.4)));
      rail.forEach((x, i) => { x.classList.toggle("on", i <= f); x.classList.toggle("thaw", clamp((p - i - 0.1) / 0.42) >= 1); });
      if (f !== lastF && lastF !== -1) tick();
      lastF = f;
      wd.style.setProperty("--hp", clamp(p / 1.2).toFixed(3));
    };
    run(); addEventListener("scroll", run, { passive: true }); addEventListener("resize", run);
  }

  /* ---------- Interviews: silk ribbons of voice, flowing in depth ---------- */
  const vf = $(".voice-field");
  if (vf) {
    const g = vf.getContext("2d"); let W = 0, H = 0, D = 1, energy = 0.3, eT = 0.3, vis = false, pulses = [];
    let px = 0.5, py = 0.5, tpx = 0.5, tpy = 0.5, hover = 0, hT = 0, holding = false;
    const size = () => { D = Math.min(devicePixelRatio || 1, 2); W = vf.clientWidth; H = vf.clientHeight; vf.width = W * D; vf.height = H * D; };
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(vf);
    const host = vf.closest(".tile");
    const pos = (e) => { const r = vf.getBoundingClientRect(); tpx = clamp((e.clientX - r.left) / r.width, -0.2, 1.2); tpy = clamp((e.clientY - r.top) / r.height, -0.3, 1.3); };
    host.addEventListener("pointermove", (e) => { pos(e); hT = 1; }, { passive: true });
    host.addEventListener("pointerleave", () => { hT = 0; holding = false; });
    host.addEventListener("pointerdown", (e) => { pos(e); hT = 1; holding = true; pulses.push({ x: tpx, t: performance.now() }); acted = true; snd.sel(); }, { passive: true });
    addEventListener("pointerup", () => { holding = false; if (!fine) hT = 0; });
    const RIB = 7;
    const draw = (now) => {
      requestAnimationFrame(draw);
      if (!vis || !W) return;
      const t = reduce ? 3 : now / 1000;
      eT = holding ? 1 : 0.3 + hover * 0.25; energy += (eT - energy) * 0.06;
      hover += (hT - hover) * 0.08; px += (tpx - px) * 0.12; py += (tpy - py) * 0.12;
      pulses = pulses.filter((p) => now - p.t < 2600);
      g.setTransform(D, 0, 0, D, 0, 0); g.clearRect(0, 0, W, H);
      const light = document.documentElement.dataset.theme === "light";
      g.globalCompositeOperation = light ? "source-over" : "lighter";
      const tx = parseFloat(host.style.getPropertyValue("--tx")) || 0, ty = parseFloat(host.style.getPropertyValue("--ty")) || 0;
      const S = 56;
      for (let r = RIB - 1; r >= 0; r--) {
        const z = 1 + r * 0.32, sc = 1 / z, ph = r * 0.9, sp = 1 - r * 0.07;
        const cy = H * 0.58 - r * H * 0.055 + ty * 6 * r, ox = tx * 10 * r;
        const top = [], bot = [];
        for (let i = 0; i <= S; i++) {
          const u = i / S, xw = (u - 0.5) * 2, env = Math.exp(-xw * xw * 1.9);
          let a = Math.sin(u * 9 + t * 1.6 * sp + ph) * 0.55 + Math.sin(u * 17 - t * 2.3 * sp + ph * 1.7) * 0.3 + Math.sin(u * 4.5 + t * 0.7 + ph) * 0.45;
          for (const p of pulses) { const k = (now - p.t) / 1000, dd = Math.abs(u - p.x) - k * 0.42; a += Math.exp(-dd * dd * 90) * Math.pow(1 - k / 2.6, 2) * 2.4 * Math.cos(dd * 40 - r * 0.6); }
          let y = cy + a * env * H * 0.2 * (0.45 + energy) * sc;
          const near = Math.exp(-Math.pow((u - px) / 0.2, 2)) * hover;
          y += (py * H - y) * near * 0.38 * sc;
          const th = (1.2 + Math.abs(a) * env * (5 + energy * 9) + near * 5) * sc;
          const x = W / 2 + (xw * W * 0.56) * (0.86 + sc * 0.14) + ox;
          top.push(x, y - th); bot.push(x, y + th);
        }
        const al = (0.16 + 0.5 * (1 - r / RIB)) * (0.7 + energy * 0.5);
        const lg = g.createLinearGradient(0, 0, W, 0);
        const col = light ? "11,20,38" : (r % 3 === 0 ? "255,255,255" : r % 3 === 1 ? "205,220,255" : "160,185,250");
        lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.25, `rgba(${col},${al * 0.7})`); lg.addColorStop(0.5, `rgba(${col},${al})`); lg.addColorStop(0.75, `rgba(${col},${al * 0.7})`); lg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = lg; g.beginPath(); g.moveTo(top[0], top[1]);
        for (let i = 2; i < top.length; i += 2) g.lineTo(top[i], top[i + 1]);
        for (let i = bot.length - 2; i >= 0; i -= 2) g.lineTo(bot[i], bot[i + 1]);
        g.closePath(); g.fill();
        if (r < 2) { g.strokeStyle = lg; g.lineWidth = 0.8; g.beginPath(); for (let i = 0; i < top.length; i += 2) { const yy = (top[i + 1] + bot[i + 1]) / 2; i ? g.lineTo(top[i], yy) : g.moveTo(top[i], yy); } g.stroke(); }
      }
      g.globalCompositeOperation = "source-over";
    };
    size(); addEventListener("resize", size); requestAnimationFrame(draw);
  }

  /* ---------- Manifesto: touch a word, it answers ---------- */
  const stm = $(".manifesto .statement");
  if (stm) {
    const pop = (e) => { const w = e.target.closest("span"); if (!w || !stm.contains(w)) return; w.classList.remove("pop"); void w.offsetWidth; w.classList.add("pop"); if (e.type === "pointerdown") { acted = true; snd.tap(); } };
    stm.addEventListener("pointerdown", pop); if (fine) stm.addEventListener("pointerover", pop);
  }

  /* ---------- oneside star: breathes, spins, scatters light ---------- */
  const burst = (x, y, n = 14) => {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i"); s.className = "os-mark os-spark";
      const a = Math.random() * 6.283, d = 26 + Math.random() * 54, z = 5 + Math.random() * 8;
      s.style.cssText = `left:${x}px;top:${y}px;width:${z}px;height:${z}px`;
      document.body.appendChild(s);
      requestAnimationFrame(() => { s.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${(Math.random() * 180) | 0}deg) scale(.2)`; s.style.opacity = "0"; });
      setTimeout(() => s.remove(), 1100);
    }
  };
  $$(".os-live").forEach((el) => {
    let rot = 0, vr = 0, drag = null, moved = 0;
    const star = $(".os-live-star", el);
    const ang = (e) => { const r = el.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    const spin = () => {
      if (!drag) { rot += vr; vr *= 0.95; const snap = Math.round(rot / 90) * 90; if (Math.abs(vr) < 0.6) rot += (snap - rot) * 0.08; }
      star.style.setProperty("--rot", rot.toFixed(1) + "deg");
      if (drag || Math.abs(vr) > 0.05 || Math.abs(rot - Math.round(rot / 90) * 90) > 0.2) requestAnimationFrame(spin); else el._sp = 0;
    };
    const kick = () => { if (!el._sp) { el._sp = 1; requestAnimationFrame(spin); } };
    el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { vr += 6; kick(); } });
    el.addEventListener("pointerdown", (e) => { drag = ang(e); moved = 0; el.setPointerCapture(e.pointerId); acted = true; kick(); });
    el.addEventListener("pointermove", (e) => { if (drag == null) return; let a = ang(e), da = a - drag; if (da > 180) da -= 360; if (da < -180) da += 360; rot += da; vr = da; moved += Math.abs(da); drag = a; if (moved > 20) tick(); });
    const end = (e) => {
      if (drag == null) return; drag = null;
      if (moved < 8) { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); vr += 14; snd.ok(); }
      kick();
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const r = el.getBoundingClientRect(); burst(r.left + 10, r.top + 10); vr += 14; kick(); } });
  });
  $$(".os-div").forEach((d) => d.addEventListener("pointerdown", (e) => {
    const m = $(".os-mark", d), r = m.getBoundingClientRect();
    if (Math.abs(e.clientX - (r.left + r.width / 2)) < 60) { burst(r.left + r.width / 2, r.top + r.height / 2, 10); acted = true; snd.sel(); m.classList.remove("flash"); void m.offsetWidth; m.classList.add("flash"); }
  }));
  const osr = $(".os-rail");
  if (osr) {
    const upd = () => { const h = Math.max(1, document.documentElement.scrollHeight - innerHeight); osr.style.setProperty("--sp", clamp(scrollY / h).toFixed(4)); osr.classList.toggle("on", scrollY > 80); };
    upd(); addEventListener("scroll", upd, { passive: true });
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
    dive(); addEventListener("scroll", dive, { passive: true });
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
    upd(); addEventListener("scroll", upd, { passive: true });
  }

  /* ---------- App install page ---------- */
  let deferred = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; document.documentElement.classList.add("can-install"); });
  const ib = $(".install-btn");
  if (ib) {
    const status = $(".app-status"), ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const say = (k) => { status.dataset.i18n = k; status.textContent = t(k); };
    $$(".plat").forEach((p) => p.classList.toggle("here", p.dataset.plat === (ios ? "ios" : android ? "android" : "desktop")));
    if (standalone) say("app.using");
    const sheetEl = $(".ios-sheet");
    const openIOS = () => { sheetEl.hidden = false; snd.open(); $(".ios-close", sheetEl).focus(); };
    sheetEl?.addEventListener("click", (e) => { if (e.target === sheetEl || e.target.closest(".ios-close")) { sheetEl.hidden = true; snd.tap(); } });
    ib.addEventListener("click", async () => {
      if (deferred) {
        deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null;
        if (r && r.outcome === "accepted") { say("app.done"); snd.ok(); }
      } else if (ios) openIOS();
      else { say("app.other"); document.getElementById("how")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
    });
    addEventListener("appinstalled", () => { say("app.done"); snd.ok(); });
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
    const upd = () => dock.classList.toggle("on", !closed && !footIn && scrollY > innerHeight * 0.7 && !document.body.classList.contains("lang-open"));
    addEventListener("scroll", upd, { passive: true }); upd();
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
