<#
Deploy helper script for publishing the current folder to GitHub Pages.

Usage:
  1. Open PowerShell in the project folder (where index.html lives).
  2. Run: .\deploy.ps1
     Or with a custom repo: .\deploy.ps1 -RepoUrl "https://github.com/you/yourrepo.git"

What the script does:
  - Ensures git is available.
  - Initializes a git repo if one doesn't exist.
  - Adds all files, commits with message, sets branch to 'main'.
  - Adds/updates remote 'origin' to the specified RepoUrl.
  - Pushes to remote main branch (force only if asked).

Notes:
  - If the repository is empty or new, this will create the initial commit and push.
  - After pushing, enable GitHub Pages in the repo Settings -> Pages -> Source: main / root.
  - This script is safe but will not overwrite remote branches unless you confirm.
#>

param(
    [string]$RepoUrl = "https://github.com/wangxiaoweigood/xian.git",
    [switch]$ForcePush
)

function Write-ErrExit($msg){
    Write-Host "[ERROR] $msg" -ForegroundColor Red
    exit 1
}

# Check git availability
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-ErrExit "Git is not installed or not in PATH. Install Git and retry."
}

$cwd = Get-Location
Write-Host "Working directory: $cwd"

# Initialize repo if needed
if (-not (Test-Path ".git")) {
    Write-Host "Initializing new git repository..."
    git init
} else {
    Write-Host "Existing git repository detected."
}

# Stage all files
Write-Host "Staging files..."
git add --all

# Commit
$commitMsg = "Deploy site $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
try {
    git commit -m $commitMsg -q
} catch {
    Write-Host "No changes to commit (or commit failed). Continuing..."
}

# Ensure main branch
try {
    git rev-parse --verify main >/dev/null 2>&1
    git checkout main
} catch {
    Write-Host "Creating and switching to branch 'main'..."
    git checkout -b main
}

# Add or update remote
$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    if ($existingRemote -ne $RepoUrl) {
        Write-Host "Updating remote 'origin' to $RepoUrl"
        git remote remove origin
        git remote add origin $RepoUrl
    } else {
        Write-Host "Remote 'origin' already set to $RepoUrl"
    }
} else {
    Write-Host "Adding remote 'origin' -> $RepoUrl"
    git remote add origin $RepoUrl
}

# Push
if ($ForcePush) {
    Write-Host "Force pushing to origin/main..."
    git push -u origin main --force
} else {
    Write-Host "Pushing to origin/main..."
    git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Push failed. You may need to resolve authentication or create the remote repo first." -ForegroundColor Yellow
        Write-Host "If the remote is empty or you want to overwrite, re-run with -ForcePush"
        exit $LASTEXITCODE
    }
}

Write-Host "Push finished. If this is a GitHub repository, go to Settings → Pages and enable Pages from branch 'main' (root)."
Write-Host "Expected Pages URL (after enabling): https://<your-github-username>.github.io/<repo>/"


