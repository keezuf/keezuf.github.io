/* Разбор чисел из полей ввода — один на весь сайт.

   Принимает запятую, пробелы между разрядами (включая неразрывные) и
   незаконченную точку: «12,5», «1 234,5», «12.» — всё это нормальные числа.
   Возвращает одно из:
     { value }        — число;
     { empty: true }  — поле пустое (это не ошибка);
     { invalid: true }— не число, ноль или минус.
   allowZero: true разрешает ноль (но не отрицательные). */

(() => {
  "use strict";

  window.Keezuf = window.Keezuf || {};

  window.Keezuf.readNumber = function readNumber(input, allowZero = false) {
    const cleaned = input.value
      .replace(/[\s\u00a0\u202f]/g, "")
      .replace(/,/g, ".")
      .replace(/\.$/, "");

    if (cleaned === "") {
      return { empty: true };
    }
    if (!/^\d*\.?\d+$/.test(cleaned)) {
      return { invalid: true };
    }

    const value = Number(cleaned);
    if (!Number.isFinite(value)) {
      return { invalid: true };
    }
    if (allowZero ? value < 0 : value <= 0) {
      return { invalid: true };
    }
    return { value };
  };
})();
