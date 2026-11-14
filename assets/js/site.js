/* Небольшие улучшения страницы.
   Сайт остаётся полностью читаемым и рабочим без этого файла:
   скрипт только уточняет год в подвале. */

(() => {
  const year = document.getElementById("year");
  if (year) {
    const current = String(new Date().getFullYear());
    if (year.textContent.trim() !== current) {
      year.textContent = current;
    }
  }
})();
