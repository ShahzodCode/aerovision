import { skeleton } from './ui';

export type Page = (arg?: string) => HTMLElement | Promise<HTMLElement>;
const routes: Record<string, Page> = {};
let outlet: HTMLElement;
let token = 0;

export const route = (path: string, page: Page) => { routes[path] = page; };

export async function render() {
  if (!outlet) return; // auth events can fire before the first page is started
  const my = ++token;
  const [path, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const page = routes[path || 'home'] ?? routes.notfound;
  outlet.replaceChildren(skeleton(2));
  let el: HTMLElement;
  try { el = await page(arg); } catch (e) { el = document.createElement('p'); el.className = 'note'; el.textContent = 'Something went wrong: ' + (e as Error).message; }
  if (my !== token) return; // a newer navigation won
  outlet.replaceChildren(el);
  window.scrollTo(0, 0);
  const key = path || 'home';
  document.querySelectorAll('.links a').forEach((a) => {
    const t = (a.getAttribute('href') ?? '').replace('#/', '');
    a.classList.toggle('on', t === key || (key === 'post' && t === 'blog'));
  });
}

export function start(el: HTMLElement) {
  outlet = el;
  addEventListener('hashchange', render);
  void render();
}
