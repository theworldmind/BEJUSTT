/* Bejustt — interactions
   Sounds are generated with Web Audio (no files), Apple clock-wheel style. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

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
      const A = ctx(), t = A.currentTime, out = A.createGain();
      out.gain.value = vol; out.connect(A.destination);
      if (nz) {
        const s = A.createBufferSource(), h = A.createBiquadFilter(), g = A.createGain();
        s.buffer = noise(A); h.type = "highpass"; h.frequency.value = hp; g.gain.value = nz;
        s.connect(h).connect(g).connect(out); s.start(t);
      }
      const o = A.createOscillator(), g = A.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2 || f * 0.82, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.0008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.01);
      if (body) {
        const b = A.createOscillator(), bg = A.createGain();
        b.type = "triangle"; b.frequency.setValueAtTime(body, t);
        bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.55, t + 0.0006); bg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
        b.connect(bg).connect(out); b.start(t); b.stop(t + dur);
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
      const A = ctx(), t = A.currentTime, out = A.createGain(), j = 1 + ((tickN++ % 3) - 1) * 0.008;
      out.gain.value = fast ? 0.09 : 0.13; out.connect(A.destination);
      const ns = A.createBufferSource(), bp = A.createBiquadFilter(), ng = A.createGain();
      ns.buffer = noise(A); bp.type = "bandpass"; bp.frequency.value = 3400 * j; bp.Q.value = 0.9;
      ng.gain.setValueAtTime(0.9, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.0022);
      ns.connect(bp).connect(ng).connect(out); ns.start(t); ns.stop(t + 0.004);
      for (const [f, a, d] of [[1900, 1, 0.007], [3800, 0.32, 0.0035], [5600, 0.12, 0.002]]) {
        const o = A.createOscillator(), g = A.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(f * j * 1.04, t); o.frequency.exponentialRampToValueAtTime(f * j, t + d);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a, t + 0.0003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.004);
      }
    } catch {}
  }
  const snd = {
    tap() { blip({ f: 1900, f2: 1500, body: 760, vol: 0.045, dur: 0.011, nz: 0.45, hp: 2400 }); haptic(2); },
    on() { blip({ f: 1650, f2: 1500, body: 820, vol: 0.09, dur: 0.022, nz: 0.35, hp: 2200 }); haptic(5); },
    off() { blip({ f: 1150, f2: 1000, body: 600, vol: 0.08, dur: 0.022, nz: 0.3, hp: 1800 }); haptic(5); },
    drop() { blip({ f: 520, f2: 380, body: 260, vol: 0.12, dur: 0.06, nz: 0.4, hp: 1200 }); haptic(8); },
  };
  addEventListener("touchstart", () => { try { ctx(); } catch {} }, { once: true, passive: true });
  document.addEventListener("click", (e) => { if (e.target.closest(".btn, .nav-links a, .nav-logo, .footer nav a")) snd.tap(); });

  /* ---------- Sound switch ---------- */
  $$(".switch").forEach((sw) => {
    const sync = () => sw.setAttribute("aria-checked", soundOn() ? "true" : "false");
    sync();
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

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Manifesto: words light up as you read ---------- */
  const st = $(".manifesto .statement");
  if (st) {
    st.innerHTML = st.textContent.trim().split(/\s+/).map((w) =>
      `<span${/justice|heard|voices/i.test(w) ? ' class="r"' : ""}>${w}</span>`).join(" ");
    const sp = $$("span", st);
    const light = () => {
      const r = st.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? 1 : clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25));
      const n = Math.round(p * sp.length);
      sp.forEach((s, i) => s.classList.toggle("lit", i < n));
    };
    light(); addEventListener("scroll", light, { passive: true });
  }

  /* ---------- Scales scene ---------- */
  const scene = $(".scene");
  if (scene) {
    const beam = $("#beam"), pl = $("#panL"), pr = $("#panR"), orb = $("#orb"), lines = $$(".scene-copy .line");
    const R = 220, CX = 300, CY = 109;
    let dropped = false, last = -1;
    const paint = () => {
      const r = scene.getBoundingClientRect();
      const p = reduce ? 1 : clamp(-r.top / (r.height - innerHeight));
      const q = clamp((p - 0.12) / 0.42);           // orb falling
      const b = clamp((p - 0.5) / 0.22);            // beam levelling
      const deg = -11 * (1 - ease(b)) + Math.sin(b * Math.PI) * 1.6;
      const a = (deg * Math.PI) / 180;
      const lx = CX - R * Math.cos(a), ly = CY - R * Math.sin(a);
      const rx = CX + R * Math.cos(a), ry = CY + R * Math.sin(a);
      beam.setAttribute("transform", `rotate(${deg} ${CX} ${CY})`);
      pl.setAttribute("transform", `translate(${lx} ${ly})`);
      pr.setAttribute("transform", `translate(${rx} ${ry})`);
      const oy = -170 + (ry + 140 + 170) * (q * q);
      orb.setAttribute("transform", `translate(${rx} ${q >= 1 ? ry + 140 : oy})`);
      orb.style.opacity = clamp(q * 4);
      if (q >= 1 && !dropped) { dropped = true; snd.drop(); }
      if (q < 0.95) dropped = false;
      const idx = p < 0.3 ? 0 : p < 0.7 ? 1 : 2;
      if (idx !== last) {
        lines.forEach((l, i) => { l.classList.toggle("off", i > idx); l.classList.toggle("past", i < idx); });
        last = idx;
      }
    };
    paint(); addEventListener("scroll", paint, { passive: true }); addEventListener("resize", paint);
  }

  /* ---------- Wheel picker (iOS style) ---------- */
  const wheel = $(".wheel");
  if (wheel) {
    const ul = $("ul", wheel), items = $$("li", wheel), H = 72;
    let cur = -1, user = false, raf = 0;
    const pad = () => { const p = (wheel.clientHeight - H) / 2; ul.style.padding = `${p}px 0`; };
    const paint = () => {
      raf = 0;
      const c = wheel.scrollTop + wheel.clientHeight / 2;
      items.forEach((li, i) => {
        const d = (li.offsetTop + H / 2 - c) / H, ad = Math.abs(d);
        const w = li.firstElementChild;
        w.style.transform = `rotateX(${clamp(-d * 20, -80, 80)}deg) scale(${1 - Math.min(ad, 3) * 0.11})`;
        w.style.opacity = String(clamp(1 - ad * 0.3, 0.08, 1));
      });
      const idx = Math.round((c - ul.offsetTop - parseFloat(ul.style.paddingTop || 0) - H / 2) / H);
      const i = clamp(idx, 0, items.length - 1);
      if (i !== cur) {
        items[cur]?.classList.remove("on"); items[i].classList.add("on");
        if (user && cur !== -1) tick();
        cur = i;
      }
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const goTo = (i, smooth = true) => wheel.scrollTo({ top: i * H, behavior: smooth && !reduce ? "smooth" : "auto" });
    pad();
    const start = items.findIndex((li) => li.dataset.start !== undefined);
    goTo(start < 0 ? 0 : start, false); paint();
    wheel.addEventListener("scroll", req, { passive: true });
    ["pointerdown", "wheel", "touchstart", "keydown"].forEach((n) => wheel.addEventListener(n, () => { user = true; }, { passive: true }));
    items.forEach((li, i) => li.addEventListener("click", () => { user = true; goTo(i); }));
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
      goTo(Math.round(c / H));
    });
    wheel.addEventListener("click", (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    addEventListener("resize", () => { pad(); goTo(cur, false); req(); });
  }

  /* ---------- Year ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
