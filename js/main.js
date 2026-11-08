(() => {
  "use strict";

  /**
   * Google Apps Script (Web App): приймає POST з полями name / phone / goal
   * (опційно) / source і пересилає їх у Telegram-бот.
   */
  const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbxmOUH3359Jd8r9tAFkFF78AXndD1G4dgKo6Xv-4Q2jUaQ0gvyPtWxyiBasy48DCzCA/exec";

  function isValidName(value) {
    return value.trim().length >= 2 && /[a-zA-Zа-яіїєґА-ЯІЇЄҐ]/.test(value);
  }

  function isValidPhone(value) {
    if (!/^[\d\s()+\-.]+$/.test(value.trim())) return false;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  }

  const LEAD_SENT_KEY = "snopykmath_lead_sent";
  const SEND_ERROR_HTML =
    'Не вдалося надіслати заявку. Спробуйте ще раз або напишіть нам у Telegram: ' +
    '<a href="https://t.me/snopyk_math_manager1" target="_blank" rel="noopener">@snopyk_math_manager1</a>';

  /**
   * Надсилає заявку і чекає відповіді скрипта: успіх лише тоді, коли він
   * відповів status "ok". text/plain — щоб браузер не робив CORS preflight.
   */
  async function postLead({ website, ...payload }) {
    // Ботові показуємо звичайне «Дякуємо!», але нікуди нічого не надсилаємо.
    if (looksLikeBot(website)) return;
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.status !== "ok") throw new Error(result.message || "Lead was not saved");
  }

  /**
   * Анти-спам: приховане поле website бачать лише боти, а людина не встигне
   * заповнити форму за перші 3 секунди після відкриття сторінки.
   */
  const PAGE_OPENED_AT = Date.now();
  function looksLikeBot(website) {
    return Boolean(website) || Date.now() - PAGE_OPENED_AT < 3000;
  }

  function rememberLeadSent() {
    try { localStorage.setItem(LEAD_SENT_KEY, "1"); } catch (err) { /* приватний режим */ }
  }

  function leadAlreadySent() {
    try { return localStorage.getItem(LEAD_SENT_KEY) === "1"; } catch (err) { return false; }
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  const burger = document.getElementById("burger");
  const mobileNav = document.getElementById("mobile-nav");

  function closeMobileNav() {
    mobileNav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  burger.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen);
  });

  // Якщо меню лишилось відкритим, а вікно розширили до десктопу — закриваємо.
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => {
    if (e.matches) closeMobileNav();
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const btn = item.querySelector(".faq-question");
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      document.querySelectorAll(".faq-item.is-open").forEach((openItem) => {
        openItem.classList.remove("is-open");
        openItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Testimonials carousel ---------- */
  (() => {
    const track = document.getElementById("carousel-track");
    if (!track) return;

    const prevBtn = document.getElementById("carousel-prev");
    const nextBtn = document.getElementById("carousel-next");
    const dotsWrap = document.getElementById("carousel-dots");
    const slides = Array.from(track.children);

    const videos = Array.from(track.querySelectorAll("video"));
    videos.forEach((video) => {
      video.addEventListener("play", () => {
        videos.forEach((other) => { if (other !== video) other.pause(); });
      });
    });

    slides.forEach((slide, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.role = "tab";
      dot.setAttribute("aria-label", `Перейти до відгуку ${i + 1}`);
      dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
      dot.addEventListener("click", () => {
        slide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      });
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function scrollByCard(direction) {
      const card = track.querySelector(".testimonial-card");
      if (!card) return;
      const amount = card.getBoundingClientRect().width + 20;
      track.scrollBy({ left: direction * amount, behavior: "smooth" });
    }

    prevBtn.addEventListener("click", () => scrollByCard(-1));
    nextBtn.addEventListener("click", () => scrollByCard(1));

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); scrollByCard(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); scrollByCard(-1); }
    });

    function updateActiveState() {
      const trackRect = track.getBoundingClientRect();
      let closestIndex = 0;
      let closestDist = Infinity;
      slides.forEach((slide, i) => {
        const dist = Math.abs(slide.getBoundingClientRect().left - trackRect.left);
        if (dist < closestDist) { closestDist = dist; closestIndex = i; }
      });
      dots.forEach((dot, i) => dot.setAttribute("aria-selected", String(i === closestIndex)));

      prevBtn.disabled = track.scrollLeft < 8;
      nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    }

    let scrollTimer;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(updateActiveState, 100);
    }, { passive: true });

    updateActiveState();
  })();

  /* ---------- Modal ---------- */
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
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!overlay.hidden) {
      closeModal();
    } else if (mobileNav.classList.contains("is-open")) {
      closeMobileNav();
      burger.focus();
    }
  });

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

  /* Auto-popup once per session, like the reference site */
  const AUTO_POPUP_DELAY_MS = 25000;
  const AUTO_POPUP_KEY = "snopykmath_popup_shown";

  const leadSection = document.getElementById("lead-form");

  /** Форма заявки на екрані або людина вже в ній пише — попап тільки заважатиме. */
  function isUsingLeadForm() {
    const rect = leadSection.getBoundingClientRect();
    return (rect.top < window.innerHeight && rect.bottom > 0) || leadSection.contains(document.activeElement);
  }

  function maybeAutoOpen() {
    if (sessionStorage.getItem(AUTO_POPUP_KEY)) return;
    if (leadAlreadySent()) return;
    if (!overlay.hidden) return;
    if (isUsingLeadForm()) return;
    openModal();
    sessionStorage.setItem(AUTO_POPUP_KEY, "1");
  }

  let autoPopupTimer = setTimeout(maybeAutoOpen, AUTO_POPUP_DELAY_MS);

  window.addEventListener(
    "scroll",
    () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrolled > 0.5) {
        clearTimeout(autoPopupTimer);
        maybeAutoOpen();
      }
    },
    { passive: true }
  );

  /* ---------- Forms ---------- */
  function handleSubmit(form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = form.querySelector(".form-status");
      const submitBtn = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());

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

      if (!FORM_ENDPOINT) {
        statusEl.textContent = "Форма ще не підключена. Напишіть нам, будь ласка, у Telegram: @snopyk_math_manager1";
        statusEl.className = "form-status is-error";
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = "Надсилаємо...";
      statusEl.className = "form-status";

      try {
        await postLead({ ...data, source: document.body.dataset.leadSource || "snopyk.math site" });
        rememberLeadSent();
        if (window.gtag) gtag("event", "generate_lead", { form: form.id });
        statusEl.textContent = "Дякуємо! Ми зв'яжемось з вами найближчим часом.";
        statusEl.className = "form-status is-success";
        form.reset();
        if (form.id === "lead-form-modal") {
          setTimeout(closeModal, 1800);
        }
      } catch (err) {
        statusEl.innerHTML = SEND_ERROR_HTML;
        statusEl.className = "form-status is-error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  handleSubmit(document.getElementById("lead-form-main"));
  handleSubmit(document.getElementById("lead-form-modal"));

  /* ---------- Reviews: students / parents tabs ---------- */
  const reviewTabs = Array.from(document.querySelectorAll(".review-tab"));
  function selectReviewTab(tab) {
    reviewTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
  }
  reviewTabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectReviewTab(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = reviewTabs[(i + (e.key === "ArrowRight" ? 1 : -1) + reviewTabs.length) % reviewTabs.length];
      selectReviewTab(next);
      next.focus();
    });
  });
})();

