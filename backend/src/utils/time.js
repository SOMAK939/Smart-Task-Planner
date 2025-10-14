// Lightweight helpers. No external deps.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toISODate(d) {
  if (!d) throw new Error(`toISODate called with invalid value: ${d}`);

  // If input is a string, convert to Date
  const date = (d instanceof Date) ? d : new Date(d);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid time value passed to toISODate: ${d}`);
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  )).toISOString().slice(0, 10);
}

function addDays(date, days) {
  if (!date) throw new Error(`addDays called with invalid value: ${date}`);

  const d = (date instanceof Date) ? date : new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error(`Invalid time value passed to addDays: ${date}`);
  }

  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc;
}

function parseHumanDuration(input) {
  // Supports: "14", "14d", "2 weeks", "3w", "1 month", "1m", "90 days"
  if (typeof input === "number") return input;
  if (!input || typeof input !== "string") return null;

  const s = input.trim().toLowerCase();
  const num = (re) => {
    const m = s.match(re);
    return m ? Number(m[1]) : null;
  };

  if (/^\d+$/.test(s)) return Number(s);                 // "14"
  if (/^(\d+)\s*d(ays)?$/.test(s)) return num(/^(\d+)/); // "10d", "10 days"
  if (/^(\d+)\s*w(ee?k?s?)?$/.test(s)) return num(/^(\d+)/) * 7;  // "2w", "2 weeks"
  if (/^(\d+)\s*m(on(th)?s?)?$/.test(s)) return num(/^(\d+)/) * 30; // ~30d month
  if (/^(\d+)\s*y(ears?)?$/.test(s)) return num(/^(\d+)/) * 365;

  return null;
}

function parsePossibleDateOrDayN(value) {
  // Accepts "2025-10-11" or "Day 7" or "7"
  if (!value) return { kind: "none" };
  if (typeof value === "string" && /^day\s*\d+$/i.test(value)) {
    return { kind: "dayN", day: Number(value.match(/\d+/)[0]) };
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return { kind: "dayN", day: Number(value) };
  }
  // ISO date?
  const d = new Date(value);
  if (!isNaN(d.getTime())) return { kind: "date", date: toISODate(d) };
  return { kind: "none" };
}

module.exports = {
  MS_PER_DAY, toISODate, addDays, parseHumanDuration, parsePossibleDateOrDayN
};
