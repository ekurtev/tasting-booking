import { connection } from "next/server";

export interface Contact {
  phone: string;
  /** Phone without spaces, for tel: links. */
  phoneHref: string;
  email: string;
  accessibilityEmail: string;
}

const PHONE_PLACEHOLDER = "+359 [телефон]";
const EMAIL_PLACEHOLDER = "[имейл]";

/** Contact data from the environment (the repo is public). Synchronous: for route handlers. */
export function readContact(): Contact {
  const phone = process.env.CONTACT_PHONE?.trim() || PHONE_PLACEHOLDER;
  const email = process.env.CONTACT_EMAIL?.trim() || EMAIL_PLACEHOLDER;
  const accessibilityEmail = process.env.ACCESSIBILITY_EMAIL?.trim() || email;
  return { phone, phoneHref: phone.replace(/[^\d+]/g, ""), email, accessibilityEmail };
}

/**
 * For server components: opts the page into request-time rendering, so `next build` (which runs
 * without .env in Docker) never bakes the placeholders into static HTML.
 */
export async function getContact(): Promise<Contact> {
  await connection();
  return readContact();
}
