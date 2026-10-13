import { db, Member } from '../supabase';
import { t } from '../content';
import { me } from '../auth';
import { h, field, input, area, empty, toast, section, initials, prose } from '../ui';

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
      h('p', {}, t('about.intro'))),
    t('about.body') ? prose(t('about.body')) : null,
    h('div', { id: 'team' }), section('Team members',
      h('div', { class: 'cards3' }, ...(members.length ? members.map((m) =>
        h('div', { class: 'panel member' },
          m.photo_url ? h('img', { class: 'avatar', src: m.photo_url, alt: '' }) : h('div', { class: 'avatar' }, initials(m.name)),
          h('h3', {}, m.name), h('small', {}, m.role), m.bio ? h('p', {}, m.bio) : null))
        : [empty('Team list coming soon')]))),
    h('div', { id: 'contact' }), section('Contact us',
      h('div', { class: 'row' },
        h('a', { class: 'btn ghost', href: `mailto:${t('contact.email')}` }, 'Email'),
        h('a', { class: 'btn ghost', href: t('contact.instagram'), target: '_blank', rel: 'noopener' }, 'Instagram'),
        h('a', { class: 'btn ghost', href: t('contact.telegram'), target: '_blank', rel: 'noopener' }, 'Telegram')),
      form));
}
