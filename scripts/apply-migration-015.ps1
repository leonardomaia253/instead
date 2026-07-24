$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
    Write-Error "SUPABASE_ACCESS_TOKEN environment variable is required."
    exit 1
}

$sql = Get-Content "C:\Users\Administrator\instead\supabase\migrations\015_platform_prices.sql" -Raw -Encoding UTF8

$jsonString = $sql | ConvertTo-Json -Compress
$payload    = "{`"query`":$jsonString}"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
}

try {
    $resp = Invoke-RestMethod `
        -Uri "https://api.supabase.com/v1/projects/wjvrcwvnznkisoerngal/database/query" `
        -Method POST `
        -Headers $headers `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($payload))

    Write-Host "SUCCESS:"
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Host "HTTP ERROR: $($_.Exception.Message)"
    Write-Host $_.ErrorDetails.Message
}
