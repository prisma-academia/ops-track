function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#fafaf9;color:#1c1917;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:24px;">
      <h1 style="font-size:18px;margin:0 0 16px 0;">${escape(title)}</h1>
      ${body}
      <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0;" />
      <p style="font-size:12px;color:#78716c;margin:0;">This is an automated message. Do not reply.</p>
    </div>
  </body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function inviteEmail(input: { name?: string | null; loginUrl: string; tempPassword: string; subjectLabel: string }): string {
  const greeting = input.name ? `Hi ${escape(input.name)},` : "Hi,";
  const body = `
    <p>${greeting}</p>
    <p>You've been invited to ${escape(input.subjectLabel)}.</p>
    <p>Sign in here: <a href="${escape(input.loginUrl)}">${escape(input.loginUrl)}</a></p>
    <p>Temporary password: <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px;">${escape(input.tempPassword)}</code></p>
    <p>You will be required to set a new password on first login.</p>
  `;
  return shell(`You've been invited`, body);
}

export function tempPasswordEmail(input: { name?: string | null; loginUrl: string; tempPassword: string }): string {
  const greeting = input.name ? `Hi ${escape(input.name)},` : "Hi,";
  const body = `
    <p>${greeting}</p>
    <p>Your password has been reset by an administrator.</p>
    <p>Sign in here: <a href="${escape(input.loginUrl)}">${escape(input.loginUrl)}</a></p>
    <p>Temporary password: <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px;">${escape(input.tempPassword)}</code></p>
    <p>You will be required to set a new password on first login.</p>
  `;
  return shell(`Your password was reset`, body);
}

export function otpEmail(input: {
  code: string;
  tenantName: string;
  variant?: "signin" | "registration";
}): string {
  const isReg = input.variant === "registration";
  const intro = isReg
    ? `<p>Your verification code to finish creating your account at <strong>${escape(input.tenantName)}</strong>:</p>`
    : `<p>Your one-time sign-in code for <strong>${escape(input.tenantName)}</strong>:</p>`;
  const body = `
    ${intro}
    <p style="font-size:28px;font-weight:600;letter-spacing:4px;font-family:monospace;background:#f5f5f4;padding:12px;border-radius:6px;text-align:center;">${escape(input.code)}</p>
    <p>This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
  `;
  return shell(isReg ? "Verify your email" : "Your sign-in code", body);
}

export function passwordResetEmail(input: { name?: string | null; resetUrl: string }): string {
  const greeting = input.name ? `Hi ${escape(input.name)},` : "Hi,";
  const body = `
    <p>${greeting}</p>
    <p>We received a request to reset your password. Use the link below. It expires in one hour.</p>
    <p><a href="${escape(input.resetUrl)}">${escape(input.resetUrl)}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  return shell(`Reset your password`, body);
}
