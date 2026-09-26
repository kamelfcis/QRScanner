export const AK_COLOR_MODE_STORAGE_KEY = 'ak-color-mode:v1';
export const AK_COLOR_MODE_COOKIE = 'ak-color-mode';

export type AkColorMode = 'dark' | 'light';

export const AK_COLOR_MODE_DEFAULT: AkColorMode = 'dark';

export function parseAkColorMode(value: string | null | undefined): AkColorMode | null {
  return value === 'light' || value === 'dark' ? value : null;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Dark is the default. Cookie wins so the first paint matches the server. */
export function readAkColorMode(): AkColorMode {
  if (typeof document === 'undefined') return 'dark';
  const fromCookie = parseAkColorMode(readCookie(AK_COLOR_MODE_COOKIE));
  if (fromCookie) return fromCookie;
  try {
    const fromStorage = parseAkColorMode(localStorage.getItem(AK_COLOR_MODE_STORAGE_KEY));
    if (fromStorage) return fromStorage;
  } catch {
    // Storage can throw in private browsing.
  }
  return 'dark';
}

export function persistAkColorMode(mode: AkColorMode) {
  try {
    localStorage.setItem(AK_COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore quota and private-mode failures.
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AK_COLOR_MODE_COOKIE}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

/** Paint the mood on the document and every menu shell, including portalled UI. */
export function applyColorMode(mode: AkColorMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-color-mode', mode);
  document.body?.setAttribute('data-color-mode', mode);
  document.querySelectorAll<HTMLElement>('[data-menu-theme]').forEach((node) => {
    node.setAttribute('data-color-mode', mode);
  });
}

export function setAkColorMode(mode: AkColorMode) {
  persistAkColorMode(mode);
  applyColorMode(mode);
  window.dispatchEvent(new CustomEvent<AkColorMode>('ak-color-mode', { detail: mode }));
}

/** Blocking head script. Runs before paint so the stored mood does not flash. */
export const AK_COLOR_MODE_BOOT_SCRIPT = `(function(){try{var mode='dark';var m=document.cookie.match(/(?:^|; )ak-color-mode=([^;]*)/);if(m&&(m[1]==='light'||m[1]==='dark'))mode=m[1];else{var ls=localStorage.getItem('ak-color-mode:v1');if(ls==='light'||ls==='dark')mode=ls;}document.documentElement.setAttribute('data-color-mode',mode);var paint=function(){if(document.body)document.body.setAttribute('data-color-mode',mode);var nodes=document.querySelectorAll('[data-menu-theme]');for(var i=0;i<nodes.length;i++)nodes[i].setAttribute('data-color-mode',mode);};paint();document.addEventListener('DOMContentLoaded',paint);}catch(e){}})();`;

export const applyAkColorMode = applyColorMode;
export const AK_COLOR_MODE_INIT_SCRIPT = AK_COLOR_MODE_BOOT_SCRIPT;
