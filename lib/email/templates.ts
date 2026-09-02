import {
  contrastText,
  resolveEmailBrand,
  tint,
  type EmailBrand,
} from "@/lib/email/branding";

export type { EmailBrand };

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ctaButton(href: string, label: string, bg: string): string {
  const fg = contrastText(bg);
  return `<a href="${escape(href)}" target="_blank" style="display:inline-block;background:${bg};color:${fg};font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:14px 28px;border-radius:8px;border:1px solid ${bg};">
      ${escape(label)}
    </a>`;
}

function codeBox(code: string, primary: string, label = "Temporary login code"): string {
  const bg = tint(primary, 0.9);
  const tracking = /^\d{6,10}$/.test(code) ? "0.28em" : "0.04em";
  const size = /^\d{6,10}$/.test(code) ? "32px" : "18px";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px 0;">
      <tr>
        <td style="background:${bg};border:1px solid ${primary};border-radius:10px;padding:18px 16px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${primary};">${escape(label)}</p>
          <p style="margin:0;font-size:${size};font-weight:700;letter-spacing:${tracking};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#0f172a;word-break:break-all;">${escape(code)}</p>
        </td>
      </tr>
    </table>`;
}

function shell(input: {
  title: string;
  preview: string;
  brand: EmailBrand;
  body: string;
}): string {
  const brand = resolveEmailBrand(input.brand);
  const primary = brand.primaryColor;
  const logo = brand.logoUrl
    ? `<img src="${escape(brand.logoUrl)}" alt="${escape(brand.companyName)}" height="40" style="height:40px;max-height:40px;max-width:200px;width:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${primary};">${escape(brand.companyName)}</div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escape(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(input.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="padding:28px 32px 20px 32px;text-align:center;border-bottom:1px solid #f1f5f9;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:${primary};">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${input.body}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                This is an automated message from ${escape(brand.companyName)}. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function greeting(name?: string | null): string {
  return name ? `Hi ${escape(name)},` : "Hi,";
}

export function inviteEmail(input: {
  name?: string | null;
  loginUrl: string;
  tempPassword: string;
  subjectLabel: string;
  brand?: Partial<EmailBrand> | null;
}): string {
  const brand = resolveEmailBrand(input.brand);
  const isOtpCode = /^\d{8,10}$/.test(input.tempPassword);
  const intro = isOtpCode
    ? `You've been invited to <strong>${escape(input.subjectLabel)}</strong>. Sign in with the code below, then set your own password.`
    : `You've been invited to <strong>${escape(input.subjectLabel)}</strong>. Sign in with the password you created, then continue to your workspace.`;
  const codeBlock = isOtpCode
    ? codeBox(input.tempPassword, brand.primaryColor)
    : "";

  const body = `
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primaryColor};">You're invited</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">Join ${escape(input.subjectLabel)}</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting(input.name)}</p>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${intro}</p>
    ${codeBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr><td>${ctaButton(input.loginUrl, "Sign in", brand.primaryColor)}</td></tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">If the button doesn't work, copy this link:<br /><a href="${escape(input.loginUrl)}" style="color:${brand.primaryColor};word-break:break-all;">${escape(input.loginUrl)}</a></p>
  `;

  return shell({
    title: `You're invited to ${input.subjectLabel}`,
    preview: `Your temporary login code for ${input.subjectLabel}`,
    brand,
    body,
  });
}

export function tempPasswordEmail(input: {
  name?: string | null;
  loginUrl: string;
  tempPassword: string;
  brand?: Partial<EmailBrand> | null;
}): string {
  const brand = resolveEmailBrand(input.brand);
  const isOtpCode = /^\d{8,10}$/.test(input.tempPassword);
  const intro = isOtpCode
    ? "An administrator reset your password. Use this code to sign in, then choose a new password."
    : "An administrator set a new password for your account. Sign in with it below, then change it after you log in.";
  const credentialBlock = isOtpCode
    ? codeBox(input.tempPassword, brand.primaryColor)
    : codeBox(input.tempPassword, brand.primaryColor, "Your new password");

  const body = `
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primaryColor};">Password reset</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">${isOtpCode ? "Your login code is ready" : "Your password was reset"}</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting(input.name)}</p>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${intro}</p>
    ${credentialBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr><td>${ctaButton(input.loginUrl, "Sign in", brand.primaryColor)}</td></tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">If the button doesn't work, copy this link:<br /><a href="${escape(input.loginUrl)}" style="color:${brand.primaryColor};word-break:break-all;">${escape(input.loginUrl)}</a></p>
  `;

  return shell({
    title: "Your password was reset",
    preview: isOtpCode
      ? "Use your temporary login code to sign in and set a new password."
      : "An administrator set a new password for your account.",
    brand,
    body,
  });
}

export function otpEmail(input: {
  code: string;
  tenantName: string;
  variant?: "signin" | "registration";
  brand?: Partial<EmailBrand> | null;
}): string {
  const brand = resolveEmailBrand({ companyName: input.tenantName, ...input.brand });
  const isReg = input.variant === "registration";
  const body = `
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primaryColor};">${isReg ? "Verify email" : "Sign-in code"}</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">${isReg ? "Confirm your email" : "Your one-time code"}</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${
      isReg
        ? `Use this code to finish creating your account at <strong>${escape(input.tenantName)}</strong>.`
        : `Use this code to sign in to <strong>${escape(input.tenantName)}</strong>.`
    }</p>
    ${codeBox(input.code, brand.primaryColor, "Your code")}
    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
  `;

  return shell({
    title: isReg ? "Verify your email" : "Your sign-in code",
    preview: `Your ${isReg ? "verification" : "sign-in"} code is ${input.code}`,
    brand,
    body,
  });
}

export function passwordResetCodeEmail(input: {
  name?: string | null;
  code: string;
  tenantName: string;
  brand?: Partial<EmailBrand> | null;
}): string {
  const brand = resolveEmailBrand({ companyName: input.tenantName, ...input.brand });
  const body = `
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primaryColor};">Password reset</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">Your password reset code</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting(input.name)}</p>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">Enter this 6-digit code in the app to choose a new password. It expires in 15 minutes.</p>
    ${codeBox(input.code, brand.primaryColor, "Your reset code")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr>
        <td style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:14px 16px;">
          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#9a3412;">Keep this code private</p>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#9a3412;">Never share this OTP with anyone. ${escape(brand.companyName)} staff will never ask you for it. If you did not request a reset, you can ignore this email.</p>
        </td>
      </tr>
    </table>
  `;

  return shell({
    title: "Your password reset code",
    preview: `Your password reset code is ${input.code}. Do not share it.`,
    brand,
    body,
  });
}

export function passwordResetEmail(input: {
  name?: string | null;
  resetUrl: string;
  brand?: Partial<EmailBrand> | null;
}): string {
  const brand = resolveEmailBrand(input.brand);
  const body = `
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primaryColor};">Password reset</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">Reset your password</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting(input.name)}</p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">We received a request to reset your password. This link expires in one hour.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr><td>${ctaButton(input.resetUrl, "Reset password", brand.primaryColor)}</td></tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">If you did not request this, you can ignore this email.<br />If the button doesn't work, copy this link:<br /><a href="${escape(input.resetUrl)}" style="color:${brand.primaryColor};word-break:break-all;">${escape(input.resetUrl)}</a></p>
  `;

  return shell({
    title: "Reset your password",
    preview: "Use this link to choose a new password. It expires in one hour.",
    brand,
    body,
  });
}

export function notificationEmail(input: {
  name?: string | null;
  title: string;
  body: string;
  moduleLabel: string;
  brand?: Partial<EmailBrand> | null;
}): string {
  const brand = resolveEmailBrand(input.brand);
  const paragraphs = escape(input.body)
    .split(/\n+/)
    .map((p) => `<p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#334155;">${p}</p>`)
    .join("");

  const html = `
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primaryColor};">${escape(input.moduleLabel)} notice</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">${escape(input.title)}</h1>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting(input.name)}</p>
    ${paragraphs}
  `;

  return shell({
    title: input.title,
    preview: input.body.slice(0, 120),
    brand,
    body: html,
  });
}
