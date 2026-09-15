import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/app/lib/session';
import { hasPurchased } from '@/app/lib/orders';
import { loadAlbumOriginals, mimeForExt, numberedName } from '@/app/lib/albumFiles';
import {
  DRIVE_SCOPE,
  driveRedirectUri,
  exchangeDriveCode,
  createDriveFolder,
  uploadToDrive,
  trashDriveFolder,
} from '@/app/lib/googleDrive';
import { DRIVE_STATE_COOKIE, DRIVE_STATE_COOKIE_PATH } from '@/app/lib/oauth';

export const runtime = 'nodejs';
// Copying six full-resolution originals into Drive is the slow part.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const back = (outcome: string, extra = '') =>
    NextResponse.redirect(new URL(`/albums?drive=${outcome}${extra}`, origin));

  const cookieStore = await cookies();
  const stored = cookieStore.get(DRIVE_STATE_COOKIE)?.value ?? '';
  cookieStore.set(DRIVE_STATE_COOKIE, '', { path: DRIVE_STATE_COOKIE_PATH, maxAge: 0 });

  const [expectedState, workId] = stored.split(':');
  const state = searchParams.get('state');
  if (!expectedState || !workId || state !== expectedState) return back('state_mismatch');

  // The buyer closed or declined the Google consent screen.
  if (searchParams.get('error')) return back('cancelled');

  const code = searchParams.get('code');
  const redirectUri = driveRedirectUri();
  if (!code || !redirectUri) return back('failed');

  // Re-check everything: the consent round-trip may have taken minutes.
  const user = await getSession();
  if (!user || !(await hasPurchased(user.id, workId))) return back('not_owned');

  let accessToken: string;
  try {
    const token = await exchangeDriveCode(code, redirectUri);
    // Google's granular consent lets buyers untick the Drive permission.
    if (!token.scope.split(' ').includes(DRIVE_SCOPE)) return back('scope_denied');
    accessToken = token.accessToken;
  } catch (error) {
    console.error('Drive token exchange error:', error);
    return back('failed');
  }

  const album = await loadAlbumOriginals(workId).catch((error) => {
    console.error('Failed to load originals for Drive:', error);
    return null;
  });
  if (!album) return back('failed');

  let folderId: string | null = null;
  try {
    folderId = await createDriveFolder(accessToken, `BLACKHAND — ${album.title}`);
    // Sequential on purpose: kind to Drive's rate limits, and six files is quick.
    for (const original of album.originals) {
      await uploadToDrive(accessToken, {
        folderId,
        name: numberedName(album.title, original.position, original.ext),
        mimeType: mimeForExt(original.ext),
        body: original.buffer,
      });
    }
  } catch (error) {
    console.error('Saving album to Drive failed:', error);
    if (folderId) await trashDriveFolder(accessToken, folderId);
    return back('failed');
  }

  return back('ok', `&folder=${encodeURIComponent(folderId)}`);
}
