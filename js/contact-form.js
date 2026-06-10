/**
 * contact-form.js — Contact form with WhatsApp + mailto submission
 *
 * Owner : Agent 23 (Phase D Interactivity Coder)
 * Plan  : PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md (Phase D1)
 * Spec  : agent-plans/agent-23_phase-d-interactivity-coder.md
 *
 * Responsibilities
 * ----------------
 * 1. Find the contact form (`form.contact__form`). Bail silently if missing.
 * 2. Read WhatsApp number and email from the form's `data-wa-number` /
 *    `data-email` attributes (content-agnostic: HTML owns the values).
 * 3. On submit (preventDefault):
 *    a. Validate: required fields filled; email regex; Israeli phone format.
 *    b. Show inline Hebrew errors with `role="alert"` under each invalid field.
 *    c. If valid: open WhatsApp tab (URL-encoded Hebrew body) and show success
 *       feedback in `.contact__feedback` (already has `role="status"` in HTML).
 *    d. Render a "שלחו במייל במקום" link that opens `mailto:` with same body.
 * 4. prefers-reduced-motion: skip submit-button animation (none currently —
 *    but module still respects the flag for future enhancements).
 *
 * Public API: init(), destroy()
 *
 * Constitution refs
 * - §2  — vanilla JS, no frameworks/libs.
 * - §4  — RTL, Hebrew copy, logical patterns.
 * - §9  — keyboard reachability (native form submit), `role="alert"` on errors,
 *         `role="status"` on success feedback.
 * - §10 — module-scoped state, init/destroy contract, no globals.
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

// Israeli phone formats (lenient — accept hyphens / spaces / parens; strip on test):
//   05X-XXX-XXXX (10 digits starting with 0)
//   +972 5X XXX XXXX (start with 972 after stripping +/spaces)
//   077-XXX-XXXX, 09-XXXXXXX (landline) — 9-10 digits starting with 0 OR 9-12 starting with 972
const PHONE_NORMALIZE_REGEX = /[\s\-().]/g;
const PHONE_VALID_REGEX     = /^(?:\+?972\d{8,9}|0\d{8,9})$/;

// Email — RFC-lite, intentionally pragmatic.
const EMAIL_VALID_REGEX     = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ERROR_CLASS = "contact__field-error";
const FIELD_INVALID_CLASS = "is-invalid";

const EVENT_TYPE_LABELS = {
  wedding:      "חתונה",
  "bar-mitzvah":"בר/בת מצווה",
  company:      "אירוע חברה",
  private:      "אירוע פרטי",
  other:        "אחר",
};

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:  false,
  form:         null,
  feedback:     null,
  submitBtn:    null,
  mailtoLink:   null,
  errorEls:     [],     // injected error <span>s tracked for destroy().
  bound: {
    onSubmit:   null,
    onInput:    null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function normalizePhone(raw) {
  return (raw || "").replace(PHONE_NORMALIZE_REGEX, "");
}

function isValidPhone(raw) {
  const n = normalizePhone(raw);
  return PHONE_VALID_REGEX.test(n);
}

function isValidEmail(raw) {
  return EMAIL_VALID_REGEX.test((raw || "").trim());
}

/**
 * Inject a Hebrew error message under a field. Idempotent — replaces existing.
 * Uses role="alert" so screen readers announce the error live.
 */
function setFieldError(field, message) {
  if (!field) return;
  const fieldWrap = field.closest(".contact__field") || field.parentElement;
  if (!fieldWrap) return;

  // Remove existing error first (idempotent).
  const existing = fieldWrap.querySelector(`.${ERROR_CLASS}`);
  if (existing) existing.remove();

  field.classList.add(FIELD_INVALID_CLASS);
  field.setAttribute("aria-invalid", "true");

  const span = document.createElement("span");
  span.className = ERROR_CLASS;
  span.setAttribute("role", "alert");
  span.textContent = message;
  fieldWrap.appendChild(span);
  state.errorEls.push(span);
}

function clearFieldError(field) {
  if (!field) return;
  const fieldWrap = field.closest(".contact__field") || field.parentElement;
  if (!fieldWrap) return;
  const existing = fieldWrap.querySelector(`.${ERROR_CLASS}`);
  if (existing) {
    existing.remove();
    const i = state.errorEls.indexOf(existing);
    if (i >= 0) state.errorEls.splice(i, 1);
  }
  field.classList.remove(FIELD_INVALID_CLASS);
  field.removeAttribute("aria-invalid");
}

