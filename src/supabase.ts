import { createClient } from '@supabase/supabase-js';

// The URL and anon (public) key are safe to ship in the page: row-level security protects the data.
const PROJECT_URL = 'https://hrnaoylfuradrjhwzmfh.supabase.co';
const ANON_KEY = 'sb_publishable_WDq6R27CYrCrhtgEmwMgQA_ZcwFxA0x';
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || PROJECT_URL;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || ANON_KEY;

export const configured = !!url && !!key;
export const db = createClient(url, key);

export type EventRow = { id: string; title: string; description: string; location: string; organizer: string; image_url: string; starts_at: string; ends_at: string };
export type Question = { q: string; type: 'text' | 'choice'; options?: string[] };
export type Survey = { id: string; title: string; description: string; questions: Question[]; open: boolean; created_at: string };
export type Post = { id: string; title: string; excerpt: string; body: string; image_url: string; author: string; published: boolean; created_at: string };
export type Member = { id: string; name: string; role: string; bio: string; photo_url: string; sort: number };
export type RequestRow = { id: string; kind: string; name: string; email: string; message: string; details: Record<string, string>; status: string; created_at: string };
export type Profile = { id: string; full_name: string; email: string; role: 'user' | 'admin'; created_at: string };

// Replace with your real contact details.
export const LINKS = {
  email: 'hello@aerovision.example',
  instagram: 'https://instagram.com/aerovision',
  telegram: 'https://t.me/aerovision',
};
