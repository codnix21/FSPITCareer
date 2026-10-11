export type VerificationEmailPayload = {
  to: string;
  firstName: string;
  verifyUrl: string;
  expiresAt: Date;
};

export interface EmailProvider {
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
