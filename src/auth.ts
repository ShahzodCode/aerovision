import { db } from './supabase';

export type Me = { id: string; email: string; name: string; admin: boolean } | null;
export let me: Me = null;
export let recovering = false; // true after the user clicked a password-reset link
const listeners: (() => void)[] = [];
export const onAuth = (f: () => void) => listeners.push(f);

export async function refreshMe() {
  const { data } = await db.auth.getSession();
  const u = data.session?.user;
  if (!u) me = null;
  else {
    let { data: p } = await db.from('profiles').select('full_name, role').eq('id', u.id).maybeSingle();
    if (!p) {
      // Accounts created before the profiles table existed: create the row now.
      await db.from('profiles').insert({ id: u.id, full_name: u.user_metadata?.full_name ?? '', email: u.email ?? '' });
      p = (await db.from('profiles').select('full_name, role').eq('id', u.id).maybeSingle()).data;
    }
    me = { id: u.id, email: u.email ?? '', name: p?.full_name || u.user_metadata?.full_name || u.email || '', admin: p?.role === 'admin' };
  }
  listeners.forEach((f) => f());
}

export const signIn = (email: string, password: string) => db.auth.signInWithPassword({ email, password });
export const signUp = (email: string, password: string, name: string) =>
  db.auth.signUp({ email, password, options: { data: { full_name: name } } });
export const signOut = () => db.auth.signOut();
export const resetEmail = (email: string) =>
  db.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
export async function setPassword(password: string) {
  const r = await db.auth.updateUser({ password });
  if (!r.error) recovering = false;
  return r;
}
export async function saveName(name: string) {
  if (!me) return null;
  const { error } = await db.from('profiles').update({ full_name: name }).eq('id', me.id);
  if (!error) await refreshMe();
  return error;
}

db.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') { recovering = true; location.hash = '#/login'; }
  void refreshMe();
});
