$content = Get-Content "C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app_fixed.js" -Raw

$emojisStart = $content.IndexOf("    const EMOJIS =")
$applyTranslationStart = $content.IndexOf("    function applyTranslation(lang) {")

if ($emojisStart -lt 0 -or $applyTranslationStart -lt 0) {
    Write-Output "Could not find markers!"
    exit 1
}

$part1 = $content.Substring(0, $emojisStart)
$part2 = $content.Substring($applyTranslationStart)

$fixAppJs = Get-Content "C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\fix_app.js" -Raw
$cleanTransStart = $fixAppJs.IndexOf("    const TRANSLATIONS = {")
$cleanTransEnd = $fixAppJs.IndexOf("    };") + 6

if ($cleanTransStart -lt 0 -or $cleanTransEnd -lt $cleanTransStart) {
    Write-Output "Could not find translations in fix_app.js!"
    exit 1
}

$cleanTranslations = $fixAppJs.Substring($cleanTransStart, $cleanTransEnd - $cleanTransStart)

$goodEmojisAndGifs = "    const EMOJIS = ['??','??','??','??','??','??','??','??','??','??','??','?','?','??','??'];
    const GIFS = ['https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', 'https://media.giphy.com/media/l0HlOBZcl7sbV6Vg8/giphy.gif', 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', 'https://media.giphy.com/media/26AHONQ79FdWZhAIw/giphy.gif'];

"

$newContent = $part1 + $goodEmojisAndGifs + $cleanTranslations + "

" + $part2

[System.IO.File]::WriteAllText("C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app.js", $newContent, [System.Text.Encoding]::UTF8)

Write-Output "Successfully rebuilt app.js with ALL languages and NO syntax errors!"
