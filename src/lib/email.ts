/**
 * Password-reset delivery. Uses SMTP when SMTP_URL is configured, otherwise
 * logs the link to the server console (useful for local / self-hosted setups).
 * Returns true when the link was sent via a real transport.
 */
export async function deliverPasswordReset(
  email: string,
  link: string
): Promise<boolean> {
  const smtpUrl = process.env.SMTP_URL;
  if (smtpUrl) {
    // Imported lazily so the dependency is only loaded when SMTP is configured.
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport(smtpUrl);
    await transport.sendMail({
      from: process.env.SMTP_FROM || "Character AI <no-reply@character.ai>",
      to: email,
      subject: "Reset your Character AI password",
      text: `You (or someone) requested a password reset.\n\nReset your password using this link (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
          <h2>Reset your password</h2>
          <p>You (or someone) requested a password reset for your Character AI account.</p>
          <p><a href="${link}" style="display:inline-block;background:#7c5cff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Reset password</a></p>
          <p style="color:#666;font-size:13px">This link is valid for 1 hour. If you didn't request it, you can ignore this email.</p>
          <p style="color:#999;font-size:12px">${link}</p>
        </div>`,
    });
    return true;
  }

  // No transport configured — log for the operator to retrieve.
  console.log(`[password-reset] ${email} -> ${link}`);
  return false;
}
