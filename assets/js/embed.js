/* Высота приложения для родительской страницы.
   Нужен только внутри iframe: сообщает высоту своего документа, чтобы
   в разделе не было второй полосы прокрутки. Вне iframe ничего не делает. */

(() => {
  if (window.parent === window) {
    return;
  }

  /* В iframe страница отдаёт фон родителю: на главной сквозь неё должно
     просвечивать созвездие. При прямом открытии фон остаётся обычным. */
  document.documentElement.classList.add("is-embedded");

  let lastHeight = 0;
  let timer = 0;

  function report() {
    /* Высота body, а не scrollHeight: scrollHeight не бывает меньше высоты
       самого iframe, из-за чего область не могла сжаться до реальной высоты. */
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height === lastHeight) {
      return;
    }
    lastHeight = height;
    window.parent.postMessage({ source: "keezuf-app", type: "height", height }, window.location.origin);
  }

  /* Действия пользователя меняют высоту (например, раскрытие новостей).
     ResizeObserver обычно справляется сам, но отчёт по событиям не зависит
     от доставки кадров и срабатывает даже при throttling. */
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(report, 60);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(report).observe(document.body);
  }

  window.addEventListener("load", report);
  window.addEventListener("resize", report);
  document.addEventListener("click", schedule, true);
  document.addEventListener("change", schedule, true);
  document.addEventListener("input", schedule, true);
  report();
})();
