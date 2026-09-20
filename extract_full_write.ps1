$lines = Get-Content 'C:\Users\hidis\.gemini\antigravity\brain\0b33cf19-904f-4e7e-bc15-eab9b6a4057f\.system_generated\logs\transcript.jsonl'
$lastWrite = ''
foreach ($line in $lines) {
    if (-not ($line -match '2026-06-09T') -and -not ($line -match '2026-06-10T')) {
        if ($line -match 'app\.js') {
            if ($line -match '"name":"write_to_file"') {
                $lastWrite = $line
            }
        }
    }
}
if ($lastWrite) {
    $json = $lastWrite | ConvertFrom-Json
    [System.IO.File]::WriteAllText("C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app_clean.js", $json.tool_calls[0].args.CodeContent, [System.Text.Encoding]::UTF8)
    Write-Output "Found full write_to_file and saved app_clean.js"
} else {
    Write-Output "No write_to_file found"
}
