import 'server-only';
import crypto from 'node:crypto';

/**
 * drive.file only reaches files this app itself creates — not the rest of the
 * buyer's Drive — which is also why Google treats it as a non-sensitive scope.
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';

/**
 * Where Google sends buyers back to. Defaults to the Drive callback on the same
 * origin as the sign-in redirect, so local and production need no extra config.
 * This exact URL must be listed under the OAuth client's authorised redirect URIs.
 */
export function driveRedirectUri(): string | null {
  if (process.env.GOOGLE_DRIVE_REDIRECT_URI) return process.env.GOOGLE_DRIVE_REDIRECT_URI;
  const login = process.env.GOOGLE_REDIRECT_URI;
  if (!login) return null;
  try {
    return new URL('/api/drive/google/callback', login).toString();
  } catch {
    return null;
  }
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/** Exchange the consent code for a one-off access token. Never stored. */
export async function exchangeDriveCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Drive token exchange failed: ${res.status}`);

  const body = (await res.json()) as { access_token: string; scope?: string };
  return { accessToken: body.access_token, scope: body.scope ?? '' };
}

async function driveError(res: Response, what: string): Promise<Error> {
  const detail = await res.text().catch(() => '');
  return new Error(`${what} failed: ${res.status} ${detail.slice(0, 300)}`);
}

export async function createDriveFolder(accessToken: string, name: string): Promise<string> {
  const res = await fetch(`${DRIVE_FILES_URL}?fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!res.ok) throw await driveError(res, 'Drive folder creation');
  return ((await res.json()) as { id: string }).id;
}

/** Single-request multipart upload: JSON metadata part, then the file bytes. */
export async function uploadToDrive(
  accessToken: string,
  file: { folderId: string; name: string; mimeType: string; body: Buffer }
): Promise<void> {
  const boundary = `blackhand-${crypto.randomBytes(12).toString('hex')}`;
  const metadata = JSON.stringify({ name: file.name, parents: [file.folderId] });

  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`
    ),
    file.body,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: new Blob([new Uint8Array(payload)]),
  });
  if (!res.ok) throw await driveError(res, `Drive upload of ${file.name}`);
}

/**
 * Move a half-finished folder to the buyer's trash. Trash, not delete, so a
 * failure on our side can never permanently remove anything from their Drive.
 */
export async function trashDriveFolder(accessToken: string, folderId: string): Promise<void> {
  await fetch(`${DRIVE_FILES_URL}/${folderId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  }).catch((e) => console.error('Failed to trash partial Drive folder:', e));
}
