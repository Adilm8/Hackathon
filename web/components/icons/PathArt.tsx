/**
 * Small multi-colour pictures for the story path nodes on /home (book, sun, smiley, trophy,
 * lock, check). Drawn in code, 48×48, with a soft dark outline like the story friend art.
 * Colours are fixed on purpose: the node behind them has its own colour in every palette.
 */
export type PathArtName = 'book' | 'sun' | 'smile' | 'trophy' | 'lock' | 'check';

const OUT = '#3b2f4f';

export function PathArt({ name, size = 32, muted = false }: { name: PathArtName; size?: number; muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={muted ? { filter: 'grayscale(0.55)', opacity: 0.7 } : undefined}
    >
      {ART[name]}
    </svg>
  );
}

const ART: Record<PathArtName, React.ReactNode> = {
  book: (
    <g strokeWidth="2">
      <path d="M4 14v25c7-1.6 14-1 20 2.5 6-3.5 13-4.1 20-2.5V14" fill="#ff7a59" stroke={OUT} />
      <path d="M24 13c-5-3-12-3.4-17-2v25c5-1 12-.6 17 2.6Z" fill="#ffffff" stroke={OUT} />
      <path d="M24 13c5-3 12-3.4 17-2v25c-5-1-12-.6-17 2.6Z" fill="#fff4dc" stroke={OUT} />
      <path d="M11 18h8M11 23h8M11 28h6M29 23h8M29 28h6" stroke="#b9b2cc" strokeWidth="1.8" />
      <path d="M31 10.4v10l2.6-2 2.6 2V10.2" fill="#ffc83d" stroke={OUT} strokeWidth="1.6" />
    </g>
  ),
  sun: (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="24" y1="5" x2="24" y2="10" stroke="#ff9f1c" strokeWidth="4" transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="11" fill="#ffd23f" stroke="#e58a00" strokeWidth="2" />
      <circle cx="20" cy="22.5" r="1.4" fill={OUT} />
      <circle cx="28" cy="22.5" r="1.4" fill={OUT} />
      <path d="M20.5 27c2 2 5 2 7 0" fill="none" stroke={OUT} strokeWidth="1.8" />
      <circle cx="17.5" cy="26.5" r="1.8" fill="#ff8fa3" opacity="0.8" />
      <circle cx="30.5" cy="26.5" r="1.8" fill="#ff8fa3" opacity="0.8" />
    </g>
  ),
  smile: (
    <g>
      <circle cx="24" cy="24" r="17" fill="#ffd23f" stroke={OUT} strokeWidth="2" />
      <path d="M13 17a12 12 0 0 1 9-6" fill="none" stroke="#fff3b0" strokeWidth="2.5" />
      <ellipse cx="18" cy="21" rx="2" ry="2.8" fill={OUT} />
      <ellipse cx="30" cy="21" rx="2" ry="2.8" fill={OUT} />
      <path d="M15.5 27.5c4.5 7.5 12.5 7.5 17 0Z" fill="#a8324a" stroke={OUT} strokeWidth="2" />
      <path d="M20 32.4c2.6-2 5.4-2 8 0-2.6 1.4-5.4 1.4-8 0Z" fill="#ff8fa3" />
      <circle cx="12.5" cy="27" r="2.6" fill="#ff8fa3" opacity="0.75" />
      <circle cx="35.5" cy="27" r="2.6" fill="#ff8fa3" opacity="0.75" />
    </g>
  ),
  trophy: (
    <g strokeWidth="2">
      <path d="M15 13H9.5c0 7 3 10.5 7 10.5M33 13h5.5c0 7-3 10.5-7 10.5" fill="none" stroke={OUT} strokeWidth="2.6" />
      <path d="M14 9h20v11c0 6.5-4.5 11-10 11s-10-4.5-10-11Z" fill="#ffc83d" stroke={OUT} />
      <path d="M28 9h6v11c0 6.5-4.5 11-10 11 4-2 4-6 4-11Z" fill="#f2a516" />
      <path d="M18.5 12.5v7" stroke="#fff6c9" strokeWidth="2.4" />
      <path d="M21 31h6v5h-6Z" fill="#e09a00" stroke={OUT} />
      <path d="M15 36h18v5.5H15Z" fill="#9b6be8" stroke={OUT} />
      <path d="m24 14.5 1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4Z" fill="#fff6c9" />
    </g>
  ),
  lock: (
    <g>
      <path d="M16 22v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#8b8fa8" strokeWidth="4.5" />
      <path d="M16 22v-5a8 8 0 0 1 16 0v5" fill="none" stroke={OUT} strokeWidth="1" opacity="0.4" />
      <rect x="10.5" y="21" width="27" height="20" rx="5" fill="#8e7cf5" stroke={OUT} strokeWidth="2" />
      <path d="M13.5 25h21" stroke="#b9adff" strokeWidth="2" />
      <circle cx="24" cy="30" r="3" fill="#ffd23f" />
      <path d="M24 31v5" stroke="#ffd23f" strokeWidth="2.6" />
    </g>
  ),
  check: (
    <g>
      <path d="m12 25 8 8 16-17" fill="none" stroke="#1f6b4a" strokeWidth="9" opacity="0.35" transform="translate(0 2)" />
      <path d="m12 25 8 8 16-17" fill="none" stroke="#ffffff" strokeWidth="7" />
    </g>
  ),
};
