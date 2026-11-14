/** Speech interfaces (docs/SPEC.md 11.6). Screens depend on these only, so ElevenLabs is a new implementation. */
export type SpeakOptions = {
  onSentence(i: number): void;
  onEnd(): void;
  /** Word boundary inside sentence `i`, as a char offset of the spoken text. Not every voice reports it. */
  onWord?(i: number, charIndex: number): void;
  rate?: number;
};

export interface Narrator {
  available(): boolean;
  speak(sentences: string[], opts: SpeakOptions): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

export interface Listener {
  /** True only when recognition can run on the device. */
  available(): Promise<boolean>;
  /** Resolves with recognised text; audio is never kept. */
  listenOnce(): Promise<string>;
}
