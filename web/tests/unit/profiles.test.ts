import { describe, expect, it } from 'vitest';
import type { ChildProfile } from '@/lib/engine/types';
import { MAX_PROFILES, firstNameOnly, parseProfiles, toSaved, upsertProfile } from '@/lib/store/profiles';

const child = (id: string, name: string, age: ChildProfile['age'] = 5): ChildProfile => ({
  id, name, age,
  character: { animal: 'bunny', color: 'blue', accessory: 'cap' },
  values: { tone: 'secular', bodyWords: 'anatomical', family: [] },
  styleMode: 'story', techniques: [], badges: [], createdOn: '2026-11-14',
});

describe('saved child profiles', () => {
  it('keeps the first name only, never a surname', () => {
    expect(firstNameOnly('  Maya Smith ')).toBe('Maya');
    expect(toSaved(child('a', 'Maya Smith'), 1).name).toBe('Maya');
  });

  it('updates the same child instead of adding a copy and keeps newest first', () => {
    let list = upsertProfile([], toSaved(child('a', 'Maya'), 1));
    list = upsertProfile(list, toSaved(child('b', 'Leo'), 2));
    list = upsertProfile(list, toSaved(child('c', 'maya', 6), 3));
    expect(list.map((p) => [p.name, p.age])).toEqual([['maya', 6], ['Leo', 5]]);
  });

  it('caps the list', () => {
    let list = upsertProfile([], toSaved(child('x0', 'Kid'), 0));
    for (let n = 1; n <= MAX_PROFILES + 2; n++) list = upsertProfile(list, toSaved(child(`x${n}`, `Kid${String.fromCharCode(64 + n)}`), n));
    expect(list).toHaveLength(MAX_PROFILES);
    expect(list[0].savedAt).toBe(MAX_PROFILES + 2);
  });

  it('drops broken or foreign data instead of crashing', () => {
    expect(parseProfiles('not json')).toEqual([]);
    expect(parseProfiles('{"a":1}')).toEqual([]);
    const good = toSaved(child('a', 'Maya'), 1);
    const parsed = parseProfiles(JSON.stringify([good, { name: 'X' }, { ...good, childId: 'b', age: 13 }]));
    expect(parsed).toEqual([good]);
  });
});
