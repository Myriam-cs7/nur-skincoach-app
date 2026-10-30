import { Platform } from 'react-native';

/**
 * Makes the web build installable on a phone's home screen: Nūr icon, Nūr name,
 * full screen, black launch. Expo serves the app as a single HTML page, so the
 * tags are added to <head> at runtime — browsers read them when the user taps
 * "Add to Home Screen".
 */
const TAGS: { tag: 'link' | 'meta'; attrs: Record<string, string> }[] = [
  { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.json' } },
  { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
  { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } },
  { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' } },
  { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Nūr Skincoach' } },
  { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' } },
  { tag: 'meta', attrs: { name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)' } },
  { tag: 'meta', attrs: { name: 'theme-color', content: '#FFFFFF', media: '(prefers-color-scheme: light)' } },
];

export function installPwaTags() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.title = 'Nūr Skincoach';

  for (const { tag, attrs } of TAGS) {
    const selector = tag === 'link'
      ? `link[rel="${attrs.rel}"]`
      : `meta[name="${attrs.name}"]${attrs.media ? `[media="${attrs.media}"]` : ''}`;
    if (document.head.querySelector(selector)) continue;
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
}
