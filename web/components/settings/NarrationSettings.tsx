'use client';
import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { narrator, readingVoices, speakOnce, subscribeVoices } from '@/lib/speech/narrator';
import { RATES, type RateName } from '@/lib/speech/voices';
import { usePrefs } from '@/lib/store/prefs';
import { Segmented } from './Segmented';

const noop = () => () => {};
const none: SpeechSynthesisVoice[] = [];
let cache: { key: string; list: SpeechSynthesisVoice[] } = { key: '', list: none };
// useSyncExternalStore needs the same array while nothing changed.
function snapshot(): SpeechSynthesisVoice[] {
  const list = readingVoices();
  const key = list.map((v) => v.voiceURI).join('|');
  if (key !== cache.key) cache = { key, list };
  return cache.list;
}

const SAMPLE = 'Once upon a time, a brave little friend got ready for a big day.';

/** Settings > Reading: the device voice, its speed and "Read on" (SPEC 11.6). Free, works offline. */
export function NarrationSettings() {
  const has = useSyncExternalStore(noop, () => narrator.available(), () => false);
  const voices = useSyncExternalStore(subscribeVoices, snapshot, () => none);
  const { voiceURI, speechRate, readOn, setVoice } = usePrefs();
  if (!has) return <p className="text-sm text-ink-soft">This browser cannot read aloud. You can still read the story yourself or record your voice.</p>;
  const current = voices.find((v) => v.voiceURI === voiceURI)?.voiceURI ?? '';
  return (
    <div className="grid gap-4">
      {voices.length > 0 && (
        <div className="grid gap-2">
          <label htmlFor="reading-voice" className="text-sm font-bold">Reading voice</label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="reading-voice" value={current}
              onChange={(e) => {
                const uri = e.target.value || null;
                setVoice({ voiceURI: uri });
                speakOnce(SAMPLE, { voiceURI: uri, rate: RATES[speechRate] });
              }}
              className="min-h-tap min-w-0 max-w-full flex-1 rounded-field border-2 border-line bg-surface px-3 font-bold"
            >
              <option value="">Best voice on this device</option>
              {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? '' : ' (online)'}</option>)}
            </select>
            <Button variant="secondary" onClick={() => speakOnce(SAMPLE, { voiceURI, rate: RATES[speechRate] })}>
              <Icon name="volume-2" size={18} /> Hear it
            </Button>
          </div>
          <p className="text-xs text-ink-soft">On iPhone, nicer voices can be added in Settings › Accessibility › Spoken Content › Voices › English.</p>
        </div>
      )}
      <Segmented<RateName>
        label="Reading speed" value={speechRate}
        options={[{ value: 'slow', label: 'Slower' }, { value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Faster' }]}
        onChange={(r) => { setVoice({ speechRate: r }); speakOnce(SAMPLE, { voiceURI, rate: RATES[r] }); }}
      />
      <Toggle
        id="read-on" label="Read on"
        hint="When Listen reaches the end of a page, turn the page and keep reading until the chapter ends."
        checked={readOn} onChange={(v) => setVoice({ readOn: v })}
      />
    </div>
  );
}
