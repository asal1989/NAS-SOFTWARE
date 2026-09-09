const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  NOTIFY_EMAIL_TO,
} = process.env;

const enabled = !!(SMTP_HOST && SMTP_USER && SMTP_PASS && NOTIFY_EMAIL_TO);

let transporter;
if (enabled) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const ICONS = {
  upload: '📤',
  delete: '🗑️',
  rename: '✏️',
  mkdir: '📁',
  move: '🔀',
};

const LABELS = {
  upload: 'File Uploaded',
  delete: 'File / Folder Deleted',
  rename: 'Item Renamed',
  mkdir: 'Folder Created',
  move: 'Item Moved',
};

function buildHtml(event, details, username) {
  const icon = ICONS[event] || '📋';
  const label = LABELS[event] || event;
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const rows = Object.entries(details)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#555;white-space:nowrap">${k}</td><td style="padding:6px 12px;font-weight:600">${v}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
    <div style="background:#1a73e8;padding:24px 28px">
      <h1 style="margin:0;color:#fff;font-size:20px">${icon} NAS Notification</h1>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#202124">${label}</p>
      <table style="border-collapse:collapse;width:100%;background:#f8f9fa;border-radius:6px">
        ${rows}
        <tr><td style="padding:6px 12px;color:#555;white-space:nowrap">By</td><td style="padding:6px 12px;font-weight:600">${username}</td></tr>
        <tr><td style="padding:6px 12px;color:#555;white-space:nowrap">Time</td><td style="padding:6px 12px;font-weight:600">${time} IST</td></tr>
      </table>
    </div>
    <div style="padding:12px 28px;border-top:1px solid #eee;color:#888;font-size:12px">
      BCIM NAS Software — automated notification
    </div>
  </div>
</body>
</html>`;
}

async function notify(event, details, username) {
  if (!enabled) return;
  const label = LABELS[event] || event;
  try {
    await transporter.sendMail({
      from: `"BCIM NAS" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL_TO,
      subject: `[NAS] ${label} — ${Object.values(details)[0]}`,
      html: buildHtml(event, details, username),
    });
  } catch (err) {
    console.error('[mailer] Failed to send notification:', err.message);
  }
}

module.exports = { notify, enabled };
