(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const EMPTY = "—";
  const NUMBER = "Введите число больше нуля";
  const COUNT_INT = "Число отверстий — целое";
  const COUNT_MIN = "Не меньше трёх отверстий";
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

  function sharedNumber(key) {
    const parsed = sharedValue(key);
    return parsed.value === undefined ? null : parsed.value;
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

  const FIG = { width: 300, height: 196, cx: 150, cy: 94, maxR: 82 };

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

  function geometry(model) {
    const odR = model.od ? model.od / 2 : 0;
    const idR = model.id ? model.id / 2 : 0;
    const pitchR = model.pitch / 2;
    const holeR = model.hole ? model.hole / 2 : 0;
    const outer = Math.max(odR, pitchR + holeR, idR) * 1.06;
    const scale = FIG.maxR / outer;

    return {
      odR: odR * scale,
      idR: idR * scale,
      pitchR: pitchR * scale,
      holeR: model.hole ? Math.max(2, holeR * scale) : 5,
      angles: Array.from({ length: model.count }, (_, index) => -90 + (index * 360) / model.count),
    };
  }

  function pointAt(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: FIG.cx + radius * Math.cos(rad),
      y: FIG.cy + radius * Math.sin(rad),
    };
  }

  function drawFlange(svg, state, focus) {
    if (state.odR) {
      svgEl("circle", { cx: FIG.cx, cy: FIG.cy, r: round(state.odR), class: "f-part" }, svg);
    }
    if (state.idR) {
      svgEl("circle", { cx: FIG.cx, cy: FIG.cy, r: round(state.idR), class: "f-bore" }, svg);
    }
    svgEl("circle", { cx: FIG.cx, cy: FIG.cy, r: round(state.pitchR), class: "f-pitch" }, svg);

    state.angles.forEach((angle, index) => {
      const point = pointAt(angle, state.pitchR);
      svgEl(
        "circle",
        {
          cx: round(point.x),
          cy: round(point.y),
          r: round(state.holeR),
          class: focus.includes(index) ? "f-hole f-hole--focus" : "f-hole",
        },
        svg
      );
    });
  }

  /* Размерная линия между двумя точками: сноски, засечки и номер. */
  function dimension(svg, from, to, offset, label, options = {}) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;

    const ax = from.x + nx * offset;
    const ay = from.y + ny * offset;
    const bx = to.x + nx * offset;
    const by = to.y + ny * offset;

    const variant = options.variant || "";
    const lineClass =
      "f-dim" + (options.soft ? " f-dim--soft" : "") + (variant ? " f-dim--" + variant : "");
    const badgeClass = "f-badge" + (variant ? " f-badge--" + variant : "");
    const textClass = "f-badge-text" + (variant ? " f-badge-text--" + variant : "");

    svgEl("line", { x1: round(from.x), y1: round(from.y), x2: round(ax), y2: round(ay), class: "f-ext" }, svg);
    svgEl("line", { x1: round(to.x), y1: round(to.y), x2: round(bx), y2: round(by), class: "f-ext" }, svg);
    svgEl("line", { x1: round(ax), y1: round(ay), x2: round(bx), y2: round(by), class: lineClass }, svg);

    const tick = 4;
    const tx = (ux + nx) * tick;
    const ty = (uy + ny) * tick;
    svgEl("line", { x1: round(ax - tx), y1: round(ay - ty), x2: round(ax + tx), y2: round(ay + ty), class: lineClass }, svg);
    svgEl("line", { x1: round(bx - tx), y1: round(by - ty), x2: round(bx + tx), y2: round(by + ty), class: lineClass }, svg);

    /* Номер: либо рядом с линией, либо снаружи от центра детали — чтобы не лез в отверстия. */
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    let lx = mx + nx * (offset >= 0 ? 14 : -14);
    let ly = my + ny * (offset >= 0 ? 14 : -14);

    if (!options.normalBadge) {
      let ox = mx - FIG.cx;
      let oy = my - FIG.cy;
      let distance = Math.hypot(ox, oy);
      if (distance < 10) {
        ox = nx;
        oy = ny;
        distance = 1;
      }
      lx = mx + (ox / distance) * 15;
      ly = my + (oy / distance) * 15;
    }

    svgEl("circle", { cx: round(lx), cy: round(ly), r: 8, class: badgeClass }, svg);
    svgText(svg, lx, ly + 3.4, label, textClass);
  }

  function unitVector(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return { x: dx / length, y: dy / length };
  }

  function shift(point, vector, distance) {
    return { x: point.x + vector.x * distance, y: point.y + vector.y * distance };
  }

  /* Пара отверстий: размер по внешним и по внутренним кромкам. */
  function drawPair(svg, state, model, firstIndex, secondIndex, labels, offset) {
    clearNode(svg);
    drawFlange(svg, state, [firstIndex, secondIndex % model.count]);

    const first = pointAt(state.angles[firstIndex], state.pitchR);
    const second = pointAt(state.angles[secondIndex % model.count], state.pitchR);
    const u = unitVector(first, second);

    dimension(svg, shift(first, u, -state.holeR), shift(second, u, state.holeR), offset, labels[0], { variant: "a" });
    dimension(svg, shift(first, u, state.holeR), shift(second, u, -state.holeR), -offset, labels[1], { variant: "b" });
  }

  function renderChord(svg, model) {
    clearNode(svg);
    const state = geometry(model);
    drawFlange(svg, state, [0, 1, 2 % model.count]);

    const first = pointAt(state.angles[0], state.pitchR);
    const second = pointAt(state.angles[1], state.pitchR);
    const third = pointAt(state.angles[2 % model.count], state.pitchR);

    dimension(svg, first, second, -15, "c₁", { variant: "a" });
    if (model.count > 2) {
      dimension(svg, first, third, -32, "c₂", { soft: true, normalBadge: true });
    }

    const radius = Math.min(34, state.pitchR * 0.45);
    const arcStart = pointAt(state.angles[0], radius);
    const arcEnd = pointAt(state.angles[1], radius);
    svgEl(
      "path",
      {
        d:
          "M" + round(arcStart.x) + " " + round(arcStart.y) +
          "A" + round(radius) + " " + round(radius) + " 0 0 1 " + round(arcEnd.x) + " " + round(arcEnd.y),
        class: "f-arc",
      },
      svg
    );

    const phi = pointAt(state.angles[0] + 180 / model.count, radius + 15);
    svgText(svg, phi.x, phi.y + 3.5, "φ", "f-note");
  }

  function renderMark(svg, model, outer, inner) {
    clearNode(svg);
    const state = geometry(model);
    drawFlange(svg, state, [0]);

    const hole = pointAt(state.angles[0], state.pitchR);

    if (outer && state.odR) {
      dimension(svg, { x: FIG.cx, y: FIG.cy - state.odR }, hole, -16, "1", { variant: "a", normalBadge: true });
    }
    if (inner && state.idR) {
      dimension(svg, { x: FIG.cx, y: FIG.cy - state.idR }, hole, -16, "2", { variant: "b", normalBadge: true });
    }
  }

  function renderOpposite(svg, model, steps) {
    const state = geometry(model);
    drawPair(svg, state, model, 0, steps, ["1", "2"], Math.max(22, state.idR + 12));
  }

  /* Крупный фрагмент: два отверстия и два размера между ними. */
  function renderPairZoom(svg, model, steps, labels) {
    clearNode(svg);

    const pitch = model.pitch;
    const hole = model.hole || pitch * 0.06;
    const angle = (Math.PI * 2 * steps) / model.count;
    const chordMm = pitch * Math.sin(angle / 2);
    const scale = Math.min(232 / chordMm, 9);
    const holeR = Math.max(4, (hole / 2) * scale);
    const chordPx = chordMm * scale;
    const pitchR = (pitch / 2) * scale;
    const sagitta = Math.sqrt(Math.max(pitchR * pitchR - (chordPx / 2) * (chordPx / 2), 0));

    const left = { x: FIG.cx - chordPx / 2, y: FIG.cy };
    const right = { x: FIG.cx + chordPx / 2, y: FIG.cy };

    /* Дуга центровой окружности: круг с центром ниже хорды, лишнее обрежет кадр. */
    svgEl("circle", { cx: FIG.cx, cy: round(FIG.cy + sagitta), r: round(pitchR), class: "f-pitch" }, svg);

    svgEl("circle", { cx: round(left.x), cy: round(left.y), r: round(holeR), class: "f-hole f-hole--focus" }, svg);
    svgEl("circle", { cx: round(right.x), cy: round(right.y), r: round(holeR), class: "f-hole f-hole--focus" }, svg);

    dimension(svg, { x: left.x - holeR, y: left.y }, { x: right.x + holeR, y: right.y }, 14, labels[0], { variant: "a" });
    dimension(svg, { x: left.x + holeR, y: left.y }, { x: right.x - holeR, y: right.y }, -14, labels[1], { variant: "b" });
  }

  function renderAdjacent(svg, model) {
    renderPairZoom(svg, model, 1, ["3", "4"]);
  }

  function renderThrough(svg, model) {
    renderPairZoom(svg, model, 2, ["5", "6"]);
  }

  function renderEdge(svg, model) {
    clearNode(svg);
    const state = geometry(model);
    drawFlange(svg, state, [0]);

    const hole = pointAt(state.angles[0], state.pitchR);

    if (state.odR) {
      dimension(
        svg,
        { x: FIG.cx, y: FIG.cy - state.odR },
        { x: hole.x, y: hole.y - state.holeR },
        -16,
        "7",
        { variant: "a", normalBadge: true }
      );
    }
    if (state.idR) {
      dimension(
        svg,
        { x: FIG.cx, y: FIG.cy - state.idR },
        { x: hole.x, y: hole.y + state.holeR },
        -16,
        "8",
        { variant: "b", normalBadge: true }
      );
    }
  }

  /* --- Карточка «шаг отверстий» --- */

  function updateChord(pitch, count) {
    const figure = byId("chord-figure");

    if (!pitch.value || !count.value) {
      byId("chord-step").textContent = EMPTY;
      byId("chord-through").textContent = EMPTY;
      byId("chord-angle").textContent = EMPTY;
      figure.hidden = true;
      return;
    }

    const step = pitch.value * Math.sin(Math.PI / count.value);
    const through = pitch.value * Math.sin((2 * Math.PI) / count.value);

    byId("chord-step").textContent = mm.format(step);
    byId("chord-through").textContent = mm.format(through) + " мм";
    byId("chord-angle").textContent = deg.format(360 / count.value) + "°";

    figure.hidden = false;
    renderChord(figure.querySelector("svg"), { pitch: pitch.value, count: count.value, hole: 0, od: 0, id: 0 });
  }

  /* --- Карточка «разметка» --- */

  function updateMark(pitch, odDrawing, odActual, idDrawing, idActual) {
    const figure = byId("mark-figure");
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

    figure.hidden = !(pitch.value && (outer !== null || inner !== null));
    if (!figure.hidden) {
      renderMark(
        figure.querySelector("svg"),
        { pitch: pitch.value, count: 8, hole: 0, od: od || 0, id: id || 0 },
        outer !== null,
        inner !== null
      );
    }
  }

  /* --- Карточка «контроль» --- */

  function setRow(index, value, drawing, tolerance) {
    byId("r" + index).textContent = value === null ? EMPTY : mm.format(value);

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

    const figures = { opposite: byId("group-opposite"), adjacent: byId("group-adjacent"), through: byId("group-through"), edge: byId("group-edge") };

    if (!ready) {
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((index) => setRow(index, null, null, null));
      warning.hidden = true;
      Object.values(figures).forEach((group) => {
        group.hidden = true;
      });
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

    /* Схемы */
    const model = {
      pitch: pitch.value,
      count: count.value,
      hole: holeActual,
      od: od || 0,
      id: id || 0,
    };

    figures.opposite.hidden = false;
    figures.adjacent.hidden = false;
    figures.through.hidden = false;
    figures.edge.hidden = !(od || id);

    renderOpposite(figures.opposite.querySelector("svg"), model, steps);
    renderAdjacent(figures.adjacent.querySelector("svg"), model);
    renderThrough(figures.through.querySelector("svg"), model);
    renderEdge(figures.edge.querySelector("svg"), model);

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

  updateAll();
})();
