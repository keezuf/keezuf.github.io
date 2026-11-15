/* Высота приложения для родительской страницы.
   Нужен только внутри iframe: сообщает высоту своего документа, чтобы
   в разделе не было второй полосы прокрутки. Вне iframe ничего не делает. */

(() => {
  if (window.parent === window) {
    return;
  }

  let lastHeight = 0;

  function report() {
    const height = Math.ceil(document.documentElement.scrollHeight);
    if (height === lastHeight) {
      return;
    }
    lastHeight = height;
    window.parent.postMessage({ source: "keezuf-app", type: "height", height }, window.location.origin);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(report).observe(document.body);
  }

  window.addEventListener("load", report);
  window.addEventListener("resize", report);
  report();
})();
