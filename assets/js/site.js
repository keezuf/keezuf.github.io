/* Небольшие улучшения страниц сайта.
   Без этого файла сайт читается и работает: скрипт уточняет год в подвале
   и подгоняет высоту встроенных страниц (например, блока новостей). */

(() => {
  const year = document.getElementById("year");
  if (year) {
    const current = String(new Date().getFullYear());
    if (year.textContent.trim() !== current) {
      year.textContent = current;
    }
  }

  const MIN_HEIGHT = 80;
  const MAX_HEIGHT = 6000;
  /* Небольшой запас: контент, который на пару пикселей выше, не должен
     рождать внутреннюю прокрутку на телефоне. */
  const BUFFER = 16;
  const frames = Array.from(document.querySelectorAll("iframe[data-embed]"));

  if (frames.length === 0) {
    return;
  }

  /* Высоту меряем напрямую в документе iframe: так она не зависит от того,
     успело ли прийти сообщение, и подхватывает перестройку при раскрытии. */
  function fit(frame) {
    let doc;
    try {
      doc = frame.contentDocument;
    } catch (error) {
      return;
    }
    if (!doc || !doc.body) {
      return;
    }

    const content = Math.ceil(doc.body.getBoundingClientRect().height);
    if (content <= 0) {
      return;
    }

    const target = Math.min(Math.max(content + BUFFER, MIN_HEIGHT), MAX_HEIGHT);
    if (Math.abs(frame.offsetHeight - target) > 1) {
      frame.style.height = target + "px";
      frame.style.minHeight = "0";
    }
  }

  frames.forEach((frame) => {
    const run = () => {
      fit(frame);
      requestAnimationFrame(() => fit(frame));
      setTimeout(() => fit(frame), 250);
      setTimeout(() => fit(frame), 1000);
    };

    frame.addEventListener("load", () => {
      run();
      try {
        new ResizeObserver(() => fit(frame)).observe(frame.contentDocument.body);
      } catch (error) {
        /* Документ недоступен — останутся сообщения из embed.js. */
      }
    });
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) {
      return;
    }
    const data = event.data;
    if (!data || data.source !== "keezuf-app" || data.type !== "height") {
      return;
    }
    const frame = frames.find((item) => item.contentWindow === event.source);
    if (frame) {
      fit(frame);
    }
  });

  window.addEventListener("resize", () => {
    frames.forEach((frame) => fit(frame));
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => frames.forEach((frame) => fit(frame)), 300);
  });

  window.addEventListener("load", () => {
    frames.forEach((frame) => fit(frame));
  });

  window.addEventListener("pageshow", () => {
    frames.forEach((frame) => fit(frame));
  });
})();
