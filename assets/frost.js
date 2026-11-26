/* Bejustt — the frozen first issue
   The cover is completely frozen. Touch or drag to melt a window into the ice:
   the cleared glass gets tiny beads of water at its edge, the ice crackles softly,
   and then the crystals slowly grow back in from the edges. Frost glints catch
   the light as you move. */
(() => {
  const posters = [...document.querySelectorAll(".poster")];
  if (!posters.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const GX = 18, GY = 24;   // coarse grid tracking how much ice is left (for glints)

  // ---- soft ice crackle (Web Audio, no files) ----
  let lastCrack = 0;
  const crackle = (k = 1) => {
    const now = performance.now(); if (now - lastCrack < 90) return; lastCrack = now;
    try { navigator.vibrate?.(3); } catch {}
    try { if (localStorage.getItem("bj-snd") === "0") return; } catch {}
    try {
      const A = window.__bjAC || (window.__bjAC = new (window.AudioContext || window.webkitAudioContext)());
      if (A.state === "suspended") A.resume();
      const t = A.currentTime, n = Math.round(A.sampleRate * 0.03), buf = A.createBuffer(1, n, A.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() < 0.08 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.15) * Math.pow(1 - i / n, 3);
      const src = A.createBufferSource(), hp = A.createBiquadFilter(), g = A.createGain();
      src.buffer = buf; hp.type = "highpass"; hp.frequency.value = 3500 + Math.random() * 2500; g.gain.value = 0.05 * k;
      src.connect(hp).connect(g).connect(A.destination); src.start(t);
    } catch {}
  };

  function makeTexture(w, h, scale) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "rgba(222,232,250,.80)"); g.addColorStop(0.5, "rgba(198,212,242,.72)"); g.addColorStop(1, "rgba(214,226,250,.82)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {   // cloudy patches: frost is never uniform
      const px = Math.random() * w, py = Math.random() * h, r = (40 + Math.random() * 120) * scale;
      const cg = x.createRadialGradient(px, py, 0, px, py, r), a = Math.random() < 0.5 ? 0.14 : -0.1;
      cg.addColorStop(0, a > 0 ? `rgba(255,255,255,${a})` : `rgba(160,180,225,${-a})`); cg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = cg; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    const edge = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    edge.addColorStop(0, "rgba(255,255,255,0)"); edge.addColorStop(1, "rgba(245,249,255,.42)");
    x.fillStyle = edge; x.fillRect(0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data;   // fine grain
    for (let i = 0; i < d.length; i += 4) {
      const n = Math.random();
      d[i + 3] = Math.max(0, Math.min(255, d[i + 3] + (n > 0.985 ? 60 : (n - 0.5) * 30)));
      if (n > 0.994) d[i] = d[i + 1] = d[i + 2] = 255;
    }
    x.putImageData(id, 0, 0);
    x.lineCap = "round";   // fern-like crystals grown in from the edges
    const branch = (px, py, ang, len, depth) => {
      if (depth <= 0 || len < 1.5) return;
      const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
      x.strokeStyle = `rgba(255,255,255,${0.14 + depth * 0.07})`; x.lineWidth = Math.max(0.35, depth * 0.42) * scale;
      x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
      const steps = 3 + ((Math.random() * 3) | 0);
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1), bx = px + (ex - px) * t, by = py + (ey - py) * t, bl = len * (0.44 - t * 0.22);
        branch(bx, by, ang + 1.05 + Math.random() * 0.2, bl, depth - 1);
        branch(bx, by, ang - 1.05 - Math.random() * 0.2, bl, depth - 1);
      }
      if (Math.random() < 0.65) branch(ex, ey, ang + (Math.random() - 0.5) * 0.5, len * 0.62, depth - 1);
    };
    const seeds = Math.round((w + h) / (11 * scale));
    for (let i = 0; i < seeds; i++) {
      const side = (Math.random() * 4) | 0, r = Math.random();
      const px = side === 0 ? r * w : side === 1 ? w : side === 2 ? r * w : 0;
      const py = side === 0 ? 0 : side === 1 ? r * h : side === 2 ? h : r * h;
      branch(px, py, Math.atan2(h / 2 - py, w / 2 - px) + (Math.random() - 0.5) * 1.2, (22 + Math.random() * 60) * scale, 4);
    }
    for (let i = 0; i < seeds * 0.9; i++) {
      const px = Math.random() * w, py = Math.random() * h, rot = Math.random();
      for (let k = 0; k < 6; k++) branch(px, py, (k * Math.PI) / 3 + rot, (2 + Math.random() * 7) * scale, 2);
    }
    return c;
  }
  // frost that is strong at the edges and faint in the middle: regrowth creeps inward
  function edgeWeighted(tex, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.drawImage(tex, 0, 0); x.globalCompositeOperation = "destination-in";
    const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, "rgba(0,0,0,.12)"); g.addColorStop(1, "rgba(0,0,0,1)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    return c;
  }

  posters.forEach((poster) => {
    poster.classList.add("frozen");
    const art = document.createElement("div"); art.className = "p-art";
    [...poster.children].filter((c) => !c.matches(".p-glare")).forEach((c) => art.appendChild(c));
    poster.prepend(art);
    const canvas = document.createElement("canvas"); canvas.className = "p-frost"; canvas.setAttribute("aria-hidden", "true");
    const glints = document.createElement("canvas"); glints.className = "p-glints"; glints.setAttribute("aria-hidden", "true");
    poster.appendChild(canvas); poster.appendChild(glints);
    const glare = poster.querySelector(".p-glare"); if (glare) poster.appendChild(glare);
    const ctx = canvas.getContext("2d"), gctx = glints.getContext("2d");
    let W = 0, H = 0, dpr = 1, tex = null, edgeTex = null, sparks = [];
    const ice = new Float32Array(GX * GY).fill(1);

    const setup = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = poster.offsetWidth, h = poster.offsetHeight; if (!w || !h) return;
      W = Math.round(w * dpr); H = Math.round(h * dpr);
      canvas.width = glints.width = W; canvas.height = glints.height = H;
      const sc = dpr * (w / 420);
      tex = makeTexture(W, H, sc); edgeTex = edgeWeighted(tex, W, H);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.drawImage(tex, 0, 0);
      ice.fill(1);
      sparks = Array.from({ length: Math.round(46 * (w / 420)) }, () => ({ x: Math.random(), y: Math.random(), s: (0.6 + Math.random()) * sc, ph: Math.random() * 6.28, dir: Math.random() * 6.28 }));
    };
    setup();
    new ResizeObserver(() => { const w = Math.round(poster.offsetWidth * dpr); if (w && Math.abs(w - W) > 4) setup(); }).observe(poster);

    let last = null, down = false;
    const beads = (x, y, r) => {   // tiny water beads around the edge of the cleared glass
      ctx.save(); ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.28, rr = r * (0.78 + Math.random() * 0.18), bx = x + Math.cos(a) * rr, by = y + Math.sin(a) * rr, s = (0.8 + Math.random() * 1.6) * dpr;
        const g = ctx.createRadialGradient(bx - s * 0.3, by - s * 0.3, 0, bx, by, s);
        g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.5, "rgba(225,236,255,.45)"); g.addColorStop(1, "rgba(120,145,200,.25)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, s, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    };
    const melt = (x, y, strength, withBeads) => {
      const r = W * 0.11;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(0.62, `rgba(0,0,0,${strength * 0.6})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); ctx.restore();
      if (withBeads) beads(x, y, r);
      const cx = Math.floor((x / W) * GX), cy = Math.floor((y / H) * GY), rad = 2;
      for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
        const gx = cx + i, gy = cy + j; if (gx < 0 || gy < 0 || gx >= GX || gy >= GY) continue;
        const f = Math.max(0, 1 - Math.hypot(i, j) / (rad + 0.5)); ice[gy * GX + gx] = Math.max(0, ice[gy * GX + gx] - strength * f * 1.4);
      }
    };
    const local = (e) => { const r = poster.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    const trail = (e, s) => {
      const p = local(e);
      if (last) {
        const dx = p[0] - last[0], dy = p[1] - last[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (W * 0.025)));
        for (let i = 1; i <= n; i++) melt(last[0] + (dx * i) / n, last[1] + (dy * i) / n, s, i === n);
        if (down) crackle(0.7);
      } else { melt(p[0], p[1], s * 1.7, true); if (down) crackle(1); }
      last = p;
    };
    let px = 0.5, py = 0.4;
    poster.addEventListener("pointerdown", (e) => { down = true; last = null; trail(e, 0.36); });
    poster.addEventListener("pointermove", (e) => {
      const r = poster.getBoundingClientRect(); px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height;
      if (down || e.pointerType === "mouse") trail(e, down ? 0.34 : 0.1);
    });
    const up = () => { down = false; last = null; };
    poster.addEventListener("pointerup", up); poster.addEventListener("pointerleave", up); poster.addEventListener("pointercancel", up);

    let visible = false, raf = 0, prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(64, now - prev) / 16.67; prev = now;
      // the ice grows back, from the edges in — only while there is melted ice to regrow
      let thawed = false; for (let i = 0; i < ice.length; i++) if (ice[i] < 1) { thawed = true; break; }
      if (tex && !reduce && thawed) {
        ctx.save(); ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.014 * dt; ctx.drawImage(edgeTex, 0, 0);
        ctx.globalAlpha = 0.0035 * dt; ctx.drawImage(tex, 0, 0);
        ctx.restore();
        for (let i = 0; i < ice.length; i++) ice[i] = Math.min(1, ice[i] + 0.0022 * dt);
      }
      gctx.clearRect(0, 0, W, H);   // glints: crystals catch the light as the pointer / tilt moves
      const lx = fine ? px : 0.5 + (parseFloat(poster.style.getPropertyValue("--ry")) || 0) / 30;
      for (const s of sparks) {
        const cell = ice[Math.min(GY - 1, (s.y * GY) | 0) * GX + Math.min(GX - 1, (s.x * GX) | 0)];
        if (cell < 0.55) continue;
        const facing = Math.cos(s.dir + (lx - s.x) * 5 + (py - s.y) * 3);
        const tw = reduce ? 0.4 : Math.max(0, facing) ** 6 * (0.6 + 0.4 * Math.sin(now / 400 + s.ph));
        if (tw < 0.04) continue;
        const X = s.x * W, Y = s.y * H, L = s.s * 7 * tw;
        gctx.globalAlpha = Math.min(1, tw) * (cell - 0.5) * 2;
        gctx.strokeStyle = "#fff"; gctx.lineWidth = s.s * 0.8;
        gctx.beginPath(); gctx.moveTo(X - L, Y); gctx.lineTo(X + L, Y); gctx.moveTo(X, Y - L); gctx.lineTo(X, Y + L); gctx.stroke();
        const g = gctx.createRadialGradient(X, Y, 0, X, Y, L * 0.8); g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
        gctx.fillStyle = g; gctx.beginPath(); gctx.arc(X, Y, L * 0.8, 0, 6.2832); gctx.fill();
      }
      gctx.globalAlpha = 1;
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { cancelAnimationFrame(raf); prev = performance.now(); raf = requestAnimationFrame(loop); } }).observe(poster);
  });
})();
