import { getCloudflareContext } from '@opennextjs/cloudflare';

declare global {
  interface CloudflareEnv {
    /** Set by scripts/setup-email.sh. Absent in local dev, and that is fine. */
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  }
}

/**
 * Sends one message. The only thing in the app that talks to the email
 * provider (Resend), so it is also the only place the fallback lives.
 *
 * **With no `RESEND_API_KEY` configured the message goes to the server console
 * and this resolves normally.** Local development therefore needs no account,
 * no verified domain and no key: a Curator's sign-in code is read out of the
 * terminal running `npm run dev`. Run `./scripts/setup-email.sh` when you want
 * real mail.
 *
 * Throws if the provider refuses. Callers who must not fail because of email —
 * the Submission receipt — catch it.
 */
export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });

  if (!env.RESEND_API_KEY) {
    console.log(
      `[email] no RESEND_API_KEY, not sending. to=${message.to} subject=${message.subject}\n${message.text}`,
    );
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? 'onboarding@resend.dev',
      ...message,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend refused the message (${response.status}): ${await response.text()}`);
  }
}
