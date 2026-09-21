
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
async function testBrevo() {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'api-key': 'REVOKED_BREVO_KEY_REMOVE_FROM_PROVIDER',
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
