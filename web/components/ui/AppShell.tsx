import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { LEAVE_READER_EVENT } from '@/lib/reader/gate';
import { ThemeToggle } from './ThemeToggle';

/**
 * Frame of every screen (docs/SPEC.md 4.2): header with the child's name and a settings
 * button, the "Sample data" badge in the sample workspace, the save indicator slot,
 * and a footer with Terms, Privacy and "Not therapy or medical advice".
 * It is presentational: the screens pass data from the stores.
 */
export function AppShell({
  children,
  childName,
  isSample = false,
  saveIndicator,
  room = 'child',
  bottomBar,
  wide = false,
  headerExtra,
  onExitSample,
  fit = false,
  homeHref = '/?landing=1',
  childMode = false,
  workspaceSwitch,
}: {
  children: ReactNode;
  childName?: string;
  isSample?: boolean;
  saveIndicator?: ReactNode;
  /** 'parent' = panel, paywall, settings. Same palette as the rest of the app; kept as a marker. */
  room?: 'child' | 'parent';
  /** Demo bar of the sample workspace. */
  bottomBar?: ReactNode;
  /** Wider main column (reader + panel side by side on desktop). */
  wide?: boolean;
  /** Extra badges next to "Sample data" (e.g. "Demo access"). */
  headerExtra?: ReactNode;
  /** Makes the "Sample data" badge a button that leaves the sample (4.3). */
  onExitSample?: () => void;
  /** One screen, no page scroll (the reader): the content gets exactly the height left between the header and the bottom bar; the footer is left out. */
  fit?: boolean;
  /** Where the logo leads: /home for a family with data, the landing page otherwise. */
  homeHref?: string;
  /** The child's own screen (the reader): no settings button, and the logo asks the reader's parent gate before leaving, so a child can't wander off. */
  childMode?: boolean;
  /** "My app | Demo" switch; replaces the "Sample data" badge when given. */
  workspaceSwitch?: ReactNode;
}) {
  const logoClass = 'inline-flex min-h-tap items-center whitespace-nowrap font-display text-base font-extrabold sm:text-lg';
  return (
    <div data-room={room} className={`flex flex-col bg-bg text-ink ${fit ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <header data-app-chrome className="no-print sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center gap-3 px-4 ${wide ? 'max-w-6xl' : 'max-w-5xl'}`}>
          {childMode ? (
            <button
              type="button"
              className={logoClass}
              onClick={() => window.dispatchEvent(new CustomEvent(LEAVE_READER_EVENT, { detail: homeHref }))}
            >
              Big Day Stories
            </button>
          ) : (
            <Link href={homeHref} className={logoClass}>Big Day Stories</Link>
          )}
          {workspaceSwitch}
          {!workspaceSwitch && isSample &&
            (onExitSample ? (
              <button
                type="button"
                onClick={onExitSample}
                aria-label="Sample data. Exit the sample"
                className="inline-flex min-h-tap items-center"
              >
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">
                  Sample data <Icon name="x" size={14} strokeWidth={2.5} />
                </span>
              </button>
            ) : (
              <span className="whitespace-nowrap rounded-pill bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">Sample data</span>
            ))}
          {headerExtra}
          <div className="ml-auto flex items-center gap-1 min-[400px]:gap-2">
            {saveIndicator}
            {childName && <span className="hidden max-w-[10rem] truncate text-sm font-bold text-ink-soft min-[400px]:inline">{childName}</span>}
            <ThemeToggle quiet={childMode} />
            {!childMode && <Link
              href="/settings"
              aria-label="Settings"
              className="inline-flex size-tap items-center justify-center rounded-pill hover:bg-surface-2"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </Link>}
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 ${fit ? 'flex min-h-0 flex-col py-3' : 'py-6'} ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>
      {!fit && <footer className="no-print border-t border-line px-4 py-4 text-xs text-ink-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2">
          <span>Not therapy or medical advice.</span>
          <Link href="/terms" className="inline-flex min-h-tap items-center underline">Terms</Link>
          <Link href="/privacy" className="inline-flex min-h-tap items-center underline">Privacy</Link>
        </div>
      </footer>}
      {bottomBar}
    </div>
  );
}
