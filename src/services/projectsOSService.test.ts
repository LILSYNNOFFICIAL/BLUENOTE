import assert from 'node:assert/strict';
import test from 'node:test';
import { generateStandalonePhotoAlbumHTML } from './projectsOSService';
import type { ProjectPhotoAlbum } from '../types/projectsOS';

function makeAlbum(overrides: Record<string, unknown> = {}): ProjectPhotoAlbum {
  return {
    id: 'album-test',
    title: 'Safe title',
    subtitle: 'Safe subtitle',
    theme: 'dark-cinema',
    layout: 'grid',
    slideshowIntervalSec: 4,
    photos: [],
    ...overrides,
  } as unknown as ProjectPhotoAlbum;
}

test('photo album HTML escapes text and rejects injected theme/interval values', () => {
  const html = generateStandalonePhotoAlbumHTML(
    makeAlbum({
      title: '<img onerror="window.__injected=1">',
      subtitle: '</p><script>window.__injected=2</script>',
      theme: 'dark-cinema"><script>window.__injected=3</script><html data-x="' as unknown as ProjectPhotoAlbum['theme'],
      slideshowIntervalSec: '1</button><script>window.__injected=4</script>' as unknown as number,
    })
  );

  assert.match(html, /data-theme="dark-cinema"/);
  assert.match(html, /Auto-Slideshow \(4s\)/);
  assert.match(html, /&lt;img onerror=&quot;window\.__injected=1&quot;&gt;/);
  assert.doesNotMatch(html, /<img onerror=/);
  assert.doesNotMatch(html, /<\/p><script>window\.__injected=2/);
  assert.doesNotMatch(html, /data-theme="dark-cinema"><script>/);
  assert.doesNotMatch(html, /Auto-Slideshow \(1<\/button><script>/);
});

test('photo album JSON escapes script-closing payloads in captions and filenames', () => {
  const html = generateStandalonePhotoAlbumHTML(
    makeAlbum({
      photos: [{
        id: 'photo-test',
        filename: '</script><script>window.__injected=5</script>',
        caption: '</script><script>window.__injected=6</script>',
        dataUrl: 'data:image/png;base64,AAAA',
        takenAt: '',
        groupName: 'Portfolio',
      }],
    })
  );

  assert.doesNotMatch(html, /<\/script><script>window\.__injected=[56]/);
  assert.match(html, /\\u003c\/script\\u003e/);
});
