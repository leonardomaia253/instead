import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const manifest = read("mobile/android/app/src/main/AndroidManifest.xml");
const gradle = read("mobile/android/app/build.gradle");
const envExample = read(".env.production.example");
const bundleScript = read("scripts/build-android-bundle.ps1");
const publishScript = read("scripts/publish-google-play.mjs");

if (manifest.includes("instead.volupai.com") || gradle.includes("instead.volupai.com")) {
  failures.push("Android TWA config must not hardcode the legacy production domain");
}
if (!manifest.includes("${twaUrl}") || !manifest.includes("${twaHost}")) {
  failures.push("AndroidManifest must use Gradle placeholders for TWA URL and host");
}
if (!gradle.includes('System.getenv("ANDROID_TWA_URL")') || !gradle.includes('System.getenv("ANDROID_TWA_HOST")')) {
  failures.push("Android Gradle config must read ANDROID_TWA_URL and ANDROID_TWA_HOST");
}
if (gradle.includes('"https://localhost"') || /applicationId\s+System\.getenv\("GOOGLE_PLAY_PACKAGE_NAME"\)\s*\?:/.test(gradle)) {
  failures.push("Android Gradle config must not default release URL or package name");
}
if (!envExample.includes("ANDROID_TWA_URL=") || !envExample.includes("ANDROID_TWA_HOST=")) {
  failures.push(".env.production.example must document Android TWA origin variables");
}
if (!bundleScript.includes("ANDROID_TWA_URL must be set") || !bundleScript.includes("ANDROID_TWA_HOST must be set")) {
  failures.push("Android release bundle script must require explicit production TWA URL and host");
}
if (!bundleScript.includes("GOOGLE_PLAY_PACKAGE_NAME must be set")) {
  failures.push("Android release bundle script must require explicit package name");
}
if (bundleScript.includes('"com.instead.app"')) {
  failures.push("Android release bundle script must not default package name");
}
if (/GOOGLE_PLAY_PACKAGE_NAME\s*\|\|\s*['"]com\.instead\.app['"]/.test(publishScript)) {
  failures.push("Google Play publish script must require GOOGLE_PLAY_PACKAGE_NAME instead of defaulting silently");
}

if (failures.length > 0) {
  console.error("Mobile config checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mobile config checks passed.");
