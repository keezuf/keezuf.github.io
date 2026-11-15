/* Фоновая музыка главной страницы.

   Браузеры не включают звук без действия пользователя. Если на главной
   показывается завеса с «Начнём», музыка стартует по нажатию этой кнопки;
   для остальных случаев пробуем автозапуск и ждём первого действия. */

(() => {
  const audio = document.getElementById("site-audio");
  const button = document.getElementById("sound-toggle");
  if (!audio || !button) {
    return;
  }

  const STORAGE_KEY = "keezuf-music";
  const VOLUME = 0.2;
  const HINT_MS = 10000;
  const hint = document.getElementById("sound-hint");

  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    /* приватный режим — просто не запоминаем выбор */
  }

  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const introActive = document.documentElement.classList.contains("intro-active");

  /* По умолчанию музыка включена. Явное «выключено» уважаем,
     а при экономии трафика не запускаем сами. */
  let wanted = saved === "off" ? false : !saveData;

  document.documentElement.classList.add("audio-js");

  function applyUi() {
    button.classList.toggle("sound-toggle--on", wanted);
    button.setAttribute("aria-pressed", wanted ? "true" : "false");
    const label = wanted ? "Выключить музыку" : "Включить музыку";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function play() {
    audio.volume = VOLUME;
    try {
      const result = audio.play();
      if (result && typeof result.then === "function") {
        result.catch(() => {
          /* автозапуск запрещён — стартуем по первому действию пользователя */
        });
      }
    } catch (error) {
      /* плеер недоступен — подсказка и кнопка всё равно работают */
    }
  }

  /* Подсказка у кнопки: «где выключить музыку». Показывается при загрузке
     главной и сама исчезает через пять секунд. */
  let hintTimer = 0;

  function hideHint() {
    window.clearTimeout(hintTimer);
    if (!hint) {
      return;
    }
    hint.classList.remove("is-visible");
    hintTimer = window.setTimeout(() => {
      hint.hidden = true;
    }, 300);
  }

  function showHint() {
    if (!hint || !wanted || document.documentElement.classList.contains("intro-active")) {
      return;
    }
    hint.hidden = false;
    /* Без requestAnimationFrame: подсказка должна появиться и там, где кадры
       не рисуются (например, в фоновой вкладке). Переход всё равно сыграет. */
    void hint.offsetWidth;
    hint.classList.add("is-visible");
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(hideHint, HINT_MS);
  }

  function onFirstGesture() {
    if (!wanted || !audio.paused) {
      return;
    }
    play();
  }

  function armGesture() {
    ["pointerdown", "keydown", "touchstart"].forEach((name) => {
      window.addEventListener(name, onFirstGesture, { passive: true });
    });
  }

  applyUi();

  if (wanted) {
    armGesture();
    /* Подсказка не зависит от того, удалось ли автозапустить звук. */
    window.setTimeout(showHint, 700);

    if (introActive) {
      /* Под завесой подсказка не нужна — покажем после «Начнём». */
      document.addEventListener("keezuf:intro-dismissed", () => {
        window.setTimeout(showHint, 700);
      }, { once: true });
    } else {
      play();
    }
  }

  button.addEventListener("click", () => {
    wanted = !wanted;
    applyUi();
    hideHint();
    try {
      localStorage.setItem(STORAGE_KEY, wanted ? "on" : "off");
    } catch (error) {
      /* не страшно: просто не запомнится */
    }
  if (wanted) {
      play();
    } else {
      audio.pause();
    }
  });
})();