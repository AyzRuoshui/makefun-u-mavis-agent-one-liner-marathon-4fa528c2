import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildEntry,
  DEFAULT_OUTPUT_DIR,
  MAX_ENTRY_CHARS,
  resolveOutputDir,
  validateOneLiner,
  writeEntry,
} from './main.ts';

test('buildEntry produces a single-line non-empty joke within 280 characters', () => {
  const joke = buildEntry();
  assert.ok(joke.length >= 1, 'joke should not be empty');
  assert.ok(joke.length <= MAX_ENTRY_CHARS, `UTF-16 length ${joke.length} exceeds ${MAX_ENTRY_CHARS}`);
  assert.ok([...joke].length <= MAX_ENTRY_CHARS, `code point length exceeds ${MAX_ENTRY_CHARS}`);
  assert.equal(/[\u0000-\u001f\u007f]/.test(joke), false, 'joke must contain no line breaks or control chars');
  assert.equal(joke, joke.trim(), 'joke should have no leading or trailing whitespace');
  assert.equal(Buffer.from(joke, 'utf8').toString('utf8'), joke, 'joke must be valid UTF-8');
  assert.equal(Buffer.byteLength(joke, 'utf8'), 141, 'refined one-liner should be 141 UTF-8 bytes');
});

test('validateOneLiner rejects empty, multiline, control-char, and over-length text', () => {
  assert.throws(() => validateOneLiner('   \t  '));
  assert.throws(() => validateOneLiner('line one\nline two'));
  assert.throws(() => validateOneLiner('bad\x00byte'));
  assert.throws(() => validateOneLiner('x'.repeat(MAX_ENTRY_CHARS + 1)));
});

test('resolveOutputDir honors MAKEFUN_OUTPUT_DIR and defaults to /output', () => {
  assert.equal(resolveOutputDir({}), DEFAULT_OUTPUT_DIR);
  assert.equal(resolveOutputDir({ MAKEFUN_OUTPUT_DIR: '  ' }), DEFAULT_OUTPUT_DIR);
  assert.equal(resolveOutputDir({ MAKEFUN_OUTPUT_DIR: '/tmp/custom-out' }), '/tmp/custom-out');
});

test('writeEntry writes deterministic UTF-8 bytes to entry.txt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'one-liner-test-'));
  try {
    const outPath = writeEntry(dir);
    assert.equal(outPath, join(dir, 'entry.txt'));
    const first = readFileSync(outPath);
    writeEntry(dir);
    const second = readFileSync(outPath);
    assert.deepEqual(first, second);
    assert.equal(first.toString('utf8'), buildEntry());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('running node main.ts honors MAKEFUN_OUTPUT_DIR end-to-end', () => {
  const dir = mkdtempSync(join(tmpdir(), 'one-liner-cli-'));
  try {
    execFileSync(process.execPath, ['main.ts'], {
      env: { ...process.env, MAKEFUN_OUTPUT_DIR: dir },
      stdio: 'pipe',
    });
    const written = readFileSync(join(dir, 'entry.txt'), 'utf8');
    assert.equal(written, buildEntry());
    assert.ok(written.length >= 1 && written.length <= MAX_ENTRY_CHARS);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