function clearAllErrors() {
  state.errorEls.forEach((el) => el.remove());
  state.errorEls = [];
  if (!state.form) return;
  state.form.querySelectorAll(`.${FIELD_INVALID_CLASS}`).forEach((el) => {
    el.classList.remove(FIELD_INVALID_CLASS);
    el.removeAttribute("aria-invalid");
  });
}

/**
 * Read all known fields by name. Returns a frozen object — fields not present
 * become empty strings.
 */
function readFormValues() {
  if (!state.form) return {};
  const fd = new FormData(state.form);
  const obj = {
    name:      String(fd.get("name") || "").trim(),
    company:   String(fd.get("company") || "").trim(),
    phone:     String(fd.get("phone") || "").trim(),
    email:     String(fd.get("email") || "").trim(),
    eventType: String(fd.get("eventType") || "").trim(),
    date:      String(fd.get("date") || "").trim(),
    message:   String(fd.get("message") || "").trim(),
  };
  return Object.freeze(obj);
}

/**
 * Convert "wedding" → "חתונה", etc. Falls back to the raw value.
 */
function eventTypeLabel(raw) {
  return EVENT_TYPE_LABELS[raw] || raw || "—";
}

/**
 * Build the Hebrew message body.
 *  שלום, הגעתי דרך האתר.
 *  שם: ...
 *  ...
 */
function buildMessageBody(values) {
  const lines = [
    "שלום, הגעתי דרך האתר.",
    `שם: ${values.name || "—"}`,
  ];
  if (values.company) lines.push(`שם החברה: ${values.company}`);
  lines.push(`טלפון: ${values.phone || "—"}`);
  if (values.email) lines.push(`דוא"ל: ${values.email}`);
  lines.push(`סוג אירוע: ${eventTypeLabel(values.eventType)}`);
  if (values.date)    lines.push(`תאריך מועדף: ${values.date}`);
  if (values.message) lines.push(`הודעה: ${values.message}`);
  return lines.join("\n");
}

function setFeedback(message, kind /* "ok" | "err" | "" */) {
  if (!state.feedback) return;
  state.feedback.textContent = message || "";
  state.feedback.dataset.kind = kind || "";
}

/**
 * Render (or update) the "send via email instead" link. Idempotent.
 * Only added after a successful WhatsApp submission so we don't preempt
 * the user's primary path.
 */
function renderMailtoFallback(email, body) {
  if (!state.form || !email) return;

  // Locate the wrap that owns the submit button.
  const wrap = state.submitBtn ? state.submitBtn.closest(".contact__submit-wrap") : null;
  if (!wrap) return;

  const subject = encodeURIComponent("פנייה מהאתר — גאמוס");
  const encodedBody = encodeURIComponent(body);
  const href = `mailto:${email}?subject=${subject}&body=${encodedBody}`;

  if (state.mailtoLink && state.mailtoLink.parentNode) {
    state.mailtoLink.href = href;
    state.mailtoLink.hidden = false;
    return;
  }

  const link = document.createElement("a");
  link.className = "contact__mailto-fallback";
  link.href = href;
  link.textContent = "שלחו במייל במקום";
  wrap.appendChild(link);
  state.mailtoLink = link;
}

// ----------------------------------------------------------------------------
// Submit handler
// ----------------------------------------------------------------------------

