// Upcoming earnings dates for roster companies, from the Nasdaq earnings calendar.
// Scans the next 75 days (weekdays only), all in parallel (about 0.2s), cached for 6 hours.

import { ROSTER as ROSTER_LIST } from "../lib/roster.js";

const ROSTER = new Set(ROSTER_LIST);
const DAYS_AHEAD = 75;
const TTL = 6 * 60 * 60 * 1000;
let cache = null;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/market-activity/earnings",
};

const TIMES = { "time-pre-market": "Before open", "time-after-hours": "After close" };

export function rowsToEarnings(rows, date) {
  return rows
    .filter((row) => ROSTER.has(row.symbol?.toUpperCase()))
    .map((row) => ({
      ticker: row.symbol.toUpperCase(),
      name: row.name || row.symbol,
      date,
      time: TIMES[row.time] || "Time TBC",
      epsEst: row.epsForecast && row.epsForecast !== "N/A" ? row.epsForecast : null,
      quarter: row.fiscalQuarterEnding || null,
    }));
}

async function fetchDay(date) {
  try {
    const res = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${date}`, { headers: HEADERS });
    const json = await res.json();
    return rowsToEarnings(json?.data?.rows || [], date);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (cache && Date.now() - cache.ts < TTL) {
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).json(cache.data);
  }

  const dates = [];
  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const d = new Date(Date.now() + i * 86_400_000);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) dates.push(d.toISOString().slice(0, 10));
  }

  const results = (await Promise.all(dates.map(fetchDay))).flat();
  results.sort((a, b) => a.date.localeCompare(b.date));

  // Only cache a non-empty result, so a temporary Nasdaq outage isn't cached for 6 hours.
  if (results.length) {
    cache = { ts: Date.now(), data: results };
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  }
  res.status(200).json(results);
}
