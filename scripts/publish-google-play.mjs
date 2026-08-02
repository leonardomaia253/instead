import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_PUBLISHER = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const ANDROID_PUBLISHER_UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

const env = process.env;
const packageName = env.GOOGLE_PLAY_PACKAGE_NAME || 'com.instead.app';
const credentialsPath = env.GOOGLE_APPLICATION_CREDENTIALS;
const bundlePath = env.ANDROID_AAB_PATH || env.GOOGLE_PLAY_AAB_PATH;
const track = env.GOOGLE_PLAY_TRACK || 'internal';
const releaseName = env.GOOGLE_PLAY_RELEASE_NAME || `Instead ${new Date().toISOString().slice(0, 10)}`;
const status = env.GOOGLE_PLAY_RELEASE_STATUS || 'draft';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function resolveCredentialsPath(path) {
  if (!path) return null;
  if (existsSync(path)) return path;

  const dir = dirname(path);
  const prefix = basename(path);
  if (!existsSync(dir)) return path;

  const candidates = readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => join(dir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  return candidates[0] || path;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    fail(`Google Play request failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: credentials.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer
    .sign(credentials.private_key, 'base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  const assertion = `${unsigned}.${signature}`;

  const token = await requestJson(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  return token.access_token;
}

async function main() {
  const resolvedCredentialsPath = resolveCredentialsPath(credentialsPath);
  if (!resolvedCredentialsPath) fail('Set GOOGLE_APPLICATION_CREDENTIALS to the Play Console service-account JSON path.');
  if (!existsSync(resolvedCredentialsPath)) fail(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`);
  if (!bundlePath) fail('Set ANDROID_AAB_PATH to the signed .aab you want to publish.');
  if (!existsSync(bundlePath)) fail(`ANDROID_AAB_PATH file not found: ${bundlePath}`);
  if (!bundlePath.toLowerCase().endsWith('.aab')) fail('ANDROID_AAB_PATH must point to an Android App Bundle (.aab).');

  const credentials = JSON.parse(readFileSync(resolvedCredentialsPath, 'utf8'));
  const token = await getAccessToken(credentials);
  const auth = { Authorization: `Bearer ${token}` };

  const edit = await requestJson(`${ANDROID_PUBLISHER}/applications/${packageName}/edits`, {
    method: 'POST',
    headers: auth,
  });

  const size = statSync(bundlePath).size;
  const upload = await requestJson(
    `${ANDROID_PUBLISHER_UPLOAD}/applications/${packageName}/edits/${edit.id}/bundles?uploadType=media`,
    {
      method: 'POST',
      headers: {
        ...auth,
        'content-type': 'application/octet-stream',
        'content-length': String(size),
      },
      body: createReadStream(bundlePath),
      duplex: 'half',
    },
  );

  await requestJson(`${ANDROID_PUBLISHER}/applications/${packageName}/edits/${edit.id}/tracks/${track}`, {
    method: 'PUT',
    headers: {
      ...auth,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      releases: [
        {
          name: releaseName,
          versionCodes: [String(upload.versionCode)],
          status,
        },
      ],
    }),
  });

  const commit = await requestJson(`${ANDROID_PUBLISHER}/applications/${packageName}/edits/${edit.id}:commit`, {
    method: 'POST',
    headers: auth,
  });

  console.log(`Published ${basename(bundlePath)} to ${packageName}/${track} as ${status}. Edit ${commit.id} committed.`);
}

main().catch((error) => fail(error?.stack || String(error)));
