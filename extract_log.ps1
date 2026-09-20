$logPath = "C:\Users\hidis\.gemini\antigravity\brain\0b33cf19-904f-4e7e-bc15-eab9b6a4057f\.system_generated\logs\transcript.jsonl"
$outFile = "C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app_from_log.txt"

# Read the file
$lines = Get-Content $logPath
foreach ($line in $lines) {
    if ($line -match 'VIEW_FILE' -and $line -match 'app\.js') {
        $json = $line | ConvertFrom-Json
        if ($json.type -eq "TOOL_RESPONSE") {
            $content = $json.content
            # The content contains the tool output. 
            [System.IO.File]::WriteAllText($outFile, $content, [System.Text.Encoding]::UTF8)
            Write-Output "Saved to app_from_log.txt"
            exit 0
        }
    }
}
Write-Output "Not found"
