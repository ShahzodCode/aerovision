import { db, LINKS, Member } from '../supabase';
import { me } from '../auth';
import { h, field, input, area, empty, toast, section, initials } from '../ui';

export async function about() {
  const { data } = await db.from('team_members').select('*').order('sort');
  const members = (data as Member[]) ?? [];

  const name = input('text', me?.name ?? '', true);
  const email = input('email', me?.email ?? '', true);
  const msg = area('', 5);
  const form = h('form', { class: 'panel form', onsubmit: async (e: Event) => {
    e.preventDefault();
    const { error } = await db.from('requests').insert({
      kind: 'contact', name: name.value.trim(), email: email.value.trim(), message: msg.value.trim(), user_id: me?.id ?? null });
    if (error) toast(error.message, true); else { toast('Message sent!'); msg.value = ''; }
  } }, field('Name', name), field('Email', email), field('Message', msg), h('button', { class: 'btn' }, 'Send message'));

  return h('div', {},
    h('header', { class: 'page-head' }, h('h1', {}, 'About us'),
      h('p', {}, 'Aero Vision started as a school team and is now a public team: anyone can join, and anyone can organize an event with us.')),
    h('div', { id: 'team' }), section('Team members',
      h('div', { class: 'cards3' }, ...(members.length ? members.map((m) =>
        h('div', { class: 'panel member' },
          m.photo_url ? h('img', { class: 'avatar', src: m.photo_url, alt: '' }) : h('div', { class: 'avatar' }, initials(m.name)),
          h('h3', {}, m.name), h('small', {}, m.role), m.bio ? h('p', {}, m.bio) : null))
        : [empty('Team list coming soon')]))),
    h('div', { id: 'contact' }), section('Contact us',
      h('div', { class: 'row' },
        h('a', { class: 'btn ghost', href: `mailto:${LINKS.email}` }, 'Email'),
        h('a', { class: 'btn ghost', href: LINKS.instagram, target: '_blank', rel: 'noopener' }, 'Instagram'),
        h('a', { class: 'btn ghost', href: LINKS.telegram, target: '_blank', rel: 'noopener' }, 'Telegram')),
      form));
}
