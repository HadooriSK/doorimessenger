
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function testBrevo() {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'api-key': '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',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: "Doori Messenger", email: "noreply@doori-messenger.de" },
            to: [{ email: "test@example.com" }],
            subject: "Test",
            htmlContent: "Test"
          })
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text);
    } catch(e) {
        console.error("Fetch error:", e);
    }
}
testBrevo();
