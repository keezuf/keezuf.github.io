/* Фон главной страницы: созвездие из точек, которое реагирует на курсор
   и отстаёт от прокрутки. Подключается только на главной странице.

   Правила: canvas за содержимым, не мешает кликам, отключается при
   системной настройке «уменьшить движение», пауза в неактивной вкладке.

   Экономия ресурсов: разрешение полотна ограничено (DPR ≤ 1.35), кадры —
   ~30 в секунду, точек до 70, во время завесы «Начнём» фон не рисуется. */

(() => {
  const canvas = document.getElementById("site-bg");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const pointer = { x: 0, y: 0, active: false };
  const LINK = 112;
  const MOUSE = 170;
  const SCROLL_DEPTH = 0.26;
  const DPR_CAP = 1.35;
  /* Запас по высоте: полотно выше видимой области, чтобы появление и скрытие
     адресной строки в мобильном браузере не требовало перерисовки. */
  const HEIGHT_BUFFER = 180;

  let width = 0;
  let height = 0;
  let dots = [];
  let interactive = finePointer.matches;
  let frame = 0;

  function physics(dot) {
    if (dot.x < 0) {
      dot.x = 0;
      dot.vx = Math.abs(dot.vx);
    } else if (dot.x > width) {
      dot.x = width;
      dot.vx = -Math.abs(dot.vx);
    }
    if (dot.y < 0) {
      dot.y = 0;
      dot.vy = Math.abs(dot.vy);
    } else if (dot.y > height) {
      dot.y = height;
      dot.vy = -Math.abs(dot.vy);
    }
  }

  function createDots() {
    const count = Math.max(34, Math.min(90, Math.round((width * height) / 18000)));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 0.8 + Math.random() * 1.6,
      z: 0.35 + Math.random() * 0.65
    }));
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const visibleHeight = Math.max(
      window.innerHeight,
      window.visualViewport ? window.visualViewport.height : 0
    );
    width = window.innerWidth;
    height = Math.ceil(visibleHeight) + HEIGHT_BUFFER;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    /* Ширину не фиксируем: её задаёт CSS (100%). Высоту — в пикселях, с запасом. */
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const still = reduce.matches;
    const scroll = still ? 0 : window.scrollY || 0;
    const showPointer = interactive && pointer.active;
    const px = showPointer ? pointer.x : width / 2;
    const py = showPointer ? pointer.y : height / 2;
    const tiltX = still || !showPointer ? 0 : (px - width / 2) * 0.018;
    const tiltY = still || !showPointer ? 0 : (py - height / 2) * 0.018;
    const wrap = height + 120;

    ctx.clearRect(0, 0, width, height);

    const points = [];
    for (const dot of dots) {
      if (!still) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        physics(dot);
      }
      points.push({
        x: dot.x + tiltX * dot.z,
        y: ((((dot.y - scroll * SCROLL_DEPTH * dot.z) % wrap) + wrap) % wrap) - 60,
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
      const near = showPointer && Math.hypot(point.x - px, point.y - py) < MOUSE;
      if (near) {
        const alpha = (1 - Math.hypot(point.x - px, point.y - py) / MOUSE) * 0.45;
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
    /* Пока открыта завеса «Начнём», фон не рисуется — незачем тратить ресурсы.
       Но как только завеса начала гаснуть (intro-leaving), созвездие уже
       двигается: к моменту проявления страницы оно живое, без рывка. */
    const root = document.documentElement;
    const introOpen = root.classList.contains("intro-active") && !root.classList.contains("intro-leaving");
    if (!introOpen) {
      draw();
    }
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (frame || reduce.matches) {
      return;
    }
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    if (frame) {
      cancelAnimationFrame(frame);
    }
    frame = 0;
  }

  function onResize() {
    const currentWidth = window.innerWidth;
    const currentHeight = Math.max(
      window.innerHeight,
      window.visualViewport ? window.visualViewport.height : 0
    );

    /* Поворот экрана или заметное изменение ширины — узор пересобираем. */
    const widthChangedALot = width > 0 && Math.abs(currentWidth - width) > width * 0.2;
    if (!dots.length || widthChangedALot) {
      sizeCanvas();
      createDots();
      draw();
      return;
    }

    /* Адресная строка: меняется только высота видимой области. Ничего не
       перерисовываем — иначе точки сдвигаются и это видно как «прыжок». */
    if (currentHeight + HEIGHT_BUFFER > height) {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      height = Math.ceil(currentHeight) + HEIGHT_BUFFER;
      canvas.height = Math.round(height * dpr);
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
  }

  window.addEventListener("resize", onResize);

  window.addEventListener("scroll", () => {
    if (reduce.matches) {
      draw();
    }
  }, { passive: true });

  if (typeof finePointer.addEventListener === "function") {
    finePointer.addEventListener("change", (event) => {
      interactive = event.matches;
      if (!interactive) {
        pointer.active = false;
      }
      draw();
    });
  }

  window.addEventListener("pointermove", (event) => {
    if (!interactive) {
      return;
    }
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

  sizeCanvas();
  createDots();
  draw();
  start();
})();
