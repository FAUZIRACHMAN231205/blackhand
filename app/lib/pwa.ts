// Install-to-home-screen rules. Pure functions, so they can be tested without a browser.

/** How long a dismissed install suggestion stays hidden. */
export const INSTALL_DISMISS_DAYS = 30;
export const INSTALL_DISMISS_KEY = 'bh-install-dismissed-at';

/**
 * Browsers built into social apps. They can't install a web app, and Google
 * sign-in is blocked inside them, so it's worth knowing when we're in one.
 */
export function isInAppBrowser(userAgent: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|BytedanceWebview|Twitter|Snapchat|WhatsApp/i.test(
    userAgent
  );
}

/** iPhone, iPod, or iPad — including iPadOS, which reports itself as a Mac. */
export function isIOS(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/**
 * How this browser can install the site:
 *   'prompt'   — fires `beforeinstallprompt` (Chrome, Edge, Samsung Internet…)
 *   'ios'      — Share → "Add to Home Screen", which we can only describe
 *   'none'     — can't (in-app browsers) or we don't know how
 */
export function installMethod(
  userAgent: string,
  maxTouchPoints: number,
  hasInstallPrompt: boolean
): 'prompt' | 'ios' | 'none' {
  if (isInAppBrowser(userAgent)) return 'none';
  if (hasInstallPrompt) return 'prompt';
  if (isIOS(userAgent, maxTouchPoints)) return 'ios';
  return 'none';
}

/** Whether a dismissal stored at `storedAt` (ms since epoch, as text) still applies. */
export function isDismissed(storedAt: string | null, now: number = Date.now()): boolean {
  const at = Number(storedAt);
  if (!storedAt || !Number.isFinite(at)) return false;
  return now - at < INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
}
