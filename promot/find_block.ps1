$content = [System.IO.File]::ReadAllText('D:\桌面\promot\prompt-generator\src\app\api\prompt\route.ts', [System.Text.Encoding]::UTF8)

$bt = [char]0x60  # backtick

# Find start of userPrompt block
$startMarker = '    let userPrompt = ' + $bt
$startIdx = $content.IndexOf($startMarker)

# Find "if (feedback)" after startIdx
$feedbackIdx = $content.IndexOf('if (feedback)', $startIdx)

# Find the last  + $bt + "; before if (feedback)
$searchBack = $content.Substring($startIdx, $feedbackIdx - $startIdx)
$lastBT = $searchBack.LastIndexOf($bt + ';')
$absEnd = $startIdx + $lastBT + 2

Write-Host "Start: $startIdx, End: $absEnd"
Write-Host "Block length: $($absEnd - $startIdx)"

Write-Host '===OLD BLOCK==='
Write-Host $content.Substring($startIdx, $absEnd - $startIdx)
Write-Host '===END OLD BLOCK==='

Write-Host '===CONTEXT AROUND==='
Write-Host $content.Substring([Math]::Max(0, $startIdx - 30), 30)
Write-Host '>>>START'
Write-Host $content.Substring($absEnd, [Math]::Min(50, $content.Length - $absEnd))
