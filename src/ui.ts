type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Record<string, any> = {}, ...kids: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k in el) (el as any)[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c) el.append(c);
  return el;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' });

export function toast(msg: string, bad = false) {
  const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

export function svg(markup: string, cls = 'ico') {
  const s = h('span', { class: cls, 'aria-hidden': 'true' });
  s.innerHTML = markup;
  return s;
}

export const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 11.5 21 4l-6.5 16-3-6.5z"/><path d="M11.5 13.5 21 4"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

/** A labelled input/textarea/select. Read the value back with the element's `.value`. */
export function field(label: string, el: HTMLElement, hint?: string) {
  return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), el, hint ? h('small', {}, hint) : null);
}
export const input = (type = 'text', value = '', required = false) =>
  h('input', { type, value, required });
export const area = (value = '', rows = 4) => h('textarea', { rows, value });
export function select(options: [string, string][], value = '') {
  const s = h('select');
  for (const [v, t] of options) s.append(h('option', { value: v, selected: v === value }, t));
  return s;
}

export const note = (msg: string) => h('p', { class: 'note' }, msg);
export const empty = (title: string, msg = '') =>
  h('div', { class: 'empty' }, h('strong', {}, title), msg ? h('span', {}, msg) : null);
export const skeleton = (n = 3) =>
  h('div', { class: 'list' }, ...Array.from({ length: n }, () => h('div', { class: 'panel skel' })));
export const section = (title: string, ...kids: (Child | Child[])[]) =>
  h('section', { class: 'sec' }, h('h2', {}, title), ...kids);

/** Post text: blank line = new paragraph, "## " = heading, "- " = list item. */
export function prose(text: string) {
  const box = h('div', { class: 'prose' });
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => l.startsWith('- '))) box.append(h('ul', {}, ...lines.map((l) => h('li', {}, l.slice(2)))));
    else if (lines[0].startsWith('## ')) { box.append(h('h2', {}, lines[0].slice(3))); if (lines.length > 1) box.append(h('p', {}, lines.slice(1).join(' '))); }
    else box.append(h('p', {}, lines.join(' ')));
  }
  return box;
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast('Nothing to export.', true);
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
  const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: name });
  document.body.append(a); a.click(); a.remove();
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
