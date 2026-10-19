import assert from 'node:assert/strict';
import test from 'node:test';
import { getSafeAvatarSrc } from './safeAvatarUrl';

const origin = 'https://bluenote.example';

test('allows compressed base64 raster avatar images', () => {
  assert.equal(getSafeAvatarSrc('data:image/jpeg;base64,QUJD', origin), 'data:image/jpeg;base64,QUJD');
  assert.equal(getSafeAvatarSrc('data:image/webp;base64,QUJD', origin), 'data:image/webp;base64,QUJD');
});

test('allows HTTPS avatar URLs and same-origin relative paths', () => {
  assert.equal(getSafeAvatarSrc('https://cdn.example/avatar.jpg', origin), 'https://cdn.example/avatar.jpg');
  assert.equal(getSafeAvatarSrc('/avatars/me.png', origin), 'https://bluenote.example/avatars/me.png');
});

test('rejects scriptable, non-image, and unsafe external schemes', () => {
  assert.equal(getSafeAvatarSrc('javascript:alert(1)', origin), null);
  assert.equal(getSafeAvatarSrc('data:text/html;base64,PHNjcmlwdD4=', origin), null);
  assert.equal(getSafeAvatarSrc('data:image/svg+xml;base64,PHN2Zz4=', origin), null);
  assert.equal(getSafeAvatarSrc('http://evil.example/avatar.png', origin), null);
  assert.equal(getSafeAvatarSrc('blob:https://bluenote.example/id', origin), null);
});

test('rejects malformed values and non-string input', () => {
  assert.equal(getSafeAvatarSrc('', origin), null);
  assert.equal(getSafeAvatarSrc('not a URL', origin), null);
  assert.equal(getSafeAvatarSrc(null, origin), null);
  assert.equal(getSafeAvatarSrc({ url: 'https://cdn.example/avatar.png' }, origin), null);
});
