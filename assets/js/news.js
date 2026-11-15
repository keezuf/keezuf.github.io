/* Плавное раскрытие и сворачивание списка новостей.

   Без этого файла новости показаны целиком и кнопки нет; с ним список
   по умолчанию свёрнут до первой новости, а раскрытие анимируется. */

(() => {
  const list = document.querySelector(".news-list");
  const toggle = document.getElementById("news-expand");
  if (!list || !toggle) {
    return;
  }

  const items = Array.from(list.querySelectorAll(".news-item"));
  if (items.length < 2) {
    return;
  }

  document.documentElement.classList.add("news-js");

  const DURATION = 450;
  let animatingUntil = 0;
  let resizeTimer = 0;

  const collapsedHeight = () => Math.ceil(items[0].getBoundingClientRect().height);
  const targetHeight = () => (toggle.checked ? Math.ceil(list.scrollHeight) : collapsedHeight());

  function apply(animate) {
    const target = targetHeight() + "px";

    if (!animate) {
      list.style.transition = "none";
      list.style.maxHeight = target;
      /* Фиксируем значение без анимации и возвращаем переход из CSS. */
      void list.offsetHeight;
      list.style.transition = "";
      return;
    }

    animatingUntil = performance.now() + DURATION;
    list.style.maxHeight = target;
  }

  apply(false);

  toggle.addEventListener("change", () => apply(true));

  /* Высоту контейнера в iframe меняет родитель — это тоже вызывает resize,
     и раньше он обрывал анимацию. Пересчитываем с задержкой и только когда
     раскрытие уже закончилось. */
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (performance.now() < animatingUntil) {
        return;
      }
      apply(false);
    }, 300);
  });
})();
