'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { BACKUP_ERRORS, backupFileName, createBackup, parseBackup } from '@/lib/backup';
import type { FamilyDoc } from '@/lib/engine/types';

/** Export / import backup (FR-B1). The JSON holds no photos and no recordings. */
export function ExportImport({ getDoc, onImport }: { getDoc: () => FamilyDoc; onImport: (doc: FamilyDoc) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<FamilyDoc | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function download() {
    const now = new Date();
    const url = URL.createObjectURL(new Blob([createBackup(getDoc(), now)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(now);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage({ kind: 'ok', text: 'Backup saved. It does not include photos or voice recordings.' });
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    const r = parseBackup(await file.text(), Date.now());
    if (fileRef.current) fileRef.current.value = '';
    if (!r.ok) return setMessage({ kind: 'error', text: BACKUP_ERRORS[r.reason] });
    setMessage(null);
    setPending(r.doc);
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-soft">Save your plan as a file, or bring it back from one. Photos and voice recordings stay on this device and are not in the file.</p>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" onClick={download}>Export backup</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import backup</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1}
          aria-label="Choose a backup file" onChange={(e) => choose(e.target.files?.[0])} />
      </div>
      {pending && (
        <div role="alertdialog" aria-label="Replace your plan?" className="grid gap-3 rounded-card border-2 border-accent bg-surface-2 p-4">
          <p className="font-bold text-ink">
            Replace your current plan with this backup{pending.child ? ` (${pending.child.name}, ${pending.events.length} big day${pending.events.length === 1 ? '' : 's'})` : ''}?
          </p>
          <p className="text-sm text-ink-soft">What is on this device now will be replaced.</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="danger" onClick={() => { onImport(pending); setPending(null); setMessage({ kind: 'ok', text: 'Backup imported.' }); }}>Replace</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
      {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-danger' : 'text-ink-soft'}`}>{message.text}</p>}
    </div>
  );
}
