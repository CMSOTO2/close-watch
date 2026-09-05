import { describe, expect, it } from 'vitest'
import { detectBot, parseUserAgent } from './bots'

// Real, current user agents. If any of these are ever flagged as a bot the
// product reports "your client never opened it" while they are reading it —
// the worst failure this module can have, so they are the first thing tested.
const HUMANS = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  // In-app browsers. A proposal is read wherever the mail was read, and on a
  // phone that is almost never a standalone browser: the reader taps the link
  // inside Outlook, Gmail or LinkedIn and gets that app's own webview. These
  // are people, and the app name in the string is the trap.
  outlookIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Outlook-iOS/745.0.prod.iphone (3.51.0)',
  outlookAndroid:
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Outlook-Android/2.0',
  linkedinIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]',
  gmailIosWebview:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  firefoxIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15',
  safari18Mac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
}

describe('detectBot', () => {
  it('never flags a real browser', () => {
    for (const [name, ua] of Object.entries(HUMANS)) {
      expect(detectBot(ua), name).toEqual({ isBot: false, reason: null })
    }
  })

  it('treats a missing or too-short user agent as a bot', () => {
    expect(detectBot(undefined)).toEqual({ isBot: true, reason: 'missing-ua' })
    expect(detectBot('')).toEqual({ isBot: true, reason: 'missing-ua' })
    expect(detectBot('short')).toEqual({ isBot: true, reason: 'missing-ua' })
  })

  it.each([
    [
      'GoogleImageProxy fetching an inlined image',
      'Mozilla/5.0 (via ggpht.com GoogleImageProxy)',
      'google',
    ],
    [
      'an email security gateway',
      'Mozilla/5.0 Mimecast Link Protection',
      'email-gateway',
    ],
    [
      'Proofpoint URL defense',
      'Mozilla/5.0 proofpoint-urldefense',
      'email-gateway',
    ],
    [
      'Outlook Safe Links',
      'Mozilla/5.0 (Windows NT) Microsoft Office Outlook',
      'microsoft',
    ],
    // The other half of the Outlook distinction: these name the Office product
    // and are probes, where Outlook-iOS in HUMANS above is a person. Both
    // directions are pinned because one regex decides them.
    [
      'the Office link probe',
      'Microsoft Office Existence Discovery',
      'microsoft',
    ],
    ['an Office protocol handler', 'MSOffice 16', 'microsoft'],
    ['a Skype unfurl', 'SkypeUriPreview Preview/0.5', 'microsoft'],
    [
      'a Slack unfurl',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'slack',
    ],
    [
      'a social preview crawler',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'social-preview',
    ],
    [
      'a headless automation browser',
      'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/124.0.0.0',
      'headless',
    ],
    ['a scripted HTTP client', 'python-requests/2.31.0', 'http-client'],
    [
      'a generic crawler',
      'Mozilla/5.0 (compatible; SomeCrawler/2.0; +http://example.com/bot)',
      'generic',
    ],
  ])('flags %s as %s', (_desc, ua, reason) => {
    expect(detectBot(ua)).toEqual({ isBot: true, reason })
  })
})

describe('parseUserAgent', () => {
  it('reads browser through the shared-token noise', () => {
    // Every one of these strings contains "Safari"; Edge and Chrome both claim
    // it, and Edge also claims "Chrome". The ordering in the parser is the only
    // thing that gets these right.
    expect(parseUserAgent(HUMANS.chromeMac).browser).toBe('Chrome')
    expect(parseUserAgent(HUMANS.edgeWindows).browser).toBe('Edge')
    expect(parseUserAgent(HUMANS.safariIphone).browser).toBe('Safari')
    expect(parseUserAgent(HUMANS.firefoxWindows).browser).toBe('Firefox')
  })

  it('reads the operating system', () => {
    expect(parseUserAgent(HUMANS.chromeMac).os).toBe('macOS')
    expect(parseUserAgent(HUMANS.firefoxWindows).os).toBe('Windows')
    expect(parseUserAgent(HUMANS.safariIphone).os).toBe('iOS')
    // An Android UA also contains "Linux"; Android must win.
    expect(parseUserAgent(HUMANS.chromeAndroid).os).toBe('Android')
  })

  it('reads the device type', () => {
    expect(parseUserAgent(HUMANS.chromeMac).deviceType).toBe('desktop')
    expect(parseUserAgent(HUMANS.safariIphone).deviceType).toBe('mobile')
    expect(parseUserAgent(HUMANS.chromeAndroid).deviceType).toBe('mobile')
    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      ).deviceType,
    ).toBe('tablet')
  })

  it('never throws on a missing user agent', () => {
    expect(parseUserAgent(undefined)).toEqual({
      deviceType: 'desktop',
      os: 'Unknown',
      browser: 'Unknown',
    })
  })
})
