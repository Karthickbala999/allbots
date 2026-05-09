$ErrorActionPreference = 'Stop'

$ProjectName = 'nkg-bot'
$ServiceName = 'nkg-bot'
$AllowedVariables = @(
    'TOKEN',
    'CLIENT_ID',
    'GUILD_ID',
    'VOICE_CHANNEL_ID',
    'WELCOME_CHANNEL_ID',
    'LOG_CHANNEL_ID',
    'TICKET_CATEGORY_ID',
    'AUTO_ROLE_ID'
)
$RequiredVariables = @('TOKEN', 'CLIENT_ID', 'GUILD_ID', 'VOICE_CHANNEL_ID')

Set-Location $PSScriptRoot

function Invoke-Railway {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]] $RailwayArgs
    )

    & npx.cmd -y '@railway/cli@latest' @RailwayArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Railway command failed: railway $($RailwayArgs -join ' ')"
    }
}

function Read-DotEnv {
    $envPath = Join-Path $PSScriptRoot '.env'
    if (-not (Test-Path $envPath)) {
        throw 'Missing .env file. Fill .env first, then run deploy-railway.bat again.'
    }

    $values = @{}
    foreach ($line in Get-Content $envPath) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) {
            continue
        }

        $parts = $trimmed.Split('=', 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        if ($value.Length -ge 2) {
            $first = $value[0]
            $last = $value[$value.Length - 1]
            if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        if ($AllowedVariables -contains $key -and $value) {
            $values[$key] = $value
        }
    }

    foreach ($key in $RequiredVariables) {
        if (-not $values.ContainsKey($key)) {
            throw "Missing required .env value: $key"
        }
    }

    return $values
}

Write-Host ''
Write-Host 'NKG BOT Railway deploy'
Write-Host '----------------------'
Write-Host 'This deploys the bot to Railway so it can run after your laptop is shut down.'
Write-Host 'You must login to your own Railway account in the browser when asked.'
Write-Host 'Do not paste your Discord bot token in chat; this script reads it from .env locally.'
Write-Host ''
Write-Host 'Railway may require a trial or paid plan for always-on hosting.'
Write-Host ''

$variables = Read-DotEnv

Write-Host 'Step 1/5: Railway login'
Invoke-Railway login
Invoke-Railway whoami

Write-Host ''
Write-Host 'Step 2/5: Create or link Railway project'
if (Test-Path (Join-Path $PSScriptRoot '.railway')) {
    Write-Host 'Existing Railway link found. Reusing it.'
} else {
    Invoke-Railway init --name $ProjectName
}

Write-Host ''
Write-Host 'Step 3/5: Create worker service'
try {
    Invoke-Railway add --service $ServiceName
} catch {
    Write-Host 'Service creation was skipped or already exists. Continuing with deployment.'
}

Write-Host ''
Write-Host 'Step 4/5: Upload environment variables'
foreach ($key in $AllowedVariables) {
    if ($variables.ContainsKey($key)) {
        Invoke-Railway variable set --service $ServiceName --skip-deploys "$key=$($variables[$key])"
        Write-Host "Set $key"
    }
}

Write-Host ''
Write-Host 'Step 5/5: Deploy bot'
Invoke-Railway up --service $ServiceName --detach --message 'Deploy NKG Discord bot'
Invoke-Railway status

Write-Host ''
Write-Host 'Done. Open Railway dashboard to confirm the nkg-bot service is running.'
Write-Host 'To view cloud logs later, run: npx.cmd -y @railway/cli@latest logs --service nkg-bot'
