import { describe, expect, it } from 'vitest';
import { arrange, moveTrack } from './playlist';

const tracks = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((t) => t.id);

describe('arrange', () => {
  it('keeps the default order with no saved order', () => {
    expect(ids(arrange(tracks, []))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('follows the saved order', () => {
    expect(ids(arrange(tracks, ['c', 'a', 'd', 'b']))).toEqual(['c', 'a', 'd', 'b']);
  });

  it('puts tracks missing from the saved order last, in their default order', () => {
    expect(ids(arrange(tracks, ['d', 'b']))).toEqual(['d', 'b', 'a', 'c']);
  });

  it('ignores saved ids that are no longer tracks', () => {
    expect(ids(arrange(tracks, ['gone', 'b']))).toEqual(['b', 'a', 'c', 'd']);
  });
});

describe('moveTrack', () => {
  it('moves a track down among all visible ones', () => {
    expect(moveTrack(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], 'a', 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('moves a track up to the top', () => {
    expect(moveTrack(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], 'd', 0)).toEqual([
      'd',
      'a',
      'b',
      'c',
    ]);
  });

  it('moves a track to the end', () => {
    expect(moveTrack(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], 'b', 3)).toEqual([
      'a',
      'c',
      'd',
      'b',
    ]);
  });

  it('keeps hidden tracks where they were', () => {
    // b is hidden: visible a, c, d. Moving d to the top of the visible list.
    expect(moveTrack(['a', 'b', 'c', 'd'], ['a', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c']);
    // Moving a below c puts it right after c, not after the hidden b.
    expect(moveTrack(['a', 'b', 'c', 'd'], ['a', 'c', 'd'], 'a', 1)).toEqual(['b', 'c', 'a', 'd']);
  });
});
