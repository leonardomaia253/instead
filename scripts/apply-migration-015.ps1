$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
    Write-Error "SUPABASE_ACCESS_TOKEN environment variable is required."
    exit 1
}

$projectRef = $env:SUPABASE_PROJECT_REF
if (-not $projectRef -or $projectRef -notmatch '^[a-z0-9]{20}$') {
    Write-Error "SUPABASE_PROJECT_REF is required and must be a 20-character Supabase project ref."
    exit 1
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sqlPath = Join-Path $repoRoot "supabase\migrations\015_platform_prices.sql"
$sql = Get-Content $sqlPath -Raw -Encoding UTF8

$jsonString = $sql | ConvertTo-Json -Compress
$payload    = "{`"query`":$jsonString}"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
}

try {
    $resp = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" `
        -Method POST `
        -Headers $headers `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))

    Write-Host "SUCCESS:"
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "HTTP ERROR: $($_.Exception.Message)"
    Write-Host $_.ErrorDetails.Message
}