/* ---------- "Як це працює": steps light up while scrolling ---------- */
(function () {
  const flow = document.querySelector(".how-flow");
  if (!flow) return;
  const items = Array.from(flow.querySelectorAll(".how-item"));
  flow.classList.add("is-live");
  let ticking = false;

  function update() {
    ticking = false;
    const trigger = window.innerHeight * 0.55;
    let current = -1;
    items.forEach((item, i) => {
      const tile = item.querySelector(".how-num").getBoundingClientRect();
      const reached = tile.top < trigger;
      item.classList.toggle("is-reached", reached);
      if (reached) current = i;
      const next = items[i + 1];
      if (next) {
        const nextTop = next.querySelector(".how-num").getBoundingClientRect().top;
        const span = nextTop - tile.bottom;
        const fill = span > 0 ? (trigger - tile.bottom) / span : 0;
        item.style.setProperty("--fill", Math.min(1, Math.max(0, fill)).toFixed(3));
      }
    });
    items.forEach((item, i) => item.classList.toggle("is-current", i === current));
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

/* ---------- "Як це працює": example sheet (plan / report) on phones ---------- */
(function () {
  const sheet = document.getElementById("example-sheet");
  if (!sheet || typeof sheet.showModal !== "function") return;
  const body = sheet.querySelector(".example-sheet-body");
  document.querySelectorAll(".how-example-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = document.querySelector('[data-example-src="' + btn.dataset.example + '"]');
      if (!src) return;
      body.innerHTML = "";
      const copy = src.cloneNode(true);
      copy.removeAttribute("data-example-src");
      copy.classList.remove("how-aside");
      body.appendChild(copy);
      sheet.showModal();
    });
  });
  sheet.querySelector(".example-sheet-close").addEventListener("click", () => sheet.close());
  sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });
})();
