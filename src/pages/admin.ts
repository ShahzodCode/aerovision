import { db, RequestRow, EventRow, Survey, Question, Profile } from '../supabase';
import { me } from '../auth';
import { h, fmtDate, field, input, area, select, empty, toast, downloadCsv } from '../ui';
import { when } from './events';

type Tab = 'overview' | 'requests' | 'events' | 'blog' | 'surveys' | 'team' | 'users';
const TABS: [Tab, string][] = [['overview', 'Overview'], ['requests', 'Requests'], ['events', 'Events'], ['blog', 'Blog'], ['surveys', 'Surveys'], ['team', 'Team'], ['users', 'Users']];
let tab: Tab = 'overview';
let goTab: (t: Tab) => void = () => {};

export async function admin() {
  if (!me) return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Admin')),
    empty('Please log in'), h('a', { class: 'btn', href: '#/login' }, 'Log in'));
  if (!me.admin) return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Admin')),
    h('div', { class: 'panel' }, h('h3', {}, 'This account is not an admin'),
      h('p', {}, `You are signed in as ${me.email}. To make this account an admin, run this in Supabase → SQL Editor, then log out and log in again:`),
      h('pre', {}, `update public.profiles set role = 'admin' where email = '${me.email}';`)));

  const body = h('div');
  const bar = h('div', { class: 'tabs' });
  const show = async (t: Tab) => {
    tab = t;
    bar.replaceChildren(...TABS.map(([k, label]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), onclick: () => show(k) }, label)));
    body.replaceChildren(h('div', { class: 'panel skel' }));
    body.replaceChildren(await ({ overview, requests, events, blog, surveys, team, users }[t])(() => show(t)));
  };
  goTab = (t) => void show(t);
  await show(tab);
  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Admin panel'), h('p', {}, 'Manage everything on the site.')), bar, body);
}

/* ---------- helpers ---------- */
const run = async (p: PromiseLike<{ error: { message: string } | null }>, again: () => void, ok = 'Saved.') => {
  const { error } = await p;
  if (error) toast(error.message, true); else { toast(ok); again(); }
};
const del = (table: string, id: string, again: () => void, label = 'Delete') =>
  h('button', { class: 'btn small danger', onclick: () => confirm('Delete this permanently?') && run(db.from(table).delete().eq('id', id), again, 'Deleted.') }, label);
const toLocal = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/* ---------- generic create / edit / delete list ---------- */
type F = {
  key: string; label: string; hint?: string; required?: boolean; rows?: number;
  type: 'text' | 'textarea' | 'datetime' | 'number' | 'checkbox';
  def?: unknown | (() => unknown);
  toInput?: (v: any) => string; fromInput?: (s: string) => unknown;
};
type Cfg = {
  table: string; noun: string; order: [string, boolean]; fields: F[];
  show: (r: any) => { title: string; sub: string; badge?: [string, string] };
  prepare?: () => Promise<any>;
  extra?: (r: any, ctx: any, again: () => void) => (Node | null)[];
};

function makeInput(f: F, cur: unknown) {
  const init = cur !== undefined ? cur : typeof f.def === 'function' ? (f.def as () => unknown)() : f.def;
  const text = f.toInput ? f.toInput(init) : String(init ?? '');
  if (f.type === 'checkbox') { const c = h('input', { type: 'checkbox', checked: !!init }); return { el: c, get: () => c.checked as unknown }; }
  if (f.type === 'textarea') { const t = area(text, f.rows ?? 4); t.required = !!f.required; return { el: t, get: () => (f.fromInput ? f.fromInput(t.value) : t.value) as unknown }; }
  if (f.type === 'datetime') { const i = input('datetime-local', toLocal(text), f.required); return { el: i, get: () => (i.value ? new Date(i.value).toISOString() : null) as unknown }; }
  if (f.type === 'number') { const i = input('number', text); return { el: i, get: () => Number(i.value || 0) as unknown }; }
  const i = input('text', text, f.required); return { el: i, get: () => i.value.trim() as unknown };
}

