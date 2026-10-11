import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, VerificationEmailPayload } from './email.provider';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger('ResendEmailProvider');

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();

    if (!apiKey || !from) {
      throw new Error('RESEND_API_KEY и RESEND_FROM_EMAIL обязательны при EMAIL_PROVIDER=resend');
    }

    const name = payload.firstName?.trim() || 'пользователь';
    const expires = payload.expiresAt.toLocaleString('ru-RU', { timeZone: 'UTC' }) + ' UTC';

    const html = `
<!DOCTYPE html>
<html lang="ru">
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0c1219;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:20px;font-weight:700;margin:0 0 12px;">FSP IT Career</p>
  <p>Здравствуйте, ${escapeHtml(name)}!</p>
  <p>Подтвердите email, чтобы завершить регистрацию на платформе.</p>
  <p style="margin:24px 0;">
    <a href="${escapeAttr(payload.verifyUrl)}"
       style="display:inline-block;background:#0d6e6a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">
      Подтвердить email
    </a>
  </p>
  <p style="font-size:13px;color:#5b6570;">Ссылка действует до ${escapeHtml(expires)}. Если кнопка не открывается, скопируйте адрес:</p>
  <p style="font-size:12px;word-break:break-all;color:#5b6570;">${escapeHtml(payload.verifyUrl)}</p>
  <p style="font-size:12px;color:#8a93a0;margin-top:28px;">Если вы не регистрировались в FSP IT Career, просто проигнорируйте это письмо.</p>
</body>
</html>`.trim();

    const text = [
      `Здравствуйте, ${name}!`,
      '',
      'Подтвердите email для FSP IT Career:',
      payload.verifyUrl,
      '',
      `Ссылка действует до ${expires}.`,
    ].join('\n');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from.includes('<') ? from : `FSP IT Career <${from}>`,
        to: [payload.to],
        subject: 'Подтвердите email — FSP IT Career',
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Resend HTTP ${response.status}: ${body}`);
      throw new Error(`Не удалось отправить письмо через Resend (${response.status})`);
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    this.logger.log(`Verification email sent to ${payload.to}${data.id ? ` id=${data.id}` : ''}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
