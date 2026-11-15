'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cloudNarrator, premiumVoices, type StoryVoice } from '@/lib/speech/cloud';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { narrator, readingVoices, speakOnce, subscribeVoices } from '@/lib/speech/narrator';
import { RATES, type RateName } from '@/lib/speech/voices';
import { usePrefs } from '@/lib/store/prefs';
import { familyVoiceId, ParentVoiceClone, type FamilyVoice } from './ParentVoiceClone';
import { Segmented } from './Segmented';
import { GoldNote } from '@/components/paywall/GoldNote';
import { useGoldExtra } from '@/lib/store/hooks';

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
  const { voiceURI, speechRate, readOn, storyVoice, characterVoice, setVoice } = usePrefs();
  const [characters, setCharacters] = useState<StoryVoice[]>([]);
  useEffect(() => {
    let live = true;
    void premiumVoices().then((v) => live && setCharacters(v));
    return () => { live = false; };
  }, []);
  const [family, setFamily] = useState<FamilyVoice[]>([]);
  const goldVoice = useGoldExtra('voice.premium');
  const goldClone = useGoldExtra('voice.clone');
  const premium = characters.length > 0;
  // Gold voices (Moon Storyteller) are offered only with Gold (SPEC 10.1).
  const offered = characters.filter((c) => goldVoice || !c.gold);
  const lockedGold = characters.some((c) => c.gold) && !goldVoice;
  // The family's cloned voices (demo) join the characters once saved.
  const all = [...offered, ...(goldClone ? family.map((v) => ({ id: familyVoiceId(v), label: v.name })) : [])];
  const character = all.find((c) => c.id === characterVoice)?.id ?? all[0]?.id ?? '';
  const hearCharacter = (id: string) =>
    cloudNarrator.speak([SAMPLE], { voiceURI: id, rate: RATES[speechRate], onSentence: () => {}, onEnd: () => {} });
  const device = !premium || storyVoice === 'device';
  if (!has) return <p className="text-sm text-ink-soft">This browser cannot read aloud. You can still read the story yourself or record your voice.</p>;
  const current = voices.find((v) => v.voiceURI === voiceURI)?.voiceURI ?? '';
  return (
    <div className="grid gap-4">
      {premium && (
        <Segmented<'premium' | 'device'>
          label="Story voice" value={storyVoice}
          options={[
            { value: 'premium', label: 'Storyteller', hint: 'A warm storyteller voice. The page text goes to our voice service; the audio is kept so each page is made once.' },
            { value: 'device', label: 'This device', hint: 'The voice built into this device. Works offline.' },
          ]}
          onChange={(v) => setVoice({ storyVoice: v })}
        />
      )}
      {premium && storyVoice === 'premium' && all.length > 1 && (
        <div className="grid gap-2">
          <Segmented<string>
            label="Character voice" value={character}
            options={all.map((c) => ({ value: c.id, label: c.label }))}
            onChange={(id) => { setVoice({ characterVoice: id }); hearCharacter(id); }}
          />
          <Button variant="secondary" className="justify-self-start" onClick={() => hearCharacter(character)}>
            <Icon name="volume-2" size={18} /> Hear it
          </Button>
        </div>
      )}
      {premium && storyVoice === 'premium' && (!goldClone || lockedGold) && (
        <GoldNote what={lockedGold ? 'Moon Storyteller voice and the story read in your own voice.' : 'The story read in your own voice.'} />
      )}
      {premium && storyVoice === 'premium' && goldClone && (
        <ParentVoiceClone
          onChange={(voices, added) => {
            setFamily(voices);
            const cur = usePrefs.getState().characterVoice;
            if (added) setVoice({ characterVoice: familyVoiceId(added) });
            // The first saved voice was called "parent" before there could be several (PR #32).
            else if (cur === 'parent' && voices[0]) setVoice({ characterVoice: familyVoiceId(voices[0]) });
            else if (cur?.startsWith('parent') && !voices.some((v) => familyVoiceId(v) === cur)) setVoice({ characterVoice: null });
          }}
        />
      )}
      {device && voices.length > 0 && (
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
        hint="When Listen reaches the end of a page, turn the page and keep reading until the chapter ends. Answers to questions are read aloud too. At night the voice reads a little slower."
        checked={readOn} onChange={(v) => setVoice({ readOn: v })}
      />
    </div>
  );
}
