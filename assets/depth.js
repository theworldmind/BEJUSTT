/* Bejustt — living depth background (WebGL, no libraries)
   1) Slowly flowing midnight-blue light veils (domain-warped noise)
   2) A field of light dust you travel through as you scroll
   Pauses when the tab is hidden; renders one still frame for reduced motion. */
(() => {
  const canvas = document.createElement("canvas");
  canvas.className = "depth";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
  if (!gl) return;
  document.body.prepend(canvas);
  document.documentElement.classList.add("has-depth");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0 ? "highp" : "mediump";

  const VEIL_VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const VEIL_FS = `precision ${precision} float;
  uniform vec2 uRes; uniform float uTime, uScroll, uLight; uniform vec2 uMouse;
  float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++){ v += a * n(p); p = m * p; a *= 0.5; } return v; }
  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float t = uTime * 0.035;
    vec2 p = uv * 1.35 + vec2(0.0, -uScroll * 1.6) + uMouse * 0.06;
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(p + 3.2 * q + vec2(8.3, 2.8) - 0.12 * t));
    float f = fbm(p + 2.6 * r);

    vec3 base = vec3(0.012, 0.024, 0.060);
    vec3 deep = vec3(0.030, 0.068, 0.170);
    vec3 blue = vec3(0.075, 0.150, 0.340);
    vec3 ice  = vec3(0.80, 0.84, 0.92);
    vec3 c = base;
    c = mix(c, deep, smoothstep(0.25, 0.95, f) * 0.9);
    c = mix(c, blue, smoothstep(0.45, 1.05, f * (0.6 + length(q))) * 0.55);
    c += ice * pow(smoothstep(0.55, 1.0, f * r.x * 1.25), 3.0) * 0.10;
    float shaft = exp(-pow(uv.y + 0.62, 2.0) * 3.0) * exp(-uv.x * uv.x * 1.4);
    c += vec3(0.22, 0.30, 0.52) * shaft * (0.40 - min(uScroll, 1.0) * 0.2);
    c *= 1.0 - 0.6 * dot(uv * 0.85, uv * 0.85);
    c *= 0.82;

    vec3 lb = vec3(0.955, 0.965, 0.985);
    vec3 lc = mix(lb, vec3(0.84, 0.87, 0.94), smoothstep(0.3, 1.0, f) * 0.75);
    lc = mix(lc, vec3(0.70, 0.76, 0.88), pow(smoothstep(0.55, 1.0, f * r.x * 1.25), 2.0) * 0.45);
    lc += vec3(0.20, 0.30, 0.60) * shaft * 0.05;
    lc = mix(lb, lc, 0.85 - 0.25 * dot(uv, uv));

    vec3 col = mix(c, lc, uLight);
    col += (h(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }`;

  const DUST_VS = `attribute vec4 a;
  uniform float uZ, uTime, uDpr, uLight; uniform vec2 uRes, uMouse;
  varying float vA; varying float vT;
  const float D = 6.0;
  void main(){
    float d = mod(a.z - uZ, D) + 0.12;
    vec2 xy = a.xy + vec2(sin(uTime * 0.09 + a.w * 6.28), cos(uTime * 0.07 + a.w * 4.1)) * 0.05;
    xy -= uMouse * 0.22;
    vec2 pr = xy / d * 0.9;
    gl_Position = vec4(pr.x * uRes.y / uRes.x, pr.y, 0.0, 1.0);
    float s = (1.1 + a.w * 2.2) * uDpr * (1.6 / d);
    gl_PointSize = clamp(s, 0.6, 9.0 * uDpr);
    vA = smoothstep(D, D * 0.55, d) * smoothstep(0.12, 0.9, d) * (0.35 + 0.65 * a.w);
    vT = a.w;
  }`;
  const DUST_FS = `precision mediump float; varying float vA; varying float vT; uniform float uLight;
  void main(){
    float r = length(gl_PointCoord - 0.5);
    float m = smoothstep(0.5, 0.0, r);
    m = m * m;
    vec3 dark = mix(vec3(0.86, 0.89, 0.96), vec3(1.0), step(0.8, vT));
    vec3 light = vec3(0.05, 0.09, 0.18);
    gl_FragColor = vec4(mix(dark, light, uLight), m * vA * mix(0.85, 0.45, uLight));
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
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    const scale = mobile ? 0.75 : 0.9;
    W = Math.round(innerWidth * dpr * scale); H = Math.round(innerHeight * dpr * scale);
    canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
    if (reduce) frame(performance.now());
  };

  let mx = 0, my = 0, tmx = 0, tmy = 0, sm = 0, light = 0;
  addEventListener("pointermove", (e) => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = -((e.clientY / innerHeight) * 2 - 1); }, { passive: true });
  const t0 = performance.now();
  const docH = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);

  function frame(now) {
    const t = (now - t0) / 1000;
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
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
    gl.uniform2f(veil.u.uRes, W, H); gl.uniform1f(veil.u.uTime, reduce ? 20 : t);
    gl.uniform1f(veil.u.uScroll, (scrollY / docH()) * 1.0 + sm * 0.05);
    gl.uniform2f(veil.u.uMouse, mx, my); gl.uniform1f(veil.u.uLight, light);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(lp);

    gl.enable(gl.BLEND);
    if (light > 0.5) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(dust.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, dustBuf);
    const la = gl.getAttribLocation(dust.p, "a");
    gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 4, gl.FLOAT, false, 0, 0);
    gl.uniform1f(dust.u.uZ, (reduce ? 0 : t * 0.12 + 4.2 * (1 - Math.exp(-t / 0.7))) + sm * 1.1);
    gl.uniform1f(dust.u.uTime, reduce ? 0 : t); gl.uniform1f(dust.u.uDpr, dpr * (mobile ? 0.75 : 0.9));
    gl.uniform2f(dust.u.uRes, W, H); gl.uniform2f(dust.u.uMouse, mx, my); gl.uniform1f(dust.u.uLight, light);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.disableVertexAttribArray(la);
  }

  let raf = 0, running = false;
  const loop = (now) => { frame(now); raf = requestAnimationFrame(loop); };
  const start = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); canvas.style.opacity = "0"; });
  addEventListener("resize", resize);
  if (reduce) {
    addEventListener("scroll", () => frame(performance.now()), { passive: true });
    new MutationObserver(() => frame(performance.now())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  resize(); start();
  if (reduce) frame(performance.now());
  requestAnimationFrame(() => canvas.classList.add("on"));
})();
