'use server';

import { redirect } from 'next/navigation';
import { forgetPendingCode, requestSignInCode, signOut, verifySignInCode } from '@/lib/auth';

export async function requestCodeAction(formData: FormData) {
  const result = await requestSignInCode(String(formData.get('email') ?? ''));
  redirect(result === 'ok' ? '/sign-in' : '/sign-in?error=email');
}

export async function verifyCodeAction(formData: FormData) {
  const result = await verifySignInCode(String(formData.get('code') ?? ''));
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
