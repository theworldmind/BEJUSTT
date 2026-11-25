(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Navigation
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Manifesto: words light up as you read
  const m = document.querySelector(".manifesto .statement");
  if (m) {
    const words = m.textContent.trim().split(/\s+/);
    m.innerHTML = words.map((w) => `<span>${w}</span>`).join(" ");
    const spans = [...m.querySelectorAll("span")];
    const light = () => {
      const r = m.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = reduce ? spans.length : Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("lit", i < n));
    };
    light();
    window.addEventListener("scroll", light, { passive: true });
  }

  // Starfield
  const canvas = document.querySelector(".sky");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let stars = [], w, h, dpr;
    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 2600);
      stars = Array.from({ length: count }, () => {
        const big = Math.random() < 0.04;
        return {
          x: Math.random() * w, y: Math.random() * h,
          r: big ? 0.9 + Math.random() * 0.8 : 0.25 + Math.random() * 0.6,
          a: 0.25 + Math.random() * 0.75,
          t: Math.random() * Math.PI * 2,
          s: 0.004 + Math.random() * 0.012,
          warm: Math.random() < 0.12,
        };
      });
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.t += s.s;
        const a = s.a * (0.7 + 0.3 * Math.sin(s.t));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.warm ? `rgba(255,214,200,${a})` : `rgba(235,240,255,${a})`;
        ctx.fill();
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    build(); draw();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) draw(); }, 150); });
  }

  // Year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
