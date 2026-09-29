// Appearance preference (pure; shared by the server and the toggle).
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export const isTheme = (v: unknown): v is Theme => typeof v === "string" && (THEMES as readonly string[]).includes(v);

/**
 * Runs in <head> before the page paints: resolves "system" against the device setting and keeps
 * following it, so there is no flash of the wrong theme. The server already sets class "dark"
 * for an explicit dark choice.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,m=window.matchMedia('(prefers-color-scheme: dark)');function a(){var t=d.getAttribute('data-theme');d.classList.toggle('dark',t==='dark'||(t==='system'&&m.matches));}a();m.addEventListener('change',a);new MutationObserver(a).observe(d,{attributes:true,attributeFilter:['data-theme']});}catch(e){}})();`;
