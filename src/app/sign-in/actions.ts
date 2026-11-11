'use server';

import { redirect } from 'next/navigation';
import {
  forgetPendingCode,
  requestSignInCode,
  signInWithPassword,
  signOut,
  verifySignInCode,
} from '@/lib/auth';

/**
 * The email form's default action. Pressing Enter submits with the form's first
 * button, "Send me a code", even from the password field — so a typed password
 * means the person meant to sign in with it.
 */
export async function requestCodeAction(formData: FormData) {
  if (formData.get('password')) return passwordSignInAction(formData);

  const result = await requestSignInCode(String(formData.get('email') ?? ''));
  redirect(result === 'ok' ? '/sign-in' : `/sign-in?error=${result}`);
}

export async function verifyCodeAction(formData: FormData) {
  const result = await verifySignInCode(String(formData.get('code') ?? ''));
  redirect(result === 'ok' ? '/dashboard' : `/sign-in?error=${result}`);
}

export async function passwordSignInAction(formData: FormData) {
  const result = await signInWithPassword(
    String(formData.get('email') ?? ''),
    String(formData.get('password') ?? ''),
  );
  redirect(result === 'ok' ? '/dashboard' : `/sign-in?error=${result}`);
}

export async function useAnotherEmailAction() {
  await forgetPendingCode();
  redirect('/sign-in');
}

export async function signOutAction() {
  await signOut();
  redirect('/sign-in');
}
