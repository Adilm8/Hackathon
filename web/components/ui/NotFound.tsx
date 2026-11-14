import { ButtonLink } from './Button';
import { EmptyState } from './EmptyState';

/** Unknown event id, e.g. a calendar link opened in another browser (docs/SPEC.md 4.2). */
export function PlanNotFound() {
  return (
    <EmptyState
      title="We can't find this plan in this browser"
      text="Plans live in the browser where they were made. Open it there, or start a new one here."
      action={<ButtonLink href="/?landing=1">Go to the start page</ButtonLink>}
    />
  );
}
