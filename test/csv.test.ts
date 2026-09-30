import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseCsvRecords, toCsv } from '../src/util/csv.ts';

test('parseCsv gère guillemets, virgules internes, guillemets doublés, CRLF et BOM', () => {
  const text = '﻿a,b,c\r\n"x, y","il dit ""oui""",3\r\n';
  assert.deepEqual(parseCsv(text), [
    ['a', 'b', 'c'],
    ['x, y', 'il dit "oui"', '3'],
  ]);
});

test('parseCsvRecords associe en-têtes et cellules ; toCsv fait l’aller-retour', () => {
  const csv = toCsv(['k', 'v'], [['a,b', 1], ['c', null]]);
  assert.equal(csv, 'k,v\n"a,b",1\nc,\n');
  assert.deepEqual(parseCsvRecords(csv), [
    { k: 'a,b', v: '1' },
    { k: 'c', v: '' },
  ]);
});
