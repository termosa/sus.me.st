let primed = false;

function synth(): SpeechSynthesis | null {
  return typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
}

/** An on-device English voice, so announcements work offline. */
function voice(s: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const english = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  return english.find((v) => v.localService) ?? english[0];
}

/** Must run inside a tap: iOS only lets speech start from a user gesture. */
export function unlockSpeech(): void {
  const s = synth();
  if (!s || primed) return;
  primed = true;
  s.speak(new SpeechSynthesisUtterance(''));
}

/** Says `text`, cutting off whatever was still being said. */
export function speak(text: string): void {
  const s = synth();
  if (!s) return;
  s.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  const v = voice(s);
  if (v) utterance.voice = v;
  s.speak(utterance);
}

export function hush(): void {
  synth()?.cancel();
}
