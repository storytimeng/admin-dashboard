export function isHtmlContent(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value.trim());
}

export function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildNotificationEmailPreviewHtml(
  title: string,
  messageHtml: string,
  firstName = "Storytimer",
): string {
  const bodyContent = isHtmlContent(messageHtml)
    ? messageHtml
    : `<p style="color: #000000; margin: 0; white-space: pre-wrap; font-size: 15px; line-height: 1.8;">${escapeHtml(messageHtml)}</p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FFE0BE;">
  <div style="background-color: #ffffff; padding: 0; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px; color: #9B5621; margin-top: 0; font-weight: bold;">Hello ${escapeHtml(firstName)},</p>
      <div style="background-color: #ffffff; padding: 25px 25px 25px 0; border-radius: 8px; margin: 25px 0;" class="admin-rich-text">
        ${bodyContent}
      </div>
      <p style="color: #333; font-size: 15px; margin-top: 30px;">Best regards,<br><strong style="color: #F8951D; font-size: 16px;">The Storytime Team</strong></p>
      <hr style="border: none; border-top: 2px solid #FFE0BE; margin: 30px 0;">
      <p style="font-size: 12px; color: #9B5621; text-align: center; margin: 0;">
        This is an automated message, please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
