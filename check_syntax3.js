try {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var f = fso.OpenTextFile("C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\app.js", 1);
    var code = f.ReadAll();
    f.Close();
    var fn = new Function(code);
    fso.CreateTextFile("C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\syntax_result.txt", true).WriteLine("SUCCESS");
} catch(e) {
    var errFile = fso.CreateTextFile("C:\\Users\\hidis\\.gemini\\antigravity\\scratch\\web-messenger\\syntax_result.txt", true);
    errFile.WriteLine("ERROR: " + e.description + " / " + e.message);
    errFile.Close();
}
