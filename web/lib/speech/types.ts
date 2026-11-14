/** Speech interfaces (docs/SPEC.md 11.6). Screens depend on these only, so ElevenLabs is a new implementation. */
export interface Narrator {
  available(): boolean;
  speak(sentences: string[], opts: { onSentence(i: number): void; onEnd(): void; rate?: number }): void;
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
