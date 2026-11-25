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

  /* ---------- Call for writers: three steps arrive from the depth ---------- */
  const wd = $(".write-deep");
  if (wd) {
    const steps = $$(".wd-step", wd), rail = $$(".wd-rail i", wd); let lastF = -1;
    const run = () => {
      const r = wd.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? 2 : clamp(-r.top / Math.max(1, r.height - vh)) * 2.15;
      steps.forEach((el, i) => {
        const d = p - i;
        const op = d < 0 ? clamp(1 + d * 1.15) : clamp(1 - Math.max(0, d - 0.35) * 2.4);
        el.style.opacity = op.toFixed(3);
        el.style.transform = `translate3d(0, ${(-d * 46).toFixed(1)}px, ${(d * 620).toFixed(1)}px)`;
        el.style.filter = `blur(${Math.min(12, Math.abs(d < 0 ? d : Math.max(0, d - 0.25)) * 9).toFixed(2)}px)`;
        el.style.pointerEvents = Math.abs(d) < 0.4 ? "auto" : "none";
      });
      const f = Math.min(2, Math.round(p));
      rail.forEach((x, i) => x.classList.toggle("on", i <= f));
      if (f !== lastF && lastF !== -1) tick();
      lastF = f;
      wd.style.setProperty("--hp", clamp(p / 1.2).toFixed(3));
    };
    run(); addEventListener("scroll", run, { passive: true }); addEventListener("resize", run);
  }

  /* ---------- Interviews: a field of voices in depth ---------- */
  const vf = $(".voice-field");
  if (vf) {
    const g = vf.getContext("2d"); let W = 0, H = 0, D = 1, energy = 0, vis = false, pulses = [];
    const rows = 9, cols = 46;
    const size = () => { D = Math.min(devicePixelRatio || 1, 2); W = vf.clientWidth; H = vf.clientHeight; vf.width = W * D; vf.height = H * D; };
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(vf);
    const host = vf.closest(".tile");
    host.addEventListener("pointermove", () => { energy = Math.min(1, energy + 0.06); }, { passive: true });
    host.addEventListener("pointerdown", (e) => {
      const r = vf.getBoundingClientRect(); pulses.push({ x: clamp((e.clientX - r.left) / r.width), t: performance.now() }); energy = 1;
    }, { passive: true });
    const draw = (now) => {
      requestAnimationFrame(draw);
      if (!vis || !W) return;
      const t = reduce ? 3 : now / 1000; energy *= 0.985;
      pulses = pulses.filter((p) => now - p.t < 2400);
      g.setTransform(D, 0, 0, D, 0, 0); g.clearRect(0, 0, W, H);
      const lightT = document.documentElement.dataset.theme === "light";
      const tl = host.style.getPropertyValue("--tx") || 0;
      for (let r = rows - 1; r >= 0; r--) {
        const z = 1 + r * 0.42, sc = 1 / z;
        for (let c = 0; c < cols; c++) {
          const u = c / (cols - 1), xw = (u - 0.5) * 2;
          const env = Math.exp(-xw * xw * 2.2);
          let a = Math.sin(u * 14 + t * 2.1 + r * 0.7) * 0.5 + Math.sin(u * 31 - t * 3.3 + r) * 0.28 + Math.sin(u * 6 + t * 0.9) * 0.4;
          for (const p of pulses) { const k = (now - p.t) / 1000, dd = Math.abs(u - p.x) - k * 0.55; a += Math.exp(-dd * dd * 160) * (1 - k / 2.4) * 2.2 * Math.sin(dd * 60); }
          const amp = (0.22 + energy * 0.45) * env * a;
          const x = W / 2 + (xw * W * 0.52 + tl * 18 * r) * sc;
          const y = H * 0.62 - r * H * 0.075 * sc * 1.4 + amp * H * 0.42 * sc;
          const rad = (1.1 + (1 - r / rows) * 1.6) * (0.8 + Math.abs(amp) * 0.9);
          const al = (0.18 + 0.82 * (1 - r / rows)) * (0.35 + env * 0.65);
          g.fillStyle = lightT ? `rgba(11,20,38,${al.toFixed(3)})` : `rgba(235,242,255,${al.toFixed(3)})`;
          g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
        }
      }
    };
    size(); addEventListener("resize", size); requestAnimationFrame(draw);
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
