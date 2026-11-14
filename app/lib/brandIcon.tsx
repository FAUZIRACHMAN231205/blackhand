import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** The dark `paper` token (app/globals.css), so the splash screen, icon and app agree. */
export const BRAND_BACKGROUND = '#0a0a0a';

/**
 * The app icon: a white "B." set in Augustus, the project's own display face,
 * echoing the grey full stop of the "Blackhand." wordmark.
 *
 * `safeZone` shrinks the mark for maskable icons, whose outer edge the OS may
 * crop to a circle or squircle (the guaranteed-visible area is the central 80%).
 */
export async function renderBrandIcon(size: number, { safeZone = false } = {}) {
  const augustus = await readFile(join(process.cwd(), 'app/fonts/augustus.ttf'));
  const glyph = Math.round(size * (safeZone ? 0.42 : 0.58));
  // Augustus' own full stop is a Roman triangle; the wordmark's is round, so draw it.
  const dot = Math.max(2, Math.round(glyph * 0.13));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_BACKGROUND,
          // The line box reserves descender space under the B; offset it so the
          // letter itself, not its box, sits in the optical centre.
          paddingTop: Math.round(glyph * 0.18),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            color: '#f5f5f5',
            fontFamily: 'Augustus',
            fontSize: glyph,
            lineHeight: 1,
          }}
        >
          B
          <div
            style={{
              width: dot,
              height: dot,
              borderRadius: dot,
              background: '#9b9b9b',
              marginLeft: Math.round(glyph * 0.05),
              // Lift the dot from the line box's bottom onto the baseline.
              marginBottom: Math.round(glyph * 0.215),
            }}
          />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: 'Augustus', data: augustus, weight: 400, style: 'normal' }],
    }
  );
}
