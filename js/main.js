(() => {
  "use strict";

  /**
   * Google Apps Script (Web App): приймає POST з полями name / phone / goal
   * (опційно) / source і пересилає їх у Telegram-бот.
   */
  const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbxmOUH3359Jd8r9tAFkFF78AXndD1G4dgKo6Xv-4Q2jUaQ0gvyPtWxyiBasy48DCzCA/exec";

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  const burger = document.getElementById("burger");
  const mobileNav = document.getElementById("mobile-nav");

  function closeMobileNav() {
    mobileNav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  }

  burger.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(isOpen));
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
    const firstInput = overlay.querySelector("input");
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
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  /* Auto-popup once per session, like the reference site */
  const AUTO_POPUP_DELAY_MS = 25000;
  const AUTO_POPUP_KEY = "snopykmath_popup_shown";

  function maybeAutoOpen() {
    if (sessionStorage.getItem(AUTO_POPUP_KEY)) return;
    if (!overlay.hidden) return;
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

      if (!FORM_ENDPOINT) {
        statusEl.textContent = "Форма ще не підключена. Напишіть нам, будь ласка, у Telegram: @snopyk_math_manager1";
        statusEl.className = "form-status is-error";
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = "Надсилаємо...";
      statusEl.className = "form-status";

      try {
        await fetch(FORM_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, source: "snopyk.math site" }),
        });
        statusEl.textContent = "Дякуємо! Ми зв'яжемось з вами найближчим часом.";
        statusEl.className = "form-status is-success";
        form.reset();
        if (form.id === "lead-form-modal") {
          setTimeout(closeModal, 1800);
        }
      } catch (err) {
        statusEl.textContent = "Щось пішло не так. Спробуйте ще раз або напишіть нам у Telegram.";
        statusEl.className = "form-status is-error";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  handleSubmit(document.getElementById("lead-form-main"));
  handleSubmit(document.getElementById("lead-form-modal"));
})();
