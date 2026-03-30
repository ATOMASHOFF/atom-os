// packages/shared/src/utils/index.ts

/** Generate a random 6-char alphanumeric gym code */
export function generateGymCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Format date to YYYY-MM-DD */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Check if a date string is today */
export function isToday(dateString: string): boolean {
  return dateString === toDateString(new Date());
}

/** Calculate subscription end date from start + plan */
export function calcSubscriptionEnd(
  start: Date,
  plan: 'monthly' | 'quarterly' | 'annual' | 'pay_as_you_go'
): Date {
  const end = new Date(start);
  switch (plan) {
    case 'monthly': end.setMonth(end.getMonth() + 1); break;
    case 'quarterly': end.setMonth(end.getMonth() + 3); break;
    case 'annual': end.setFullYear(end.getFullYear() + 1); break;
    case 'pay_as_you_go': end.setDate(end.getDate() + 1); break;
  }
  return end;
}

/** Mask email for display: ash***@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 3)}***@${domain}`;
}

/** Sleep for ms milliseconds (useful for testing) */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
