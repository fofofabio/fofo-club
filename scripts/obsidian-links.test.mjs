import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

async function load(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { parseObsidianNoteLink, readProjectNoteLinks, serializeProjectNoteLinks, projectNotesStorageKey } = await load('../src/lib/obsidianLinks.ts');
const { workspaceTasksPath, safeWorkspaceReturnPath, requestedTaskProject } = await load('../src/lib/workspaceLinks.ts');

test('note links preserve Unicode, folder separators, spaces, punctuation and headings', () => {
  const file = 'Customers/Example & Co/Übersicht – Project#Decisions';
  const parsed = parseObsidianNoteLink(`obsidian://open?vault=Work%20Notes&file=${encodeURIComponent(file)}`);
  assert.equal(parsed.file, file);
  assert.equal(parsed.vault, 'Work Notes');
  assert.equal(new URL(parsed.href).searchParams.get('file'), file);
  assert.ok(parsed.href.includes('%20'));
  assert.ok(!parsed.href.includes('+'));
});

test('only a note-opening URI is accepted', () => {
  for (const value of [
    'javascript:alert(1)', 'https://example.com', 'obsidian://new?vault=Work&file=A&content=overwrite',
    'obsidian://open?vault=Work&file=A&append=true', 'obsidian://advanced-uri?vault=Work&command=run',
    'obsidian://open?vault=Work', 'obsidian://open?file=A', 'obsidian://open?vault=Work&file=',
    'obsidian://open?vault=Work&file=../private', 'obsidian://open?vault=Work&file=C%3A%2Fprivate',
    'obsidian://open?vault=Work&file=%2Fprivate', 'obsidian://open?vault=Work&file=A%2F..%2FB',
    'obsidian://open?vault=Work&file=A&file=B', 'obsidian://open?vault=Work&vault=Other&file=A',
    'obsidian://user:password@open?vault=Work&file=A', 'obsidian://open/command?vault=Work&file=A',
    'obsidian://open?vault=Work&file=A#unexpected', 'obsidian://open?vault=Work&file=A%00B',
    'obsidian://open?vault=Work\n&file=A',
  ]) assert.equal(parseObsidianNoteLink(value), null, value);
});

test('Windows note separators are normalized inside a vault', () => {
  const parsed = parseObsidianNoteLink('obsidian://open?vault=Work&file=Projects%5CExample');
  assert.equal(parsed.file, 'Projects/Example');
});

test('project-link files round-trip without sharing across projects or special object keys', () => {
  const note = 'obsidian://open?vault=Demo&file=Project%20A';
  const input = new Map([['Project A', note], ['__proto__', note], ['all', note]]);
  assert.deepEqual([...readProjectNoteLinks(serializeProjectNoteLinks(input))], [...input]);
  assert.deepEqual([...readProjectNoteLinks(null)], []);
  assert.notEqual(projectNotesStorageKey('user-a'), projectNotesStorageKey('user-b'));
  assert.notEqual(projectNotesStorageKey('user:a'), projectNotesStorageKey('user%3Aa'));
});

test('imports fail as a whole for malformed, duplicate, incompatible or unsafe entries', () => {
  const good = { project: 'Example', url: 'obsidian://open?vault=Demo&file=A' };
  for (const value of [
    '{}', 'not-json', JSON.stringify({ version: 2, projects: [good] }),
    JSON.stringify({ version: 1, projects: [good, good] }),
    JSON.stringify({ version: 1, projects: [good, { project: 'Other', url: 'javascript:alert(1)' }] }),
    JSON.stringify({ version: 1, projects: [{ project: '', url: good.url }] }),
    JSON.stringify({ version: 1, projects: [{ project: 'Bad\nname', url: good.url }] }),
    JSON.stringify({ version: 1, projects: [{ project: 'x'.repeat(201), url: good.url }] }),
  ]) assert.throws(() => readProjectNoteLinks(value), value);
});

test('task links preserve exact project identity, including reserved filter labels', () => {
  for (const project of ['Example & Co', 'Work notes / API', 'all', 'done', 'Möbel – Test']) {
    const path = workspaceTasksPath(project);
    assert.equal(requestedTaskProject(new URL(path, 'https://example.com').search), project);
    assert.equal(safeWorkspaceReturnPath(path), path);
  }
  assert.equal(workspaceTasksPath(), '/workspace?view=tasks');
  assert.equal(requestedTaskProject('?project='), null);
  assert.equal(requestedTaskProject('?project=Bad%00value'), null);
  assert.equal(requestedTaskProject(`?project=${'x'.repeat(201)}`), null);
});

test('login destinations cannot redirect outside the task board', () => {
  for (const value of [
    'https://evil.example/workspace?view=tasks', '//evil.example/workspace?view=tasks',
    '/workspace/login?view=tasks', '/workspace/../other?view=tasks', '/workspace?view=hours',
    '/workspace\\evil?view=tasks', '/workspace?view=tasks\n', null, 42,
  ]) assert.equal(safeWorkspaceReturnPath(value), '/workspace', String(value));
  assert.equal(safeWorkspaceReturnPath('/workspace?view=tasks&project=Example&next=https://evil.example'), '/workspace?view=tasks&project=Example');
});
