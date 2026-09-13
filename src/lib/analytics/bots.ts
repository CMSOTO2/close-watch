/**
 * Email security gateways and link previewers open every URL you send. Gmail's
 * image proxy, Outlook Safe Links, Mimecast, Proofpoint and Barracuda will all
 * hit a share link within seconds of delivery, usually before the human has
 * even seen the message.
 *
 * Reporting those as "Acme opened your proposal" is the single fastest way to
 * make this product untrustworthy, so we filter in two passes: user agent here,
 * and an engagement floor in record_engagement().
 */

const BOT_PATTERNS: Array<[RegExp, string]> = [
  [/googleimageproxy|google-safebrowsing|googlebot/i, 'google'],
  [/bingbot|msnbot|BingPreview/i, 'bing'],
  [/slackbot|slack-imgproxy/i, 'slack'],
  [
    /discordbot|telegrambot|whatsapp|twitterbot|facebookexternalhit|linkedinbot/i,
    'social-preview',
  ],
  // "outlook" and "office" on their own cannot be the signal. Outlook's mobile
  // apps put Outlook-iOS/745.0 or Outlook-Android/2.0 in the webview UA of a
  // real person reading their own mail, and a B2B recipient reads mail on a
  // phone more often than not. Flagging those tells the sender "your client
  // never opened it" while the client is reading it, which is the worst thing
  // this file can do.
  //
  // What Office actually sends names the product: "Microsoft Office Outlook",
  // "Microsoft Office Existence Discovery", "MSOffice 16". Match those.
  [
    /microsoft office|msoffice|microsoftpreview|skypeuripreview|microsoft-webdav-miniredir/i,
    'microsoft',
  ],
  [
    /mimecast|proofpoint|barracuda|symantec|forcepoint|cloudmark|ironport/i,
    'email-gateway',
  ],
  [/bitlybot|redditbot|embedly|quora link preview/i, 'link-preview'],
  [/headlesschrome|phantomjs|puppeteer|playwright|selenium/i, 'headless'],
  [
    /curl|wget|python-requests|axios|go-http-client|java\/|okhttp|libwww/i,
    'http-client',
  ],
  [/bot\b|crawler|spider|scraper|monitor|preview|fetcher/i, 'generic'],
]

/**
 * Not a bot: the proposal's owner opening their own link while signed in.
 *
 * Stored with is_bot set, and that is deliberate. Every count of client reads
 * already filters bots — the free plan's cap, the activity emails, the score,
 * the dashboard — so a preview is left out of all of them without any of them
 * learning a new rule. record_engagement does not look at is_bot, so the
 * preview's time and pages are still recorded, and the proposal page shows
 * them back to the owner as their own preview.
 */
export const OWNER_PREVIEW = 'owner-preview'

export function detectBot(userAgent: string | undefined) {
  if (!userAgent || userAgent.trim().length < 10) {
    return { isBot: true, reason: 'missing-ua' }
  }
  for (const [pattern, reason] of BOT_PATTERNS) {
    if (pattern.test(userAgent)) return { isBot: true, reason }
  }
  return { isBot: false, reason: null }
}

export type DeviceInfo = {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
}

export function parseUserAgent(ua: string | undefined): DeviceInfo {
  const s = ua ?? ''

  const deviceType: DeviceInfo['deviceType'] =
    /ipad|tablet|playbook|silk/i.test(s)
      ? 'tablet'
      : /mobi|android|iphone|ipod/i.test(s)
        ? 'mobile'
        : 'desktop'

  // Order matters twice over. iPhone and iPad UAs both contain "like Mac OS X",
  // so iOS must be tested before macOS or every mobile viewer reads as a Mac.
  // Android UAs contain "Linux", so Android must come before Linux.
  const os = /windows nt/i.test(s)
    ? 'Windows'
    : /iphone|ipad|ipod/i.test(s)
      ? 'iOS'
      : /mac os x/i.test(s)
        ? 'macOS'
        : /android/i.test(s)
          ? 'Android'
          : /linux/i.test(s)
            ? 'Linux'
            : 'Unknown'

  // Order matters: Edge and Chrome both claim Safari, Edge claims Chrome.
  const browser = /edg\//i.test(s)
    ? 'Edge'
    : /opr\/|opera/i.test(s)
      ? 'Opera'
      : /firefox\//i.test(s)
        ? 'Firefox'
        : /chrome\//i.test(s)
          ? 'Chrome'
          : /safari\//i.test(s)
            ? 'Safari'
            : 'Unknown'

  return { deviceType, os, browser }
}