async function crud(cfg: Cfg, again: () => void) {
  const { data, error } = await db.from(cfg.table).select('*').order(cfg.order[0], { ascending: cfg.order[1] });
  if (error) return empty('Could not load ' + cfg.noun + 's', error.message + ' — did you run supabase/update-2.sql?');
  const ctx = cfg.prepare ? await cfg.prepare() : undefined;
  const rows = (data ?? []) as any[];
  const host = h('div');

  const openForm = (row?: any) => {
    const parts = cfg.fields.map((f) => ({ f, ...makeInput(f, row ? row[f.key] : undefined) }));
    const form = h('form', { class: 'panel form', onsubmit: (e: Event) => {
      e.preventDefault();
      const payload: Record<string, unknown> = {};
      parts.forEach((p) => { payload[p.f.key] = p.get(); });
      void run(row ? db.from(cfg.table).update(payload).eq('id', row.id) : db.from(cfg.table).insert(payload), again,
        row ? 'Changes saved.' : cfg.noun[0].toUpperCase() + cfg.noun.slice(1) + ' created.');
    } },
      h('h3', {}, (row ? 'Edit ' : 'New ') + cfg.noun),
      ...parts.map((p) => h('label', { class: 'field' + (p.f.type === 'checkbox' ? ' check' : '') },
        h('span', { class: 'lbl' }, p.f.label), p.el, p.f.hint ? h('small', {}, p.f.hint) : null)),
      h('div', { class: 'row' }, h('button', { class: 'btn' }, row ? 'Save changes' : 'Create'),
        h('button', { class: 'btn ghost', type: 'button', onclick: () => host.replaceChildren() }, 'Cancel')));
    host.replaceChildren(form);
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return h('div', {},
    h('div', { class: 'row between bar' }, h('h2', {}, `${rows.length} ${cfg.noun}${rows.length === 1 ? '' : 's'}`),
      h('button', { class: 'btn', onclick: () => openForm() }, `+ New ${cfg.noun}`)),
    host,
    h('div', { class: 'list' }, ...(rows.length ? rows.map((r) => {
      const s = cfg.show(r);
      return h('article', { class: 'panel' },
        h('div', { class: 'row between' }, h('h3', {}, s.title), s.badge ? h('span', { class: 'badge ' + s.badge[1] }, s.badge[0]) : null),
        h('small', {}, s.sub),
        ...(cfg.extra ? cfg.extra(r, ctx, again) : []),
        h('div', { class: 'row' }, h('button', { class: 'btn small ghost', onclick: () => openForm(r) }, 'Edit'), del(cfg.table, r.id, again)));
    }) : [empty(`No ${cfg.noun}s yet`, `Click “New ${cfg.noun}” to add the first one.`)])));
}

/* ---------- tabs ---------- */
async function overview() {
  const count = async (t: string, f?: (q: any) => any) => {
    let q: any = db.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q);
    return (await q).count ?? 0;
  };
  const [req, ev, posts, regs, users, resp] = await Promise.all([
    count('requests', (q) => q.eq('status', 'new')), count('events'), count('posts'),
    count('event_registrations'), count('profiles'), count('survey_responses')]);
  const stat = (n: number, l: string, to: Tab) => h('button', { class: 'panel stat', onclick: () => goTab(to) },
    h('b', {}, String(n)), h('span', {}, l));
  return h('div', { class: 'cards3' }, stat(req, 'New requests', 'requests'), stat(ev, 'Events', 'events'), stat(posts, 'Blog posts', 'blog'),
    stat(regs, 'Event registrations', 'events'), stat(users, 'Accounts', 'users'), stat(resp, 'Survey responses', 'surveys'));
}

