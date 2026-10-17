// Company-local date/time helpers. Env is read lazily (dotenv loads after ES imports).
const timezone = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';

// -> { date: 'YYYY-MM-DD', time: 'HH:MM:SS', dateTime: 'YYYY-MM-DD HH:MM:SS' } in APP_TIMEZONE
export function localNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone(),
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  const d = `${get('year')}-${get('month')}-${get('day')}`;
  const t = `${get('hour')}:${get('minute')}:${get('second')}`;
  return { date: d, time: t, dateTime: `${d} ${t}` };
}