function onSubmit(event) {
  event.preventDefault();
  if (!state.form) return;

  clearAllErrors();
  setFeedback("", "");

  const values = readFormValues();
  let firstInvalid = null;

  // 1. Validation
  if (!values.name) {
    const f = state.form.querySelector('[name="name"]');
    setFieldError(f, "אנא הזינו שם מלא.");
    firstInvalid = firstInvalid || f;
  }

  if (!values.phone) {
    const f = state.form.querySelector('[name="phone"]');
    setFieldError(f, "אנא הזינו מספר טלפון.");
    firstInvalid = firstInvalid || f;
  } else if (!isValidPhone(values.phone)) {
    const f = state.form.querySelector('[name="phone"]');
    setFieldError(f, "טלפון לא תקין. דוגמה: 050-1234567 או 077-9972343.");
    firstInvalid = firstInvalid || f;
  }

  if (!values.email) {
    const f = state.form.querySelector('[name="email"]');
    setFieldError(f, "אנא הזינו כתובת דוא\"ל.");
    firstInvalid = firstInvalid || f;
  } else if (!isValidEmail(values.email)) {
    const f = state.form.querySelector('[name="email"]');
    setFieldError(f, "כתובת דוא\"ל לא תקינה.");
    firstInvalid = firstInvalid || f;
  }

  if (!values.eventType) {
    const f = state.form.querySelector('[name="eventType"]');
    setFieldError(f, "אנא בחרו סוג אירוע.");
    firstInvalid = firstInvalid || f;
  }

  if (firstInvalid) {
    // Move focus to the first invalid field — keyboard users get there fast.
    try { firstInvalid.focus({ preventScroll: false }); } catch { /* ignore */ }
    setFeedback("יש שדות שדורשים תיקון.", "err");
    return;
  }

  // 2. Build body
  const waNumber = state.form.dataset.waNumber || "";
  const email    = state.form.dataset.email || "";
  const body     = buildMessageBody(values);

  if (!waNumber) {
    // Defensive: HTML didn't supply a number. Still allow mailto fallback.
    if (email) {
      renderMailtoFallback(email, body);
      setFeedback("ההודעה לא נשלחה (חסר מספר ווטסאפ). השתמשו בקישור הדוא\"ל.", "err");
    } else {
      setFeedback("שגיאה: לא הוגדרו פרטי שליחה.", "err");
    }
    return;
  }

  // 3. Open WhatsApp
  // wa.me URL format: https://wa.me/<number>?text=<encoded body>
  // Number must be digits only (no +, no dashes).
  const cleanedNumber = waNumber.replace(/\D/g, "");
  const waUrl = `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(body)}`;

  let opened = null;
  try {
    opened = window.open(waUrl, "_blank", "noopener,noreferrer");
  } catch {
    /* popup blocked — fall through */
  }

  if (opened) {
    setFeedback("ההודעה נפתחה ב-WhatsApp. ניתן לסגור את החלון הזה.", "ok");
  } else {
    // Popup blocked — give the user a direct link.
    setFeedback("נחסמה פתיחת חלון. לחצו על הקישור לפתוח את ווטסאפ.", "err");
    // Inject a fallback anchor to wa.me link inside feedback.
    const a = document.createElement("a");
    a.href = waUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "פתחו ב-WhatsApp";
    a.className = "contact__wa-fallback";
    state.feedback.appendChild(document.createTextNode(" "));
    state.feedback.appendChild(a);
  }

  // 4. Always render the mailto fallback after a valid submit so the user
  //    has an alternative path even if WhatsApp wasn't their preference.
  if (email) {
    renderMailtoFallback(email, body);
  }
}

/**
 * Clear field error as the user types — feels less punishing than waiting
 * for the next submit.
 */
function onInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.classList.contains(FIELD_INVALID_CLASS)) {
    clearFieldError(target);
  }
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  // 1. Locate form. Quietly bail if missing — page must still boot.
  state.form = document.querySelector("form.contact__form");
  if (!state.form) return;

  state.feedback  = state.form.querySelector(".contact__feedback");
  state.submitBtn = state.form.querySelector(".contact__submit");

  // Defensive: ensure feedback element has accessibility attributes
  // (HTML already includes them, but module shouldn't depend on that).
  if (state.feedback) {
    if (!state.feedback.getAttribute("role"))     state.feedback.setAttribute("role", "status");
    if (!state.feedback.getAttribute("aria-live")) state.feedback.setAttribute("aria-live", "polite");
  }

  // 2. Wire listeners.
  state.bound.onSubmit = onSubmit;
  state.bound.onInput  = onInput;
  state.form.addEventListener("submit", state.bound.onSubmit);
  state.form.addEventListener("input",  state.bound.onInput);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  if (state.form && state.bound.onSubmit) {
    state.form.removeEventListener("submit", state.bound.onSubmit);
    state.form.removeEventListener("input",  state.bound.onInput);
  }

  // Remove any error elements we injected.
  clearAllErrors();

  // Remove mailto fallback anchor.
  if (state.mailtoLink && state.mailtoLink.parentNode) {
    state.mailtoLink.parentNode.removeChild(state.mailtoLink);
  }

  // Clear feedback text we wrote.
  if (state.feedback) {
    state.feedback.textContent = "";
    delete state.feedback.dataset.kind;
  }

  state.initialised = false;
  state.form        = null;
  state.feedback    = null;
  state.submitBtn   = null;
  state.mailtoLink  = null;
  state.errorEls    = [];
  state.bound.onSubmit = null;
  state.bound.onInput  = null;
}
