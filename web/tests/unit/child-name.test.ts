import { describe, expect, it } from 'vitest';
import { childNameError } from '@/lib/childName';

describe('child name rules', () => {
  it('needs 2 to 20 characters, one word of letters', () => {
    expect(childNameError('')).toMatch(/enter/);
    expect(childNameError('A')).toMatch(/at least 2/);
    expect(childNameError('Al')).toBe('');
    expect(childNameError('A'.repeat(20))).toBe('');
    expect(childNameError('A'.repeat(21))).toMatch(/at most 20/);
    expect(childNameError('Mary Jane')).toMatch(/One word/);
    expect(childNameError("O'Neil")).toBe('');
  });
});
