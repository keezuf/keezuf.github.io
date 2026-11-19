(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const EMPTY = "—";
  const NUMBER = "Введите число больше нуля";
  const COUNT_INT = "Число отверстий — целое";
  const COUNT_MIN = "Не меньше трёх отверстий";
  const COUNT_MAX = "Не больше 100 отверстий";
  const TOLERANCE = "Допуск — число от нуля";

  const mm = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const deg = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

  const byId = (id) => document.getElementById(id);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const round = (value) => Math.round(value * 10) / 10;

  const shareInputs = all("[data-share]");
  const inputOf = (key) => shareInputs.find((input) => input.dataset.share === key) || null;

  /* --- Ввод --- */

  const baseReadNumber = window.Keezuf.readNumber;

  function readNumber(input, allowZero = false) {
    const parsed = baseReadNumber(input, allowZero);
    return parsed.invalid ? { error: NUMBER } : parsed;
  }

  function readCount(input) {
    const parsed = readNumber(input);
    if (parsed.error || parsed.empty) {
      return parsed;
    }
    if (!Number.isInteger(parsed.value)) {
      return { error: COUNT_INT };
    }
    if (parsed.value < 3) {
      return { error: COUNT_MIN };
    }
    if (parsed.value > 100) {
      return { error: COUNT_MAX };
    }
    return parsed;
  }

  function readTolerance(input) {
    const parsed = readNumber(input, true);
    if (parsed.empty) {
      return parsed;
    }
    if (parsed.error) {
      return { error: TOLERANCE };
    }
    return parsed;
  }

  const readers = { count: readCount, tolerance: readTolerance };

  function sharedValue(key) {
    const input = inputOf(key);
    if (!input) {
      return { empty: true };
    }
    return (readers[key] || readNumber)(input);
  }

  function hintOf(input) {
    const id = input.getAttribute("aria-describedby");
    return id ? byId(id) : null;
  }

  function applyMessage(input, message) {
    const hint = hintOf(input);
    if (hint) {
      hint.textContent = message;
      hint.hidden = !message;
    }
    if (message) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function messageFor(key, message) {
    shareInputs.filter((input) => input.dataset.share === key).forEach((input) => applyMessage(input, message));
  }

  /* --- Схемы --- */

  /* Схемы контрольной карточки: «противолежащие» перерисовывается под
     число отверстий, остальные четыре — статичные картинки в разметке. */

  const OPPOSITE = { cx: 150, radius: 90, hole: 15, od: 135, id: 45 };

  function renderOpposite(svg, count, outer, inner) {
    clearNode(svg);

    const steps = count % 2 === 0 ? count / 2 : (count - 1) / 2;
    const spread = (steps * 360) / count;
    const startAngle = 90 - spread / 2;
    const shift = OPPOSITE.radius * Math.cos(toRadians(spread / 2));

    /* С 17 отверстий кружки сливаются — рисуем их точками, кольцо чуть
       уменьшаем, а размерные линии выносим за него. */
    const dense = count > 16;

    let scale = Math.min(1, 180 / (2 * (OPPOSITE.radius + OPPOSITE.hole)));
    if (dense) {
      scale = Math.min(scale, 62 / OPPOSITE.radius);
    }

    const radius = OPPOSITE.radius * scale;
    const hole = OPPOSITE.hole * scale;
    const od = OPPOSITE.od * scale;
    const centerShift = shift * scale;
    const edge = dense ? 7 : hole;
    const ringRoom = radius + Math.abs(centerShift) + (dense ? 10 : 0);
    const dotRadius = Math.max(1.6, Math.min(3.4, ((Math.PI * radius) / count) * 0.36));

    const contentTop = dense ? -(ringRoom + 24) : Math.min(-63, centerShift - radius - hole);
    const contentBottom = dense ? ringRoom + 24 : Math.max(63, centerShift + radius + hole);
    const pairY = 100 - (contentTop + contentBottom) / 2;
    const centerY = pairY + centerShift;

    const pointOf = (angle) => ({
      x: OPPOSITE.cx + radius * Math.cos(toRadians(angle)),
      y: centerY - radius * Math.sin(toRadians(angle)),
    });

    const points = Array.from({ length: count }, (_, index) => pointOf(startAngle + (index * 360) / count));
    const pair = points[0].x <= points[steps].x ? [points[0], points[steps]] : [points[steps], points[0]];
    const left = pair[0];
    const right = pair[1];

    /* Размерные линии: у плотной окружности — за кольцом,
       у обычной — в свободной полосе над парой и под ней. */
    function freeLine(direction) {
      if (dense) {
        return pairY + direction * ringRoom;
      }
      for (let offset = 45; offset <= 90; offset += 2) {
        const y = pairY + direction * offset;
        const busy = points.some((point) => Math.abs(point.y - y) < hole + 9);
        if (!busy) {
          return y;
        }
      }
      return pairY + direction * 90;
    }

    const outerY = freeLine(-1);
    const innerY = freeLine(1);

    svgEl("circle", { cx: OPPOSITE.cx, cy: round(centerY), r: round(od), class: "f-part" }, svg);
    svgEl("circle", { cx: OPPOSITE.cx, cy: round(centerY), r: round(OPPOSITE.id * scale), class: "f-bore" }, svg);
    svgEl("circle", { cx: OPPOSITE.cx, cy: round(centerY), r: round(radius), class: "f-pitch" }, svg);

    points.forEach((point, index) => {
      const focused = index === 0 || index === steps;
      svgEl(
        "circle",
        {
          cx: round(point.x),
          cy: round(point.y),
          r: dense ? (focused ? dotRadius + 1.2 : dotRadius) : hole,
          class: dense
            ? focused
              ? "f-dot f-dot--focus"
              : "f-dot"
            : focused
              ? "f-hole f-hole--focus"
              : "f-hole",
        },
        svg
      );
    });

    const line = (fromX, fromY, toX, toY, className) => {
      svgEl("line", { x1: round(fromX), y1: round(fromY), x2: round(toX), y2: round(toY), class: className }, svg);
    };

    const arrow = (x, y, direction, className) => {
      const back = round(x - direction * 7);
      svgEl(
        "path",
        { d: "M" + back + " " + (y - 3) + "L" + round(x) + " " + round(y) + "L" + back + " " + (y + 3), class: className },
        svg
      );
    };

    const outerLeft = left.x - edge;
    const outerRight = right.x + edge;
    const innerLeft = left.x + edge;
    const innerRight = right.x - edge;

    line(outerLeft, pairY, outerLeft, outerY - 6, "f-ext f-ext--solid");
    line(outerRight, pairY, outerRight, outerY - 6, "f-ext f-ext--solid");
    line(outerLeft, outerY, outerRight, outerY, "f-dim f-dim--a");
    arrow(outerLeft, outerY, -1, "f-arrow f-arrow--a");
    arrow(outerRight, outerY, 1, "f-arrow f-arrow--a");

    line(innerLeft, pairY, innerLeft, innerY + 6, "f-ext f-ext--solid");
    line(innerRight, pairY, innerRight, innerY + 6, "f-ext f-ext--solid");
    line(innerLeft, innerY, innerRight, innerY, "f-dim f-dim--b");
    arrow(innerLeft, innerY, -1, "f-arrow f-arrow--b");
    arrow(innerRight, innerY, 1, "f-arrow f-arrow--b");

    svgText(svg, OPPOSITE.cx, dense ? outerY - 6 : outerY + 13, outer, "f-chord-text f-chord-text--a");
    svgText(svg, OPPOSITE.cx, dense ? innerY + 16 : innerY - 7, inner, "f-chord-text f-chord-text--b");

    byId("opposite-note").hidden = !dense;
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
    parent.appendChild(node);
    return node;
  }

  function svgText(parent, x, y, content, className, anchor) {
    const node = svgEl(
      "text",
      { x: round(x), y: round(y), class: className, "text-anchor": anchor || "middle" },
      parent
    );
    node.textContent = content;
    return node;
  }

  /* --- Схема «шаг отверстий» ---

     Размеры вынесены за центровую окружность: c₁ — сверху-снаружи,
     c₂ — снизу-снаружи. Ничего не ложится на отверстия и не уходит
     за границу рисунка. Угол φ показан дугой между радиусами. */

  const CHORD = { cx: 180, cy: 155, radius: 90, gap: 20, holeRadius: 5 };

  function chordPoint(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return { x: CHORD.cx + radius * Math.cos(rad), y: CHORD.cy + radius * Math.sin(rad) };
  }

  const angleGap = (angle, target) => {
    const diff = Math.abs(angle - target) % 360;
    return diff > 180 ? 360 - diff : diff;
  };

  /* Границы рисунка собираем по ходу отрисовки: viewBox подгоняется под
     содержимое, поэтому размеры никогда не выходят за кадр. */
  function chordBounds() {
    return {
      minX: CHORD.cx - CHORD.radius,
      maxX: CHORD.cx + CHORD.radius,
      minY: CHORD.cy - CHORD.radius,
      maxY: CHORD.cy + CHORD.radius,
    };
  }

  function growBounds(bounds, point, margin) {
    bounds.minX = Math.min(bounds.minX, point.x - margin);
    bounds.maxX = Math.max(bounds.maxX, point.x + margin);
    bounds.minY = Math.min(bounds.minY, point.y - margin);
    bounds.maxY = Math.max(bounds.maxY, point.y + margin);
  }

  /* Нормаль наружу от центра в середине хорды; для диаметра — на «нижнее» отверстие. */
  function chordNormal(first, second, fallbackAngle) {
    const mx = (first.x + second.x) / 2 - CHORD.cx;
    const my = (first.y + second.y) / 2 - CHORD.cy;
    const length = Math.hypot(mx, my);
    if (length < 1) {
      const rad = (fallbackAngle * Math.PI) / 180;
      return { x: Math.cos(rad), y: Math.sin(rad) };
    }
    return { x: mx / length, y: my / length };
  }

  /* Концы размерной линии: проекции центров отверстий на линию,
     удалённую от центра на R + отступ. */
  function chordSpan(first, second, normal) {
    const reach =
      CHORD.radius + CHORD.gap -
      (normal.x * (first.x - CHORD.cx) + normal.y * (first.y - CHORD.cy));
    return {
      start: { x: first.x + normal.x * reach, y: first.y + normal.y * reach },
      end: { x: second.x + normal.x * reach, y: second.y + normal.y * reach },
    };
  }

  function chordLine(svg, from, to, className) {
    svgEl("line", { x1: round(from.x), y1: round(from.y), x2: round(to.x), y2: round(to.y), class: className }, svg);
  }

  /* Открытая стрелка: остриё в tip, смотрит по direction. */
  function chordArrow(svg, tip, direction, className, size) {
    const length = size || 7;
    const normal = { x: -direction.y, y: direction.x };
    const back = { x: tip.x - direction.x * length, y: tip.y - direction.y * length };
    const wing = length * 0.4;
    const d =
      "M" + round(back.x + normal.x * wing) + " " + round(back.y + normal.y * wing) +
      "L" + round(tip.x) + " " + round(tip.y) +
      "L" + round(back.x - normal.x * wing) + " " + round(back.y - normal.y * wing);
    svgEl("path", { d, class: className }, svg);
  }

  function chordText(svg, point, content, className, angle) {
    const node = svgEl(
      "text",
      { x: round(point.x), y: round(point.y + 3.5), class: className, "text-anchor": "middle" },
      svg
    );
    if (angle) {
      node.setAttribute("transform", "rotate(" + round(angle) + " " + round(point.x) + " " + round(point.y) + ")");
    }
    node.textContent = content;
  }

  /* Выносная линия от центра отверстия за размерную линию. */
  function chordExtension(svg, point, edge, normal) {
    chordLine(svg, point, { x: edge.x + normal.x * 6, y: edge.y + normal.y * 6 }, "f-ext f-ext--solid");
  }

  function chordDimension(svg, span, normal, style, label, rotate) {
    const dx = span.end.x - span.start.x;
    const dy = span.end.y - span.start.y;
    const length = Math.hypot(dx, dy) || 1;
    const direction = { x: dx / length, y: dy / length };

    chordLine(svg, span.start, span.end, style.line);
    chordArrow(svg, span.start, { x: -direction.x, y: -direction.y }, style.arrow);
    chordArrow(svg, span.end, direction, style.arrow);

    let angle = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
    if (angle > 90) {
      angle -= 180;
    }
    if (angle < -90) {
      angle += 180;
    }

    const labelPoint = {
      x: (span.start.x + span.end.x) / 2 + normal.x * 15,
      y: (span.start.y + span.end.y) / 2 + normal.y * 15,
    };
    chordText(svg, labelPoint, label, style.text, rotate ? angle : 0);
    return labelPoint;
  }

  function renderChord(svg, chord) {
    clearNode(svg);

    /* Значения для подписей считает карточка — здесь только рисунок. */
    const { count, step, through, angle } = chord;
    const angles = Array.from({ length: count }, (_, index) => -90 + (index * 360) / count);
    const points = angles.map((angle) => chordPoint(angle, CHORD.radius));

    /* Размер c₂ — между соседями отверстия, ближайшего к низу рисунка. */
    let bottom = 0;
    angles.forEach((angle, index) => {
      if (angleGap(angle, 90) < angleGap(angles[bottom], 90)) {
        bottom = index;
      }
    });

    const adjacent = 1 % count;
    const acrossLeft = (bottom - 1 + count) % count;
    const acrossRight = (bottom + 1) % count;
    const focus = [0, adjacent, acrossLeft, acrossRight];

    const normalAdjacent = chordNormal(points[0], points[adjacent], angles[0] + 180 / count);
    const normalAcross = chordNormal(points[acrossLeft], points[acrossRight], angles[bottom]);
    const spanAdjacent = chordSpan(points[0], points[adjacent], normalAdjacent);
    const spanAcross = chordSpan(points[acrossLeft], points[acrossRight], normalAcross);

    const bounds = chordBounds();
    [spanAdjacent, spanAcross].forEach((span) => {
      growBounds(bounds, span.start, 9);
      growBounds(bounds, span.end, 9);
    });
    growBounds(bounds, points[0], 7);
    growBounds(bounds, points[adjacent], 7);
    growBounds(bounds, points[acrossLeft], 7);
    growBounds(bounds, points[acrossRight], 7);

    /* Окружность и радиусы к соседним отверстиям. */
    svgEl("circle", { cx: CHORD.cx, cy: CHORD.cy, r: CHORD.radius, class: "f-pitch" }, svg);
    chordLine(svg, { x: CHORD.cx, y: CHORD.cy }, points[0], "f-radius");
    chordLine(svg, { x: CHORD.cx, y: CHORD.cy }, points[adjacent], "f-radius");

    points.forEach((point, index) => {
      svgEl(
        "circle",
        {
          cx: round(point.x),
          cy: round(point.y),
          r: CHORD.holeRadius,
          class: focus.includes(index) ? "f-hole f-hole--focus" : "f-hole",
        },
        svg
      );
    });

    /* Выносные линии рисуем поверх отверстий: видно, что размер идёт от центров. */
    chordExtension(svg, points[0], spanAdjacent.start, normalAdjacent);
    chordExtension(svg, points[adjacent], spanAdjacent.end, normalAdjacent);
    chordExtension(svg, points[acrossLeft], spanAcross.start, normalAcross);
    chordExtension(svg, points[acrossRight], spanAcross.end, normalAcross);

    const adjacentLabel = chordDimension(
      svg,
      spanAdjacent,
      normalAdjacent,
      { line: "f-dim f-dim--a", arrow: "f-arrow f-arrow--a", text: "f-chord-text f-chord-text--a" },
      mm.format(step),
      true
    );
    const acrossLabel = chordDimension(
      svg,
      spanAcross,
      normalAcross,
      { line: "f-dim f-dim--b", arrow: "f-arrow f-arrow--b", text: "f-chord-text f-chord-text--b" },
      mm.format(through),
      false
    );
    growBounds(bounds, adjacentLabel, 26);
    growBounds(bounds, acrossLabel, 26);

    /* Угол φ между радиусами соседних отверстий. */
    const arcRadius = CHORD.radius * 0.5;
    const sweep = 360 / count;
    const arcStart = chordPoint(angles[0], arcRadius);
    const arcEnd = chordPoint(angles[0] + sweep, arcRadius);
    svgEl(
      "path",
      {
        d:
          "M" + round(arcStart.x) + " " + round(arcStart.y) +
          "A" + round(arcRadius) + " " + round(arcRadius) + " 0 " + (sweep > 180 ? 1 : 0) + " 1 " +
          round(arcEnd.x) + " " + round(arcEnd.y),
        class: "f-arc",
      },
      svg
    );

    const startRad = (angles[0] * Math.PI) / 180;
    const endRad = ((angles[0] + sweep) * Math.PI) / 180;
    chordArrow(svg, arcStart, { x: Math.sin(startRad), y: -Math.cos(startRad) }, "f-arrow f-arrow--muted", 5.5);
    chordArrow(svg, arcEnd, { x: -Math.sin(endRad), y: Math.cos(endRad) }, "f-arrow f-arrow--muted", 5.5);

    const phi = chordPoint(angles[0] + sweep / 2, arcRadius + 18);
    svgText(svg, phi.x, phi.y + 3.5, deg.format(angle) + "°", "f-note");
    growBounds(bounds, phi, 18);

    /* Кадр подгоняем под содержимое: ничего не выходит за границы. */
    const pad = 8;
    svg.setAttribute(
      "viewBox",
      [
        round(bounds.minX - pad),
        round(bounds.minY - pad),
        round(bounds.maxX - bounds.minX + pad * 2),
        round(bounds.maxY - bounds.minY + pad * 2),
      ].join(" ")
    );
  }

  /* --- Отметки отверстий: углы поворотного стола или координаты для ЧПУ --- */

  const marksToggle = byId("marks-toggle");
  const marksPanel = byId("marks-panel");
  const marksList = byId("marks-list");
  const marksStart = byId("chord-start");
  const START_MESSAGE = "Введите число от нуля";
  const coord = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
  const toRadians = (value) => (value * Math.PI) / 180;

  let marksMode = "table";
  let marksOpen = false;

  function cleanCoordinate(value) {
    const rounded = Math.round(value * 100) / 100;
    return rounded === 0 ? 0 : rounded;
  }

  function normalizeAngle(value) {
    const wrapped = ((value % 360) + 360) % 360;
    const rounded = Math.round(wrapped * 100) / 100;
    return rounded >= 360 ? 0 : rounded;
  }

  function clearMarks() {
    while (marksList.firstChild) {
      marksList.removeChild(marksList.firstChild);
    }
  }

  function updateMarks(pitch, count) {
    const parsed = readNumber(marksStart, true);
    applyMessage(marksStart, parsed.error ? START_MESSAGE : "");

    clearMarks();
    if (parsed.error || !pitch || !count) {
      return;
    }

    const start = parsed.value || 0;
    const stepAngle = 360 / count;
    const radius = pitch / 2;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
      const angle = normalizeAngle(start + index * stepAngle);
      const item = document.createElement("li");
      item.className = "marks-item";

      if (marksMode === "table") {
        item.textContent = deg.format(angle) + "°";
      } else {
        const x = cleanCoordinate(radius * Math.cos(toRadians(angle)));
        const y = cleanCoordinate(radius * Math.sin(toRadians(angle)));
        item.textContent = "X" + coord.format(x) + " Y" + coord.format(y);
      }

      fragment.appendChild(item);
    }

    marksList.appendChild(fragment);
  }

  /* --- Карточка «шаг отверстий» --- */

  function updateChord(pitch, count) {
    const figure = byId("chord-figure");

    if (!pitch.value || !count.value) {
      byId("chord-step").textContent = EMPTY;
      byId("chord-through").textContent = EMPTY;
      byId("chord-angle").textContent = EMPTY;
      figure.hidden = true;
      marksToggle.hidden = true;
      marksPanel.hidden = true;
      clearMarks();
      return;
    }

    const step = pitch.value * Math.sin(Math.PI / count.value);
    const through = pitch.value * Math.sin((2 * Math.PI) / count.value);
    const angle = 360 / count.value;

    byId("chord-step").textContent = mm.format(step);
    byId("chord-through").textContent = mm.format(through) + " мм";
    byId("chord-angle").textContent = deg.format(angle) + "°";

    figure.hidden = false;
    marksToggle.hidden = false;
    marksPanel.hidden = !marksOpen;

    renderChord(figure.querySelector("svg"), { count: count.value, step, through, angle });
    updateMarks(pitch.value, count.value);
  }

  /* --- Карточка «разметка» --- */

  function updateMark(pitch, odDrawing, odActual, idDrawing, idActual) {
    const outerValue = byId("mark-outer");
    const innerValue = byId("mark-inner");
    const outerNote = byId("mark-outer-note");
    const innerNote = byId("mark-inner-note");

    const od = odActual.value ?? odDrawing.value ?? null;
    const id = idActual.value ?? idDrawing.value ?? null;

    let outer = null;
    let outerByDrawing = null;
    let inner = null;
    let innerByDrawing = null;

    if (pitch.value && od) {
      outer = (od - pitch.value) / 2;
      if (odDrawing.value) {
        outerByDrawing = (odDrawing.value - pitch.value) / 2;
      }
    }
    if (pitch.value && id) {
      inner = (pitch.value - id) / 2;
      if (idDrawing.value) {
        innerByDrawing = (pitch.value - idDrawing.value) / 2;
      }
    }

    outerValue.textContent = outer === null ? EMPTY : mm.format(outer);
    innerValue.textContent = inner === null ? EMPTY : mm.format(inner);

    const outerDiff = outer !== null && outerByDrawing !== null && Math.abs(outer - outerByDrawing) > 0.0005;
    const innerDiff = inner !== null && innerByDrawing !== null && Math.abs(inner - innerByDrawing) > 0.0005;

    outerNote.hidden = !outerDiff;
    outerNote.textContent = outerDiff ? "по чертежу: " + mm.format(outerByDrawing) + " мм" : "";
    innerNote.hidden = !innerDiff;
    innerNote.textContent = innerDiff ? "по чертежу: " + mm.format(innerByDrawing) + " мм" : "";

    byId("fig-mark-outer").textContent = outerValue.textContent;
    byId("fig-mark-inner").textContent = innerValue.textContent;
  }

  /* --- Карточка «контроль» --- */

  function setRow(index, value, drawing, tolerance) {
    const text = value === null ? EMPTY : mm.format(value);
    byId("r" + index).textContent = text;

    const caption = byId("fig-label-" + index);
    if (caption) {
      caption.textContent = text;
    }

    const limit = byId("r" + index + "-limit");
    if (value === null || tolerance === null) {
      limit.hidden = true;
    } else {
      limit.hidden = false;
      limit.textContent =
        "пределы " + mm.format(value - tolerance) + " … " + mm.format(value + tolerance);
    }

    const note = byId("r" + index + "-drawing");
    const differs = value !== null && drawing !== null && Math.abs(value - drawing) > 0.0005;
    note.hidden = !differs;
    note.textContent = differs ? "по чертежу: " + mm.format(drawing) + " мм" : "";
  }

  function updateControl(inputs) {
    const pitch = inputs.pitch;
    const count = inputs.count;
    const hole = inputs.hole;
    const od = inputs.od;
    const id = inputs.id;
    const tolerance = inputs.tolerance;

    const warning = byId("ctrl-warning");
    const ready = Boolean(pitch.value && count.value && hole.value);

    const odd = ready && count.value % 2 !== 0;
    const steps = ready ? (odd ? (count.value - 1) / 2 : count.value / 2) : 0;

    byId("name-r1").textContent = odd
      ? "Внешние кромки · внутренними губками (пара через " + steps + ")"
      : "Внешние кромки · внутренними губками";

    const oppositeSvg = byId("group-opposite").querySelector("svg");

    if (!ready) {
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((index) => setRow(index, null, null, null));
      warning.hidden = true;
      renderOpposite(oppositeSvg, count.value || 6, EMPTY, EMPTY);
      return;
    }

    const chord = (stepCount) => pitch.value * Math.sin((Math.PI * stepCount) / count.value);
    const adjacent = chord(1);
    const through = chord(2);
    const opposite = chord(steps);
    const holeActual = hole.value;

    const drawingHole = inputs.holeDrawing.value ?? hole.value;
    const drawingOd = inputs.odDrawing.value;
    const drawingId = inputs.idDrawing.value;

    setRow(1, opposite + holeActual, opposite + drawingHole, tolerance.value ?? null);
    setRow(2, opposite - holeActual, opposite - drawingHole, tolerance.value ?? null);
    setRow(3, adjacent + holeActual, adjacent + drawingHole, tolerance.value ?? null);
    setRow(4, adjacent - holeActual, adjacent - drawingHole, tolerance.value ?? null);
    setRow(5, through + holeActual, through + drawingHole, tolerance.value ?? null);
    setRow(6, through - holeActual, through - drawingHole, tolerance.value ?? null);

    const edgeTolerance = tolerance.value === undefined ? null : tolerance.value / 2;

    setRow(
      7,
      od ? (od - pitch.value - holeActual) / 2 : null,
      od && drawingOd ? (drawingOd - pitch.value - drawingHole) / 2 : null,
      edgeTolerance
    );
    setRow(
      8,
      id ? (pitch.value - holeActual - id) / 2 : null,
      id && drawingId ? (pitch.value - drawingHole - drawingId) / 2 : null,
      edgeTolerance
    );

    /* Схема «противолежащие» — единственная, что следует за числом отверстий. */
    renderOpposite(
      oppositeSvg,
      count.value,
      mm.format(opposite + holeActual),
      mm.format(opposite - holeActual)
    );

    /* Предупреждения о невозможной геометрии */
    const messages = [];
    if (od && pitch.value + holeActual > od + 0.0005) {
      messages.push("Отверстия выходят за наружную кромку детали.");
    }
    if (id && pitch.value - holeActual < id - 0.0005) {
      messages.push("Отверстия заходят за внутреннюю расточку.");
    }
    if (adjacent - holeActual < -0.0005) {
      messages.push("Соседние отверстия пересекаются: шаг меньше диаметра отверстия.");
    }

    warning.hidden = messages.length === 0;
    warning.textContent = messages.join(" ");
  }

  /* --- Общий пересчёт --- */

  function updateAll() {
    const pitch = sharedValue("pitch");
    const count = sharedValue("count");
    const odDrawing = sharedValue("od-drawing");
    const odActual = sharedValue("od-actual");
    const idDrawing = sharedValue("id-drawing");
    const idActual = sharedValue("id-actual");
    const holeDrawing = sharedValue("hole-drawing");
    const holeActual = sharedValue("hole-actual");
    const tolerance = sharedValue("tolerance");

    messageFor("pitch", pitch.error || "");
    messageFor("count", count.error || "");
    messageFor("od-drawing", odDrawing.error || "");
    messageFor("od-actual", odActual.error || "");
    messageFor("id-drawing", idDrawing.error || "");
    messageFor("id-actual", idActual.error || "");
    messageFor("hole-drawing", holeDrawing.error || "");
    messageFor("hole-actual", holeActual.error || "");
    messageFor("tolerance", tolerance.error || "");

    updateChord(pitch, count);
    updateMark(pitch, odDrawing, odActual, idDrawing, idActual);
    updateControl({
      pitch,
      count,
      hole: holeActual.value !== undefined ? holeActual : holeDrawing,
      holeDrawing,
      od: odActual.value ?? odDrawing.value ?? null,
      id: idActual.value ?? idDrawing.value ?? null,
      odDrawing: odDrawing,
      idDrawing: idDrawing,
      tolerance,
    });
  }

  /* --- Связывание полей: одно значение на все карточки --- */

  shareInputs.forEach((input) => {
    input.addEventListener("input", () => {
      shareInputs
        .filter((peer) => peer !== input && peer.dataset.share === input.dataset.share)
        .forEach((peer) => {
          peer.value = input.value;
        });
      updateAll();
    });
  });

  /* --- Отметки: разворачивание и режим --- */

  /* Список отметок зависит только от полей карточки шага — читаем их явно. */
  function updateMarksFromInputs() {
    updateMarks(sharedValue("pitch").value || 0, sharedValue("count").value || 0);
  }

  marksToggle.addEventListener("click", () => {
    marksOpen = !marksOpen;
    marksPanel.hidden = !marksOpen;
    marksToggle.setAttribute("aria-expanded", marksOpen ? "true" : "false");
    marksToggle.textContent = marksOpen ? "Скрыть отметки/координаты" : "Показать отметки/координаты";
  });

  all("[data-marks-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      marksMode = button.dataset.marksMode === "cnc" ? "cnc" : "table";
      all("[data-marks-mode]").forEach((other) => {
        const active = other === button;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", active ? "true" : "false");
      });
      updateMarksFromInputs();
    });
  });

  marksStart.addEventListener("input", updateMarksFromInputs);

  updateAll();
})();
