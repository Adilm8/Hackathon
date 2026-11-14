/** Three simple faces for the check-in (docs/SPEC.md 4.13): calm, a bit hard, hard. Drawn, not emoji. */
export function Face({ rating, size = 48 }: { rating: 1 | 2 | 3; size?: number }) {
  const mouth = rating === 1 ? 'M8 14.5c1.2 1.6 2.5 2.3 4 2.3s2.8-.7 4-2.3' : rating === 2 ? 'M8.5 15.5h7' : 'M8 16.8c1.2-1.6 2.5-2.3 4-2.3s2.8.7 4 2.3';
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
      {/* Sad, not angry: the inner ends of the brows go up. */}
      {rating === 3 && <path d="M7.2 7.3l2.2-1.2M16.8 7.3l-2.2-1.2" />}
      <path d={mouth} />
    </svg>
  );
}

export const RATING_LABEL: Record<1 | 2 | 3, string> = { 1: 'Calm', 2: 'A bit hard', 3: 'Hard' };
