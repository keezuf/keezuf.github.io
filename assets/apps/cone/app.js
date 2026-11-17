(() => {
  "use strict";

  const EMPTY_VALUE = "—";
  const NUMBER_MESSAGE = "Введите число больше нуля";
  const RANGE_MESSAGE = "Угол должен быть больше 0 и меньше ";
  const DMS_MESSAGE = "Минуты и секунды — целые от 0 до 59";
  const ALERT_MESSAGE = "Конус с такими данными не получается: второй диаметр выходит за ноль. Уменьшите угол или длину.";

  const formatters = new Map();

  function formatNumber(value, digits) {
    if (!formatters.has(digits)) {
      formatters.set(
        digits,
        new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits })
      );
    }
    return formatters.get(digits).format(value);
  }

  /* Градусы в привычную запись градусы-минуты-секунды. */
  function formatDms(value) {
    const total = Math.round(value * 3600);
    const deg = Math.floor(total / 3600);
    const min = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return deg + "° " + min + "′ " + sec + "″";
  }

  const byId = (id) => document.getElementById(id);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const round = (value) => Math.round(value * 10) / 10;

  function radioValue(name) {
    const checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  }

  /* Числа вводят с запятой и пробелами между разрядами — принимаем оба варианта.
     Незаконченный ввод («12,») не считается ошибкой, пока не появилась цифра после разделителя. */
  function readNumber(input, allowZero = false) {
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
  }

  function showHint(hint, message, inputs = []) {
    hint.textContent = message;
    hint.hidden = !message;

    inputs.forEach((input) => {
      if (message) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    });
  }

  const field = (inputId, hintId) => ({
    input: byId(inputId),
    hint: byId(hintId),
  });

  const degrees = (radians) => (radians * 180) / Math.PI;
  const radians = (value) => (value * Math.PI) / 180;

  /* --- Направление конуса: влияет только на схемы --- */
  let direction = "left";

  /* --- Схема конуса --- */
  const VIEW = {
    width: 320,
    axisY: 78,
    left: 62,
    right: 282,
    maxHalf: 52,
    bottomY: 142,
    tick: 6,
  };

  function verticalDim(x, top, bottom) {
    return [
      "M" + round(x) + " " + round(top) + "L" + round(x) + " " + round(bottom),
      "M" + round(x - VIEW.tick) + " " + round(top) + "L" + round(x + VIEW.tick) + " " + round(top),
      "M" + round(x - VIEW.tick) + " " + round(bottom) + "L" + round(x + VIEW.tick) + " " + round(bottom),
    ].join("");
  }

  function horizontalDim(y, from, to) {
    return [
      "M" + round(from) + " " + round(y) + "L" + round(to) + " " + round(y),
      "M" + round(from) + " " + round(y - VIEW.tick) + "L" + round(from) + " " + round(y + VIEW.tick),
      "M" + round(to) + " " + round(y - VIEW.tick) + "L" + round(to) + " " + round(y + VIEW.tick),
    ].join("");
  }

  /* Строит схему по размерам: важен только масштаб, пропорции и угол сохраняются. */
  function renderCone(svg, big, small, length) {
    const scale = Math.min((2 * VIEW.maxHalf) / big, (VIEW.right - VIEW.left) / length);
    const heightBig = (big * scale) / 2;
    const heightSmall = (small * scale) / 2;
    const lengthPx = length * scale;

    const x0 = VIEW.left + (VIEW.right - VIEW.left - lengthPx) / 2;
    const x1 = x0 + lengthPx;

    const flip = direction === "left";
    const screenX0 = flip ? VIEW.width - x0 : x0;
    const screenX1 = flip ? VIEW.width - x1 : x1;
    const topSmall = VIEW.axisY - heightSmall;
    const bottomSmall = VIEW.axisY + heightSmall;
    const topBig = VIEW.axisY - heightBig;
    const bottomBig = VIEW.axisY + heightBig;

    const shape = svg.querySelector('[data-el="shape"]');
    shape.setAttribute(
      "points",
      [
        [screenX0, topSmall],
        [screenX1, topBig],
        [screenX1, bottomBig],
        [screenX0, bottomSmall],
      ]
        .map(([x, y]) => round(x) + "," + round(y))
        .join(" ")
    );

    const axis = svg.querySelector('[data-el="axis"]');
    axis.setAttribute("x1", round(screenX0 + (flip ? 6 : -6)));
    axis.setAttribute("y1", VIEW.axisY);
    axis.setAttribute("x2", round(screenX1 + (flip ? -6 : 6)));
    axis.setAttribute("y2", VIEW.axisY);

    svg
      .querySelector('[data-el="dim-small"]')
      .setAttribute("d", verticalDim(screenX0 + (flip ? 10 : -10), topSmall, bottomSmall));
    svg
      .querySelector('[data-el="dim-big"]')
      .setAttribute("d", verticalDim(screenX1 + (flip ? -10 : 10), topBig, bottomBig));
    svg
      .querySelector('[data-el="dim-length"]')
      .setAttribute("d", horizontalDim(VIEW.bottomY, screenX0, screenX1));

    const labelSmall = svg.querySelector('[data-el="label-small"]');
    labelSmall.setAttribute("x", round(screenX0 + (flip ? 18 : -18)));
    labelSmall.setAttribute("y", VIEW.axisY + 4);
    labelSmall.setAttribute("text-anchor", flip ? "start" : "end");

    const labelBig = svg.querySelector('[data-el="label-big"]');
    labelBig.setAttribute("x", round(screenX1 + (flip ? -18 : 18)));
    labelBig.setAttribute("y", VIEW.axisY + 4);
    labelBig.setAttribute("text-anchor", flip ? "end" : "start");

    const labelLength = svg.querySelector('[data-el="label-length"]');
    labelLength.setAttribute("x", round((screenX0 + screenX1) / 2));
    labelLength.setAttribute("y", VIEW.bottomY - 8);
    labelLength.setAttribute("text-anchor", "middle");

    /* Дуга угла: центр — вершина конуса, поэтому дуга начинается на оси
       и заканчивается на образующей. Радиус взят чуть больше расстояния
       до малого торца — дуга уходит внутрь конуса, а не ложится на торец. */
    const tan = (big - small) / (2 * length);
    const halfAngle = Math.atan(tan);
    const apexDistance = heightSmall / tan;
    const radius = Math.hypot(apexDistance, heightSmall) + 18;
    const apexX = screenX0 + (flip ? apexDistance : -apexDistance);
    const side = flip ? -1 : 1;

    const arcStart = { x: apexX + side * radius, y: VIEW.axisY };
    const arcEnd = {
      x: apexX + side * radius * Math.cos(halfAngle),
      y: VIEW.axisY - radius * Math.sin(halfAngle),
    };

    svg
      .querySelector('[data-el="angle"]')
      .setAttribute(
        "d",
        "M" + round(arcStart.x) + " " + round(arcStart.y) +
          "A" + round(radius) + " " + round(radius) + " 0 0 " + (flip ? 1 : 0) + " " +
          round(arcEnd.x) + " " + round(arcEnd.y)
      );

    const labelAlpha = svg.querySelector('[data-el="label-alpha"]');
    labelAlpha.setAttribute("x", round(screenX0 + (flip ? -26 : 26)));
    labelAlpha.setAttribute("y", VIEW.axisY - 16);
    labelAlpha.setAttribute("text-anchor", flip ? "end" : "start");
  }

  function figureOf(key) {
    return document.querySelector('[data-cone="' + key + '"]').closest("[data-figure]");
  }

  function drawCone(key, big, small, length) {
    const figure = figureOf(key);
    if (!(big > 0 && small > 0 && length > 0 && big > small)) {
      figure.hidden = true;
      return;
    }
    renderCone(document.querySelector('[data-cone="' + key + '"]'), big, small, length);
    figure.hidden = false;
  }

  function hideCone(key) {
    figureOf(key).hidden = true;
  }

  /* --- Угол: разбор формата ввода --- */

  /* Возвращает половину угла при вершине (угол на сторону от оси) или пусто. */
  function readAngle(prefix) {
    const mode = radioValue(prefix + "-angle-mode");

    if (mode === "taper") {
      const taper = field(prefix + "-taper", "hint-" + prefix + "-taper");
      const parsed = readNumber(taper.input);
      showHint(taper.hint, parsed.invalid ? NUMBER_MESSAGE : "", [taper.input]);
      if (parsed.invalid || parsed.empty) {
        return { empty: true };
      }
      /* Конусность 1 : X — это (D − d) / L = 2 · tan α. */
      return { half: degrees(Math.atan(1 / (2 * parsed.value))) };
    }

    const kind = radioValue(prefix + "-angle-kind");
    const reference = radioValue(prefix + "-angle-ref");
    const limit = kind === "full" ? 180 : 90;

    let given;
    let hint;
    let inputs;

    if (mode === "dms") {
      hint = byId("hint-" + prefix + "-angle-dms");
      inputs = [
        byId(prefix + "-angle-deg"),
        byId(prefix + "-angle-min"),
        byId(prefix + "-angle-sec"),
      ];

      const values = inputs.map((input) => readNumber(input, true));
      const broken = values.some((parsed) => parsed.invalid);
      const outOfRange = values
        .slice(1)
        .some((parsed) => !parsed.empty && parsed.value >= 60);

      showHint(hint, broken ? NUMBER_MESSAGE : outOfRange ? DMS_MESSAGE : "", inputs);
      if (broken || outOfRange) {
        return { empty: true };
      }

      given =
        (values[0].value || 0) +
        (values[1].value || 0) / 60 +
        (values[2].value || 0) / 3600;
    } else {
      const angle = field(prefix + "-angle", "hint-" + prefix + "-angle");
      hint = angle.hint;
      inputs = [angle.input];

      const parsed = readNumber(angle.input);
      showHint(hint, parsed.invalid ? NUMBER_MESSAGE : "", inputs);
      if (parsed.invalid || parsed.empty) {
        return { empty: true };
      }
      given = parsed.value;
    }

    if (given >= limit) {
      showHint(hint, RANGE_MESSAGE + limit + "°", inputs);
      return { empty: true };
    }

    const step = kind === "full" ? given / 2 : given;
    const half = reference === "face" ? 90 - step : step;
    return half > 0 ? { half } : { empty: true };
  }

  /* Показывает блок ввода под выбранный формат угла. */
  function syncAngleMode(prefix) {
    const card = document.querySelector('[data-card="' + prefix + '"]');
    if (!card) {
      return;
    }
    const mode = radioValue(prefix + "-angle-mode");
    all("[data-angle-block]", card).forEach((block) => {
      const kind = block.dataset.angleBlock;
      block.hidden = kind === "variants" ? mode === "taper" : kind !== mode;
    });
  }

  /* --- Карточка «угол по размерам» --- */
  const cardA = {
    big: field("a-big", "hint-a-big"),
    small: field("a-small", "hint-a-small"),
    length: field("a-length", "hint-a-length"),
    half: document.querySelector('[data-output="a-half"] [data-value]'),
    full: document.querySelector('[data-out="a-full"]'),
    face: document.querySelector('[data-out="a-face"]'),
    taper: document.querySelector('[data-out="a-taper"]'),
    slope: document.querySelector('[data-out="a-slope"]'),
    dms: document.querySelector('[data-out="a-dms"]'),
  };

  function updateCardA() {
    const big = readNumber(cardA.big.input);
    const small = readNumber(cardA.small.input);
    const length = readNumber(cardA.length.input);

    showHint(cardA.big.hint, big.invalid ? NUMBER_MESSAGE : "", [cardA.big.input]);
    showHint(cardA.length.hint, length.invalid ? NUMBER_MESSAGE : "", [cardA.length.input]);

    let smallMessage = small.invalid ? NUMBER_MESSAGE : "";
    if (!smallMessage && big.value && small.value && small.value >= big.value) {
      smallMessage = "Меньший диаметр должен быть меньше большего";
    }
    showHint(cardA.small.hint, smallMessage, [cardA.small.input]);

    if (!big.value || !small.value || !length.value || smallMessage) {
      cardA.half.textContent = EMPTY_VALUE;
      cardA.full.textContent = EMPTY_VALUE;
      cardA.face.textContent = EMPTY_VALUE;
      cardA.taper.textContent = EMPTY_VALUE;
      cardA.slope.textContent = EMPTY_VALUE;
      cardA.dms.textContent = EMPTY_VALUE;
      hideCone("a");
      return;
    }

    const half = degrees(Math.atan((big.value - small.value) / (2 * length.value)));
    const taper = (big.value - small.value) / length.value;

    cardA.half.textContent = formatNumber(half, 2);
    cardA.full.textContent = formatNumber(2 * half, 2) + "°";
    cardA.face.textContent = formatNumber(90 - half, 2) + "°";
    cardA.taper.textContent = "1 : " + formatNumber(1 / taper, 2);
    cardA.slope.textContent = formatNumber(taper * 50, 1) + " %";
    cardA.dms.textContent = formatDms(half);

    drawCone("a", big.value, small.value, length.value);
  }

  /* --- Карточка «диаметр по углу» --- */
  const cardB = {
    diameter: field("b-diameter", "hint-b-diameter"),
    length: field("b-length", "hint-b-length"),
    label: document.querySelector('[data-label="b"]'),
    alert: document.querySelector('[data-alert="b"]'),
    value: document.querySelector('[data-output="b-diameter"] [data-value]'),
    half: document.querySelector('[data-out="b-half"]'),
    full: document.querySelector('[data-out="b-full"]'),
    dms: document.querySelector('[data-out="b-dms"]'),
  };

  function updateCardB() {
    const known = readNumber(cardB.diameter.input);
    const length = readNumber(cardB.length.input);

    showHint(cardB.diameter.hint, known.invalid ? NUMBER_MESSAGE : "", [cardB.diameter.input]);
    showHint(cardB.length.hint, length.invalid ? NUMBER_MESSAGE : "", [cardB.length.input]);

    const angle = readAngle("b");
    cardB.alert.hidden = true;

    if (!angle.half || !known.value || !length.value) {
      cardB.value.textContent = EMPTY_VALUE;
      cardB.half.textContent = EMPTY_VALUE;
      cardB.full.textContent = EMPTY_VALUE;
      cardB.dms.textContent = EMPTY_VALUE;
      hideCone("b");
      return;
    }

    const knownIsBig = radioValue("b-known") !== "small";
    const tan = Math.tan(radians(angle.half));
    const other = knownIsBig
      ? known.value - 2 * length.value * tan
      : known.value + 2 * length.value * tan;

    cardB.label.textContent = knownIsBig ? "Меньший диаметр d" : "Больший диаметр D";
    cardB.half.textContent = formatNumber(angle.half, 2) + "°";
    cardB.full.textContent = formatNumber(2 * angle.half, 2) + "°";
    cardB.dms.textContent = formatDms(angle.half);

    if (!(other > 0)) {
      cardB.value.textContent = EMPTY_VALUE;
      cardB.alert.textContent = ALERT_MESSAGE;
      cardB.alert.hidden = false;
      hideCone("b");
      return;
    }

    cardB.value.textContent = formatNumber(other, 2);
    drawCone(
      "b",
      knownIsBig ? known.value : other,
      knownIsBig ? other : known.value,
      length.value
    );
  }

  /* --- Карточка «длина по диаметрам и углу» --- */
  const cardC = {
    big: field("c-big", "hint-c-big"),
    small: field("c-small", "hint-c-small"),
    value: document.querySelector('[data-output="c-length"] [data-value]'),
    half: document.querySelector('[data-out="c-half"]'),
    full: document.querySelector('[data-out="c-full"]'),
    dms: document.querySelector('[data-out="c-dms"]'),
  };

  function updateCardC() {
    const big = readNumber(cardC.big.input);
    const small = readNumber(cardC.small.input);

    showHint(cardC.big.hint, big.invalid ? NUMBER_MESSAGE : "", [cardC.big.input]);

    let smallMessage = small.invalid ? NUMBER_MESSAGE : "";
    if (!smallMessage && big.value && small.value && small.value >= big.value) {
      smallMessage = "Меньший диаметр должен быть меньше большего";
    }
    showHint(cardC.small.hint, smallMessage, [cardC.small.input]);

    const angle = readAngle("c");

    if (!big.value || !small.value || !angle.half || smallMessage) {
      cardC.value.textContent = EMPTY_VALUE;
      cardC.half.textContent = EMPTY_VALUE;
      cardC.full.textContent = EMPTY_VALUE;
      cardC.dms.textContent = EMPTY_VALUE;
      hideCone("c");
      return;
    }

    const length = (big.value - small.value) / (2 * Math.tan(radians(angle.half)));

    cardC.half.textContent = formatNumber(angle.half, 2) + "°";
    cardC.full.textContent = formatNumber(2 * angle.half, 2) + "°";
    cardC.dms.textContent = formatDms(angle.half);
    cardC.value.textContent = formatNumber(length, 2);

    drawCone("c", big.value, small.value, length);
  }

  /* --- Связывание --- */
  ["a-big", "a-small", "a-length"].forEach((id) => {
    byId(id).addEventListener("input", updateCardA);
  });

  ["b-angle", "b-angle-deg", "b-angle-min", "b-angle-sec", "b-taper", "b-diameter", "b-length"].forEach((id) => {
    byId(id).addEventListener("input", updateCardB);
  });

  ["c-angle", "c-angle-deg", "c-angle-min", "c-angle-sec", "c-taper", "c-big", "c-small"].forEach((id) => {
    byId(id).addEventListener("input", updateCardC);
  });

  all('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      const name = event.target.name;

      if (name === "cone-dir") {
        direction = event.target.value === "right" ? "right" : "left";
        updateCardA();
        updateCardB();
        updateCardC();
        return;
      }

      const prefix = name.charAt(0);
      if (prefix !== "b" && prefix !== "c") {
        return;
      }
      syncAngleMode(prefix);
      if (prefix === "b") {
        updateCardB();
      } else {
        updateCardC();
      }
    });
  });

  syncAngleMode("b");
  syncAngleMode("c");
  updateCardA();
  updateCardB();
  updateCardC();
})();
