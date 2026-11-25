/* Bejustt — Europe globe
   Orthographic dotted globe with glowing capitals and light arcs between the
   countries we are in conversation with. Drag to rotate (with clock ticks). */
(() => {
  const stage = document.querySelector(".globe-stage");
  const D = window.BJ_GLOBE;
  if (!stage || !D) return;
  const canvas = stage.querySelector("canvas"), ctx = canvas.getContext("2d");
  const tip = stage.querySelector(".globe-tip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RAD = Math.PI / 180;
  const snd = () => window.BJ_snd || {};

  const dots = [];
  for (let i = 0; i < D.dots.length; i += 2) {
    const la = D.dots[i] * RAD, lo = D.dots[i + 1] * RAD;
    dots.push([Math.cos(la), Math.sin(la), lo]);
  }
  const caps = D.caps.map(([n, la, lo, c]) => ({ n, la: la * RAD, lo: lo * RAD, c, x: 0, y: 0, z: 0 }));
  const byName = Object.fromEntries(caps.map((c) => [c.n, c]));
  const ARCS = [["Ankara", "Bucharest"], ["Bucharest", "Chișinău"], ["Chișinău", "Kyiv"], ["Ankara", "Rome"], ["Rome", "Paris"], ["Paris", "Madrid"], ["Rome", "Madrid"], ["Kyiv", "Paris"]]
    .map(([a, b], i) => ({ a: byName[a], b: byName[b], off: i * 0.37 })).filter((a) => a.a && a.b);

  let W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.43; cx = W / 2; cy = H / 2;
  };

  // View state
  const BASE_LON = 16, BASE_LAT = 47;
  let lon0 = BASE_LON, lat0 = BASE_LAT, dLon = 0, dLat = 0, vLon = 0, vLat = 0, drag = null, tickAcc = 0;
  let sinL = 0, cosL = 1;
  const project = (cl, sl, lo) => {
    const dl = lo - lon0 * RAD, cd = Math.cos(dl);
    return [cl * Math.sin(dl), cosL * sl - sinL * cl * cd, sinL * sl + cosL * cl * cd];
  };
  const proj3 = (la, lo) => project(Math.cos(la), Math.sin(la), lo);

  // Great-circle point between two capitals, lifted above the surface
  const slerp = (a, b, t) => {
    const va = [Math.cos(a.la) * Math.cos(a.lo), Math.cos(a.la) * Math.sin(a.lo), Math.sin(a.la)];
    const vb = [Math.cos(b.la) * Math.cos(b.lo), Math.cos(b.la) * Math.sin(b.lo), Math.sin(b.la)];
    const dot = Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]), om = Math.acos(dot), so = Math.sin(om) || 1;
    const k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so;
    const v = [k1 * va[0] + k2 * vb[0], k1 * va[1] + k2 * vb[1], k1 * va[2] + k2 * vb[2]];
    const la = Math.asin(v[2]), lo = Math.atan2(v[1], v[0]);
    const p = proj3(la, lo), lift = 1 + 0.09 * Math.sin(Math.PI * t) * Math.min(1, om * 3);
    return [p[0] * lift, p[1] * lift, p[2]];
  };

  let hover = null, light = false;
  function draw(t) {
    light = document.documentElement.dataset.theme === "light";
    const ink = light ? "11,20,38" : "255,255,255";
    sinL = Math.sin(lat0 * RAD); cosL = Math.cos(lat0 * RAD);
    ctx.clearRect(0, 0, W, H);

    // atmosphere
    const atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.28);
    atm.addColorStop(0, light ? "rgba(40,70,140,.16)" : "rgba(160,180,225,.20)");
    atm.addColorStop(0.35, light ? "rgba(40,70,140,.05)" : "rgba(90,115,180,.08)");
    atm.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2); ctx.fill();

    // sphere body
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    if (light) { body.addColorStop(0, "#ffffff"); body.addColorStop(1, "#dfe6f2"); }
    else { body.addColorStop(0, "#14244a"); body.addColorStop(0.55, "#0a1630"); body.addColorStop(1, "#050b1a"); }
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // graticule
    ctx.lineWidth = 0.6; ctx.strokeStyle = `rgba(${ink},${light ? 0.07 : 0.06})`;
    for (let la = -60; la <= 80; la += 20) {
      ctx.beginPath(); let pen = false;
      for (let lo = -180; lo <= 180; lo += 4) {
        const p = proj3(la * RAD, lo * RAD);
        if (p[2] > 0) { const X = cx + p[0] * R, Y = cy - p[1] * R; pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); pen = true; } else pen = false;
      }
      ctx.stroke();
    }
    for (let lo = -180; lo < 180; lo += 20) {
      ctx.beginPath(); let pen = false;
      for (let la = -80; la <= 80; la += 4) {
        const p = proj3(la * RAD, lo * RAD);
        if (p[2] > 0) { const X = cx + p[0] * R, Y = cy - p[1] * R; pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); pen = true; } else pen = false;
      }
      ctx.stroke();
    }

    // land dots, bucketed by depth for speed
    const buckets = [[], [], [], [], []];
    for (const d of dots) {
      const p = project(d[0], d[1], d[2]);
      if (p[2] <= 0.02) continue;
      buckets[Math.min(4, (p[2] * 5) | 0)].push(cx + p[0] * R, cy - p[1] * R);
    }
    const ds = Math.max(1.1, R / 230);
    buckets.forEach((b, i) => {
      if (!b.length) return;
      const a = light ? 0.18 + i * 0.12 : 0.16 + i * 0.15;
      ctx.fillStyle = `rgba(${ink},${a})`;
      const s = ds * (0.75 + i * 0.07);
      ctx.beginPath();
      for (let k = 0; k < b.length; k += 2) { ctx.moveTo(b[k] + s, b[k + 1]); ctx.arc(b[k], b[k + 1], s, 0, Math.PI * 2); }
      ctx.fill();
    });

    // arcs
    const T = reduce ? 0.5 : t / 1000;
    for (const arc of ARCS) {
      const pa = proj3(arc.a.la, arc.a.lo), pb = proj3(arc.b.la, arc.b.lo);
      if (pa[2] < 0.05 || pb[2] < 0.05) continue;
      ctx.beginPath();
      for (let s = 0; s <= 32; s++) { const p = slerp(arc.a, arc.b, s / 32); const X = cx + p[0] * R, Y = cy - p[1] * R; s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.strokeStyle = `rgba(${ink},${light ? 0.3 : 0.28})`; ctx.lineWidth = 1.1; ctx.stroke();
      const head = ((T * 0.22 + arc.off) % 1.6) / 1.6;
      if (head < 1) {
        for (let s = 0; s < 10; s++) {
          const tt = head - s * 0.018; if (tt < 0) break;
          const p = slerp(arc.a, arc.b, tt);
          ctx.fillStyle = `rgba(${ink},${(1 - s / 10) * 0.9})`;
          ctx.beginPath(); ctx.arc(cx + p[0] * R, cy - p[1] * R, 2.2 * (1 - s / 14), 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // capitals
    for (const c of caps) {
      const p = proj3(c.la, c.lo); c.z = p[2]; c.x = cx + p[0] * R; c.y = cy - p[1] * R;
      if (c.z <= 0.05) continue;
      const a = Math.min(1, c.z * 1.6), on = hover === c;
      if (c.c) {
        const pulse = reduce ? 0.5 : (T * 0.6 + c.la) % 1;
        ctx.strokeStyle = `rgba(${ink},${(1 - pulse) * 0.55 * a})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(c.x, c.y, 4 + pulse * 14, 0, Math.PI * 2); ctx.stroke();
      }
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.c ? 14 : 9);
      g.addColorStop(0, `rgba(${ink},${(c.c ? 0.55 : 0.35) * a})`); g.addColorStop(1, `rgba(${ink},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.c ? 14 : 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${ink},${a})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, (c.c ? 2.8 : 1.9) * (on ? 1.6 : 1), 0, Math.PI * 2); ctx.fill();
    }

    // rim
    ctx.strokeStyle = `rgba(${ink},${light ? 0.12 : 0.14})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  }

  // Interaction
  const pick = (x, y) => {
    let best = null, bd = 16;
    for (const c of caps) { if (c.z <= 0.1) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } }
    return best;
  };
  const showTip = (c) => {
    if (c === hover) return;
    hover = c;
    if (!c) { tip.classList.remove("on"); return; }
    tip.textContent = c.n; tip.classList.toggle("contact", !!c.c);
    tip.style.transform = `translate(${c.x}px, ${c.y - 18}px) translate(-50%, -100%)`;
    tip.classList.add("on"); snd().sel?.();
  };
  stage.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, lon: dLon, lat: dLat, t: performance.now(), lx: e.clientX, ly: e.clientY };
    stage.setPointerCapture(e.pointerId); stage.classList.add("grab");
  });
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    if (drag) {
      const k = 120 / R;
      const nl = Math.max(-55, Math.min(55, drag.lon - (e.clientX - drag.x) * k));
      const nt = Math.max(-22, Math.min(22, drag.lat + (e.clientY - drag.y) * k));
      tickAcc += Math.abs(nl - dLon) + Math.abs(nt - dLat);
      if (tickAcc > 5) { tickAcc = 0; window.BJ_tick?.(); }
      const now = performance.now(), dt = Math.max(16, now - drag.t);
      vLon = (nl - dLon) / dt * 16; vLat = (nt - dLat) / dt * 16; drag.t = now;
      dLon = nl; dLat = nt;
      showTip(null);
    } else if (e.pointerType === "mouse") showTip(pick(e.clientX - r.left, e.clientY - r.top));
  });
  const end = (e) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6;
    drag = null; stage.classList.remove("grab");
    if (!moved) { const r = stage.getBoundingClientRect(); showTip(pick(e.clientX - r.left, e.clientY - r.top)); }
  };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerleave", () => { if (!drag) showTip(null); });

  // Loop (only while visible)
  let raf = 0, visible = false, last = performance.now(), idle = 0;
  const loop = (now) => {
    const dt = Math.min(64, now - last); last = now;
    if (!drag) {
      dLon += vLon; dLat += vLat; vLon *= 0.93; vLat *= 0.93;
      dLon = Math.max(-55, Math.min(55, dLon)); dLat = Math.max(-22, Math.min(22, dLat));
      if (Math.abs(vLon) + Math.abs(vLat) < 0.02) { idle += dt; if (idle > 2500) { dLon *= 0.985; dLat *= 0.985; } } else idle = 0;
    } else idle = 0;
    const sway = reduce ? 0 : Math.sin(now / 9000) * 9;
    lon0 = BASE_LON + dLon + sway; lat0 = BASE_LAT + dLat;
    draw(now);
    if (hover) tip.style.transform = `translate(${hover.x}px, ${hover.y - 18}px) translate(-50%, -100%)`;
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: "100px" }).observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
  addEventListener("resize", () => { size(); draw(performance.now()); });
  size(); draw(performance.now());
})();
