$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

function Read-RequiredInput {
    param(
        [string] $Prompt,
        [string] $DefaultValue = ''
    )

    if ($DefaultValue) {
        $value = Read-Host "$Prompt [$DefaultValue]"
        if (-not $value) {
            return $DefaultValue
        }
        return $value
    }

    $value = Read-Host $Prompt
    if (-not $value) {
        throw "$Prompt is required."
    }
    return $value
}

function Invoke-Step {
    param(
        [string] $Name,
        [scriptblock] $Script
    )

    Write-Host ''
    Write-Host $Name
    Write-Host ('-' * $Name.Length)
    & $Script
}

if (-not (Test-Path '.env')) {
    throw 'Missing .env file. The Oracle VM needs the bot token and channel IDs from .env.'
}

$hostIp = Read-RequiredInput 'Oracle VM public IP'
$user = Read-RequiredInput 'Oracle VM SSH username' 'ubuntu'
$keyPath = Read-RequiredInput 'Full path to SSH private key file'
$keyPath = (Resolve-Path $keyPath).Path

$remote = "$user@$hostIp"
$archive = Join-Path $env:TEMP 'nkg-bot-oracle.tar.gz'

Invoke-Step 'Create upload archive' {
    if (Test-Path $archive) {
        Remove-Item -LiteralPath $archive -Force
    }

    tar -czf $archive `
        --exclude='./node_modules' `
        --exclude='./logs' `
        --exclude='./.git' `
        --exclude='./.railway' `
        --exclude='./nkg-bot-oracle.tar.gz' `
        .

    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to create project archive.'
    }
}

Invoke-Step 'Prepare Oracle VM folder' {
    ssh -i $keyPath -o StrictHostKeyChecking=accept-new $remote 'mkdir -p ~/nkg-bot'
    if ($LASTEXITCODE -ne 0) {
        throw 'SSH connection failed. Check public IP, username, and private key.'
    }
}

Invoke-Step 'Upload bot project' {
    scp -i $keyPath $archive "${remote}:/tmp/nkg-bot-oracle.tar.gz"
    if ($LASTEXITCODE -ne 0) {
        throw 'Project upload failed.'
    }
}

Invoke-Step 'Install and start bot on Oracle VM' {
$remoteCommand = @'
set -e
find "$HOME/nkg-bot" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xzf /tmp/nkg-bot-oracle.tar.gz -C ~/nkg-bot
chmod +x ~/nkg-bot/scripts/oracle-setup.sh
bash ~/nkg-bot/scripts/oracle-setup.sh
'@

    $remoteCommand | ssh -i $keyPath $remote 'bash -s'
    if ($LASTEXITCODE -ne 0) {
        throw 'Oracle setup failed. Check the output above.'
    }
}

Invoke-Step 'Cloud bot status' {
    ssh -i $keyPath $remote 'pm2 status nkg-bot && pm2 logs nkg-bot --lines 30 --nostream'
}

Write-Host ''
Write-Host 'Done. The bot is now running on the Oracle VM.'
Write-Host 'Your laptop can be shut down after you confirm the bot is in VC.'
