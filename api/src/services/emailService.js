// VoidCat RDC Email Service (Cloudflare Worker compatible)
// Supports MailChannels (native) and SendGrid (future)

/**
 * Send registration email with API key to user
 * @param {Object} opts
 * @param {string} opts.email - Recipient email
 * @param {string} opts.apiKey - User's API key
 * @param {Object} env - Worker environment (for secrets/config)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendRegistrationEmail({ email, apiKey }, env) {
  const provider = env.MAIL_PROVIDER || 'mailchannels';
  const from = env.MAIL_FROM || 'noreply@voidcat.org';

  if (provider === 'mailchannels') {
    const mailData = {
      personalizations: [
        {
          to: [{ email }],
          dkim_domain: 'voidcat.org',
          dkim_selector: 'mailchannels',
          dkim_private_key: env.MAILCHANNELS_DKIM_PRIVATE_KEY || undefined
        }
      ],
      from: { email: from, name: 'VoidCat RDC' },
      subject: 'Welcome to VoidCat RDC – Your API Key',
      content: [
        {
          type: 'text/plain',
          value: `Welcome to VoidCat RDC!\n\nYour API key: ${apiKey}\n\nKeep this key safe. You will need it to access grant search and proposal features.\n\nIf you did not register, please ignore this email.\n\nThank you,\nVoidCat RDC Team`
        }
      ]
    };
    try {
      const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailData)
      });
      if (!resp.ok) {
        const err = await resp.text();
        return { success: false, error: `MailChannels error: ${resp.status} ${err}` };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  // Add SendGrid or other providers as needed
  return { success: false, error: 'Unsupported mail provider' };
}
