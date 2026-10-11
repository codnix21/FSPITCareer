import { ResendEmailProvider } from './resend-email.provider';

describe('ResendEmailProvider', () => {
  const originalFetch = global.fetch;
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 'support@cabinet.netcorehub.ru';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = env;
    global.fetch = originalFetch;
  });

  it('sends verification email via Resend API', async () => {
    const provider = new ResendEmailProvider();
    await provider.sendVerificationEmail({
      to: 'user@example.com',
      firstName: 'Иван',
      verifyUrl: 'https://itcareer.netcorehub.ru/verify-email?token=abc',
      expiresAt: new Date('2026-10-12T00:00:00.000Z'),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test',
        }),
      }),
    );

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.to).toEqual(['user@example.com']);
    expect(body.from).toContain('support@cabinet.netcorehub.ru');
    expect(body.html).toContain('verify-email?token=abc');
  });

  it('throws when Resend credentials missing', async () => {
    delete process.env.RESEND_API_KEY;
    const provider = new ResendEmailProvider();
    await expect(
      provider.sendVerificationEmail({
        to: 'user@example.com',
        firstName: 'Иван',
        verifyUrl: 'https://example.com/v',
        expiresAt: new Date(),
      }),
    ).rejects.toThrow(/RESEND_API_KEY/);
  });
});
