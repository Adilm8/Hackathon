/** Wall-clock milliseconds for expiry checks of paid access (not calendar logic, which uses clock.today()). */
export function nowMs(): number {
  return Date.now();
}
