$lines = Get-Content 'C:\Users\hidis\.gemini\antigravity\brain\0b33cf19-904f-4e7e-bc15-eab9b6a4057f\.system_generated\logs\transcript.jsonl'
$lastAppJs = ''
$lastStyleCss = ''

foreach ($line in $lines) {
    if ($line -match '"created_at":"2026-06-08T') {
        try {
            $json = $line | ConvertFrom-Json
            if ($json.tool_calls) {
                foreach ($tool in $json.tool_calls) {
                    if ($tool.name -eq 'write_to_file' -or $tool.name -eq 'replace_file_content' -or $tool.name -eq 'multi_replace_file_content') {
                        if ($tool.args.TargetFile -match 'app\.js') {
                            if ($tool.args.CodeContent) {
                                $lastAppJs = $tool.args.CodeContent
                            }
                        }
                        if ($tool.args.TargetFile -match 'style\.css') {
                            if ($tool.args.CodeContent) {
                                $lastStyleCss = $tool.args.CodeContent
                            }
                        }
                    }
                }
            }
        } catch {}
    }
}

if ($lastAppJs) {
    [System.IO.File]::WriteAllText("C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\app_backup.js", $lastAppJs, [System.Text.Encoding]::UTF8)
    Write-Output "App.js backup saved, length: $($lastAppJs.Length)"
}
if ($lastStyleCss) {
    [System.IO.File]::WriteAllText("C:\Users\hidis\.gemini\antigravity\scratch\web-messenger\style_backup.css", $lastStyleCss, [System.Text.Encoding]::UTF8)
    Write-Output "Style.css backup saved, length: $($lastStyleCss.Length)"
}
