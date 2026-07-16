<#
.SYNOPSIS
  Backs up each browser extension's key.pem to the Linode (~/keys) for safekeeping.

.DESCRIPTION
  Copies key.pem from each extension repo to /tmp on the Linode via scp, then
  moves them into ~/keys with 600 permissions and a per-extension filename
  (key.pem alone is ambiguous once there's more than one). /tmp is used as a
  relay because these are user-owned files under $HOME - no sudo/root step
  needed, unlike the /var/www CRX deploys.

.NOTES
  Run from any directory; paths below are absolute. Requires an SSH key
  already authorized for jason@ssh.tendimensions.com (same auth used for the
  CRX deploys).
#>

$ErrorActionPreference = "Stop"

$sshHost = "jason@ssh.tendimensions.com"

$keys = @(
    @{ Name = "custom-add-bookmark";     Path = "C:\Users\Softupdate\Source\Repos\CustomAddBookmark\key.pem" },
    @{ Name = "clean-url-copy";          Path = "C:\Users\Softupdate\Source\Repos\URLCopyExtension\key.pem" },
    @{ Name = "reddit-comment-sentiment"; Path = "C:\Users\Softupdate\Source\Repos\RedditCommentSentiment\key.pem" }
)

foreach ($k in $keys) {
    if (-not (Test-Path $k.Path)) {
        Write-Warning "Skipping $($k.Name) - not found at $($k.Path)"
        continue
    }
    $remoteName = "$($k.Name).pem"
    Write-Host "Uploading $($k.Name) -> ${sshHost}:/tmp/$remoteName"
    scp $k.Path "${sshHost}:/tmp/$remoteName"
    if ($LASTEXITCODE -ne 0) {
        throw "scp failed for $($k.Name) (exit $LASTEXITCODE)"
    }
}

Write-Host "`nMoving keys into ~/keys on the Linode..."
$remoteNames = ($keys | ForEach-Object { "$($_.Name).pem" }) -join " "
ssh $sshHost "mkdir -p ~/keys && chmod 700 ~/keys && cd /tmp && mv $remoteNames ~/keys/ && chmod 600 ~/keys/*.pem && ls -la ~/keys"
if ($LASTEXITCODE -ne 0) {
    throw "ssh move/chmod step failed (exit $LASTEXITCODE)"
}

Write-Host "`nDone. Keys backed up to ~/keys on the Linode."