async function requests(again: () => void) {
  const { data, error } = await db.from('requests').select('*').order('created_at', { ascending: false });
  if (error) return empty('Could not load requests', error.message);
  const all = (data as RequestRow[]) ?? [];
  let kind = 'all', status = 'all';
  const list = h('div', { class: 'list' });
  const bar = h('div', { class: 'row' });
  const kinds = ['all', 'join', 'event', 'opportunity', 'idea', 'contact'];
  const draw = () => {
    const kSel = select(kinds.map((k) => [k, k === 'all' ? 'All types' : k] as [string, string]), kind);
    const sSel = select([['all', 'Any status'], ['new', 'New'], ['approved', 'Approved'], ['declined', 'Declined']], status);
    kSel.onchange = () => { kind = kSel.value; draw(); };
    sSel.onchange = () => { status = sSel.value; draw(); };
    bar.replaceChildren(kSel, sSel,
      h('button', { class: 'btn small ghost', onclick: () => downloadCsv('requests.csv', all.map((r) => ({ type: r.kind, status: r.status, name: r.name, email: r.email, message: r.message, details: JSON.stringify(r.details), date: r.created_at }))) }, 'Export CSV'));
    const shown = all.filter((r) => (kind === 'all' || r.kind === kind) && (status === 'all' || r.status === status));
    list.replaceChildren(...(shown.length ? shown.map((r) => h('article', { class: 'panel' },
      h('div', { class: 'row between' }, h('h3', {}, `${r.name}`), h('span', { class: 'row' }, h('span', { class: 'badge' }, r.kind), h('span', { class: 'badge ' + r.status }, r.status))),
      h('small', {}, `${r.email} · ${fmtDate(r.created_at)}`),
      r.message ? h('p', {}, r.message) : null,
      Object.values(r.details ?? {}).some(Boolean) ? h('pre', {}, Object.entries(r.details).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => run(db.from('requests').update({ status: 'approved' }).eq('id', r.id), again) }, 'Approve'),
        h('button', { class: 'btn small ghost', onclick: () => run(db.from('requests').update({ status: 'declined' }).eq('id', r.id), again) }, 'Decline'),
        h('a', { class: 'btn small ghost', href: `mailto:${r.email}?subject=${encodeURIComponent('Aero Vision: your ' + r.kind + ' request')}` }, 'Reply by email'),
        del('requests', r.id, again)))) : [empty('No requests match')]));
  };
  draw();
  return h('div', {}, bar, list);
}

const eventsCfg: Cfg = {
  table: 'events', noun: 'event', order: ['starts_at', false],
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'starts_at', label: 'Starts', type: 'datetime', required: true },
    { key: 'ends_at', label: 'Ends', type: 'datetime', required: true },
    { key: 'location', label: 'Place', type: 'text', hint: 'For example: School gym' },
    { key: 'organizer', label: 'Organizer', type: 'text', def: 'Aero Vision' },
    { key: 'image_url', label: 'Image link (optional)', type: 'text', hint: 'A web address of a picture (https://…).' },
    { key: 'description', label: 'Description', type: 'textarea', rows: 6 },
  ],
  show: (e: EventRow) => ({ title: e.title, sub: `${fmtDate(e.starts_at)} · ${e.location || 'no place'} · by ${e.organizer}`, badge: [when(e), when(e)] }),
  prepare: async () => (await db.from('event_registrations').select('id, event_id, name, email, created_at')).data ?? [],
  extra: (e, regs: any[], again) => {
    const mine = regs.filter((r) => r.event_id === e.id);
    return [h('details', {}, h('summary', {}, `${mine.length} registered`),
      h('div', { class: 'row bar' }, h('button', { class: 'btn small ghost', onclick: () => downloadCsv(`${e.title}-registrations.csv`, mine.map((r) => ({ name: r.name, email: r.email, registered: r.created_at }))) }, 'Export CSV')),
      ...mine.map((r) => h('div', { class: 'row between line' }, h('span', {}, `${r.name} · ${r.email}`), del('event_registrations', r.id, again, 'Remove'))))];
  },
};

const blogCfg: Cfg = {
  table: 'posts', noun: 'post', order: ['created_at', false],
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'excerpt', label: 'Short summary', type: 'text', hint: 'Shown on the blog list.' },
    { key: 'image_url', label: 'Cover image link (optional)', type: 'text' },
    { key: 'body', label: 'Text', type: 'textarea', rows: 14, required: true, hint: 'Blank line = new paragraph. Start a line with “## ” for a heading, or with “- ” for a bullet list.' },
    { key: 'author', label: 'Author', type: 'text', def: () => me?.name ?? '' },
    { key: 'published', label: 'Published (untick to keep as a draft)', type: 'checkbox', def: true },
  ],
  show: (p) => ({ title: p.title, sub: `${fmtDate(p.created_at)}${p.author ? ' · ' + p.author : ''}`, badge: p.published ? ['published', 'approved'] : ['draft', 'new'] }),
};
const blog = (again: () => void) => crud(blogCfg, again);
const events = (again: () => void) => crud(eventsCfg, again);

