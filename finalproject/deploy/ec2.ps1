# Deploy the Daily Challenge Django API to the class EC2 instance.
# Run this from PowerShell on the machine that has the key pair.
#
#   powershell -ExecutionPolicy Bypass -File .\deploy\ec2.ps1
#
# Instance: 13.56.184.13
# Key pair: data5570finalproject
# Key file: C:\Users\tynea\Downloads\data5570finalproject.pem

$ErrorActionPreference = "Stop"

$Key = "C:\Users\tynea\Downloads\data5570finalproject.pem"
$Server = "13.56.184.13"
$UserName = "ec2-user"

if (-not (Test-Path $Key)) {
  Write-Error "The key file is not at $Key"
}

# OpenSSH refuses a private key other users can read.
icacls $Key /inheritance:r | Out-Null
icacls $Key /grant:r "${env:USERNAME}:(R)" | Out-Null

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Archive = Join-Path $env:TEMP "rally-finalproject.tgz"
if (Test-Path $Archive) { Remove-Item $Archive }

tar -czf $Archive `
  --exclude=node_modules `
  --exclude=.venv `
  --exclude=.expo `
  --exclude=db.sqlite3 `
  --exclude=media `
  --exclude=.env `
  -C $ProjectRoot .

scp -i $Key -o StrictHostKeyChecking=accept-new $Archive "${UserName}@${Server}:/tmp/rally-finalproject.tgz"
scp -i $Key -o StrictHostKeyChecking=accept-new (Join-Path $PSScriptRoot "remote-setup.sh") "${UserName}@${Server}:/tmp/rally-remote-setup.sh"
ssh -i $Key -o StrictHostKeyChecking=accept-new "${UserName}@${Server}" "bash /tmp/rally-remote-setup.sh"

Write-Host "API: http://${Server}:8000/api/health/"
Write-Host "Open TCP 8000 in the instance security group if that URL does not load."
