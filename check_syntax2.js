try {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var f = fso.OpenTextFile("C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\app.js", 1);
    var code = f.ReadAll();
    f.Close();
    var fn = new Function(code);
    WScript.Echo("SUCCESS");
} catch(e) {
    WScript.Echo("ERROR: " + e.description);
}
