'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/sync';

export function restoreUrl(origin: string, code: string): string {
  return `${origin}/restore#${code}`;
}

/** "Use on another device" (SPEC 4.15): a private link and QR code, shown once; a new one cancels the old. */
export function RestoreLink({ createCode = () => api.createRestoreCode() }: { createCode?: () => Promise<string | null> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<{ url: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    let live = true;
    QRCode.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: 'M' }).then((data) => live && setQr({ url, data }));
    return () => { live = false; };
  }, [url]);

  async function make() {
    setBusy(true); setError(false); setCopied(false);
    const code = await createCode();
    setBusy(false);
    if (!code) return setError(true);
    setUrl(restoreUrl(window.location.origin, code));
  }

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* user can select the text */ }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-soft">
        Open your plan on another phone or computer. The link works like a key: share it only with a grown-up you trust.
        Making a new link stops the old one.
      </p>
      {!url && (
        <Button variant="secondary" onClick={make} disabled={busy} className="justify-self-start">
          {busy ? 'Making link…' : 'Make a link and QR code'}
        </Button>
      )}
      {error && <p role="alert" className="text-sm text-danger">Could not make a link. Check your connection and try again.</p>}
      {url && (
        <div className="grid gap-3 justify-items-start">
          {qr && qr.url === url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr.data} width={220} height={220} alt="QR code that opens your family on another device" className="rounded-field bg-white p-2" />
          )}
          <input readOnly value={url} aria-label="Private link" onFocus={(e) => e.currentTarget.select()}
            className="w-full min-h-tap rounded-field border-2 border-line bg-surface px-3 text-sm text-ink" />
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
            <Button variant="ghost" onClick={make} disabled={busy}>Make a new link</Button>
          </div>
          <p className="text-xs text-ink-soft">This link is shown only now. Make a new one any time.</p>
        </div>
      )}
    </div>
  );
}
