$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:8088'
$secure = Read-Host 'Nhap DEMO_PASSWORD' -AsSecureString
$demoPassword = [System.Net.NetworkCredential]::new('', $secure).Password

try {
    $tokens = @{}
    foreach ($role in @('TENANT', 'LANDLORD', 'MANAGER', 'ADMIN')) {
        $identifier = switch ($role) {
            'TENANT' { 'tenant01@demo.local' }
            'LANDLORD' { 'landlord@demo.local' }
            'MANAGER' { 'manager@demo.local' }
            'ADMIN' { 'admin@demo.local' }
        }
        $loginBody = @{ identifier = $identifier; password = $demoPassword } |
            ConvertTo-Json -Compress
        $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post `
            -ContentType 'application/json' -Body $loginBody
        if (-not $login.accessToken) {
            throw "Dang nhap $role khong tra accessToken"
        }
        $tokens[$role] = $login.accessToken
    }
} finally {
    Remove-Variable secure, demoPassword, loginBody, login -ErrorAction SilentlyContinue
}

# Moi module co it nhat mot phep doc. Cac phep ghi ben duoi chi dung ID 0
# hoac role bi cam, nen khong thay doi du lieu demo.
$cases = @(
    @{ Module = 'Accounts'; Name = 'Own profile'; Method = 'GET'; Path = '/api/profile'; Expected = @{ TENANT = 200; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Accounts'; Name = 'Admin users'; Method = 'GET'; Path = '/api/admin/users'; Expected = @{ TENANT = 403; LANDLORD = 403; MANAGER = 403; ADMIN = 200 } }
    @{ Module = 'Buildings'; Name = 'Building list'; Method = 'GET'; Path = '/api/buildings'; Expected = @{ TENANT = 403; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Rooms'; Name = 'Room list'; Method = 'GET'; Path = '/api/rooms'; Expected = @{ TENANT = 403; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Prices'; Name = 'Service prices'; Method = 'GET'; Path = '/api/services'; Expected = @{ LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Listings'; Name = 'Public listings'; Method = 'GET'; Path = '/api/public/listings/search'; Expected = @{ TENANT = 200; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Requests'; Name = 'Own requests'; Method = 'GET'; Path = '/api/rental-requests/my'; Expected = @{ TENANT = 200 } }
    @{ Module = 'Requests'; Name = 'Building requests'; Method = 'GET'; Path = '/api/landlord/requests'; Expected = @{ LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Contracts'; Name = 'Own contracts'; Method = 'GET'; Path = '/api/tenant/contracts'; Expected = @{ TENANT = 200 } }
    @{ Module = 'Contracts'; Name = 'Building contracts'; Method = 'GET'; Path = '/api/landlord/requests/contracts'; Expected = @{ LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Meters'; Name = 'Meter buildings'; Method = 'GET'; Path = '/api/manager/meter-readings/buildings'; Expected = @{ LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Invoices'; Name = 'Invoice detail'; Method = 'GET'; Path = '/api/invoices/3'; Expected = @{ TENANT = 200; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Debts'; Name = 'Debt list'; Method = 'GET'; Path = '/api/debts'; Expected = @{ TENANT = 403; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Maintenance'; Name = 'Own reports'; Method = 'GET'; Path = '/api/maintenance-reports'; Expected = @{ TENANT = 200 } }
    @{ Module = 'Maintenance'; Name = 'Managed reports'; Method = 'GET'; Path = '/api/manager/maintenance-reports'; Expected = @{ LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Reports'; Name = 'Monthly report'; Method = 'GET'; Path = '/api/reports/monthly?from=2026-07&to=2026-09'; Expected = @{ TENANT = 403; LANDLORD = 200; MANAGER = 200; ADMIN = 200 } }
    @{ Module = 'Accounts'; Name = 'Non-admin creates user'; Method = 'POST'; Path = '/api/admin/users'; Expected = @{ TENANT = 403; LANDLORD = 403; MANAGER = 403 } }
    @{ Module = 'Buildings'; Name = 'Non-landlord creates building'; Method = 'POST'; Path = '/api/buildings'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Rooms'; Name = 'Non-landlord creates room'; Method = 'POST'; Path = '/api/rooms'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Listings'; Name = 'Non-landlord creates listing'; Method = 'POST'; Path = '/api/listings'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Requests'; Name = 'Non-landlord approves request'; Method = 'POST'; Path = '/api/landlord/requests/0/approve'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Contracts'; Name = 'Non-landlord settles contract'; Method = 'POST'; Path = '/api/checkout/0'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Meters'; Name = 'Read-only roles save meter'; Method = 'POST'; Path = '/api/manager/meter-readings'; Expected = @{ TENANT = 403; ADMIN = 403 } }
    @{ Module = 'Invoices'; Name = 'Read-only roles issue invoice'; Method = 'POST'; Path = '/api/invoices/0/issue'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Debts'; Name = 'Read-only roles pay invoice'; Method = 'POST'; Path = '/api/debts/invoices/0/pay'; Expected = @{ TENANT = 403; MANAGER = 403; ADMIN = 403 } }
    @{ Module = 'Maintenance'; Name = 'Read-only roles change status'; Method = 'PATCH'; Path = '/api/manager/maintenance-reports/0/status?status=IN_PROGRESS&note=test'; Expected = @{ TENANT = 403; ADMIN = 403 } }
)

$passCount = 0
$failures = @()
foreach ($case in $cases) {
    foreach ($role in @('TENANT', 'LANDLORD', 'MANAGER', 'ADMIN')) {
        if (-not $case.Expected.ContainsKey($role)) { continue }

        $curlArgs = @('-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '15',
            '-X', $case.Method, '-H', "Authorization: Bearer $($tokens[$role])")
        if ($case.Method -ne 'GET') {
            $curlArgs += @('-H', 'Content-Type: application/json', '--data-raw', '{}')
        }
        $actual = [string](& curl.exe @curlArgs "$baseUrl$($case.Path)")
        $actual = $actual.Trim()
        $expected = [string]$case.Expected[$role]
        if ($actual -eq $expected) {
            $passCount++
        } else {
            $failures += "FAIL [$($case.Module)] $($case.Name) / $role : expected $expected, got $actual"
        }
    }
}

Remove-Variable tokens -ErrorAction SilentlyContinue
Write-Host "PASS: $passCount"
foreach ($failure in $failures) { Write-Host $failure }
Write-Host "FAIL: $($failures.Count)"
if ($failures.Count -gt 0) { exit 1 }
