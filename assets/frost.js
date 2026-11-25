/* Bejustt — frozen magazine cover
   A layer of frost covers each .poster. Around the BEJUSTT masthead the ice is
   slowly thawing. Touch or drag to melt the ice; it quietly freezes again. */
(() => {
  const posters = [...document.querySelectorAll(".poster")];
  if (!posters.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeTexture(w, h, scale) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    // base frost: milky blue-white, thicker towards the edges
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(214,226,248,.66)"); g.addColorStop(0.5, "rgba(190,206,240,.56)"); g.addColorStop(1, "rgba(206,220,248,.68)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const edge = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    edge.addColorStop(0, "rgba(255,255,255,0)"); edge.addColorStop(1, "rgba(240,246,255,.38)");
    x.fillStyle = edge; x.fillRect(0, 0, w, h);
    // grain
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = Math.random();
      d[i + 3] = Math.min(255, d[i + 3] + (n > 0.985 ? 70 : (n - 0.5) * 26));
      if (n > 0.993) { d[i] = d[i + 1] = d[i + 2] = 255; }
    }
    x.putImageData(id, 0, 0);
    // ice crystals growing in from the edges (fern-like branches)
    x.lineCap = "round";
    const branch = (px, py, ang, len, depth) => {
      if (depth <= 0 || len < 2) return;
      const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
      x.strokeStyle = `rgba(255,255,255,${0.16 + depth * 0.06})`; x.lineWidth = Math.max(0.4, depth * 0.38) * scale;
      x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
      const steps = 3 + (Math.random() * 3) | 0;
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1), bx = px + (ex - px) * t, by = py + (ey - py) * t, bl = len * (0.42 - t * 0.2);
        branch(bx, by, ang + 1.0 + Math.random() * 0.25, bl, depth - 1);
        branch(bx, by, ang - 1.0 - Math.random() * 0.25, bl, depth - 1);
      }
      if (Math.random() < 0.6) branch(ex, ey, ang + (Math.random() - 0.5) * 0.6, len * 0.6, depth - 1);
    };
    const seeds = Math.round((w + h) / (14 * scale));
    for (let i = 0; i < seeds; i++) {
      const side = (Math.random() * 4) | 0, r = Math.random();
      const px = side === 0 ? r * w : side === 1 ? w : side === 2 ? r * w : 0;
      const py = side === 0 ? 0 : side === 1 ? r * h : side === 2 ? h : r * h;
      const inward = Math.atan2(h / 2 - py, w / 2 - px) + (Math.random() - 0.5) * 1.1;
      branch(px, py, inward, (18 + Math.random() * 46) * scale, 3);
    }
    for (let i = 0; i < seeds * 0.7; i++) {   // scattered small crystals
      const px = Math.random() * w, py = Math.random() * h;
      for (let k = 0; k < 6; k++) branch(px, py, (k * Math.PI) / 3 + Math.random() * 0.2, (2 + Math.random() * 5) * scale, 2);
    }
    return c;
  }

  posters.forEach((poster) => {
    const canvas = document.createElement("canvas");
    canvas.className = "p-frost"; canvas.setAttribute("aria-hidden", "true");
    poster.classList.add("frozen");
    const art = document.createElement("div"); art.className = "p-art";
    [...poster.children].filter((c) => !c.matches(".p-glare")).forEach((c) => art.appendChild(c));
    poster.prepend(art);
    poster.appendChild(canvas);
    const glare = poster.querySelector(".p-glare"); if (glare) poster.appendChild(glare);
    for (let i = 0; i < 5; i++) {
      const drop = document.createElement("span"); drop.className = "p-drop"; drop.setAttribute("aria-hidden", "true");
      drop.style.left = 14 + Math.random() * 72 + "%"; drop.style.animationDelay = -(Math.random() * 9).toFixed(2) + "s";
      drop.style.setProperty("--s", (0.7 + Math.random() * 0.7).toFixed(2));
      poster.appendChild(drop);
    }
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, tex = null, dpr = 1;
    const thaw = (alpha) => {   // the ice over the BEJUSTT masthead is melting
      const R = W * 0.5;
      ctx.save(); ctx.globalCompositeOperation = "destination-out";
      ctx.translate(W * 0.5, H * 0.215); ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.6})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    const setup = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = poster.offsetWidth, h = poster.offsetHeight; if (!w || !h) return;
      W = Math.round(w * dpr); H = Math.round(h * dpr); canvas.width = W; canvas.height = H;
      tex = makeTexture(W, H, dpr * (w / 420));
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); ctx.drawImage(tex, 0, 0);
      thaw(0.7);
    };
    setup();
    new ResizeObserver(() => { const w = Math.round(poster.offsetWidth * dpr); if (w && Math.abs(w - W) > 4) setup(); }).observe(poster);

    // melt with touch / pointer
    let last = null, down = false;
    const melt = (x, y, strength) => {
      const r = W * 0.12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${strength})`); g.addColorStop(0.6, `rgba(0,0,0,${strength * 0.5})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    };
    const local = (e) => {   // pointer position on the (possibly tilted) poster, approximated by its bounding box
      const r = poster.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    };
    const trail = (e, s) => {
      const p = local(e);
      if (last) { const dx = p[0] - last[0], dy = p[1] - last[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (W * 0.03)));
        for (let i = 1; i <= n; i++) melt(last[0] + (dx * i) / n, last[1] + (dy * i) / n, s); }
      else melt(p[0], p[1], s * 1.6);
      last = p;
    };
    poster.addEventListener("pointerdown", (e) => { down = true; last = null; trail(e, 0.32); window.BJ_snd?.tap?.(); });
    poster.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" ? true : down) trail(e, e.pointerType === "mouse" && !down ? 0.12 : 0.3); });
    const up = () => { down = false; last = null; };
    poster.addEventListener("pointerup", up); poster.addEventListener("pointerleave", up); poster.addEventListener("pointercancel", up);

    // slowly freeze again (but keep the masthead thawing)
    let visible = false, raf = 0, prev = performance.now();
    const loop = (now) => {
      const dt = Math.min(64, now - prev) / 16.67; prev = now;
      if (tex) {
        ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.0065 * dt; ctx.drawImage(tex, 0, 0); ctx.restore();
        thaw(0.006 * dt);
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    if (!reduce) new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { cancelAnimationFrame(raf); prev = performance.now(); raf = requestAnimationFrame(loop); } }).observe(poster);
  });
})();
