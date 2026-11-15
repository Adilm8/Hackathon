/** Speech interfaces (docs/SPEC.md 11.6). Screens depend on these only, so ElevenLabs is a new implementation. */
export type SpeakOptions = {
  onSentence(i: number): void;
  onEnd(): void;
  /** Word boundary inside sentence `i`, as a char offset of the spoken text. Not every voice reports it. */
  onWord?(i: number, charIndex: number): void;
  rate?: number;
  /** The parent's chosen device voice (Settings > Reading voice); missing or gone = the best English voice. */
  voiceURI?: string | null;
};

export interface Narrator {
  available(): boolean;
  speak(sentences: string[], opts: SpeakOptions): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

export interface Listener {
  /** True when this listener can run here (in 'device' mode: only when recognition stays on the device). */
  available(): Promise<boolean>;
  /** Resolves with recognised text; audio is never kept by us. `onInterim` shows the words as they come. */
  listenOnce(opts?: { onInterim?(text: string): void; maxMs?: number }): Promise<string>;
  /** Ends listening early; listenOnce resolves with what was heard so far. */
  stop(): void;
}
