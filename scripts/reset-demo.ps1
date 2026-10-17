$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path '.env.staging')) {
    throw 'Khong tim thay .env.staging'
}

$composeArgs = @('--env-file', '.env.staging', '-f', 'compose.staging.yml')

docker compose @composeArgs config --quiet
if ($LASTEXITCODE -ne 0) {
    throw 'Cau hinh Docker Compose khong hop le'
}

$startedAt = Get-Date

# Chi xoa database va uploads cua compose.staging.yml.
docker compose @composeArgs down --volumes
if ($LASTEXITCODE -ne 0) {
    throw 'Khong the dung staging'
}

docker compose @composeArgs up -d --no-build
if ($LASTEXITCODE -ne 0) {
    throw 'Khong the khoi dong staging'
}

$deadline = $startedAt.AddMinutes(2)

while ((Get-Date) -lt $deadline) {
    $invoiceCount = docker compose @composeArgs exec -T db `
        psql -U postgres -d tro_room -At `
        -c 'SELECT count(*) FROM invoices;' 2>$null

    if ($LASTEXITCODE -eq 0 -and ([string]$invoiceCount).Trim() -eq '60') {
        $seconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
        Write-Host "Reset thanh cong: 60 hoa don, $seconds giay."
        exit 0
    }

    Start-Sleep -Seconds 2
}

throw 'Qua 2 phut ma chua co du 60 hoa don. Kiem tra logs backend.'