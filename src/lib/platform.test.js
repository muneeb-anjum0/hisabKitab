import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import capacitor from '../../capacitor.config.json';
import firebase from '../../firebase.json';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('public/manifest.webmanifest'));

describe('application contracts', () => {
  it('keeps the web manifest branded and installable', () => {
    expect(manifest).toMatchObject({ name: 'HisabKitab', short_name: 'HisabKitab', start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait-primary' });
  });

  it('provides regular and maskable PWA artwork', () => {
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]));
    manifest.icons.forEach((icon) => expect(existsSync(new URL(`../../public${icon.src}`, import.meta.url))).toBe(true));
  });

  it('keeps the HTML viewport safe-area aware', () => {
    const html = read('index.html');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('<title>HisabKitab</title>');
  });

  it('keeps Capacitor identity and output aligned with Android', () => {
    expect(capacitor).toMatchObject({ appId: 'com.muneebanjum.hisabkitab', appName: 'HisabKitab', webDir: 'dist' });
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain('applicationId "com.muneebanjum.hisabkitab"');
    expect(gradle).toContain('outputFileName = "HisabKitab-${variant.name}.apk"');
  });

  it('keeps native authentication and system-bar safety enabled', () => {
    expect(capacitor.plugins.FirebaseAuthentication).toMatchObject({ skipNativeAuth: true, providers: ['google.com'] });
    expect(capacitor.plugins.SystemBars).toMatchObject({ insetsHandling: 'css', style: 'dark' });
  });

  it('keeps Firebase Hosting configured as a single-page application', () => {
    expect(firebase.hosting.public).toBe('dist');
    expect(firebase.hosting.rewrites).toContainEqual({ source: '**', destination: '/index.html' });
    expect(firebase.firestore).toEqual({ rules: 'firestore.rules', indexes: 'firestore.indexes.json' });
  });

  it('documents every required public Firebase environment key', () => {
    const keys = [...read('.env.example').matchAll(/^VITE_FIREBASE_[A-Z_]+(?==)/gm)].map(([key]) => key);
    expect(keys).toEqual(['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID']);
  });

  it('keeps Firebase policy files and the stable APK present', () => {
    ['firestore.rules', 'firestore.indexes.json', 'HisabKitab.apk'].forEach((path) => expect(existsSync(new URL(`../../${path}`, import.meta.url))).toBe(true));
  });
});
