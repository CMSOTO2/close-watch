/**
 * A deal value as it is typed: "12000.5" becomes "12,000.5". Anything that is
 * not a digit or the first point is dropped, leading zeros go, and decimals
 * stop at two. The upload form shows this and strips the commas on submit, so
 * the server still receives a plain number.
 */
export function formatDealValue(raw: string): string {
  const [whole = '', ...rest] = raw.replace(/[^\d.]/g, '').split('.')
  const grouped = whole
    .replace(/^0+(?=\d)/, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rest.length ? `${grouped}.${rest.join('').slice(0, 2)}` : grouped
}
