import { format, utcToZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

export function formatIST(date: Date | string, pattern = 'dd MMM yyyy') {
  const zoned = utcToZonedTime(new Date(date), IST_TIMEZONE);
  return format(zoned, pattern, { timeZone: IST_TIMEZONE });
}

export function todayIST() {
  return utcToZonedTime(new Date(), IST_TIMEZONE);
}
