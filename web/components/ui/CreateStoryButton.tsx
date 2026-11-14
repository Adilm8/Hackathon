'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import type { Workspace } from '@/lib/engine/types';
import { ownStoryHref, startOwnStory } from '@/lib/store/sample';
import { Button, ButtonLink, type ButtonSize, type ButtonVariant } from './Button';

/**
 * Entry point to a new AI story for the parent's own child (onboarding). In the sample it
 * switches to the parent's own space first; saved children are offered on the first step.
 */
export function CreateStoryButton({
  workspace, label = 'Create your own story', variant = 'primary', size = 'm', className = '',
}: { workspace: Workspace; label?: string; variant?: ButtonVariant; size?: ButtonSize; className?: string }) {
  const content = (
    <>
      <Icon name="sparkles" size={20} /> {label}
    </>
  );
  if (workspace === 'sample')
    return (
      <Button variant={variant} size={size} className={className} onClick={startOwnStory}>
        {content}
      </Button>
    );
  return (
    <ButtonLink href={ownStoryHref()} variant={variant} size={size} className={className}>
      {content}
    </ButtonLink>
  );
}

/** Compact header version: icon on phones, "New story" from 640 px; hidden on onboarding itself. */
export function HeaderCreateStory({ workspace }: { workspace: Workspace }) {
  const path = usePathname();
  if (path?.startsWith('/start')) return null;
  const cls =
    'inline-flex min-h-tap items-center gap-1.5 whitespace-nowrap rounded-pill bg-primary px-3 text-sm font-extrabold text-primary-ink shadow-step-primary hover:brightness-105';
  const inner = (
    <>
      <Icon name="sparkles" size={18} />
      <span className="hidden sm:inline">{workspace === 'sample' ? 'Create your own' : 'New story'}</span>
    </>
  );
  const aria = workspace === 'sample' ? 'Create your own story (leaves the sample)' : 'Create a new story';
  if (workspace === 'sample')
    return (
      <button type="button" onClick={startOwnStory} aria-label={aria} className={cls}>
        {inner}
      </button>
    );
  return (
    <Link href={ownStoryHref()} aria-label={aria} className={cls}>
      {inner}
    </Link>
  );
}
