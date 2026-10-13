import { db } from './supabase';

/** Editable site texts. The admin changes them in Admin -> Site pages; empty = default below. */
export const DEFAULTS: Record<string, string> = {
  'home.eyebrow': 'A public team',
  'home.title_a': 'Build, fly and learn',
  'home.title_b': 'together.',
  'home.lead': 'Aero Vision started in a school. Now it is open to everyone: join the team, or organize your own event under the Aero Vision name.',
  'home.step1_title': 'Everyone can join',
  'home.step1_text': 'No school or membership needed. Send a request and you are in.',
  'home.step2_title': 'Organize your event',
  'home.step2_text': 'We give you a place (a school for now) and the support to run it on behalf of the team.',
  'home.step3_title': 'Make an account',
  'home.step3_text': 'Your name is filled in automatically when you register for events.',
  'about.intro': 'Aero Vision started as a school team and is now a public team: anyone can join, and anyone can organize an event with us.',
  'about.body': '',
  'contact.email': 'hello@aerovision.example',
  'contact.instagram': 'https://instagram.com/aerovision',
  'contact.telegram': 'https://t.me/aerovision',
  'footer.text': '© Aero Vision · a public team',
};

let data: Record<string, string> = {};
const subs: (() => void)[] = [];
export const onContent = (f: () => void) => subs.push(f);

export async function loadContent() {
  const { data: rows } = await db.from('site_content').select('key, value');
  data = {};
  (rows ?? []).forEach((r: { key: string; value: string }) => { if (r.value.trim()) data[r.key] = r.value; });
  subs.forEach((f) => f());
}

export const t = (key: string) => data[key] ?? DEFAULTS[key] ?? '';
export const raw = (key: string) => data[key] ?? '';
