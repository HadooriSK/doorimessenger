$logPath = 'C:\Users\hidis\.gemini\antigravity\brain\0b33cf19-904f-4e7e-bc15-eab9b6a4057f\.system_generated\logs\transcript.jsonl'
$lines = Get-Content $logPath

$appJsContent = ''
$indexHtmlContent = ''
$styleCssContent = ''

foreach ($line in $lines) {
    if ($line -match '"created_at":"2026-06-08T') {
        if ($line -match '"TargetFile":"(.*?app\.js)"') {
            # Extract content. It's inside "CodeContent":"..." or "ReplacementContent":"..."
            if ($line -match '"CodeContent":"(.*?)"(?:,"|\})') {
                $appJsContent = $matches[1]
            }
        }
        if ($line -match '"TargetFile":"(.*?index\.html)"') {
            if ($line -match '"CodeContent":"(.*?)"(?:,"|\})') {
                $indexHtmlContent = $matches[1]
            }
        }
        if ($line -match '"TargetFile":"(.*?style\.css)"') {
            if ($line -match '"CodeContent":"(.*?)"(?:,"|\})') {
                $styleCssContent = $matches[1]
            }
        }
    }
}

Write-Output "App.js backup length: $($appJsContent.Length)"
Write-Output "Index.html backup length: $($indexHtmlContent.Length)"
Write-Output "Style.css backup length: $($styleCssContent.Length)"
