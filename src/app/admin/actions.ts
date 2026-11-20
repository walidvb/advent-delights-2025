'use server';

import { redirect } from 'next/navigation';
import { deleteCalendar, deleteSubmission, refreshCalendar, setSelfFilled } from '@/lib/admin';

/** Admin checks live inside `deleteCalendar` / `deleteSubmission`, not here. */
export async function deleteCalendarAction(id: string) {
  await deleteCalendar(id);
  redirect('/admin');
}

export async function refreshCalendarAction(id: string) {
  await refreshCalendar(id);
  redirect('/admin');
}

export async function deleteSubmissionAction(calendarId: string, day: number) {
  await deleteSubmission(calendarId, day);
  redirect('/admin');
}

export async function setSelfFilledAction(id: string, selfFilled: boolean) {
  await setSelfFilled(id, selfFilled);
  redirect('/admin');
}
