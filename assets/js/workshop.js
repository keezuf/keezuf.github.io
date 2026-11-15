/* Переключение приложений раздела без перезагрузки страницы.
   Страница приложения открывается в iframe. Без JavaScript вкладки
   работают как обычные ссылки и открывают приложение отдельной страницей. */

(() => {
  const frame = document.getElementById("app-frame");
  const tabs = Array.from(document.querySelectorAll("[data-app]"));
  if (!frame || tabs.length === 0) {
    return;
  }

  const bar = document.querySelector(".tabs-bar");
  const MIN_HEIGHT = 60;
  const MAX_HEIGHT = 6000;

  function markActive(current) {
    tabs.forEach((tab) => {
      const active = tab === current;
      tab.classList.toggle("is-active", active);
      if (active) {
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    });
  }

  function show(tab, push) {
    const href = tab.getAttribute("href");
    const slug = tab.dataset.app;

    if (frame.getAttribute("src") !== href) {
      frame.style.height = "";
      frame.style.minHeight = "";
      frame.setAttribute("src", href);
    }
    frame.setAttribute("title", tab.textContent.trim());
    markActive(tab);

    if (push && location.hash !== "#" + slug) {
      history.pushState({ app: slug }, "", "#" + slug);
    }
  }

  function tabFromHash() {
    return tabs.find((tab) => "#" + tab.dataset.app === location.hash) || null;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();

      if (tab.classList.contains("is-active")) {
        return;
      }

      show(tab, true);

      if (bar && bar.getBoundingClientRect().top < 0) {
        bar.scrollIntoView({ block: "start" });
      }
      tab.scrollIntoView({ block: "nearest", inline: "center" });
    });
  });

  window.addEventListener("popstate", () => {
    const tab = tabFromHash();
    if (tab) {
      show(tab, false);
    }
  });

  /* Приложение сообщает свою высоту — подгоняем iframe, чтобы не было
     второй полосы прокрутки. */
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) {
      return;
    }
    const data = event.data;
    if (!data || data.source !== "keezuf-app" || data.type !== "height") {
      return;
    }

    const height = Math.min(Math.max(Math.ceil(data.height), MIN_HEIGHT), MAX_HEIGHT);
    if (Math.abs(frame.offsetHeight - height) > 4) {
      frame.style.height = height + "px";
      /* min-height в CSS — запасной вариант без JavaScript; с ним область
         не могла сжаться до реальной высоты приложения. */
      frame.style.minHeight = "0";
    }
  });

  /* Прямая ссылка вида /apps/metalworking/#cone сразу открывает нужное приложение. */
  const initial = tabFromHash();
  if (initial) {
    show(initial, false);
    initial.scrollIntoView({ block: "nearest", inline: "center" });
  }
})();
