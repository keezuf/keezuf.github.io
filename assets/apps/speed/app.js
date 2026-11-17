(() => {
  "use strict";

  const INVALID_MESSAGE = "Введите число больше нуля";
  const EMPTY_VALUE = "—";

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

  /* Числа вводят с запятой и пробелами между разрядами — принимаем оба варианта.
     Незаконченный ввод («12,») не считается ошибкой, пока не появилась цифра после разделителя. */
  function readNumber(input) {
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
    return Number.isFinite(value) && value > 0 ? { value } : { invalid: true };
  }

  /* Карточка: два поля ввода, формула расчёта и место для результата. */
  function bindCard(card) {
    const output = document.querySelector('[data-output="' + card.id + '"]');
    const resultNode = output.querySelector("[data-value]");
    const fields = [card.first, card.diameter];

    function update() {
      const parsed = fields.map((field) => readNumber(field.input));
      let complete = true;

      fields.forEach((field, index) => {
        const invalid = Boolean(parsed[index].invalid);

        field.hint.textContent = invalid ? INVALID_MESSAGE : "";
        field.hint.hidden = !invalid;

        if (invalid) {
          field.input.setAttribute("aria-invalid", "true");
        } else {
          field.input.removeAttribute("aria-invalid");
        }

        if (invalid || parsed[index].empty) {
          complete = false;
        }
      });

      const value = complete ? card.compute(parsed[0].value, parsed[1].value) : Number.NaN;
      resultNode.textContent = Number.isFinite(value) ? formatNumber(value, card.digits) : EMPTY_VALUE;
    }

    fields.forEach((field) => {
      field.input.addEventListener("input", update);
    });

    update();
  }

  const byId = (id) => document.getElementById(id);

  /* Прямой расчёт: сколько оборотов нужно для заданной скорости резания. */
  bindCard({
    id: "rpm",
    first: { input: byId("v-target"), hint: byId("hint-v-target") },
    diameter: { input: byId("d-rpm"), hint: byId("hint-d-rpm") },
    compute: (speed, diameter) => (1000 * speed) / (Math.PI * diameter),
    digits: 1,
  });

  /* Обратный расчёт: какая скорость резания получится на заданных оборотах. */
  bindCard({
    id: "speed",
    first: { input: byId("rpm-actual"), hint: byId("hint-rpm-actual") },
    diameter: { input: byId("d-speed"), hint: byId("hint-d-speed") },
    compute: (rpm, diameter) => (Math.PI * diameter * rpm) / 1000,
    digits: 2,
  });
})();
