// Email Service for VoidCat Grant Automation Platform
// Supports MailChannels (Cloudflare Workers) and Resend

import { convert } from 'html-to-text';
/**
 * Email service configuration and provider selection
 */
export class EmailService {
  constructor(env) {
    this.env = env;
    this.provider = env.MAIL_PROVIDER || 'mailchannels';
    this.fromEmail = env.MAIL_FROM || 'noreply@voidcat.org';
    
    // Rate limiting (simple in-memory store for now)
    this.rateLimitStore = new Map();
    this.maxEmailsPerHour = 10;
  }

  /**
   * Check rate limit for email address
   */
  checkRateLimit(email) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Clean old entries
    for (const [key, timestamp] of this.rateLimitStore.entries()) {
      if (timestamp < hourAgo) {
        this.rateLimitStore.delete(key);
      }
    }
    
    // Get emails sent to this address in the last hour
    const emailsSent = Array.from(this.rateLimitStore.entries())
      .filter(([key, timestamp]) => key.startsWith(email + ':') && timestamp > hourAgo)
      .length;
    
    return emailsSent < this.maxEmailsPerHour;
  }

  /**
   * Record email sent for rate limiting
   */
  recordEmailSent(email, type) {
    const key = `${email}:${type}:${Date.now()}`;
    this.rateLimitStore.set(key, Date.now());
  }

  /**
   * Send email using configured provider
   */
  async sendEmail({ to, subject, htmlContent, textContent, templateType = 'general' }) {
    try {
      // Check rate limit
      if (!this.checkRateLimit(to)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      let result;
      
      if (this.provider === 'mailchannels') {
        result = await this.sendWithMailChannels({ to, subject, htmlContent, textContent });
      } else if (this.provider === 'resend') {
        result = await this.sendWithResend({ to, subject, htmlContent, textContent });
      } else {
        throw new Error(`Unsupported email provider: ${this.provider}`);
      }

      // Record successful send for rate limiting
      this.recordEmailSent(to, templateType);
      
      return {
        success: true,
        provider: this.provider,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Email sending failed:', {
        error: error.message,
        to,
        subject,
        provider: this.provider,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error.message,
        provider: this.provider,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send email using MailChannels (Cloudflare Workers)
   */
  async sendWithMailChannels({ to, subject, htmlContent, textContent }) {
    const emailData = {
      personalizations: [
        {
          to: [{ email: to }],
          dkim_domain: 'voidcat.org',
          dkim_selector: 'mailchannels',
          dkim_private_key: this.env.DKIM_PRIVATE_KEY || undefined
        }
      ],
      from: {
        email: this.fromEmail,
        name: 'VoidCat RDC'
      },
      subject: subject,
      content: [
        {
          type: 'text/plain',
          value: textContent || this.htmlToText(htmlContent)
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    };

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MailChannels API error: ${response.status} - ${errorText}`);
    }

    return {
      messageId: `mc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provider: 'mailchannels'
    };
  }

  /**
   * Send email using Resend
   */
  async sendWithResend({ to, subject, htmlContent, textContent }) {
    if (!this.env.RESEND_API_KEY) {
      throw new Error('Resend API key not configured');
    }

    const emailData = {
      from: `${this.fromEmail}`,
      to: [to],
      subject: subject,
      html: htmlContent,
      text: textContent || this.htmlToText(htmlContent)
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      messageId: result.id,
      provider: 'resend'
    };
  }

  /**
   * Convert HTML to plain text (basic implementation)
   */
  htmlToText(html) {
    if (!html) return '';
    // Use robust html-to-text library to prevent incomplete sanitization
    return convert(html, {
      wordwrap: false, // avoid wrapping lines
      selectors: [ // preserve newlines for <br> and <p>
        { selector: 'br', format: 'lineBreak' },
        { selector: 'p', format: 'paragraph' }
      ]
    }).trim();
  }

  /**
   * Generate registration confirmation email
   */
  generateRegistrationEmail(userInfo) {
    const { name, email, apiKey } = userInfo;
    
    const subject = '🚀 Welcome to VoidCat RDC - Your Federal Grant Automation Account is Ready!';
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VoidCat RDC</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .api-key { background: #e9ecef; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px; border-left: 4px solid #007bff; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🚀 Welcome to VoidCat RDC!</h1>
            <p>Your Federal Grant Automation Platform</p>
        </div>
        <div class="content">
            <p>Hi ${name || 'there'},</p>
            
            <p>Welcome to VoidCat RDC! Your account has been successfully created and you're ready to start discovering and applying for federal grants with the power of AI automation.</p>
            
            <h3>🔑 Your API Key</h3>
            <p>Your unique API key for accessing the platform:</p>
            <div class="api-key">
                <strong>${apiKey}</strong>
            </div>
            <p><small>⚠️ Keep this API key secure and don't share it with others.</small></p>
            
            <h3>🎯 What's Next?</h3>
            <ul>
                <li><strong>Search Grants:</strong> Find federal funding opportunities tailored to your needs</li>
                <li><strong>Generate Proposals:</strong> Use AI to create compelling grant applications</li>
                <li><strong>Track Applications:</strong> Monitor your submissions and deadlines</li>
                <li><strong>Upgrade to Pro:</strong> Unlock unlimited access for $99/month</li>
            </ul>
            
            <a href="https://sorrowscry86.github.io/voidcat-grant-automation" class="button">Start Exploring Grants →</a>
            
            <h3>📚 Getting Started Resources</h3>
            <ul>
                <li><a href="#">Platform User Guide</a></li>
                <li><a href="#">Grant Writing Best Practices</a></li>
                <li><a href="#">Success Stories</a></li>
                <li><a href="#">Contact Support</a></li>
            </ul>
            
            <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
            
            <p>Happy grant hunting! 🎉</p>
            <p><strong>The VoidCat RDC Team</strong></p>
        </div>
        <div class="footer">
            <p>VoidCat RDC Federal Grant Automation Platform<br>
            This email was sent to ${email}</p>
        </div>
    </body>
    </html>`;

    const textContent = `
Welcome to VoidCat RDC!

Hi ${name || 'there'},

Welcome to VoidCat RDC! Your account has been successfully created and you're ready to start discovering and applying for federal grants with the power of AI automation.

Your API Key: ${apiKey}
⚠️ Keep this API key secure and don't share it with others.

What's Next?
- Search Grants: Find federal funding opportunities tailored to your needs
- Generate Proposals: Use AI to create compelling grant applications  
- Track Applications: Monitor your submissions and deadlines
- Upgrade to Pro: Unlock unlimited access for $99/month

Start exploring grants at: https://sorrowscry86.github.io/voidcat-grant-automation

If you have any questions or need assistance, don't hesitate to reach out to our support team.

Happy grant hunting! 🎉
The VoidCat RDC Team

This email was sent to ${email}
`;

    return {
      to: email,
      subject,
      htmlContent,
      textContent,
      templateType: 'registration'
    };
  }

  /**
   * Generate grant deadline reminder email
   */
  generateDeadlineReminderEmail(userInfo, grants) {
    const { name, email } = userInfo;
    
    const subject = `⏰ Grant Deadlines Approaching - ${grants.length} opportunities closing soon`;
    
    const grantsList = grants.map(grant => 
      `<li><strong>${grant.title}</strong> - ${grant.agency}<br>
       <small>Deadline: ${grant.deadline} | Amount: ${grant.amount}</small></li>`
    ).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Grant Deadlines Approaching</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .grants-list { background: white; padding: 20px; border-radius: 6px; border-left: 4px solid #ff6b6b; }
            .button { display: inline-block; background: #ff6b6b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>⏰ Deadlines Approaching</h1>
            <p>Don't miss these funding opportunities!</p>
        </div>
        <div class="content">
            <p>Hi ${name || 'there'},</p>
            
            <p>This is a friendly reminder that you have ${grants.length} grant ${grants.length === 1 ? 'opportunity' : 'opportunities'} with upcoming deadlines:</p>
            
            <div class="grants-list">
                <ul>
                ${grantsList}
                </ul>
            </div>
            
            <a href="https://sorrowscry86.github.io/voidcat-grant-automation" class="button">Review & Apply Now →</a>
            
            <p>Don't let these opportunities slip away! Use our AI-powered proposal generator to create compelling applications quickly and efficiently.</p>
            
            <p><strong>The VoidCat RDC Team</strong></p>
        </div>
        <div class="footer">
            <p>VoidCat RDC Federal Grant Automation Platform<br>
            This email was sent to ${email}</p>
        </div>
    </body>
    </html>`;

    return {
      to: email,
      subject,
      htmlContent,
      textContent: this.htmlToText(htmlContent),
      templateType: 'deadline_reminder'
    };
  }
}

export default EmailService;
