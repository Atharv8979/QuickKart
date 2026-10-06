import nodemailer from 'nodemailer';

/**
 * Email delivery for QuickKart transactional messages.
 *
 * Configure Gmail SMTP (or any SMTP provider) with these env vars:
 *   SMTP_HOST   default: smtp.gmail.com
 *   SMTP_PORT   default: 465
 *   SMTP_SECURE default: true
 *   SMTP_USER   e.g. quickkart.team@gmail.com
 *   SMTP_PASS   Gmail "App Password" (16 chars, NOT your normal password)
 *   SMTP_FROM   optional "From" address (defaults to SMTP_USER)
 *   SMTP_FROM_NAME default: QuickKart
 *
 * When SMTP is not configured the code is written to the server console so the
 * flow stays testable locally. It is NEVER returned to the client in production.
 */

let cachedTransporter = null;
let cachedKey = null;

const getSmtpConfig = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? 'true') === 'true',
    user,
    pass,
  };
};

export const isEmailConfigured = () => Boolean(getSmtpConfig());

const getTransporter = () => {
  const cfg = getSmtpConfig();
  if (!cfg) return null;

  const key = `${cfg.host}:${cfg.port}:${cfg.user}`;
  if (cachedTransporter && cachedKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  cachedKey = key;
  return cachedTransporter;
};

const escapeHtml = (value) => String(value || '').replace(/[<>&]/g, '');

const buildResetCodeHtml = ({ name, code, ttlMinutes }) => `
  <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:24px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">QuickKart</h1>
        <p style="margin:4px 0 0;color:#e0f2fe;font-size:12px;">Hyperlocal Product Discovery</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:15px;">Hi ${escapeHtml(name) || 'there'},</p>
        <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
          We received a request to reset your QuickKart password. Enter the verification
          code below to continue. This code expires in <strong>${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}</strong>.
        </p>
        <div style="text-align:center;margin:0 0 20px;">
          <div style="display:inline-block;padding:16px 28px;background:#f0f9ff;border:1px dashed #0ea5e9;border-radius:16px;">
            <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:#0369a1;font-family:Consolas,Menlo,monospace;">${code}</span>
          </div>
        </div>
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;line-height:1.6;">
          If you did not request a password reset, you can safely ignore this email -
          your password will remain unchanged.
        </p>
        <p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:11px;">
          For your security, never share this code with anyone. QuickKart staff will
          never ask you for it.
        </p>
      </div>
    </div>
  </div>`;

const buildResetCodeText = ({ name, code, ttlMinutes }) =>
  `Hi ${name || 'there'},\n\n` +
  `Your QuickKart password reset code is: ${code}\n` +
  `It expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}.\n\n` +
  `If you did not request this, you can safely ignore this email.\n` +
  `Never share this code with anyone.\n\n- QuickKart`;

const buildPasswordChangedHtml = ({ name }) => `
  <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:24px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">QuickKart</h1>
        <p style="margin:4px 0 0;color:#d1fae5;font-size:12px;">Security Notification</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:15px;">Hi ${escapeHtml(name) || 'there'},</p>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
          Your QuickKart password was <strong>changed successfully</strong>. You can now
          sign in using your new password.
        </p>
        <p style="margin:0;padding:14px;background:#fef2f2;border-radius:12px;color:#b91c1c;font-size:12px;line-height:1.6;">
          If you did not make this change, contact support immediately and reset your
          password again.
        </p>
      </div>
    </div>
  </div>`;

/**
 * Sends the password-reset code.
 * @returns {Promise<{sent:boolean, via:'smtp'|'console', error?:string}>}
 */
export const sendPasswordResetCodeEmail = async ({ to, name, code, ttlMinutes }) => {
  const cfg = getSmtpConfig();
  const sender = process.env.SMTP_FROM || cfg?.user;

  if (!cfg) {
    console.warn(
      '\n============== QUICKKART PASSWORD RESET (EMAIL NOT CONFIGURED) ==============\n' +
        `  Recipient : ${to}\n` +
        `  Code      : ${code}   (valid ${ttlMinutes} min)\n` +
        '  Set SMTP_USER / SMTP_PASS (Gmail App Password) to deliver this by email.\n' +
        '============================================================================\n'
    );
    return { sent: false, via: 'console' };
  }

  try {
    await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'QuickKart'}" <${sender}>`,
      to,
      subject: `Your QuickKart password reset code: ${code}`,
      text: buildResetCodeText({ name, code, ttlMinutes }),
      html: buildResetCodeHtml({ name, code, ttlMinutes }),
    });
    return { sent: true, via: 'smtp' };
  } catch (error) {
    console.error(`[Email] Failed to send reset code to ${to}:`, error.message);
    return { sent: false, via: 'smtp', error: error.message };
  }
};

/** Fire-and-forget "your password changed" alert. Never throws. */
export const sendPasswordChangedEmail = async ({ to, name }) => {
  const cfg = getSmtpConfig();
  if (!cfg) return { sent: false, via: 'console' };

  try {
    await getTransporter().sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'QuickKart'}" <${process.env.SMTP_FROM || cfg.user}>`,
      to,
      subject: 'Your QuickKart password was changed',
      html: buildPasswordChangedHtml({ name }),
    });
    return { sent: true, via: 'smtp' };
  } catch (error) {
    console.error(`[Email] Failed to send password-changed notice to ${to}:`, error.message);
    return { sent: false, via: 'smtp', error: error.message };
  }
};

