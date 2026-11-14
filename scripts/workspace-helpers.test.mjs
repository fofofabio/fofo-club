import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

async function load(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { displayMerchant } = await load('../src/lib/merchantName.ts');
const { parseCsv, parseMoneyToCents, decodeExport, readBankExport } = await load('../src/lib/financeCsv.ts');
const { parsePgTimestamp } = await load('../src/lib/pgTimestamp.ts');

test('merchant names drop legal forms, branch notes and terminal prefixes', () => {
  assert.equal(displayMerchant('Amazon Eu S.a R.l., Niederlassung Deutschland'), 'Amazon');
  assert.equal(displayMerchant('Energie Graz Gmbh Co Kg'), 'Energie Graz');
  assert.equal(displayMerchant('Willhaben Internet Services Gmbh ?co Kg'), 'Willhaben Internet Services');
  assert.equal(displayMerchant('Manufactum Handelsgmbh'), 'Manufactum');
  assert.equal(displayMerchant('Storer Handels Gmbh'), 'Storer');
  assert.equal(displayMerchant('Wiener Linien Gmbh & C'), 'Wiener Linien');
  assert.equal(displayMerchant('Zurich Versicherungs-Aktiengesellschaft'), 'Zurich');
  assert.equal(displayMerchant('Sumup *eisperle Gmbh'), 'Eisperle');
  assert.equal(displayMerchant('Riot Games, Limited'), 'Riot Games');
});

test('merchant names keep people, shops and words that only look like legal forms', () => {
  assert.equal(displayMerchant('Alexander Gerald Gollmann'), 'Alexander Gerald Gollmann');
  assert.equal(displayMerchant('Butlers Handel Gmbh'), 'Butlers Handel');
  assert.equal(displayMerchant('Selecta Betriebsverpfl'), 'Selecta Betriebsverpfl');
  assert.equal(displayMerchant('Gmbh'), 'Gmbh');
  assert.equal(displayMerchant('  Netflix  '), 'Netflix');
});

test('money parsing handles Austrian and English separators', () => {
  assert.equal(parseMoneyToCents('-12,50'), -1250);
  assert.equal(parseMoneyToCents('1.234,56'), 123456);
  assert.equal(parseMoneyToCents('1,234.56'), 123456);
  assert.equal(parseMoneyToCents(' 7 '), 700);
  assert.equal(parseMoneyToCents(''), 0);
});

test('CSV parsing keeps quoted commas, escaped quotes and CRLF rows', () => {
  const rows = parseCsv('﻿A,B\r\n"x, y","say ""hi"""\r\n\r\n1,2');
  assert.deepEqual(rows, [{ A: 'x, y', B: 'say "hi"' }, { A: '1', B: '2' }]);
});

test('bank exports decode UTF-16 LE with a BOM and fall back to UTF-8', () => {
  const text = 'Booking Date,Amount\n';
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  assert.equal(decodeExport(utf16.buffer.slice(utf16.byteOffset, utf16.byteOffset + utf16.length)).replace(/^﻿/, ''), text);
  const utf8 = Buffer.from(text, 'utf8');
  assert.equal(decodeExport(utf8.buffer.slice(utf8.byteOffset, utf8.byteOffset + utf8.length)), text);
});

test('bank export rows match the importer: dates, skipped zero rows and #n for repeated references', () => {
  const csv = [
    'Booking Date,Amount,Booking Reference',
    '03.11.2026,"-12,50",REF1',
    '04.11.2026,"0,00",REF1',
    '05.11.2026,"-3,00",REF1',
    '06.11.2026,"100,00",',
    'not a date,"1,00",REF2',
  ].join('\n');
  const { rows, missingColumns } = readBankExport(csv);
  assert.deepEqual(missingColumns, []);
  assert.deepEqual(rows, [
    { bookedOn: '2026-11-03', amountCents: -1250, reference: 'REF1' },
    { bookedOn: '2026-11-05', amountCents: -300, reference: 'REF1#3' },
    { bookedOn: '2026-11-06', amountCents: 10000, reference: null },
  ]);
});

test('bank exports without the expected columns are reported, not parsed', () => {
  const { rows, missingColumns } = readBankExport('Date,Value\n01.01.2026,1');
  assert.deepEqual(rows, []);
  assert.deepEqual(missingColumns, ['Booking Date', 'Amount', 'Booking Reference']);
});

test('Postgres timestamp text parses the same in every engine', () => {
  const cases = {
    '2026-11-14 10:00:00.123456+01': '2026-11-14T09:00:00.123Z',
    '2026-11-14 10:00:00+01': '2026-11-14T09:00:00.000Z',
    '2026-11-14 10:00:00+05:30': '2026-11-14T04:30:00.000Z',
    '2026-11-14T09:00:00.000Z': '2026-11-14T09:00:00.000Z',
    '2026-06-01 08:15:42.5+02': '2026-06-01T06:15:42.500Z',
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(parsePgTimestamp(input).toISOString(), expected, input);
});

const { isDateKey, isUuid, invalidTaskField, invalidTimeEntry, isTimeZone } = await load('../src/lib/workspaceValidation.ts');

test('date checks accept real calendar days and reject rolled-over ones', () => {
  for (const ok of ['2026-11-14', '2028-02-29', '2026-12-31']) assert.ok(isDateKey(ok), ok);
  for (const bad of ['2026-02-29', '2026-02-31', '2026-13-01', '2026-11-1', '14.11.2026', '', null, 20261114]) assert.ok(!isDateKey(bad), String(bad));
});

test('task updates accept what the UI sends and reject the rest', () => {
  for (const ok of [{ done: true }, { dueDate: null }, { dueDate: '' }, { dueDate: '2026-11-30', pinned: false }, { text: 'Call bank', project: 'Home', notes: '' }]) {
    assert.equal(invalidTaskField(ok), null, JSON.stringify(ok));
  }
  assert.match(invalidTaskField({ dueDate: '2026-02-31' }), /real date/);
  assert.match(invalidTaskField({ done: 'yes' }), /true or false/);
  assert.match(invalidTaskField({ text: 5 }), /string/);
  assert.match(invalidTaskField({ text: 'x'.repeat(1001) }), /too long/);
});

test('time entries need a real date and clock times', () => {
  const entry = { project: 'EREX', task: 'Review', date: '2026-11-14', start: '09:30', end: '24:00' };
  assert.equal(invalidTimeEntry(entry), null);
  assert.equal(invalidTimeEntry({ ...entry, start: '09:30:00' }), null);
  assert.match(invalidTimeEntry({ ...entry, date: '2026-02-30' }), /real date/);
  assert.match(invalidTimeEntry({ ...entry, end: '25:00' }), /time like/);
  assert.match(invalidTimeEntry({ ...entry, project: 'x'.repeat(201) }), /at most 200/);
});

test('ids and time zones are checked before they reach Postgres', () => {
  assert.ok(isUuid('3f2b8c1e-9a4d-4e7b-8c2f-1a2b3c4d5e6f'));
  assert.ok(!isUuid('42'));
  assert.ok(isTimeZone('Europe/Vienna'));
  assert.ok(!isTimeZone('Mars/Olympus'));
});
