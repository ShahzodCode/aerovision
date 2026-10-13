import { db, Post } from '../supabase';
import { h, fmtDay, empty, prose } from '../ui';

export const postCard = (p: Post) =>
  h('a', { class: 'panel post-card', href: `#/post/${p.id}` },
    p.image_url ? h('img', { class: 'cover', src: p.image_url, alt: '', loading: 'lazy' }) : null,
    h('div', {}, h('small', {}, fmtDay(p.created_at) + (p.published ? '' : ' · DRAFT')),
      h('h3', {}, p.title),
      h('p', {}, p.excerpt || p.body.slice(0, 140) + (p.body.length > 140 ? '…' : ''))));

export async function blog() {
  const { data, error } = await db.from('posts').select('*').order('created_at', { ascending: false });
  const posts = (data as Post[]) ?? [];
  return h('div', {}, h('header', { class: 'page-head' }, h('h1', {}, 'Blog'),
    h('p', {}, 'News, stories and announcements from the team.')),
    h('div', { class: 'list' }, ...(posts.length ? posts.map(postCard)
      : [empty(error ? 'Could not load posts' : 'No posts yet', error?.message ?? 'Check back soon.')])));
}

export async function postPage(id?: string) {
  const { data } = await db.from('posts').select('*').eq('id', id ?? '').maybeSingle();
  const p = data as Post | null;
  if (!p) return h('div', {}, empty('Post not found'), h('a', { class: 'btn ghost', href: '#/blog' }, '← Back to blog'));
  return h('article', { class: 'article' },
    h('a', { class: 'back', href: '#/blog' }, '← Blog'),
    h('h1', {}, p.title),
    h('small', {}, `${fmtDay(p.created_at)}${p.author ? ' · ' + p.author : ''}${p.published ? '' : ' · DRAFT (only admins see this)'}`),
    p.image_url ? h('img', { class: 'cover wide', src: p.image_url, alt: '' }) : null,
    prose(p.body));
}