const questionsToText = (qs: Question[]) => (qs ?? []).map((q) => (q.type === 'choice' ? [q.q, ...(q.options ?? [])].join(' | ') : q.q)).join('\n');
const textToQuestions = (s: string): Question[] => s.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const [q, ...options] = l.split('|').map((x) => x.trim()).filter(Boolean);
  return options.length ? { q, type: 'choice' as const, options } : { q, type: 'text' as const };
});

const surveysCfg: Cfg = {
  table: 'surveys', noun: 'survey', order: ['created_at', false],
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { key: 'questions', label: 'Questions (one per line)', type: 'textarea', rows: 7, required: true, toInput: questionsToText, fromInput: textToQuestions,
      hint: 'Free answer: just write the question. Multiple choice: Question? | Option A | Option B' },
    { key: 'open', label: 'Open for answers', type: 'checkbox', def: true },
  ],
  show: (s: Survey) => ({ title: s.title, sub: `${s.questions.length} questions · ${fmtDate(s.created_at)}`, badge: s.open ? ['open', 'approved'] : ['closed', 'declined'] }),
  prepare: async () => {
    const resp = (await db.from('survey_responses').select('survey_id, user_id, answers, created_at')).data ?? [];
    const profiles = (await db.from('profiles').select('id, full_name, email')).data ?? [];
    return { resp, who: new Map(profiles.map((p: any) => [p.id, `${p.full_name || '(no name)'} <${p.email}>`])) };
  },
  extra: (s: Survey, ctx: any) => {
    const mine = ctx.resp.filter((r: any) => r.survey_id === s.id);
    return [h('details', {}, h('summary', {}, `${mine.length} responses`),
      h('div', { class: 'row bar' }, h('button', { class: 'btn small ghost', onclick: () => downloadCsv(`${s.title}-responses.csv`, mine.map((r: any) => ({
        who: ctx.who.get(r.user_id) ?? r.user_id, date: r.created_at, ...Object.fromEntries((r.answers as { q: string; a: string }[]).map((a) => [a.q, a.a])) }))) }, 'Export CSV')),
      ...mine.map((r: any) => h('pre', {}, `${ctx.who.get(r.user_id) ?? r.user_id}\n` + (r.answers as { q: string; a: string }[]).map((a) => `${a.q}\n  → ${a.a}`).join('\n'))))];
  },
};
const surveys = (again: () => void) => crud(surveysCfg, again);

const teamCfg: Cfg = {
  table: 'team_members', noun: 'team member', order: ['sort', true],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'role', label: 'Role', type: 'text' },
    { key: 'bio', label: 'Short bio', type: 'textarea', rows: 3 },
    { key: 'photo_url', label: 'Photo link (optional)', type: 'text' },
    { key: 'sort', label: 'Order (1 = first)', type: 'number', def: 10 },
  ],
  show: (m) => ({ title: m.name, sub: m.role || '—' }),
};
const team = (again: () => void) => crud(teamCfg, again);

async function users(again: () => void) {
  const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return empty('Could not load users', error.message);
  const rows = (data as Profile[]) ?? [];
  return h('div', {},
    h('div', { class: 'row between bar' }, h('h2', {}, `${rows.length} accounts`),
      h('button', { class: 'btn small ghost', onclick: () => downloadCsv('users.csv', rows.map((p) => ({ name: p.full_name, email: p.email, role: p.role, joined: p.created_at }))) }, 'Export CSV')),
    h('div', { class: 'list' }, ...rows.map((p) => h('article', { class: 'panel row between' },
      h('div', {}, h('h3', {}, p.full_name || '(no name)'), h('small', {}, `${p.email} · joined ${fmtDate(p.created_at)}`)),
      h('div', { class: 'row' }, h('span', { class: 'badge ' + (p.role === 'admin' ? 'current' : '') }, p.role),
        p.id === me!.id ? null : h('button', { class: 'btn small ghost', onclick: () =>
          confirm(p.role === 'admin' ? `Remove admin rights from ${p.email}?` : `Make ${p.email} an admin? They will be able to manage everything.`) &&
          run(db.from('profiles').update({ role: p.role === 'admin' ? 'user' : 'admin' }).eq('id', p.id), again) }, p.role === 'admin' ? 'Remove admin' : 'Make admin'))))));
}
