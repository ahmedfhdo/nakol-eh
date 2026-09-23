import { describe, expect, it } from 'vitest';
import { removePork, removePorkFromList } from './removePork';

describe('removePork', () => {
  it('leaves pork-free dishes alone', () => {
    expect(removePork({ name: 'Paella', categories: ['chicken', 'fish'] })).toEqual({ name: 'Paella', categories: ['chicken', 'fish'] });
  });

  it('strips pork from mixed dishes', () => {
    expect(removePork({ name: 'Pizza', categories: ['vegetarian', 'pork'] })).toEqual({ name: 'Pizza', categories: ['vegetarian'] });
  });

  it('converts the four old pork-only defaults', () => {
    expect(removePork({ name: 'Schnitzel', categories: ['pork'] })?.name).toBe('Chicken Schnitzel');
    expect(removePork({ name: 'Currywurst mit Pommes', categories: ['pork'] })).toEqual({
      name: 'Rindercurrywurst mit Pommes',
      categories: ['beef'],
    });
    expect(removePork({ name: 'Pulled Pork Sandwich', categories: ['pork'] })?.categories).toEqual(['beef']);
    expect(removePork({ name: 'Pork Stir-Fry with Rice', categories: ['pork'] })?.categories).toEqual(['chicken']);
  });

  it('keeps extra fields (id, lastCooked)', () => {
    expect(removePork({ id: 5, name: 'Schnitzel', categories: ['pork'], lastCooked: 9 })).toEqual({
      id: 5,
      name: 'Chicken Schnitzel',
      categories: ['chicken'],
      lastCooked: 9,
    });
  });

  it('returns null for other pork-only dishes', () => {
    expect(removePork({ name: 'Spanferkel', categories: ['pork'] })).toBeNull();
  });
});

describe('removePorkFromList', () => {
  it('splits into kept and removed', () => {
    const { kept, removed } = removePorkFromList([
      { name: 'Schnitzel', categories: ['pork'] },
      { name: 'Spanferkel', categories: ['pork'] },
      { name: 'Gulasch', categories: ['beef', 'pork'] },
    ]);
    expect(kept.map((d) => d.name)).toEqual(['Chicken Schnitzel', 'Gulasch']);
    expect(removed.map((d) => d.name)).toEqual(['Spanferkel']);
  });
});
