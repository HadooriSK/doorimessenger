$ErrorActionPreference = "Stop"
$file = "C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app.js"

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$replacements = @{
    "Ã¤" = "ä"
    "Ã¶" = "ö"
    "Ã¼" = "ü"
    "ÃŸ" = "ß"
    "Ã„" = "Ä"
    "Ã–" = "Ö"
    "Ãœ" = "Ü"
    "â ¤ï¸ " = "❤️"
    "ðŸ‘ " = "👍"
    "ðŸ˜‚" = "😂"
    "ðŸ‘Ž" = "👎"
    "ðŸ”¥" = "🔥"
    "â†ªï¸ " = "↪️"
    "ðŸ—‘ï¸ " = "🗑️"
    "âœ–" = "✖"
    "ðŸ“¹" = "📹"
    "ðŸ“·" = "📷"
    "â– " = "■"
    "âŒ›" = "⏳"
    "ðŸ“Ž" = "📎"
    "ðŸ”’" = "🔒"
    "ðŸ•’" = "🕘"
    "ðŸ’¾" = "💾"
    "âœ“âœ“" = "✓✓"
    "âœ“" = "✓"
    "âž•" = "➕"
    "âš™ï¸ " = "⚙️"
    "ðŸ” " = "🔍"
    "â ³" = "⏳"
    "âž¤" = "➤"
    "ðŸ”•" = "🔕"
    "ðŸŽ¤" = "🎤"
    "ðŸ“Š" = "📊"
    "ðŸ˜€" = "😀"
}

$modified = $false
foreach ($key in $replacements.Keys) {
    if ($content.Contains($key)) {
        $content = $content.Replace($key, $replacements[$key])
        $modified = $true
    }
}

if ($modified) {
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully fixed app.js"
} else {
    Write-Output "No mojibake found"
}
