export const OAUTH_STATE_COOKIE = 'bh_oauth_state';

/** CSRF state for the "save album to Google Drive" consent round-trip. */
export const DRIVE_STATE_COOKIE = 'bh_drive_state';
/** Scoped so the cookie is only ever sent to the Drive callback. */
export const DRIVE_STATE_COOKIE_PATH = '/api/drive';
