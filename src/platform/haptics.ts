/** Vibrates on Android Chrome; a no-op elsewhere (iOS has no web vibration). */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw before the first user interaction.
  }
}
