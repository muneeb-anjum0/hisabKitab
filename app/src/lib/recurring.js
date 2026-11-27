const pad = (value) => String(value).padStart(2, '0');
export const occurrenceDate = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

export function dueOccurrences(rule, today, maximum = 12) {
  const start = String(rule.startDate || '').slice(0, 10);
  const day = Number(rule.day);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(day) || day < 1 || day > 28)
    return [];
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = String(today).slice(0, 7).split('-').map(Number);
  const count = (endYear - startYear) * 12 + endMonth - startMonth;
  const dates = [];
  for (let offset = Math.max(0, count - maximum + 1); offset <= count; offset += 1) {
    const monthIndex = startMonth - 1 + offset;
    const date = occurrenceDate(
      startYear + Math.floor(monthIndex / 12),
      (monthIndex % 12) + 1,
      day,
    );
    if (date >= start && date <= today) dates.push(date);
  }
  return dates;
}

export function nextOccurrence(rule, today) {
  const [year, month] = String(today).slice(0, 7).split('-').map(Number);
  const [startYear, startMonth] = String(rule.startDate).slice(0, 7).split('-').map(Number);
  const firstMonth = Math.max(year * 12 + month - 1, startYear * 12 + startMonth - 1);
  let candidate = occurrenceDate(
    Math.floor(firstMonth / 12),
    (firstMonth % 12) + 1,
    Number(rule.day),
  );
  if (candidate >= today && candidate >= rule.startDate) return candidate;
  const nextMonth = firstMonth + 1;
  candidate = occurrenceDate(Math.floor(nextMonth / 12), (nextMonth % 12) + 1, Number(rule.day));
  return candidate;
}
