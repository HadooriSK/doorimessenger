$lines = Get-Content 'C:\Users\hidis\.gemini\antigravity\brain\0b33cf19-904f-4e7e-bc15-eab9b6a4057f\.system_generated\logs\transcript.jsonl'
foreach ($line in $lines) {
    if ($line -match '2026-06-08T') {
        try {
            $json = $line | ConvertFrom-Json
            if ($json.tool_calls) {
                foreach ($tool in $json.tool_calls) {
                    if ($tool.name -eq 'write_to_file' -or $tool.name -eq 'replace_file_content' -or $tool.name -eq 'multi_replace_file_content') {
                        if ($tool.args.TargetFile -match 'app\.js') {
                            # This is a modification to app.js
                            Write-Output "Found app.js modification at $($json.created_at)"
                        }
                    }
                }
            }
        } catch {}
    }
}
