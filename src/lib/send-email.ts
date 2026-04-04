/**
 * Send email via Microsoft Graph API using client_credentials OAuth2.
 * Uses the same Azure App Registration as the IMAP poller.
 * Requires Mail.Send application permission.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const fromAddress = process.env.IMAP_USER; // belege_reisekosten@bundesamt.dpsgonline.de

  if (!tenant || !clientId || !clientSecret || !fromAddress) {
    console.error("Azure/IMAP env vars missing for email sending");
    return false;
  }

  // Get OAuth2 token
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("Failed to get Graph token:", tokenData);
    return false;
  }

  // Send email via Graph API
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${fromAddress}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Graph sendMail failed:", res.status, err);
    return false;
  }

  return true;
}
