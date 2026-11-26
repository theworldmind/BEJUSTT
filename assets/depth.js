/* Bejustt — living depth background (WebGL, no libraries)
   1) Slowly flowing midnight-blue light veils (domain-warped noise)
   2) A field of light dust you travel through as you scroll
   Pauses when the tab is hidden; renders one still frame for reduced motion. */
(function boot() {
  const canvas = document.createElement("canvas");
  canvas.className = "depth";
  canvas.setAttribute("aria-hidden", "true");
  let gl = null;
  try { gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false }) || canvas.getContext("experimental-webgl"); } catch (e) {}
  if (!gl) return;
  document.body.prepend(canvas);
  document.documentElement.classList.add("has-depth");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0 ? "highp" : "mediump";

  const VEIL_VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const VEIL_FS = `precision ${precision} float;
  uniform vec2 uRes; uniform float uTime, uScroll, uLight, uIg, uDim, uS, uR, uSw, uTh, uRh, uL; uniform vec2 uMouse, uIgP;
  float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++){ v += a * n(p); p = m * p; a *= 0.5; } return v; }
  void main(){
    vec2 uv0 = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    // Black hole around the oneside star: space swirls (frame dragging) and bends light (gravitational lens)
    vec2 d0 = uv0 - uIgP; float r0 = length(d0);
    float ang = uSw / (r0 + 0.08); float ca = cos(ang), sa = sin(ang);
    vec2 d1 = vec2(ca * d0.x - sa * d0.y, sa * d0.x + ca * d0.y);
    d1 *= 1.0 - (uTh * uTh) / max(r0 * r0, 0.0004);
    // Big Bang: the whole sky is pulled into (S>1) or flung out of the star
    vec2 uv = uIgP + d1 * uS;
    float t = uTime * 0.035;
    vec2 p = uv * 1.35 + vec2(0.0, -uScroll * 1.6) + uMouse * 0.06;
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + 3.2 * q + vec2(8.3, 2.8) - 0.12 * t));
    float f = fbm(p + 2.6 * r);

    vec3 base = vec3(0.014, 0.030, 0.078);
    vec3 deep = vec3(0.036, 0.082, 0.210);
    vec3 blue = vec3(0.085, 0.170, 0.400);
    vec3 ice  = vec3(0.80, 0.84, 0.92);
    vec3 c = base;
    c = mix(c, deep, smoothstep(0.25, 0.95, f) * 0.9);
    c = mix(c, blue, smoothstep(0.45, 1.05, f * (0.6 + length(q))) * 0.55);
    c += ice * pow(smoothstep(0.55, 1.0, f * r.x * 1.25), 3.0) * 0.10;
    float shaft = 0.0;
    c *= 1.0 - 0.6 * dot(uv * 0.85, uv * 0.85);
    c *= 0.82;

    // deep field: three star layers at different distances, each drifting at its own speed
    for (int L = 0; L < 3; L++) {
      float fl = float(L);
      float sc = 34.0 + fl * 26.0;
      vec2 sp = uv * sc + vec2(fl * 17.3, -uScroll * (2.0 + fl * 5.5) * sc * 0.06) + uMouse * (0.4 + fl * 0.9);
      vec2 id = floor(sp), gv = fract(sp) - 0.5;
      float rnd = h(id + fl * 31.7);
      if (rnd > 0.86 - fl * 0.04) {
        vec2 o = vec2(h(id + 3.1), h(id + 7.7)) - 0.5;
        float d = length(gv - o * 0.7);
        float tw = 0.65 + 0.35 * sin(uTime * (0.6 + rnd * 1.8) + rnd * 40.0);
        float sz = (0.035 + 0.05 * (1.0 - fl / 3.0)) ;
        // the light wave from the oneside star reaches the near layer first, the far one last
        float wd = length(uv - uIgP) + fl * 0.55;
        float wave = uIg > 0.0 ? exp(-pow((wd - uIg) / 0.07, 2.0)) : 0.0;
        float after = uIg > 0.0 ? smoothstep(uIg, uIg - 0.5, wd) * 0.35 * smoothstep(3.2, 2.2, uIg) : 0.0;
        c += vec3(0.78, 0.84, 1.0) * smoothstep(sz * (1.0 + wave * 1.6), 0.0, d) * (0.55 - fl * 0.12) * (tw + wave * 4.0 + after);
      }
    }
    // a distant core of light you fall toward as you scroll
    float core = exp(-dot(uv * vec2(1.0, 1.3), uv * vec2(1.0, 1.3)) * (5.5 - min(uScroll, 1.0) * 2.0));
    c += vec3(0.10, 0.16, 0.36) * core * 0.55;

    vec3 lb = vec3(0.955, 0.965, 0.985);
    vec3 lc = mix(lb, vec3(0.84, 0.87, 0.94), smoothstep(0.3, 1.0, f) * 0.75);
    lc = mix(lc, vec3(0.70, 0.76, 0.88), pow(smoothstep(0.55, 1.0, f * r.x * 1.25), 2.0) * 0.45);
    lc += vec3(0.20, 0.30, 0.60) * shaft * 0.05;
    lc = mix(lb, lc, 0.85 - 0.25 * dot(uv, uv));

    float rd = length(uv0 - uIgP);
    float born = uR < 0.0 ? 1.0 : smoothstep(uR, uR - 0.18, rd);
    float front = uR < 0.0 ? 0.0 : exp(-pow((rd - uR) / 0.05, 2.0)) * smoothstep(2.6, 1.4, uR);
    if (uL > 0.0) {
      // accretion disk: a flattened, tilted ring of light spiralling in
      vec2 q = vec2(0.96 * d0.x + 0.28 * d0.y, -0.28 * d0.x + 0.96 * d0.y); q.y /= 0.3;
      float rq = length(q), pa = atan(q.y, q.x);
      float band = smoothstep(uRh * 1.15, uRh * 1.7, rq) * smoothstep(uRh * 4.6, uRh * 1.9, rq);
      float spiral = 0.55 + 0.45 * sin(pa * 3.0 + log(rq + 0.001) * 9.0 - uSw * 5.0) * (0.6 + 0.4 * n(vec2(pa * 2.0, rq * 30.0 - uSw * 3.0)));
      c += vec3(0.78, 0.84, 1.0) * band * spiral * uL * 0.75 * clamp(uRh * 1.8 / max(rq, 0.001), 0.0, 1.6);
      // Einstein ring, then the event horizon with its thin photon ring
      c += vec3(0.55, 0.65, 0.95) * exp(-pow((r0 - uTh) / 0.012, 2.0)) * 0.3 * uL;
      c *= smoothstep(uRh, uRh * 1.06 + 0.002, r0);
      c += vec3(0.9, 0.94, 1.0) * exp(-pow((r0 - uRh * 1.1) / (uRh * 0.05 + 0.002), 2.0)) * uL * 0.9;
    }
    c *= (1.0 - uDim) * born;
    c += vec3(0.55, 0.65, 0.95) * front * 0.22;
    vec3 col = mix(c, lc, uLight);
    col += (h(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }`;

  const DUST_VS = `attribute vec4 a;
  uniform float uZ, uTime, uDpr, uLight, uIg, uS, uR, uDim, uSw, uRh, uL; uniform vec2 uRes, uMouse, uIgP;
  varying float vA; varying float vT; varying float vG;
  const float D = 6.0;
  void main(){
    float d = mod(a.z - uZ, D) + 0.12;
    vec2 xy = a.xy + vec2(sin(uTime * 0.09 + a.w * 6.28), cos(uTime * 0.07 + a.w * 4.1)) * 0.05;
    xy -= uMouse * 0.22;
    vec2 pr = xy / d * 0.9;
    gl_Position = vec4(pr.x * uRes.y / uRes.x, pr.y, 0.0, 1.0);
    vec2 ip = uIgP * 2.0;
    vec2 dd = pr - ip; float rr = length(dd) * 0.5;
    float an = uSw / (rr + 0.08); float cn = cos(an), sn = sin(an);
    dd = vec2(cn * dd.x - sn * dd.y, sn * dd.x + cn * dd.y) * (1.0 - uL * 0.3);
    float swallowed = uL > 0.0 ? smoothstep(uRh * 1.05, uRh * 1.6, rr) : 1.0;
    pr = ip + dd / uS;                              // pulled into the star, or flung out of it
    gl_Position = vec4(pr.x * uRes.y / uRes.x, pr.y, 0.0, 1.0);
    vec2 sp = pr * 0.5;
    float wd = length(sp - uIgP) + d * 0.32;
    vG = uIg > 0.0 ? exp(-pow((wd - uIg) / 0.09, 2.0)) : 0.0;
    float s = (1.1 + a.w * 2.2) * uDpr * (1.6 / d) * (1.0 + vG * 1.8);
    gl_PointSize = clamp(s, 0.6, 9.0 * uDpr);
    float rd = length(sp - uIgP);
    float born = uR < 0.0 ? 1.0 : smoothstep(uR + 0.02, uR - 0.1, rd + d * 0.04);
    float front = uR < 0.0 ? 0.0 : exp(-pow((rd + d * 0.04 - uR) / 0.07, 2.0));
    vG = max(vG, front * 1.4);
    vA = smoothstep(D, D * 0.55, d) * smoothstep(0.12, 0.9, d) * (0.35 + 0.65 * a.w) * born * swallowed * (1.0 - uDim * 0.92);
    vT = a.w;
  }`;
  const DUST_FS = `precision mediump float; varying float vA; varying float vT; varying float vG; uniform float uLight;
  void main(){
    float r = length(gl_PointCoord - 0.5);
    float m = smoothstep(0.5, 0.0, r);
    m = m * m;
    vec3 dark = mix(vec3(0.86, 0.89, 0.96), vec3(1.0), step(0.8, vT));
    vec3 light = vec3(0.05, 0.09, 0.18);
    gl_FragColor = vec4(mix(dark, light, uLight), min(1.0, m * (vA + vG * 0.9) * mix(0.85, 0.45, uLight)));
  }`;

  function prog(vs, fs) {
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const k = gl.getActiveUniform(p, i).name; u[k] = gl.getUniformLocation(p, k); }
    return { p, u };
  }
  let veil, dust;
  try { veil = prog(VEIL_VS, VEIL_FS); dust = prog(DUST_VS, DUST_FS); }
  catch (e) { canvas.remove(); document.documentElement.classList.remove("has-depth"); return; }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const N = mobile ? 520 : 1400;
  const pts = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pts[i * 4] = (Math.random() * 2 - 1) * 2.4;
    pts[i * 4 + 1] = (Math.random() * 2 - 1) * 1.6;
    pts[i * 4 + 2] = Math.random() * 6.0;
    pts[i * 4 + 3] = Math.pow(Math.random(), 2.2);
  }
  const dustBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
  gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    const scale = mobile ? 0.8 : 0.85;
    const vw = innerWidth || document.documentElement.clientWidth || screen.width, vh = innerHeight || document.documentElement.clientHeight || screen.height;
    W = Math.max(1, Math.round(vw * dpr * scale)); H = Math.max(1, Math.round(vh * dpr * scale));
    canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
    if (reduce) frame(performance.now());
  };

  // "The source of light": a oneside star asks the sky to answer
  let igAt = -1, igP = [0, 0], zClock = 0, lastNow = performance.now(), hold = 1;
  let bangAt = -1;
  window.BJ_bang = (x, y) => { const vw = innerWidth || 1, vh = innerHeight || 1; igP = [(x - vw / 2) / vh, -(y - vh / 2) / vh]; bangAt = performance.now(); igAt = -1; };
  window.BJ_bangEnd = () => { bangAt = -1; };
  window.BJ_ignite = (x, y) => {
    const vw = innerWidth || 1, vh = innerHeight || 1;
    igP = [(x - vw / 2) / vh, -(y - vh / 2) / vh]; igAt = performance.now();
  };
  let mx = 0, my = 0, tmx = 0, tmy = 0, sm = 0, light = 0, vel = 0, travel = 0, lastY = scrollY;
  addEventListener("pointermove", (e) => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = -((e.clientY / innerHeight) * 2 - 1); }, { passive: true });
  const t0 = performance.now();
  const docH = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

  function frame(now) {
    // in-app browsers (Instagram, etc.) can report a 0×0 viewport at first: keep checking until real
    if (W <= 2 || H <= 2 || Math.abs(canvas.width / Math.max(1, innerWidth) - dpr * (mobile ? 0.8 : 0.85)) > 0.2) resize();
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
    const ig = igAt < 0 ? -1 : (now - igAt) / 1000;   // seconds into the moment
    if (ig > 6.2) igAt = -1;
    // breath held: motion slows to a stop for the first second, then resumes slowly
    const wantHold = ig < 0 ? 1 : ig < 1.0 ? 0 : Math.min(1, (ig - 1.0) / 4.5);
    hold += (wantHold - hold) * (ig >= 0 && ig < 1.0 ? 0.08 : 0.03);
    zClock += dt * hold;
    const dim = ig < 0 ? 0 : ig < 0.6 ? ig / 0.6 * 0.38 : ig < 1.05 ? 0.38 : Math.max(0, 0.38 - (ig - 1.05) * 0.9);
    let wave = ig < 1.0 ? -1 : (ig - 1.0) * 1.15 + 0.02;
    // Liquid → Big Bang timeline (seconds): 0–2.4 the sky flows into the star · 2.4–2.9 silence · 2.9 bang · 2.9–5.3 expansion
    let S = 1, Rv = -1, bdim = 0, Sw = 0, Th = 0, Rh = 0, BL = 0;
    const bt = bangAt < 0 ? -1 : (now - bangAt) / 1000;
    if (bt >= 0) {
      if (bt < 2.4) { const k = bt / 2.4; S = 1 + 7 * Math.pow(k, 2.2); bdim = Math.pow(k, 1.4); hold = 1 - k; }
      else if (bt < 2.9) { S = 8; bdim = 1; hold = 0; }
      else if (bt < 5.3) { const k = (bt - 2.9) / 2.4, e = 1 - Math.pow(1 - k, 3); S = 1 + 7 * Math.pow(1 - e, 2.2); Rv = 0.02 + e * 2.4; bdim = 0; hold = e; wave = -1; }
      else bangAt = -1;
    }
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    const dy = scrollY - lastY; lastY = scrollY;
    vel += (Math.min(Math.abs(dy) / innerHeight, 0.08) - vel) * 0.12; travel += vel * 2.2;
    const target = scrollY / innerHeight;
    sm += (target - sm) * (reduce ? 1 : 0.06);
    const wantLight = document.documentElement.dataset.theme === "light" ? 1 : 0;
    light += (wantLight - light) * (reduce ? 1 : 0.08);
    if (Math.abs(wantLight - light) < 0.002) light = wantLight;

    gl.disable(gl.BLEND);
    gl.useProgram(veil.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const lp = gl.getAttribLocation(veil.p, "p");
    gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(veil.u.uRes, W, H); gl.uniform1f(veil.u.uTime, reduce ? 20 : zClock);
    gl.uniform1f(veil.u.uScroll, (scrollY / docH()) * 1.0 + sm * 0.05);
    gl.uniform2f(veil.u.uMouse, mx, my); gl.uniform1f(veil.u.uLight, light);
    gl.uniform1f(veil.u.uIg, wave); gl.uniform1f(veil.u.uDim, Math.max(dim, bdim)); gl.uniform1f(veil.u.uS, S); gl.uniform1f(veil.u.uR, Rv); gl.uniform1f(veil.u.uSw, Sw); gl.uniform1f(veil.u.uTh, Th); gl.uniform1f(veil.u.uRh, Rh); gl.uniform1f(veil.u.uL, BL); gl.uniform2f(veil.u.uIgP, igP[0], igP[1]);
    const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(lp);

    gl.enable(gl.BLEND);
    if (light > 0.5) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(dust.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    const la = gl.getAttribLocation(dust.p, "a");
    gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 4, gl.FLOAT, false, 0, 0);
    gl.uniform1f(dust.u.uZ, (reduce ? 0 : zClock * 0.12 + 4.2 * (1 - Math.exp(-t / 0.7))) + sm * 1.6 + (reduce ? 0 : travel));
    gl.uniform1f(dust.u.uIg, wave); gl.uniform1f(dust.u.uS, S); gl.uniform1f(dust.u.uR, Rv); gl.uniform1f(dust.u.uDim, bdim); gl.uniform1f(dust.u.uSw, Sw); gl.uniform1f(dust.u.uRh, Rh); gl.uniform1f(dust.u.uL, BL); gl.uniform2f(dust.u.uIgP, igP[0], igP[1]);
    gl.uniform1f(dust.u.uTime, reduce ? 0 : zClock); gl.uniform1f(dust.u.uDpr, dpr * (mobile ? 0.75 : 0.9));
    gl.uniform2f(dust.u.uRes, W, H); gl.uniform2f(dust.u.uMouse, mx, my); gl.uniform1f(dust.u.uLight, light);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.disableVertexAttribArray(la);
  }

  let raf = 0, running = false;
  const loop = (now) => { frame(now); raf = requestAnimationFrame(loop); };
  const start = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); canvas.remove(); setTimeout(boot, 600); });
  addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(document.documentElement);
  if (window.visualViewport) visualViewport.addEventListener("resize", resize);
  if (reduce) {
    addEventListener("scroll", () => frame(performance.now()), { passive: true });
    new MutationObserver(() => frame(performance.now())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  resize(); start();
  if (reduce) frame(performance.now());
  requestAnimationFrame(() => canvas.classList.add("on"));
})();
