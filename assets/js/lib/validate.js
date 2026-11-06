// Small declarative validator (the role Zod + React Hook Form play in a React stack).
// Client-side validation is for UX; the database constraints are the real gate.

export const rules = {
  required: (msg = 'This field is required.') => (v) =>
    (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || v === false ? msg : null),
  minLen: (n, msg) => (v) => (v && String(v).trim().length < n ? msg ?? `Please enter at least ${n} characters.` : null),
  maxLen: (n, msg) => (v) => (v && String(v).length > n ? msg ?? `Please keep this under ${n} characters.` : null),
  email: (msg = 'Enter a valid email address.') => (v) =>
    (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v).trim()) ? msg : null),
  oneOf: (allowed, msg = 'Choose an option from the list.') => (v) => (v && !allowed.includes(v) ? msg : null),
  number: ({ min, max, integer = false } = {}, msg) => (v) => {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return msg ?? 'Enter a number.';
    if (integer && !Number.isInteger(n)) return msg ?? 'Enter a whole number.';
    if (min !== undefined && n < min) return msg ?? `Must be ${min} or more.`;
    if (max !== undefined && n > max) return msg ?? `Must be ${max} or less.`;
    return null;
  },
  notFuture: (msg = 'Date cannot be in the future.') => (v) =>
    (v && new Date(v).getTime() > Date.now() + 10 * 60 * 1000 ? msg : null),
  isTrue: (msg = 'Please tick this box to continue.') => (v) => (v === true ? null : msg),
  file: ({ maxMB = 5, types = ['image/jpeg', 'image/png', 'image/webp'] } = {}) => (f) => {
    if (!f) return null;
    if (!types.includes(f.type)) return 'Upload a JPG, PNG or WebP image.';
    if (f.size > maxMB * 1024 * 1024 * 3) return `Image is too large (max ${maxMB} MB after compression).`;
    return null;
  },
};

export function validate(values, schema) {
  const errors = {};
  for (const [field, checks] of Object.entries(schema)) {
    for (const check of checks) {
      const err = check(values[field], values);
      if (err) { errors[field] = err; break; }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Read a form into a plain object: checkboxes → boolean, files → File|null, empty → ''. */
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; else out[el.name] ??= ''; }
    else if (el.type === 'file') out[el.name] = el.files?.[0] ?? null;
    else out[el.name] = el.value;
  }
  return out;
}

function showErrors(form, errors) {
  form.querySelectorAll('.field-error').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  let first = null;
  for (const [name, msg] of Object.entries(errors)) {
    const input = form.elements[name];
    const el = input instanceof RadioNodeList ? input[0] : input;
    if (!el) continue;
    el.setAttribute('aria-invalid', 'true');
    const holder = form.querySelector(`[data-error-for="${name}"]`);
    if (holder) holder.textContent = msg;
    first ??= el;
  }
  first?.focus();
}

/**
 * Wire a form: validation, honeypot, minimum fill time, double-submit guard.
 * onSubmit(values) may throw — the message is shown in the form status area.
 */
export function bindForm(form, schema, onSubmit, { minFillMs = 2500 } = {}) {
  const started = Date.now();
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('[type="submit"]');
  const setStatus = (msg, type) => {
    if (!status) return;
    status.className = `form-status ${type ? `form-status--${type}` : ''}`;
    status.textContent = msg ?? '';
  };

  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid')) {
      e.target.removeAttribute('aria-invalid');
      const h = form.querySelector(`[data-error-for="${e.target.name}"]`);
      if (h) h.textContent = '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.busy) return;
    const values = readForm(form);

    // Bot traps: hidden honeypot field filled, or form submitted inhumanly fast.
    if (values.website || Date.now() - started < minFillMs) {
      setStatus('Thank you.', 'success'); // look successful; store nothing
      form.reset();
      return;
    }
    delete values.website;

    const resolvedSchema = typeof schema === 'function' ? schema(values) : schema;
    const { ok, errors } = validate(values, resolvedSchema);
    showErrors(form, errors);
    if (!ok) { setStatus('Please correct the highlighted fields.', 'error'); return; }

    form.dataset.busy = '1';
    button?.setAttribute('disabled', '');
    button?.classList.add('is-loading');
    setStatus('Submitting…');
    try {
      await onSubmit(values);
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus(friendlyError(err), 'error');
    } finally {
      delete form.dataset.busy;
      button?.removeAttribute('disabled');
      button?.classList.remove('is-loading');
    }
  });
  return { setStatus, showErrors: (errs) => showErrors(form, errs) };
}

export function friendlyError(err) {
  const msg = err?.message ?? String(err ?? '');
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Network problem. Check your connection and try again.';
  if (/Too many/i.test(msg)) return msg;
  if (/violates check constraint|invalid input/i.test(msg)) return 'Some details were not accepted. Please review the form and try again.';
  if (/JWT|permission denied|row-level security/i.test(msg)) return 'You do not have permission to do that.';
  if (msg && msg.length < 160 && !/\bsql\b|relation|column/i.test(msg)) return msg;
  return 'Something went wrong. Please try again.';
}
