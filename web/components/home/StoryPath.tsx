'use client';
import Link from 'next/link';
import { Character } from '@/components/character';
import { Icon } from '@/components/icons';
import { PathArt, type PathArtName } from '@/components/icons/PathArt';
import type { ChildProfile } from '@/lib/engine/types';
import { currentNodeIndex, type NodeKind, type PathNode } from '@/lib/home/path';

const KIND_ART: Record<NodeKind, PathArtName> = { chapter: 'book', day: 'sun', checkin: 'smile', badge: 'trophy' };
/** Colour of an open node per kind; chapters keep the palette's primary. */
const KIND_BG: Record<NodeKind, string> = { chapter: 'var(--primary)', day: '#3aa0e0', checkin: '#ec5f9a', badge: '#9b6be8' };

/** Sideways shift of node k, so the trail winds like a path (px). */
const shift = (k: number) => Math.round(Math.sin(k * 0.95) * 64);

/**
 * The trail of evenings: one round node per chapter, then the big day, the check-in and the
 * badge. The current node is bigger, ringed, and carries the "Start" bubble; the child's
 * story friend stands beside it.
 */
export function StoryPath({ nodes, child, onLocked }: { nodes: PathNode[]; child: ChildProfile; onLocked?: (node: PathNode) => void }) {
  const cur = currentNodeIndex(nodes);
  return (
    <ol aria-label="Story path" className="relative mx-auto flex w-full max-w-sm flex-col items-center overflow-x-clip py-4">
      {nodes.map((n, k) => {
        const isCur = k === cur;
        const x = shift(k);
        const hasNext = k < nodes.length - 1;
        const nextX = hasNext ? shift(k + 1) : x;
        const friendLeft = x > 0;
        const doneSeg = n.state === 'done';
        return (
          <li key={n.key} className="relative flex w-full flex-col items-center">
            <div className="relative flex w-full justify-center" style={{ transform: `translateX(${x}px)` }}>
              <div className="relative z-10 flex flex-col items-center">
                {isCur && <Bubble node={n} />}
                <Node node={n} current={isCur} onLocked={onLocked} />
                <span className={`mt-1.5 text-xs font-bold ${n.state === 'locked' ? 'text-ink-soft' : 'text-ink'}`}>{n.title}</span>
                {n.early && onLocked && (
                  <button
                    type="button"
                    onClick={() => onLocked(n)}
                    className="mt-1 inline-flex min-h-tap items-center gap-1 whitespace-nowrap rounded-pill px-3 text-sm font-extrabold text-primary-text hover:bg-surface-2"
                  >
                    Read now <Icon name="arrow-right" size={16} />
                  </button>
                )}
                {n.demo && n.href && (
                  <Link
                    href={n.href}
                    className="mt-1 inline-flex min-h-tap items-center gap-1 whitespace-nowrap rounded-pill px-3 text-sm font-extrabold text-primary-text hover:bg-surface-2"
                  >
                    Open in demo <Icon name="arrow-right" size={16} />
                  </Link>
                )}
              </div>
              {isCur && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 min-[380px]:block"
                  style={friendLeft ? { right: 'calc(50% + 64px)' } : { left: 'calc(50% + 64px)' }}
                >
                  <Character character={child.character} mood={n.kind === 'day' ? 'brave' : 'happy'} size={96} decorative />
                </div>
              )}
            </div>
            {hasNext && (
              <svg aria-hidden width="200" height="36" viewBox="-100 0 200 36" className="pointer-events-none my-1 overflow-visible">
                <path
                  d={`M ${x} 0 C ${x} 18, ${nextX} 18, ${nextX} 36`}
                  fill="none"
                  stroke={doneSeg ? 'var(--success)' : 'var(--line)'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={doneSeg ? undefined : '7 7'}
                />
              </svg>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Bubble({ node }: { node: PathNode }) {
  const text = node.state === 'open' ? 'Start' : node.state === 'pay' ? 'Unlock' : node.hint;
  return (
    <span className="relative mb-2 whitespace-nowrap rounded-card border-2 border-line bg-surface px-3 py-1.5 text-sm font-extrabold text-primary-text shadow-step">
      {text}
      <span aria-hidden className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-surface" />
    </span>
  );
}

function Node({ node, current, onLocked }: { node: PathNode; current: boolean; onLocked?: (node: PathNode) => void }) {
  const size = current ? 'size-20' : 'size-16';
  const bg =
    node.state === 'done' ? 'var(--success)' : node.state === 'open' ? KIND_BG[node.kind] : node.state === 'pay' ? 'var(--accent)' : 'var(--surface-2)';
  const press =
    node.state === 'open' && node.kind === 'chapter'
      ? 'var(--primary-press)'
      : node.state === 'locked'
        ? 'var(--line)'
        : `color-mix(in srgb, ${bg} 70%, black)`;
  const look = { background: bg, boxShadow: `0 5px 0 ${press}` };
  const art: PathArtName = node.state === 'done' && node.kind === 'chapter' ? 'check' : node.state === 'pay' ? 'lock' : KIND_ART[node.kind];
  const inner = <PathArt name={art} size={current ? 50 : 40} muted={node.state === 'locked'} />;
  const label = `${node.title}: ${node.hint}`;
  const ring = current ? 'ring-4 ring-primary/25 ring-offset-4 ring-offset-bg' : '';
  const cls = `flex ${size} items-center justify-center rounded-pill ${ring} transition-transform active:translate-y-[3px]`;
  if (!node.href && onLocked && node.kind === 'chapter')
    return (
      <button type="button" aria-label={label} title={node.hint} onClick={() => onLocked(node)} className={cls} style={look}>
        {inner}
      </button>
    );
  if (!node.href)
    return (
      <span role="img" aria-label={label} title={node.hint} className={`${cls} cursor-not-allowed`} style={look}>
        {inner}
      </span>
    );
  return (
    <Link href={node.href} aria-label={label} aria-current={current ? 'step' : undefined} className={`${cls} hover:brightness-105`} style={look}>
      {inner}
    </Link>
  );
}
