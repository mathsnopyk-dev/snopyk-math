(() => {
  "use strict";

  /** Той самий Apps Script Web App, що й у головній формі сайту — окремого сервісу сповіщень не треба. */
  const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbxmOUH3359Jd8r9tAFkFF78AXndD1G4dgKo6Xv-4Q2jUaQ0gvyPtWxyiBasy48DCzCA/exec";

  function isValidName(value) {
    return value.trim().length >= 2 && /[a-zA-Zа-яіїєґА-ЯІЇЄҐ]/.test(value);
  }

  function isValidPhone(value) {
    if (!/^[\d\s()+\-.]+$/.test(value.trim())) return false;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  }

  /** Той самий ключ, що й у main.js: після заявки з тесту головна не показує авто-попап. */
  const LEAD_SENT_KEY = "snopykmath_lead_sent";
  const SEND_ERROR_HTML =
    'Не вдалося надіслати заявку. Спробуйте ще раз або напишіть нам у Telegram: ' +
    '<a href="https://t.me/snopyk_math_manager1" target="_blank" rel="noopener">@snopyk_math_manager1</a>';

  /**
   * Анти-спам: приховане поле website бачать лише боти, а людина не встигне
   * заповнити форму за перші 3 секунди після відкриття сторінки.
   */
  const PAGE_OPENED_AT = Date.now();
  function looksLikeBot(website) {
    return Boolean(website) || Date.now() - PAGE_OPENED_AT < 3000;
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Lead modal (same behaviour as main site) ---------- */
  const overlay = document.getElementById("modal-overlay");
  const modalClose = document.getElementById("modal-close");
  let lastFocusedEl = null;

  function openModal() {
    lastFocusedEl = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add("modal-open");
    const firstInput = overlay.querySelector("input:not([name=\"website\"])");
    if (firstInput) firstInput.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  document.querySelectorAll(".js-open-modal").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.tagName === "A") e.preventDefault();
      openModal();
    });
  });

  modalClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) closeModal(); });

  /** Tab / Shift+Tab ходять по колу всередині відкритого вікна, а не по сторінці під ним. */
  function trapFocus(e) {
    if (e.key !== "Tab" || overlay.hidden) return;
    const focusable = Array.from(
      overlay.querySelectorAll('a[href], button:not([disabled]), input:not([tabindex="-1"])')
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  document.addEventListener("keydown", trapFocus);

  async function submitLead({ website, ...data }, statusEl, submitBtn) {
    // Ботові показуємо звичайний успіх, але нікуди нічого не надсилаємо.
    if (looksLikeBot(website)) return true;
    submitBtn.disabled = true;
    statusEl.textContent = "Надсилаємо...";
    statusEl.className = "form-status";
    try {
      // Чекаємо відповіді скрипта: успіх лише коли він відповів status "ok".
      // text/plain — щоб браузер не робив CORS preflight.
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.status !== "ok") throw new Error(result.message || "Lead was not saved");
      try { localStorage.setItem(LEAD_SENT_KEY, "1"); } catch (err) { /* приватний режим */ }
      return true;
    } catch (err) {
      statusEl.innerHTML = SEND_ERROR_HTML;
      statusEl.className = "form-status is-error";
      return false;
    } finally {
      submitBtn.disabled = false;
    }
  }

  const modalForm = document.getElementById("lead-form-modal");
  modalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = modalForm.querySelector(".form-status");
    const submitBtn = modalForm.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(modalForm).entries());
    if (!data.name || !data.phone) {
      statusEl.textContent = "Будь ласка, заповніть ім'я та телефон.";
      statusEl.className = "form-status is-error";
      return;
    }
    if (!isValidName(data.name)) {
      statusEl.textContent = "Будь ласка, введіть справжнє ім'я.";
      statusEl.className = "form-status is-error";
      return;
    }
    if (!isValidPhone(data.phone)) {
      statusEl.textContent = "Будь ласка, введіть коректний номер телефону.";
      statusEl.className = "form-status is-error";
      return;
    }
    const ok = await submitLead({ ...data, source: "snopyk.math тест рівня" }, statusEl, submitBtn);
    if (ok) {
      statusEl.textContent = "Дякуємо! Ми зв'яжемось з вами найближчим часом.";
      statusEl.className = "form-status is-success";
      modalForm.reset();
      setTimeout(closeModal, 1800);
    }
  });

  /* ---------- Quiz ---------- */
  const DATA = window.SNOPYK_TEST_DATA;

  const steps = {
    intro: document.getElementById("quiz-intro"),
    questions: document.getElementById("quiz-questions"),
    contact: document.getElementById("quiz-contact"),
    results: document.getElementById("quiz-results"),
  };

  function showStep(name) {
    Object.values(steps).forEach((el) => { el.hidden = true; });
    steps[name].hidden = false;
    steps[name].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const state = { grade: null, questions: [], index: 0, answers: [] };

  const progressBar = document.getElementById("quiz-progress-bar");
  const progressText = document.getElementById("quiz-progress-text");
  const questionText = document.getElementById("question-text");
  const questionOptions = document.getElementById("question-options");
  const LETTERS = ["А", "Б", "В", "Г"];

  document.getElementById("grade-grid").addEventListener("click", (e) => {
    const card = e.target.closest(".grade-card");
    if (!card) return;
    const grade = card.dataset.grade;
    const gradeData = DATA[grade];
    if (!gradeData) return;

    state.grade = grade;
    state.questions = gradeData.questions;
    state.index = 0;
    state.answers = [];

    showStep("questions");
    renderQuestion();
  });

  function renderQuestion() {
    const total = state.questions.length;
    const q = state.questions[state.index];

    progressBar.style.width = `${(state.index / total) * 100}%`;
    progressText.textContent = `Питання ${state.index + 1} з ${total}`;

    questionText.textContent = q.q;
    questionOptions.innerHTML = "";

    q.options.forEach((optionText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.innerHTML = `<span class="option-letter">${LETTERS[i]}</span><span>${optionText}</span>`;
      btn.addEventListener("click", () => selectAnswer(i));
      questionOptions.appendChild(btn);
    });
  }

  function selectAnswer(optionIndex) {
    state.answers[state.index] = optionIndex;

    if (state.index < state.questions.length - 1) {
      state.index += 1;
      renderQuestion();
    } else {
      progressBar.style.width = "100%";
      showStep("contact");
    }
  }

  /* ---------- Contact gate → submit → show results ---------- */
  const contactForm = document.getElementById("quiz-contact-form");
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = contactForm.querySelector(".form-status");
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(contactForm).entries());

    if (!data.name || !data.phone) {
      statusEl.textContent = "Будь ласка, заповніть ім'я та телефон.";
      statusEl.className = "form-status is-error";
      return;
    }
    if (!isValidName(data.name)) {
      statusEl.textContent = "Будь ласка, введіть справжнє ім'я.";
      statusEl.className = "form-status is-error";
      return;
    }
    if (!isValidPhone(data.phone)) {
      statusEl.textContent = "Будь ласка, введіть коректний номер телефону.";
      statusEl.className = "form-status is-error";
      return;
    }

    const score = state.answers.reduce(
      (acc, ans, i) => acc + (ans === state.questions[i].correct ? 1 : 0),
      0
    );

    const ok = await submitLead(
      {
        name: data.name,
        phone: data.phone,
        goal: `${state.grade} клас · тест рівня: ${score}/${state.questions.length}`,
        source: "snopyk.math тест рівня",
        website: data.website,
      },
      statusEl,
      submitBtn
    );

    if (ok) {
      renderResults(score);
      showStep("results");
    }
  });

  function renderResults(score) {
    const total = state.questions.length;
    document.getElementById("result-score").textContent = `${score}/${total}`;

    let message;
    if (score === 5) {
      message = "Відмінний рівень! Ти повністю готовий(-а) до уроків математики в цьому класі.";
    } else if (score >= 3) {
      message = "Добрий результат, але є кілька дрібниць, які варто повторити.";
    } else {
      message = "Варто освіжити базові теми перед початком навчального року.";
    }
    document.getElementById("result-message").textContent = message;

    const breakdown = document.getElementById("result-breakdown");
    breakdown.innerHTML = "";

    state.questions.forEach((q, i) => {
      const userAnswer = state.answers[i];
      const isCorrect = userAnswer === q.correct;

      const item = document.createElement("div");
      item.className = `result-item ${isCorrect ? "is-correct" : "is-wrong"}`;

      const icon = isCorrect
        ? '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      const answersLine = isCorrect
        ? `<span class="is-correct-text">${LETTERS[userAnswer]}) ${q.options[userAnswer]}</span>`
        : `Твоя відповідь: <span class="is-wrong-text">${LETTERS[userAnswer]}) ${q.options[userAnswer]}</span> · Правильна: <span class="is-correct-text">${LETTERS[q.correct]}) ${q.options[q.correct]}</span>`;

      item.innerHTML = `
        <div class="result-item-head">
          <span class="result-icon">${icon}</span>
          <p class="result-item-q">${q.q}</p>
        </div>
        <p class="result-item-answers">${answersLine}</p>
        <p class="result-item-explain">${q.explanation}</p>
      `;
      breakdown.appendChild(item);
    });
  }

  document.getElementById("quiz-restart").addEventListener("click", () => {
    state.grade = null;
    state.questions = [];
    state.index = 0;
    state.answers = [];
    showStep("intro");
  });
})();
