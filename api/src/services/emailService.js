// Email Service for VoidCat Grant Automation Platform
// Supports MailChannels (Cloudflare Workers) and Resend

/**
 * Email service configuration and provider selection
 */
export class EmailService {
  constructor(env) {
    this.env = env;
    this.provider = env.MAIL_PROVIDER || 'mailchannels';
    this.fromEmail = env.MAIL_FROM || 'noreply@voidcat.org';
    this.fromName = 'VoidCat RDC';
  }

  /**
   * Send email using the configured provider
   * @param {Object} emailData - Email data object
   * @returns {Promise<{success: boolean, provider: string, error?: string}>}
   */
  async sendEmail(emailData) {
    try {
      if (this.provider === 'mailchannels') {
        return await this.sendViaMailChannels(emailData);
      } else if (this.provider === 'resend') {
        return await this.sendViaResend(emailData);
      } else {
        return {
          success: false,
          provider: this.provider,
          error: `Unsupported email provider: ${this.provider}`
        };
      }
    } catch (error) {
      return {
        success: false,
        provider: this.provider,
        error: error.message
      };
    }
  }

  /**
   * Send email via MailChannels (Cloudflare Workers native)
   */
  async sendViaMailChannels(emailData) {
    const mailData = {
      personalizations: [
        {
          to: [{ email: emailData.to }],
          dkim_domain: 'voidcat.org',
          dkim_selector: 'mailchannels',
          dkim_private_key: this.env.MAILCHANNELS_DKIM_PRIVATE_KEY || undefined
        }
      ],
      from: { email: this.fromEmail, name: this.fromName },
      subject: emailData.subject,
      content: [
        {
          type: 'text/plain',
          value: emailData.textContent
        },
        ...(emailData.htmlContent ? [{
          type: 'text/html',
          value: emailData.htmlContent
        }] : [])
      ]
    };

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        provider: 'mailchannels',
        error: `MailChannels API error: ${response.status} ${errorText}`
      };
    }

    return {
      success: true,
      provider: 'mailchannels'
    };
  }

  /**
   * Send email via Resend (alternative provider)
   */
  async sendViaResend(emailData) {
    if (!this.env.RESEND_API_KEY) {
      return {
        success: false,
        provider: 'resend',
        error: 'RESEND_API_KEY environment variable not configured'
      };
    }

    const resendData = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: [emailData.to],
      subject: emailData.subject,
      text: emailData.textContent,
      ...(emailData.htmlContent && { html: emailData.htmlContent })
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(resendData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        provider: 'resend',
        error: `Resend API error: ${response.status} ${errorData.message || 'Unknown error'}`
      };
    }

    return {
      success: true,
      provider: 'resend'
    };
  }

  /**
   * Generate registration email content
   * @param {Object} userData - User registration data
   * @returns {Object} Email data object
   */
  generateRegistrationEmail(userData) {
    const { name, email, apiKey } = userData;
    
    const textContent = `Welcome to VoidCat RDC, ${name}!

Thank you for registering with VoidCat RDC Federal Grant Automation Platform.

Your Account Details:
- Email: ${email}
- API Key: ${apiKey}

Important: Keep your API key secure and do not share it. You will need this key to access our grant search and proposal generation features.

Getting Started:
1. Use your API key to authenticate API requests
2. Search federal grants using our comprehensive database
3. Generate professional grant proposals with AI assistance

Need help? Visit our documentation or contact support.

If you did not create this account, please ignore this email.

Best regards,
The VoidCat RDC Team

---
VoidCat RDC - Federal Grant Automation Platform
Website: https://voidcat.org`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to VoidCat RDC</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1f2937; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .api-key { background: #e5e7eb; padding: 10px; font-family: monospace; border-radius: 4px; }
        .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to VoidCat RDC</h1>
        </div>
        <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for registering with VoidCat RDC Federal Grant Automation Platform.</p>
            
            <h3>Your Account Details:</h3>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>API Key:</strong> <div class="api-key">${apiKey}</div></li>
            </ul>
            
            <p><strong>Important:</strong> Keep your API key secure and do not share it.</p>
            
            <h3>Getting Started:</h3>
            <ol>
                <li>Use your API key to authenticate API requests</li>
                <li>Search federal grants using our comprehensive database</li>
                <li>Generate professional grant proposals with AI assistance</li>
            </ol>
            
            <p>If you did not create this account, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>VoidCat RDC - Federal Grant Automation Platform<br>
            Website: <a href="https://voidcat.org">https://voidcat.org</a></p>
        </div>
    </div>
</body>
</html>`;

    return {
      to: email,
      subject: 'Welcome to VoidCat RDC – Your API Key',
      textContent,
      htmlContent
    };
  }
}

// Legacy function for backward compatibility
export async function sendRegistrationEmail({ email, apiKey }, env) {
  const emailService = new EmailService(env);
  const emailData = emailService.generateRegistrationEmail({
    name: email.split('@')[0], // Simple name fallback
    email,
    apiKey
  });
  
  const result = await emailService.sendEmail(emailData);
  return {
    success: result.success,
    error: result.error
  };
}

export default EmailService;
