import { db, EventRow, Post, Survey } from '../supabase';
import { me } from '../auth';
import { t } from '../content';
import { h, empty, toast, field, area, select, section } from '../ui';
import { eventCard, when } from './events';
import { postCard } from './blog';

export async function home() {
  const [ev, posts, surveys] = await Promise.all([
    db.from('events').select('*').order('starts_at', { ascending: true }),
    db.from('posts').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3),
    db.from('surveys').select('*').eq('open', true).order('created_at', { ascending: false }),
  ]);
  const next = ((ev.data as EventRow[]) ?? []).filter((e) => when(e) !== 'past').slice(0, 3);
  const step = (n: string) => h('div', { class: 'step' }, h('b', {}, '0' + n), h('h3', {}, t(`home.step${n}_title`)), h('p', {}, t(`home.step${n}_text`)));

  return h('div', {},
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, t('home.eyebrow')),
      h('h1', {}, t('home.title_a') + ' ', h('em', {}, t('home.title_b'))),
      h('p', { class: 'lead' }, t('home.lead')),
      h('div', { class: 'row' },
        h('a', { class: 'btn', href: '#/request/join' }, 'Join the team'),
        h('a', { class: 'btn ghost', href: '#/events' }, 'Browse events'))),
    h('section', { class: 'steps' },
      step('1'), step('2'), step('3')),
    section('Next events',
      h('div', { class: 'list' }, ...(next.length ? next.map((e) => eventCard(e))
        : [empty('No events planned yet', ev.error?.message ?? 'Have an idea? Request one.')])),
      h('a', { class: 'more', href: '#/events' }, 'All events →')),
    section('From the blog',
      h('div', { class: 'list' }, ...(((posts.data as Post[]) ?? []).length ? (posts.data as Post[]).map(postCard)
        : [empty('No posts yet')])),
      h('a', { class: 'more', href: '#/blog' }, 'All posts →')),
    ((surveys.data as Survey[]) ?? []).length ? section('Surveys & forms',
      h('div', { class: 'list' }, ...(surveys.data as Survey[]).map((s) =>
        h('article', { class: 'panel row between' },
          h('div', {}, h('h3', {}, s.title), h('p', {}, s.description)),
          h('a', { class: 'btn small', href: `#/survey/${s.id}` }, 'Answer'))))) : null);
}

export async function surveyPage(id?: string) {
  const { data } = await db.from('surveys').select('*').eq('id', id ?? '').maybeSingle();
  const s = data as Survey | null;
  if (!s) return h('div', {}, empty('Survey not found'));
  if (!me) return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, s.title)),
    empty('Please log in to answer', 'We use your account so everyone answers once.'), h('a', { class: 'btn', href: '#/login' }, 'Log in'));
  if (!s.open) return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, s.title)), empty('This survey is closed'));
  const inputs = s.questions.map((q) =>
    q.type === 'choice' ? select((q.options ?? []).map((o) => [o, o] as [string, string])) : area());
  const form = h('form', { class: 'panel form', onsubmit: async (e: Event) => {
    e.preventDefault();
    const answers = s.questions.map((q, i) => ({ q: q.q, a: inputs[i].value }));
    const { error } = await db.from('survey_responses').insert({ survey_id: s.id, user_id: me!.id, answers });
    if (error) toast(error.code === '23505' ? 'You already answered this survey.' : error.message, true);
    else { toast('Thank you!'); location.hash = '#/home'; }
  } }, ...s.questions.map((q, i) => field(q.q, inputs[i])), h('button', { class: 'btn' }, 'Send answers'));
  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, s.title), h('p', {}, s.description)), form);
}
