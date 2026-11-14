'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FACES_WARNING, MAX_CAPTION, MAX_PHOTOS, clampCaption, resizePhoto } from '@/lib/photos';

export interface DraftPhoto { id: string; blob: Blob; caption: string }

/** Up to 3 photos of the real place, resized in the browser; nothing is uploaded (SPEC 11.5). Holds drafts until the event exists. */
export function PhotoPicker({ value, onChange }: { value: DraftPhoto[]; onChange: (v: DraftPhoto[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of value) next[p.id] = URL.createObjectURL(p.blob);
    setUrls(next); // eslint-disable-line react-hooks/set-state-in-effect
    return () => Object.values(next).forEach((u) => URL.revokeObjectURL(u));
  }, [value]);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(false);
    const added: DraftPhoto[] = [];
    for (const f of Array.from(files).slice(0, MAX_PHOTOS - value.length)) {
      try {
        added.push({ id: crypto.randomUUID(), blob: await resizePhoto(f), caption: '' });
      } catch {
        setError(true);
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    if (added.length) onChange([...value, ...added]);
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-bold">Photos of the place (optional)</p>
        <p className="text-xs text-ink-soft">Up to {MAX_PHOTOS}, for example the waiting room. {FACES_WARNING}. They stay on this device.</p>
      </div>
      {value.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-2">
          {urls[p.id] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[p.id]} alt="" className="size-20 shrink-0 rounded-field object-cover" />
          )}
          <div className="grid flex-1 gap-1">
            <label className="sr-only" htmlFor={`cap-${p.id}`}>Caption</label>
            <input id={`cap-${p.id}`} maxLength={MAX_CAPTION} value={p.caption} placeholder="Caption, e.g. The waiting room"
              onChange={(e) => onChange(value.map((x) => (x.id === p.id ? { ...x, caption: e.target.value.slice(0, MAX_CAPTION) } : x)))}
              onBlur={() => onChange(value.map((x) => (x.id === p.id ? { ...x, caption: clampCaption(x.caption) } : x)))}
              className="min-h-tap rounded-field border-2 border-line bg-surface px-3 text-sm text-ink" />
            <button type="button" className="justify-self-start text-sm font-bold text-primary-text min-h-tap"
              onClick={() => onChange(value.filter((x) => x.id !== p.id))}>Remove</button>
          </div>
        </div>
      ))}
      {value.length < MAX_PHOTOS && (
        <>
          <Button variant="secondary" className="justify-self-start" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Adding…' : 'Add a photo'}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1}
            aria-label="Choose photos of the place" onChange={(e) => pick(e.target.files)} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-danger">That photo could not be added. Try another one.</p>}
    </div>
  );
}
