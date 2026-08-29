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
  [/discordbot|telegrambot|whatsapp|twitterbot|facebookexternalhit|linkedinbot/i, 'social-preview'],
  [/outlook|microsoftpreview|skypeuripreview|office/i, 'microsoft'],
  [/mimecast|proofpoint|barracuda|symantec|forcepoint|cloudmark|ironport/i, 'email-gateway'],
  [/bitlybot|redditbot|embedly|quora link preview/i, 'link-preview'],
  [/headlesschrome|phantomjs|puppeteer|playwright|selenium/i, 'headless'],
  [/curl|wget|python-requests|axios|go-http-client|java\/|okhttp|libwww/i, 'http-client'],
  [/bot\b|crawler|spider|scraper|monitor|preview|fetcher/i, 'generic'],
]

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

  const deviceType: DeviceInfo['deviceType'] = /ipad|tablet|playbook|silk/i.test(s)
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
