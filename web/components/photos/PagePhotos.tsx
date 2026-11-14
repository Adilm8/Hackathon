'use client';
import { useEffect, useState } from 'react';
import type { PlacePhoto } from '@/lib/engine/types';
import { getPhoto } from '@/lib/photos';

/** The family's photos of the real place with their captions, on the first page of the chapter about "what happens" (SPEC 4.7). */
export function PagePhotos({ photos }: { photos: PlacePhoto[] }) {
  const [items, setItems] = useState<{ key: string; url: string; caption: string }[]>([]);
  const sig = photos.map((p) => `${p.key}|${p.caption}`).join('\n');
  useEffect(() => {
    let live = true;
    const made: string[] = [];
    Promise.all(photos.map(async (p) => {
      const b = await getPhoto(p.key).catch(() => undefined);
      if (!b) return null;
      const url = URL.createObjectURL(b);
      made.push(url);
      return { key: p.key, url, caption: p.caption };
    })).then((r) => live && setItems(r.filter((x): x is NonNullable<typeof x> => !!x)));
    return () => { live = false; made.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((i) => (
        <figure key={i.key} className="m-0 max-w-[48%] grow basis-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={i.url} alt={i.caption || 'Photo of the place'} className="w-full rounded-card border border-line object-cover" />
          {i.caption && <figcaption className="mt-1 text-sm font-bold text-ink-soft">{i.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
