import { db, EventRow } from '../supabase';
import { signIn, signUp, signOut, resetEmail, setPassword, saveName, me, recovering } from '../auth';
import { h, field, input, toast, fmtDate, empty, section } from '../ui';

type Mode = 'login' | 'signup' | 'forgot';

export async function login() {
  if (recovering) return recoveryForm();
  if (me) return account();

  let mode: Mode = 'login';
  const name = input('text'); const email = input('email', '', true); const pass = input('password');
  const nameField = field('Name', name, 'Used automatically when you register for events.');
  const passField = field('Password', pass, 'At least 6 characters.');
  const title = h('h1'); const submit = h('button', { class: 'btn' });
  const toggles = h('div', { class: 'row' });
  const draw = () => {
    title.textContent = { login: 'Log in', signup: 'Create account', forgot: 'Reset password' }[mode];
    submit.textContent = { login: 'Log in', signup: 'Create account', forgot: 'Send reset link' }[mode];
    nameField.style.display = mode === 'signup' ? '' : 'none';
    passField.style.display = mode === 'forgot' ? 'none' : '';
    pass.required = mode !== 'forgot';
    toggles.replaceChildren(
      ...(mode === 'login' ? [link('Create an account', 'signup'), link('Forgot password?', 'forgot')] : [link('Back to log in', 'login')]));
  };
  const link = (t: string, m: Mode) => h('button', { class: 'link', type: 'button', onclick: () => { mode = m; draw(); } }, t);
  draw();

  const form = h('form', { class: 'panel form narrow', onsubmit: async (e: Event) => {
    e.preventDefault();
    if (mode === 'forgot') {
      const r = await resetEmail(email.value.trim());
      return r.error ? toast(r.error.message, true) : toast('If that email has an account, a reset link is on its way.');
    }
    const r = mode === 'signup' ? await signUp(email.value, pass.value, name.value.trim()) : await signIn(email.value, pass.value);
    if (r.error) return toast(r.error.message, true);
    if (mode === 'signup' && !r.data.session) return toast('Check your email to confirm the account, then log in.');
    location.hash = '#/home';
  } }, nameField, field('Email', email), passField, submit, toggles);
  return h('div', {}, h('header', { class: 'page-head' }, title), form);
}

function recoveryForm() {
  const pass = input('password', '', true);
  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Choose a new password')),
    h('form', { class: 'panel form narrow', onsubmit: async (e: Event) => {
      e.preventDefault();
      const r = await setPassword(pass.value);
      if (r.error) return toast(r.error.message, true);
      toast('Password changed.'); location.hash = '#/home';
    } }, field('New password', pass, 'At least 6 characters.'), h('button', { class: 'btn' }, 'Save password')));
}

async function account() {
  const name = input('text', me!.name, true);
  const { data } = await db.from('event_registrations').select('id, name, events(title, starts_at)').eq('user_id', me!.id);
  const regs = (data as unknown as { id: string; name: string; events: Pick<EventRow, 'title' | 'starts_at'> | null }[]) ?? [];
  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Your account'), h('p', {}, me!.email + (me!.admin ? ' · admin' : ''))),
    h('form', { class: 'panel form narrow', onsubmit: async (e: Event) => {
      e.preventDefault();
      const err = await saveName(name.value.trim());
      err ? toast(err.message, true) : toast('Name saved.');
    } }, field('Name', name, 'Prefilled on event registrations. You can still change it per event.'), h('button', { class: 'btn' }, 'Save name')),
    section('Your registrations', h('div', { class: 'list' }, ...(regs.length ? regs.map((r) =>
      h('div', { class: 'panel row between' }, h('div', {}, h('h3', {}, r.events?.title ?? 'Event'),
        h('small', {}, `${r.events ? fmtDate(r.events.starts_at) : ''} · registered as ${r.name}`))))
      : [empty('No registrations yet')]))),
    h('button', { class: 'btn ghost', onclick: async () => { await signOut(); location.hash = '#/home'; } }, 'Log out'));
}
