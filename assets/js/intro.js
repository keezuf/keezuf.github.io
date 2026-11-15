/* Завеса при входе на главную.

   Кнопка не для красоты: клик даёт браузеру разрешение на звук, поэтому
   музыка стартует ровно в этот момент.

   Сценарий после нажатия — всё отсчитывается от клика:
     1) звёзды разлетаются — --intro-fly-duration;
     2) с момента --intro-fade-delay начинает гаснуть ВСЁ сразу (звёзды,
        кнопка, обводка, пятно, фон) — --intro-fade-duration.

   Что можно менять здесь:
   ALWAYS_SHOW     — показывать завесу при каждом обновлении (тестовый режим);
   STAR_COUNT      — сколько звёзд;
   CENTER_BIAS     — больше 1 = плотнее у кнопки, реже к краям;
   DRIFT_MIN/MAX   — период медленного дрейфа звёзд, секунды;
   FLIGHT_MIN/MAX  — на сколько пикселей звезда улетает от кнопки. */

(() => {
  const overlay = document.getElementById("intro");
  const button = document.getElementById("intro-start");
  if (!overlay || !button) {
    return;
  }

  const STORAGE_KEY = "keezuf-intro";
  /* Завеса показывается один раз: после «Начнём» выбор запоминается и больше
     не мешает. true — тестовый режим с завесой на каждом обновлении. */
  const ALWAYS_SHOW = false;
  const STAR_COUNT = 90;
  const CENTER_BIAS = 1.7;
  const DRIFT_MIN = 2.0;
  const DRIFT_MAX = 5.0;
  const FLIGHT_MIN = 420;
  const FLIGHT_MAX = 980;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let visited = false;
  try {
    visited = !ALWAYS_SHOW && localStorage.getItem(STORAGE_KEY) === "done";
  } catch (error) {
    /* приватный режим: покажем завесу, но не запомним */
  }

  if (visited) {
    overlay.remove();
    return;
  }

  const stars = overlay.querySelector(".intro-stars");
  const width = overlay.clientWidth || window.innerWidth;
  const height = overlay.clientHeight || window.innerHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.hypot(centerX, centerY);

  for (let index = 0; index < STAR_COUNT; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    /* Math.random() ** CENTER_BIAS при показателе больше 1 тянет точки к центру. */
    const radius = maxRadius * Math.pow(Math.random(), CENTER_BIAS);
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    const star = document.createElement("span");
    star.className = "intro-star";
    star.style.setProperty("--sx", x.toFixed(0) + "px");
    star.style.setProperty("--sy", y.toFixed(0) + "px");
    star.style.setProperty("--d", (DRIFT_MIN + Math.random() * (DRIFT_MAX - DRIFT_MIN)).toFixed(2) + "s");
    star.style.setProperty("--delay", (-Math.random() * DRIFT_MAX).toFixed(2) + "s");
    star.style.setProperty("--s", (0.7 + Math.random() * 0.9).toFixed(2));
    stars.appendChild(star);
  }

  document.documentElement.classList.add("intro-active");

  window.setTimeout(() => {
    button.focus({ preventScroll: true });
  }, 60);

  function readMs(style, name, fallback) {
    const value = style.getPropertyValue(name);
    const number = parseFloat(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return /ms\s*$/.test(value) ? number : number * 1000;
  }

  /* Разлёт на Web Animations API: CSS-переход здесь не работает, потому что
     одновременно снимается анимация дрейфа — переходу не от чего стартовать. */
  function flyAway(duration) {
    overlay.querySelectorAll(".intro-star").forEach((star) => {
      const x = parseFloat(star.style.getPropertyValue("--sx")) || centerX;
      const y = parseFloat(star.style.getPropertyValue("--sy")) || centerY;
      const computed = getComputedStyle(star);
      const from = computed.transform === "none" ? "translate3d(0, 0, 0)" : computed.transform;
      const fromOpacity = computed.opacity;

      const angle = Math.atan2(y - centerY, x - centerX) + (Math.random() - 0.5) * 0.25;
      const distance = FLIGHT_MIN + Math.random() * (FLIGHT_MAX - FLIGHT_MIN);
      const dx = (Math.cos(angle) * distance).toFixed(0);
      const dy = (Math.sin(angle) * distance).toFixed(0);

      star.style.animation = "none";

      if (typeof star.animate === "function") {
        star.animate(
          [
            { transform: from, opacity: fromOpacity },
            { transform: "translate3d(" + dx + "px, " + dy + "px, 0) scale(0.15)", opacity: 0 }
          ],
          {
            duration,
            easing: "cubic-bezier(0.15, 0.7, 0.2, 1)",
            fill: "forwards"
          }
        );
      } else {
        star.style.transform = "translate3d(" + dx + "px, " + dy + "px, 0) scale(0.15)";
        star.style.opacity = "0";
      }
    });
  }

  function finish() {
    document.documentElement.classList.remove("intro-active");
    document.documentElement.classList.remove("intro-leaving");
    if (overlay.parentNode) {
      overlay.remove();
    }
    document.dispatchEvent(new CustomEvent("keezuf:intro-dismissed"));
  }

  function dismiss() {
    if (!document.documentElement.classList.contains("intro-active") ||
        overlay.classList.contains("intro--busy")) {
      return;
    }
    /* Класс intro-active НЕ снимаем: он держит display завесы, пока идут все
       три этапа. Снимется в finish(), когда завеса уже растворена. */
    overlay.classList.add("intro--busy");
    /* Однократное кольцо: расходится от кнопки всё время, пока идёт сценарий. */
    overlay.classList.add("intro--ring");
    /* Фон страницы запускаем сразу: пока завеса гаснет, созвездие уже живёт,
       и после проявления не будет скачка «стояло → поехало». */
    document.documentElement.classList.add("intro-leaving");

    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch (error) {
      /* не запомнилось — не страшно */
    }

    if (reduce.matches) {
      finish();
      return;
    }

    const style = getComputedStyle(overlay);
    const fly = readMs(style, "--intro-fly-duration", 1000);
    const fadeDelay = readMs(style, "--intro-fade-delay", 700);
    const fadeDuration = readMs(style, "--intro-fade-duration", 1200);

    /* Звёзды летят всё отведённое им время... */
    try {
      flyAway(fly);
    } catch (error) {
      /* звёзды не полетели — сценарий всё равно продолжится */
    }

    /* ...а с момента fadeDelay начинает гаснуть ВСЁ сразу: звёзды, кнопка,
       обводка, пятно и фон. Это один общий переход прозрачности завесы. */
    window.setTimeout(() => {
      overlay.classList.add("intro--fade");
    }, fadeDelay);

    window.setTimeout(finish, fadeDelay + fadeDuration + 150);
  }

  button.addEventListener("click", dismiss);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      dismiss();
    }
  });
})();
