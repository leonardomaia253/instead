$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$gradle = Join-Path $root ".gradle-local\extract2\gradle-8.10.2\bin\gradle.bat"

if (!(Test-Path -LiteralPath $gradle)) {
  throw "Gradle not found at $gradle. Download Gradle 8.10.2 into .gradle-local\extract2 or install Gradle on PATH."
}

$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "C:\Android\Sdk" }
$env:ANDROID_SDK_ROOT = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { $env:ANDROID_HOME }
$env:ANDROID_KEYSTORE_PATH = if ($env:ANDROID_KEYSTORE_PATH) { $env:ANDROID_KEYSTORE_PATH } else { Join-Path $root "chave.jks" }
$env:ANDROID_KEY_ALIAS = if ($env:ANDROID_KEY_ALIAS) { $env:ANDROID_KEY_ALIAS } else { "instead" }

if (!$env:GOOGLE_PLAY_PACKAGE_NAME) {
  throw "GOOGLE_PLAY_PACKAGE_NAME must be set before building a release bundle."
}

if (!$env:ANDROID_TWA_URL -or $env:ANDROID_TWA_URL -notmatch '^https://[^/\s]+') {
  throw "ANDROID_TWA_URL must be set to the production HTTPS origin before building a release bundle."
}

if (!$env:ANDROID_TWA_HOST -or $env:ANDROID_TWA_URL -notlike "https://$($env:ANDROID_TWA_HOST)*") {
  throw "ANDROID_TWA_HOST must be set and match ANDROID_TWA_URL before building a release bundle."
}

& $gradle -p (Join-Path $root "mobile\android") bundleRelease --no-daemon
