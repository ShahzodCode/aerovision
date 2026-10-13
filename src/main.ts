import './styles.css';
import { me, onAuth, refreshMe } from './auth';
import { route, start, render } from './router';
import { h, svg, ICONS, empty } from './ui';
import { toggleTheme, isDark } from './theme';
import { home, surveyPage } from './pages/home';
import { events } from './pages/events';
import { blog, postPage } from './pages/blog';
import { request } from './pages/request';
import { about } from './pages/about';
import { login } from './pages/login';
import { admin } from './pages/admin';
import { LINKS } from './supabase';

route('home', home);
route('events', events);
route('blog', blog);
route('post', postPage);
route('request', request);
route('about', about);
route('login', login);
route('admin', admin);
route('survey', surveyPage);
route('notfound', () => h('div', {}, empty('Page not found', 'That page does not exist.'), h('a', { class: 'btn', href: '#/home' }, 'Go home')));

const app = document.getElementById('app')!;
const nav = h('header', { class: 'nav' });
const main = h('main', { id: 'main' });

const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Toggle light / dark mode', onclick: () => { toggleTheme(); drawTheme(); } });
const drawTheme = () => themeBtn.replaceChildren(svg(isDark() ? ICONS.sun : ICONS.moon));

const drawNav = () => {
  const links = h('nav', { class: 'links', id: 'links' },
    h('a', { href: '#/home' }, 'Main'),
    h('a', { href: '#/events' }, 'Events'),
    h('a', { href: '#/blog' }, 'Blog'),
    h('a', { href: '#/request' }, 'Request'),
    h('a', { href: '#/about' }, 'About us'),
    me?.admin ? h('a', { href: '#/admin' }, 'Admin') : null);
  links.addEventListener('click', () => links.classList.remove('open'));
  nav.replaceChildren(h('div', { class: 'wrap row between' },
    h('a', { class: 'brand', href: '#/home' }, svg(ICONS.logo, 'logo'), 'Aero Vision'),
    links,
    h('div', { class: 'row tools' }, themeBtn,
      h('a', { class: 'btn small ghost', href: '#/login' }, me ? me.name.split(' ')[0] || 'Account' : 'Log in'),
      h('button', { class: 'icon-btn burger', 'aria-label': 'Menu', onclick: () => links.classList.toggle('open') }, svg(ICONS.menu)))));
  drawTheme();
};

app.append(nav, h('div', { class: 'wrap' }, main),
  h('footer', {}, h('div', { class: 'wrap row between' },
    h('span', {}, '© Aero Vision · a public team'),
    h('span', { class: 'row' },
      h('a', { href: `mailto:${LINKS.email}` }, 'Email'),
      h('a', { href: LINKS.instagram, target: '_blank', rel: 'noopener' }, 'Instagram'),
      h('a', { href: LINKS.telegram, target: '_blank', rel: 'noopener' }, 'Telegram')))));
drawNav();
onAuth(() => { drawNav(); void render(); });
start(main);
void refreshMe();
