import { useEffect, useRef, useState } from 'react';

// Modal behaviour for any overlay: focus moves in, Tab is trapped, Escape closes
// (only the top-most dialog when they stack), background scroll is locked, and
// focus returns to whatever opened it.

const stack = [];
let lockCount = 0;
let savedOverflow = '';

const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

export function focusablesIn(node) {
  return [...node.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'));
}

export function useDialog(ref, onClose, labelledById) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Captured at first render: by the time effects run, an autoFocus child may already hold focus.
  const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const entry = { node };
    stack.push(entry);
    if (lockCount++ === 0) { savedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    if (labelledById && !document.getElementById(labelledById)) node.removeAttribute('aria-labelledby');
    if (!node.contains(document.activeElement)) {
      const auto = node.querySelector('[data-autofocus]');
      (auto || node).focus({ preventScroll: true });
    }

    const onKey = (e) => {
      if (stack[stack.length - 1] !== entry) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusablesIn(node);
      if (!f.length) { e.preventDefault(); node.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      if (!node.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (--lockCount <= 0) { lockCount = 0; document.body.style.overflow = savedOverflow; }
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        try { opener.focus({ preventScroll: true }); } catch { /* ignore */ }
      }
    };
  }, []);
}
