import { installMethod, isDismissed, isInAppBrowser, isIOS, INSTALL_DISMISS_DAYS } from '@/app/lib/pwa'

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadOS: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  instagramIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0)',
  tiktokAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 [FBAN/EMA;FBLC/id_ID;FBAV/400.0.0]',
}

describe('isInAppBrowser', () => {
  it('spots browsers built into social apps', () => {
    expect(isInAppBrowser(UA.instagramIOS)).toBe(true)
    expect(isInAppBrowser(UA.tiktokAndroid)).toBe(true)
    expect(isInAppBrowser(UA.facebookAndroid)).toBe(true)
  })

  it('leaves real browsers alone', () => {
    expect(isInAppBrowser(UA.androidChrome)).toBe(false)
    expect(isInAppBrowser(UA.iphoneSafari)).toBe(false)
  })
})

describe('isIOS', () => {
  it('recognises iPhones', () => {
    expect(isIOS(UA.iphoneSafari)).toBe(true)
  })

  it('recognises iPadOS, which claims to be a Mac but has touch', () => {
    expect(isIOS(UA.ipadOS, 5)).toBe(true)
    expect(isIOS(UA.macSafari, 0)).toBe(false)
  })
})

describe('installMethod', () => {
  it('uses the one-tap prompt where the browser offers it', () => {
    expect(installMethod(UA.androidChrome, 5, true)).toBe('prompt')
  })

  it('falls back to Share → Add to Home Screen steps on iOS', () => {
    expect(installMethod(UA.iphoneSafari, 5, false)).toBe('ios')
  })

  it('suggests nothing inside social-app browsers, even on iOS', () => {
    expect(installMethod(UA.instagramIOS, 5, false)).toBe('none')
    expect(installMethod(UA.tiktokAndroid, 5, true)).toBe('none')
  })

  it('suggests nothing when it has no way to install', () => {
    expect(installMethod(UA.androidChrome, 5, false)).toBe('none')
  })
})

describe('isDismissed', () => {
  const now = Date.parse('2026-10-01T00:00:00Z')
  const daysAgo = (d: number) => String(now - d * 24 * 60 * 60 * 1000)

  it('keeps the suggestion hidden for the dismissal period', () => {
    expect(isDismissed(daysAgo(1), now)).toBe(true)
    expect(isDismissed(daysAgo(INSTALL_DISMISS_DAYS - 1), now)).toBe(true)
  })

  it('shows it again afterwards', () => {
    expect(isDismissed(daysAgo(INSTALL_DISMISS_DAYS + 1), now)).toBe(false)
  })

  it('treats a missing or garbled value as not dismissed', () => {
    expect(isDismissed(null, now)).toBe(false)
    expect(isDismissed('soon', now)).toBe(false)
  })
})
