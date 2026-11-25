/* Bejustt — Europe in depth
   A dotted map of Europe lying on a tilted plane in space. Capitals glow and
   send up columns of light; arcs of light connect the countries we talk with.
   The plane tilts as you scroll and leans gently toward the pointer. */
(() => {
  const stage = document.querySelector(".map-stage");
  const D = window.BJ_MAP;
  if (!stage || !D) return;
  const canvas = stage.querySelector("canvas"), ctx = canvas.getContext("2d");
  const tip = stage.querySelector(".map-tip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RAD = Math.PI / 180;
  const snd = () => window.BJ_snd || {};

  const N = D.dots.length / 2;
  const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N);
  const caps = D.caps.map(([n, x, y, c]) => ({ n, x, y, c, X: 0, Y: 0, Z: 0, k: 1 }));
  const by = Object.fromEntries(caps.map((c) => [c.n, c]));

  let W = 0, H = 0, dpr = 1, S = 1, F = 1, cx = 0, cy = 0, mobile = false;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mobile = W < 760;
    S = (mobile ? W * 1.5 : Math.min(W, H * 2.0)) / 64;
    F = Math.max(W, H) * 1.6; cx = W / 2; cy = H * 0.5;
  };

  let tilt = 55, yaw = 0, zoom = 1, mx = 0, my = 0, tmx = 0, tmy = 0;
  let ct = 1, st = 0, cyw = 1, syw = 0;
  // map units → camera space
  const xf = (x, y, h) => {
    const X = (x - 4) * S * zoom, Y = (y + 5.5) * S * zoom;
    let y3 = Y * ct + h * S * st, z3 = Y * st - h * S * ct;
    const x3 = X * cyw - z3 * syw; z3 = X * syw + z3 * cyw;
    return [x3, y3, z3];
  };
  const toScreen = (p) => { const k = F / (F + p[2]); return [cx + p[0] * k, cy - p[1] * k, k]; };

  let hover = null, light = false;
  function draw(t) {
    light = document.documentElement.dataset.theme === "light";
    const ink = light ? "11,20,38" : "255,255,255";
    ct = Math.cos(tilt * RAD); st = Math.sin(tilt * RAD); cyw = Math.cos(yaw * RAD); syw = Math.sin(yaw * RAD);
    ctx.clearRect(0, 0, W, H);

    // dots: brightness from depth + a slow light wave
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i < N; i++) {
      const p = xf(D.dots[i * 2], D.dots[i * 2 + 1], 0);
      if (F + p[2] < F * 0.2) { sx[i] = -9999; sy[i] = -9999; sz[i] = p[2]; continue; }
      const k = F / (F + p[2]); sx[i] = cx + p[0] * k; sy[i] = cy - p[1] * k; sz[i] = p[2];
      if (p[2] < zmin) zmin = p[2]; if (p[2] > zmax) zmax = p[2];
    }
    const zr = zmax - zmin || 1;
    const T = reduce ? 0.6 : t / 1000;
    const wave = ((T * 3.2) % 70) - 30;            // wave front moves west → east (map units)
    const B = 10, buckets = Array.from({ length: B }, () => []);
    for (let i = 0; i < N; i++) {
      if (sx[i] < -10 || sx[i] > W + 10 || sy[i] < -10 || sy[i] > H + 10) continue;
      const mxp = D.dots[i * 2], myp = D.dots[i * 2 + 1];
      const ex = Math.min(mxp + 26, 28 - mxp) / 9, ey = Math.min(myp + 24, 22 - myp) / 7;
      const ef = Math.min(1, Math.max(0, Math.min(ex, ey)));
      if (ef < 0.04) continue;
      const fade = ef * ef * (3 - 2 * ef);
      const near = 1 - (sz[i] - zmin) / zr, dx = mxp - wave;
      const boost = Math.exp(-(dx * dx) / 18);
      const v = Math.min(0.999, (near * 0.68 + boost * 0.42) * fade);
      buckets[(v * B) | 0].push(i);
    }
    const base = S * 0.085;
    for (let b = 0; b < B; b++) {
      const v = (b + 0.5) / B, a = light ? 0.12 + v * 0.6 : 0.07 + v * 0.8;
      ctx.fillStyle = `rgba(${ink},${a.toFixed(3)})`;
      ctx.beginPath();
      for (const i of buckets[b]) {
        const r = Math.max(0.55, base * (F / (F + sz[i])) * (0.9 + v * 0.25));
        ctx.moveTo(sx[i] + r, sy[i]); ctx.arc(sx[i], sy[i], r, 0, 6.2832);
      }
      ctx.fill();
    }


    // capitals: glow on the plane + a column of light
    const sorted = caps.slice();
    for (const c of sorted) { const p = xf(c.x, c.y, 0); const s = toScreen(p); c.X = s[0]; c.Y = s[1]; c.k = s[2]; c.Z = p[2]; }
    sorted.sort((a, b) => b.Z - a.Z);
    for (const c of sorted) {
      if (c.k <= 0.2 || c.X < -40 || c.X > W + 40 || c.Y < -40 || c.Y > H + 40) continue;
      const on = hover === c, k = c.k;
      // ground glow (flattened ellipse)
      const breathe = reduce ? 1 : 0.85 + 0.15 * Math.sin(T * 1.1 + c.x * 0.7);
      const gr = (c.c ? 1.1 : 0.6) * S * k * breathe;
      ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(1, Math.max(0.25, ct));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
      g.addColorStop(0, `rgba(${ink},${c.c ? 0.5 : 0.28})`); g.addColorStop(1, `rgba(${ink},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, gr, 0, 6.2832); ctx.fill();
      if (c.c) {
        const pulse = reduce ? 0.5 : (((T * 0.22 + c.x * 0.13) % 1) + 1) % 1;
        ctx.strokeStyle = `rgba(${ink},${(1 - pulse) * 0.6})`; ctx.lineWidth = 1.2 / Math.max(0.25, ct);
        ctx.beginPath(); ctx.arc(0, 0, gr * (0.3 + pulse * 1.6), 0, 6.2832); ctx.stroke();
      }
      ctx.restore();
      // column
      const hgt = c.c ? 4.2 : 1.3;
      const top = toScreen(xf(c.x, c.y, hgt));
      const lg = ctx.createLinearGradient(c.X, c.Y, top[0], top[1]);
      lg.addColorStop(0, `rgba(${ink},${c.c ? 0.95 : 0.55})`); lg.addColorStop(1, `rgba(${ink},0)`);
      ctx.strokeStyle = lg; ctx.lineWidth = (c.c ? 2 : 1.2) * Math.min(1.4, k); ctx.beginPath(); ctx.moveTo(c.X, c.Y); ctx.lineTo(top[0], top[1]); ctx.stroke();
      // point
      ctx.fillStyle = `rgba(${ink},1)`; ctx.beginPath(); ctx.arc(c.X, c.Y, (c.c ? 2.6 : 1.7) * Math.min(1.5, k) * (on ? 1.6 : 1), 0, 6.2832); ctx.fill();
      if (c.c && !mobile) {
        ctx.font = `600 ${Math.round(12 * Math.min(1.25, k))}px Inter, -apple-system, sans-serif`;
        ctx.fillStyle = `rgba(${ink},.85)`; ctx.textAlign = "center"; ctx.fillText(c.n, top[0], top[1] - 6);
      }
    }
  }

  // hover / tap
  const pick = (x, y) => { let best = null, bd = 18; for (const c of caps) { const d = Math.hypot(c.X - x, c.Y - y); if (d < bd) { bd = d; best = c; } } return best; };
  const place = () => { if (hover) tip.style.transform = `translate(${hover.X}px, ${hover.Y - 14}px) translate(-50%, -100%)`; };
  const setHover = (c) => {
    if (c === hover) return; hover = c;
    if (!c) { tip.classList.remove("on"); return; }
    tip.textContent = c.n; tip.classList.toggle("contact", !!c.c); place(); tip.classList.add("on"); snd().sel?.();
  };
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width) * 2 - 1; tmy = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (e.pointerType === "mouse") setHover(pick(e.clientX - r.left, e.clientY - r.top));
  });
  stage.addEventListener("pointerleave", () => { tmx = tmy = 0; setHover(null); });
  stage.addEventListener("click", (e) => { const r = stage.getBoundingClientRect(); setHover(pick(e.clientX - r.left, e.clientY - r.top)); });

  // loop while visible
  let raf = 0, visible = false;
  const loop = (now) => {
    const r = stage.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    const e = 1 - Math.pow(1 - p, 2);
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    const idle = reduce ? 0 : Math.sin(now / 4200) * 1.2;
    tilt = (mobile ? 42 : 52) - 16 * e + my * 3 + idle;
    yaw = mx * 5 + (reduce ? 0 : Math.sin(now / 7000) * 1.5);
    zoom = 0.94 + 0.08 * e;
    draw(now); place();
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }, { rootMargin: "120px" }).observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible) start(); });
  addEventListener("resize", () => { size(); draw(performance.now()); });
  size(); draw(performance.now());
})();
