'use client';
import { Component, type ReactNode } from 'react';

/**
 * Keeps one broken block from taking the whole screen down: the rest of the page stays usable and
 * the block shows `fallback` instead. Used around browser features that differ between builds
 * (speech recognition in Settings and the reader).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ui] a block failed and was replaced by its fallback', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
