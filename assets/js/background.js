/* Фон главной страницы: созвездие из точек, которое реагирует на курсор
   и отстаёт от прокрутки. Подключается только на главной странице.

   Правила: canvas за содержимым, не мешает кликам, отключается при
   системной настройке «уменьшить движение», пауза в неактивной вкладке. */

(() => {
  const canvas = document.getElementById("site-bg");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = { x: 0, y: 0, active: false };
  const LINK = 118;
  const MOUSE = 170;
  const SCROLL_DEPTH = 0.26;

  let width = 0;
  let height = 0;
  let dots = [];
  let frame = 0;
  let lastFrame = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(36, Math.min(90, Math.round((width * height) / 18000)));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: 0.8 + Math.random() * 1.6,
      z: 0.35 + Math.random() * 0.65
    }));

    draw();
  }

  function draw() {
    const still = reduce.matches;
    const scroll = still ? 0 : window.scrollY || 0;
    const px = pointer.active ? pointer.x : width / 2;
    const py = pointer.active ? pointer.y : height / 2;
    const tiltX = still ? 0 : (px - width / 2) * 0.018;
    const tiltY = still ? 0 : (py - height / 2) * 0.018;
    const wrap = height + 120;

    ctx.clearRect(0, 0, width, height);

    const points = [];
    for (const dot of dots) {
      if (!still) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < -30) dot.x = width + 30;
        if (dot.x > width + 30) dot.x = -30;
        if (dot.y < -30) dot.y = height + 30;
        if (dot.y > height + 30) dot.y = -30;
      }
      points.push({
        x: dot.x + tiltX * dot.z,
        y: (((dot.y - scroll * SCROLL_DEPTH * dot.z) % wrap) + wrap) % wrap - 60,
        r: dot.r,
        z: dot.z
      });
    }

    ctx.lineWidth = 1;

    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance2 = dx * dx + dy * dy;
        if (distance2 > LINK * LINK) {
          continue;
        }
        const alpha = (1 - Math.sqrt(distance2) / LINK) * 0.14;
        ctx.strokeStyle = "rgba(143,176,255," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const point of points) {
      const distance = Math.hypot(point.x - px, point.y - py);
      const near = pointer.active && distance < MOUSE;

      if (near) {
        const alpha = (1 - distance / MOUSE) * 0.45;
        ctx.strokeStyle = "rgba(127,222,212," + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      ctx.fillStyle = near
        ? "rgba(190,230,255,.95)"
        : "rgba(175,198,235," + (0.32 + point.z * 0.34).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.r + (near ? 0.6 : 0), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(now) {
    lastFrame = now;
    draw();
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (frame || reduce.matches) {
      return;
    }
    lastFrame = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    if (frame) {
      cancelAnimationFrame(frame);
    }
    frame = 0;
  }

  window.addEventListener("resize", resize);

  window.addEventListener("scroll", () => {
    if (reduce.matches) {
      draw();
    }
  }, { passive: true });

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    if (reduce.matches) {
      draw();
    }
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
    if (reduce.matches) {
      draw();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  if (typeof reduce.addEventListener === "function") {
    reduce.addEventListener("change", () => {
      if (reduce.matches) {
        stop();
        draw();
      } else {
        start();
      }
    });
  }

  resize();
  start();
})();
