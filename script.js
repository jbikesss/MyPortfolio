(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const body = document.body;
  const themeToggle = $("#themeToggle");
  const themeLabel = $("#themeLabel");
  const menuToggle = $("#menuToggle");
  const nav = $("#nav");

  /* =====================================================
     Theme toggle (with circular reveal where supported)
     ===================================================== */
  const store = {
    get() { try { return localStorage.getItem("portfolio-theme"); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem("portfolio-theme", v); } catch (e) {} }
  };

  let accent = "#c5ff65";
  const readAccent = () => {
    accent = getComputedStyle(body).getPropertyValue("--accent").trim() || accent;
  };

  const applyTheme = (light) => {
    body.classList.toggle("light", light);
    themeLabel.textContent = light ? "DARK MODE" : "LIGHT MODE";
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#e7e7e4" : "#050506");
    readAccent();
  };

  if (store.get() === "light") applyTheme(true);
  else readAccent();

  themeToggle.addEventListener("click", (e) => {
    const toLight = !body.classList.contains("light");
    const change = () => { applyTheme(toLight); store.set(toLight ? "light" : "dark"); };

    if (!document.startViewTransition || reduce) { change(); return; }

    const x = e.clientX || innerWidth - 80;
    const y = e.clientY || 40;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = document.startViewTransition(change);
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 800, easing: "cubic-bezier(.22,1,.36,1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
  });

  /* =====================================================
     Mobile menu
     ===================================================== */
  menuToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }));

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =====================================================
     Hero: parallax + floating dust
     ===================================================== */
  const stage = $("#home");
  const glow = $(".stage-glow", stage);
  const photo = $(".photo-inner", stage);
  const rowA = $('[data-depth="a"]', stage);
  const rowB = $('[data-depth="b"]', stage);
  const dust = $(".stage-dust", stage);
  const dctx = dust.getContext("2d");

  let stageVisible = true;
  let px = 0, py = 0;           // pointer target (-1..1)
  let cx = 0, cy = 0;           // smoothed
  let pointerActive = false;
  let scrollY = 0;

  addEventListener("pointermove", (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
    pointerActive = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointerActive = false; });

  // dust particles
  let dw = 0, dh = 0, dpr = 1, motes = [];
  const sizeDust = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    dw = r.width; dh = r.height;
    dust.width = dw * dpr; dust.height = dh * dpr;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = clamp(Math.round(dw * dh / 16000), 28, 70);
    motes = Array.from({ length: n }, () => mote(true));
  };
  const mote = (anywhere) => ({
    x: Math.random() * dw,
    y: anywhere ? Math.random() * dh : dh + 10,
    r: .6 + Math.random() * 2,
    v: .15 + Math.random() * .5,
    s: Math.random() * 6.28,
    a: .2 + Math.random() * .6
  });
  if (!reduce) { sizeDust(); addEventListener("resize", sizeDust); }

  new IntersectionObserver(([en]) => { stageVisible = en.isIntersecting; }, { threshold: 0 }).observe(stage);

  const loop = (t) => {
    requestAnimationFrame(loop);
    if (reduce || !stageVisible) return;

    // idle sway so the hero is alive even without a mouse
    const tx = pointerActive ? px : Math.sin(t / 2600) * .35;
    const ty = pointerActive ? py : Math.cos(t / 3200) * .2;
    cx += (tx - cx) * .05;
    cy += (ty - cy) * .05;

    const s = clamp(scrollY / (stage.offsetHeight || 1), 0, 1);

    photo.style.transform =
      `translate3d(${cx * 14}px, ${cy * 6 + s * 70}px, 0) rotateY(${cx * 3}deg) scale(${1 + s * .06})`;
    rowA.style.transform = `translate3d(${cx * -34}px, ${s * 120}px, 0)`;
    rowB.style.transform = `translate3d(${cx * 20}px, ${s * -40}px, 0)`;
    glow.style.transform = `translate3d(${cx * -26}px, ${cy * -14}px, 0)`;

    // dust
    dctx.clearRect(0, 0, dw, dh);
    dctx.fillStyle = accent;
    dctx.shadowColor = accent;
    dctx.shadowBlur = 8;
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.y -= m.v;
      m.x += Math.sin(t / 1400 + m.s) * .25 + cx * .15;
      if (m.y < -10) motes[i] = mote(false);
      dctx.globalAlpha = m.a * (.55 + Math.sin(t / 700 + m.s) * .45);
      dctx.beginPath();
      dctx.arc(m.x, m.y, m.r, 0, 6.283);
      dctx.fill();
    }
    dctx.globalAlpha = 1;
    dctx.shadowBlur = 0;
  };
  requestAnimationFrame(loop);

  /* =====================================================
     Scroll: progress bar, hide-on-scroll header, scrub text
     ===================================================== */
  const progress = $("#progress");
  const topbar = $(".topbar");
  let lastY = 0, ticking = false;

  const aboutBig = $(".about-big");
  let aboutWords = [];
  if (aboutBig && !reduce) {
    const text = aboutBig.textContent.trim();
    aboutBig.textContent = "";
    aboutWords = text.split(/\s+/).map((w, i, arr) => {
      const span = document.createElement("span");
      span.className = "sw";
      span.textContent = w + (i < arr.length - 1 ? " " : "");
      aboutBig.appendChild(span);
      return span;
    });
  }

  const onScroll = () => {
    scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;

    const down = scrollY > lastY && scrollY > 160;
    if (!nav.classList.contains("open")) topbar.classList.toggle("hide", down);
    lastY = scrollY;

    if (aboutWords.length) {
      const r = aboutBig.getBoundingClientRect();
      const p = clamp((innerHeight * .88 - r.top) / (innerHeight * .45 + r.height), 0, 1);
      const lit = Math.round(p * aboutWords.length);
      aboutWords.forEach((w, i) => w.classList.toggle("lit", i < lit));
    }
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* =====================================================
     Active nav link
     ===================================================== */
  const links = $$("a", nav);
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));

  /* =====================================================
     Scroll reveals
     ===================================================== */
  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("i");
            inner.textContent = part;
            inner.style.setProperty("--wi", i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") {
          walk(n);
        }
      });
    };
    walk(el);
    el.classList.add("words");
  };

  if (!reduce) {
    // headings: word-by-word mask reveal
    $$(".section-heading h2, .contact-main h2").forEach(splitWords);

    // everything else: fade / rise / unblur, staggered inside groups
    const groups = [
      [".section-heading .eyebrow, .heading-note, .contact-main .eyebrow, .contact-main > p:not(.eyebrow), .contact-main .button", 0],
      [".featured-project", 0],
      [".project-grid > .project-card", 140],
      [".about-copy > p", 120],
      [".about-facts > div", 110],
      [".skills-grid > .skill-box", 110],
      [".contact-links > a", 120],
      [".footer", 0]
    ];
    const targets = [];
    groups.forEach(([sel, step]) => {
      $$(sel).forEach((el, i) => {
        el.classList.add("reveal");
        el.style.setProperty("--d", i * step + "ms");
        targets.push(el);
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add("in");
        io.unobserve(el);
        // once the entrance has finished, drop the helper classes so hover/tilt are crisp
        if (el.classList.contains("reveal")) {
          const d = parseInt(el.style.getPropertyValue("--d")) || 0;
          setTimeout(() => { el.classList.remove("reveal", "in"); el.style.removeProperty("--d"); }, d + 1300);
        }
      });
    }, { threshold: .15, rootMargin: "0px 0px -6% 0px" });

    targets.forEach((el) => io.observe(el));
    $$(".words").forEach((el) => io.observe(el));
  }

  /* =====================================================
     Card tilt + cursor spotlight
     ===================================================== */
  if (finePointer && !reduce) {
    $$(".project-card, .skill-box").forEach((card) => {
      const strength = card.classList.contains("featured-project") ? 2.2 : 7;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", x * 100 + "%");
        card.style.setProperty("--my", y * 100 + "%");
        card.style.transform =
          `perspective(1000px) rotateX(${(.5 - y) * strength}deg) rotateY(${(x - .5) * strength * 1.3}deg) translateY(-6px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });

    /* magnetic buttons */
    $$(".button, .theme-toggle, .stage-cue").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * .22}px, ${dy * .3}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });

    /* cursor follower */
    const dot = $(".cursor-dot");
    const ring = $(".cursor-ring");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      body.classList.add("has-cursor");
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    }, { passive: true });
    document.addEventListener("pointerleave", () => body.classList.remove("has-cursor"));
    const follow = () => {
      rx += (mx - rx) * .16;
      ry += (my - ry) * .16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    };
    follow();
    const hoverables = "a, button, .project-card, .skill-box";
    document.addEventListener("pointerover", (e) => {
      if (e.target.closest(hoverables)) ring.classList.add("hover");
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest(hoverables)) ring.classList.remove("hover");
    });
  }
})();
