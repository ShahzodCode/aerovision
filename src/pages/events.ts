import { db, EventRow } from '../supabase';
import { me } from '../auth';
import { h, fmtDate, empty, toast, field, input, svg, ICONS } from '../ui';

export type Filter = 'all' | 'current' | 'upcoming' | 'past';
const FILTERS: Filter[] = ['all', 'current', 'upcoming', 'past'];

export function when(e: EventRow): Exclude<Filter, 'all'> {
  const now = Date.now();
  if (new Date(e.ends_at).getTime() < now) return 'past';
  if (new Date(e.starts_at).getTime() > now) return 'upcoming';
  return 'current';
}

export async function events() {
  const { data, error } = await db.from('events').select('*').order('starts_at', { ascending: true });
  const all = (data as EventRow[]) ?? [];
  const mine = new Set<string>();
  if (me) {
    const { data: regs } = await db.from('event_registrations').select('event_id').eq('user_id', me.id);
    regs?.forEach((r: { event_id: string }) => mine.add(r.event_id));
  }
  let filter: Filter = 'all';
  const list = h('div', { class: 'list' });
  const bar = h('div', { class: 'tabs', role: 'tablist' });

  const draw = () => {
    bar.replaceChildren(...FILTERS.map((f) => {
      const n = f === 'all' ? all.length : all.filter((e) => when(e) === f).length;
      return h('button', { class: 'tab' + (f === filter ? ' on' : ''), role: 'tab', onclick: () => { filter = f; draw(); } },
        f[0].toUpperCase() + f.slice(1), h('span', { class: 'count' }, String(n)));
    }));
    // upcoming: soonest first; past: latest first
    const shown = all.filter((e) => filter === 'all' || when(e) === filter);
    if (filter === 'past') shown.reverse();
    list.replaceChildren(...(shown.length
      ? shown.map((e) => eventCard(e, mine))
      : [empty(error ? 'Could not load events' : 'No events here yet', error ? error.message : 'Check another tab, or organize one yourself from the Request page.')]));
  };
  draw();
  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Events'),
    h('p', {}, 'Everything Aero Vision and our community organizes.')), bar, list);
}

export function eventCard(e: EventRow, mine: Set<string> = new Set()) {
  const status = when(e);
  const d = new Date(e.starts_at);
  const card = h('article', { class: 'panel event' },
    h('div', { class: 'date' },
      h('b', {}, String(d.getDate())), h('span', {}, d.toLocaleString(undefined, { month: 'short' }).toUpperCase())),
    h('div', { class: 'body' },
      e.image_url ? h('img', { class: 'cover', src: e.image_url, alt: '', loading: 'lazy' }) : null,
      h('div', { class: 'row between' }, h('h3', {}, e.title),
        h('span', { class: 'badge ' + status }, status)),
      h('div', { class: 'meta' },
        h('span', {}, svg(ICONS.clock), fmtDate(e.starts_at)),
        h('span', {}, svg(ICONS.pin), e.location || 'TBA'),
        h('span', {}, 'by ' + e.organizer)),
      e.description ? h('p', {}, e.description) : null));
  const actions = h('div', { class: 'row' });
  if (mine.has(e.id)) actions.append(h('span', { class: 'badge approved' }, 'You are registered'));
  else if (status !== 'past') actions.append(h('button', { class: 'btn small', onclick: () => regForm(e, card.querySelector('.body')!) }, 'Register'));
  card.querySelector('.body')!.append(actions);
  return card;
}

function regForm(e: EventRow, host: Element) {
  if (host.querySelector('form')) return host.querySelector('form')!.remove();
  // The account name is the default; it can be changed for this registration only.
  const name = input('text', me?.name ?? '', true);
  const email = input('email', me?.email ?? '', true);
  const form = h('form', { class: 'form inline', onsubmit: async (ev: Event) => {
    ev.preventDefault();
    const { error } = await db.from('event_registrations').insert({
      event_id: e.id, user_id: me?.id ?? null, name: name.value.trim(), email: email.value.trim() });
    if (error) toast(error.message, true);
    else { toast('You are registered!'); form.remove(); host.querySelector('.row:last-child')!.replaceChildren(h('span', { class: 'badge approved' }, 'Registered')); }
  } },
    field('Name for this registration', name, me ? 'Filled from your account. Change it if you register someone else.' : 'Create an account to have your name filled in automatically.'),
    field('Email', email),
    h('button', { class: 'btn' }, 'Confirm registration'));
  host.append(form);
}
