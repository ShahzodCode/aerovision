import { db } from '../supabase';
import { me } from '../auth';
import { h, field, input, area, toast } from '../ui';

const KINDS: [string, string, string][] = [
  ['join', 'Join the team', 'Everyone is welcome.'],
  ['event', 'Organize an event', 'We provide a place and support.'],
  ['opportunity', 'Opportunity', 'Ask for a role, a resource or a place.'],
  ['idea', 'Share an idea', 'Anything that could make us better.'],
];

export function request(kind?: string) {
  let sel = KINDS.some(([k]) => k === kind) ? kind! : 'join';
  const name = input('text', me?.name ?? '', true);
  const email = input('email', me?.email ?? '', true);
  const message = area('', 5);
  const extra = h('div', { class: 'form', style: 'padding:0' });
  const picker = h('div', { class: 'choices' });

  // Event requests ask for the details we need to give them a place.
  const eventDate = input('date'); const eventPlace = input('text', 'A school (default)'); const people = input('number');
  const draw = () => {
    picker.replaceChildren(...KINDS.map(([k, t, d]) =>
      h('button', { type: 'button', class: 'choice' + (k === sel ? ' on' : ''), onclick: () => { sel = k; draw(); } },
        h('b', {}, t), h('span', {}, d))));
    extra.replaceChildren(...(sel === 'event'
      ? [field('Preferred date', eventDate), field('Place', eventPlace), field('Expected people', people)] : []));
  };
  draw();

  const form = h('form', { class: 'panel form', onsubmit: async (e: Event) => {
    e.preventDefault();
    const details = sel === 'event' ? { date: eventDate.value, place: eventPlace.value, people: people.value } : {};
    const { error } = await db.from('requests').insert({
      kind: sel, name: name.value.trim(), email: email.value.trim(),
      message: message.value.trim(), details, user_id: me?.id ?? null });
    if (error) return toast(error.message, true);
    toast('Request sent. We will get back to you!');
    message.value = '';
  } },
    field('Your name', name), field('Email', email), extra, field('Tell us more', message),
    h('button', { class: 'btn' }, 'Send request'));

  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Request'),
    h('p', {}, 'Anyone can join Aero Vision or organize an event on behalf of the team. No account needed.')),
    picker, form);
}
