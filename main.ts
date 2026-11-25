import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_ENTRY_CHARS = 280;
export const DEFAULT_OUTPUT_DIR = '/output';
export const ENTRY_FILENAME = 'entry.txt';

const ONE_LINER =
  "I set my bank's security question to 'What is your biggest regret?', which worked until personal growth locked me out of my checking account.";

/**
 * Validates that a candidate entry satisfies the competition gate:
 * non-empty, single-line UTF-8 text without control characters, within 280 characters.
 */
export function validateOneLiner(text: string): string {
  const normalized = text.trim();
  if (normalized.length === 0) {
    throw new Error('Entry text must not be empty or whitespace-only.');
  }
  if (/[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error('Entry text must be a single line with no control characters or line breaks.');
  }
  const codePointCount = [...normalized].length;
  if (normalized.length > MAX_ENTRY_CHARS || codePointCount > MAX_ENTRY_CHARS) {
    throw new Error(`Entry text exceeds ${MAX_ENTRY_CHARS} characters (got ${codePointCount}).`);
  }
  return normalized;
}

/**
 * Returns the validated one-line joke for the competition entry.
 */
export function buildEntry(): string {
  return validateOneLiner(ONE_LINER);
}

/**
 * Resolves the target output directory, honoring MAKEFUN_OUTPUT_DIR as the local stand-in.
 */
export function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.MAKEFUN_OUTPUT_DIR?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_OUTPUT_DIR;
}

/**
 * Writes the validated one-line entry to <outputDir>/entry.txt and returns the written path.
 */
export function writeEntry(outputDir: string = resolveOutputDir()): string {
  const joke = buildEntry();
  mkdirSync(outputDir, { recursive: true });
  const targetPath = join(outputDir, ENTRY_FILENAME);
  writeFileSync(targetPath, joke, 'utf8');
  return targetPath;
}

function isRunningAsEntrypoint(): boolean {
  const arg = process.argv[1];
  if (typeof arg !== 'string' || arg.length === 0) {
    return false;
  }
  try {
    return pathToFileURL(realpathSync(arg)).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isRunningAsEntrypoint()) {
  writeEntry();
}
