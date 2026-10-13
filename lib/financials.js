// Financial snapshot and share count history from SEC XBRL "company facts" (official, free).
// Works on the figures companies tag in their 10-K, 10-Q, 20-F and 40-F filings.
// Trailing twelve months (TTM) = last full year + this year to date - same period last year.

const DAY = 86_400_000;
const t = (d) => Date.parse(d + "T00:00:00Z");
const days = (a, b) => Math.round((t(b) - t(a)) / DAY);
const near = (a, b, tol = 12) => Math.abs(days(a, b)) <= tol;

// Tag names in order of preference. us-gaap first, then IFRS (foreign filers).
export const TAGS = {
  revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet", "Revenue"],
  costOfRevenue: ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfServices", "CostOfSales"],
  grossProfit: ["GrossProfit"],
  netIncome: ["NetIncomeLoss", "ProfitLossAttributableToOwnersOfParent", "ProfitLoss"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations", "CashFlowsFromUsedInOperatingActivities"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashAndCashEquivalents", "Cash", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  shortTermInvestments: ["ShortTermInvestments", "MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent", "ShortTermInvestmentsAndOtherFinancialAssets"],
  debtTotal: ["LongTermDebt", "LongTermDebtAndCapitalLeaseObligations", "ConvertibleNotesPayable", "Borrowings"],
  debtLastResort: ["DebtInstrumentCarryingAmount"],
  debtNoncurrent: ["LongTermDebtNoncurrent", "ConvertibleNotesPayableNoncurrent", "ConvertibleDebtNoncurrent", "LongTermNotesPayable", "SeniorNotesNoncurrent", "NoncurrentPortionOfNoncurrentBorrowings"],
  debtCurrent: ["LongTermDebtCurrent", "ConvertibleNotesPayableCurrent", "ConvertibleDebtCurrent", "CurrentPortionOfNoncurrentBorrowings"],
  sharesCover: ["EntityCommonStockSharesOutstanding"],
  sharesBalance: ["CommonStockSharesOutstanding"],
  sharesWeighted: ["WeightedAverageNumberOfSharesOutstandingBasic"],
};

// Only periodic reports. Proxy statements (DEF 14A) and others can restate figures in different scales.
const PERIODIC = /^(10-K|10-Q|20-F|40-F|6-K|10-KT)/;

// All facts for a tag in its main unit, one per period (latest filing wins).
function series(facts, tag, unitPref) {
  for (const ns of ["us-gaap", "ifrs-full", "dei"]) {
    const units = facts?.[ns]?.[tag]?.units;
    if (!units) continue;
    const unit = unitPref && units[unitPref] ? unitPref : Object.keys(units).find((u) => !u.includes("/")) || Object.keys(units)[0];
    const byKey = {};
    for (const f of units[unit] || []) {
      if (f.val == null || !f.end || !PERIODIC.test(f.form || "")) continue;
      const key = `${f.start || ""}|${f.end}`;
      if (!byKey[key] || f.filed > byKey[key].filed) byKey[key] = f;
    }
    const out = Object.values(byKey).sort((a, b) => a.end.localeCompare(b.end));
    if (out.length) return { unit, facts: out };
  }
  return null;
}

// First tag that has data reasonably recent (within ~18 months of the newest filing).
function pick(facts, names, latestEnd, unitPref) {
  let best = null;
  for (const n of names) {
    const s = series(facts, n, unitPref);
    if (!s) continue;
    const end = s.facts[s.facts.length - 1].end;
    if (!best || end > best.end) best = { ...s, tag: n, end };
    if (latestEnd && days(end, latestEnd) <= 120) return best;
  }
  return best;
}

// Flow facts merged across alternative tags (companies switch tags over time); earlier tags win per period.
function merged(facts, names, unitPref = "USD") {
  const byKey = {};
  let unit = null, tag = null;
  for (const n of names) {
    const sr = series(facts, n, unitPref);
    if (!sr) continue;
    if (unit && sr.unit !== unit) continue;
    unit ??= sr.unit;
    tag ??= n;
    for (const f of sr.facts) {
      const k = `${f.start || ""}|${f.end}`;
      if (!byKey[k]) byKey[k] = f;
    }
  }
  const fs = Object.values(byKey).sort((a, b) => a.end.localeCompare(b.end));
  return fs.length ? { unit, tag, facts: fs } : null;
}

const duration = (f) => (f.start ? days(f.start, f.end) + 1 : 0);
const isAnnual = (f) => duration(f) >= 350 && duration(f) <= 380;
const isQuarter = (f) => duration(f) >= 80 && duration(f) <= 100;

// Trailing twelve months ending on `end`.
export function ttmAt(fs, end) {
  const annual = fs.find((f) => isAnnual(f) && near(f.end, end));
  if (annual) return annual.val;
  const ytd = fs.filter((f) => f.start && f.end === end && duration(f) < 350).sort((a, b) => duration(b) - duration(a))[0];
  if (!ytd) return null;
  const fy = fs.find((f) => isAnnual(f) && near(f.end, new Date(t(ytd.start) - DAY).toISOString().slice(0, 10)));
  const prior = fs.find((f) => f.start && Math.abs(duration(f) - duration(ytd)) <= 12 && near(f.end, new Date(t(end) - 365 * DAY).toISOString().slice(0, 10)));
  if (fy && prior) return fy.val + ytd.val - prior.val;
  return null;
}

// Fallback: add up the last four quarters.
function sumQuarters(fs, end) {
  let total = 0;
  for (let k = 0; k < 4; k++) {
    const target = new Date(t(end) - k * 91.3 * DAY).toISOString().slice(0, 10);
    const e = fs.map((f) => f.end).find((x) => near(x, target, 10));
    const q = e ? quarterAt(fs, e) : null;
    if (q == null) return null;
    total += q;
  }
  return total;
}
const ttmOrQuarters = (fs, end) => ttmAt(fs, end) ?? sumQuarters(fs, end);

// Single quarter ending on `end` (Q4 = full year minus nine months).
export function quarterAt(fs, end) {
  const q = fs.find((f) => isQuarter(f) && f.end === end);
  if (q) return q.val;
  const annual = fs.find((f) => isAnnual(f) && f.end === end);
  if (!annual) return null;
  const nine = fs.find((f) => f.start === annual.start && duration(f) >= 260 && duration(f) <= 285);
  return nine ? annual.val - nine.val : null;
}

const yearBefore = (end) => new Date(t(end) - 365 * DAY).toISOString().slice(0, 10);
const findNear = (fs, end, tol = 12) => fs.find((f) => near(f.end, end, tol));

function flowMetric(facts, names, periodEnd) {
  const s = merged(facts, names);
  if (!s) return null;
  const fs = s.facts;
  const endFact = findNear(fs, periodEnd, 5);
  const end = endFact?.end || periodEnd;
  const prevEnd = fs.map((f) => f.end).find((e) => near(e, yearBefore(end))) || yearBefore(end);
  return {
    tag: s.tag, unit: s.unit,
    ttm: ttmOrQuarters(fs, end), ttmPrior: ttmOrQuarters(fs, prevEnd),
    quarter: quarterAt(fs, end), quarterPrior: quarterAt(fs, prevEnd),
  };
}

// First tag with a balance on the period end date.
function instantMetric(facts, names, periodEnd) {
  for (const n of names) {
    const s = series(facts, n, "USD");
    const f = s && findNear(s.facts.filter((x) => !x.start), periodEnd, 5);
    if (f) return { val: f.val, end: f.end, tag: n, unit: s.unit };
  }
  return null;
}

// Reverse splits make share counts fall sharply. Restate earlier points so the history is comparable.
const SPLIT_RATIOS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50, 100];
export function adjustForSplits(points) {
  // A jump of more than 4x between two filings is a data scale change or a merger: keep only what follows.
  let from = 0;
  points.forEach((p, i) => { if (i && p.shares / points[i - 1].shares > 4) from = i; });
  const out = points.slice(from).map((p) => ({ ...p }));
  let adjusted = false;
  for (let i = out.length - 1; i > 0; i--) {
    const r = out[i - 1].shares / out[i].shares;
    if (r < 1.8) continue; // a fall of more than about 45% between two filings is a reverse split, not a buyback
    const ratio = SPLIT_RATIOS.find((x) => Math.abs(r / x - 1) < 0.2) || Math.round(r);
    for (let j = 0; j < i; j++) out[j].shares = out[j].shares / ratio;
    adjusted = true;
  }
  return { points: out, adjusted };
}

// Share count history. Prefers the cover-page count from each 10-K/10-Q; falls back to the balance sheet
// count, then quarterly weighted average basic shares (which covers companies with several share classes).
export function shareHistory(facts, periodEnd) {
  const fresh = (pts) => pts.length >= 2 && (!periodEnd || days(pts[pts.length - 1].date, periodEnd) < 200);
  for (const n of [...TAGS.sharesCover, ...TAGS.sharesBalance]) {
    const units = facts?.dei?.[n]?.units?.shares || facts?.["us-gaap"]?.[n]?.units?.shares || facts?.["ifrs-full"]?.[n]?.units?.shares;
    if (!units?.length) continue;
    const byAccn = {};
    for (const f of units) {
      if (f.start || !PERIODIC.test(f.form || "")) continue;
      (byAccn[f.accn] ??= { end: f.end, filed: f.filed, vals: new Set() }).vals.add(f.val);
    }
    const byDate = {};
    Object.values(byAccn).forEach((x) => {
      const p = { date: x.end, filed: x.filed, shares: [...x.vals].reduce((a, b) => a + b, 0) };
      if (!byDate[p.date] || p.filed > byDate[p.date].filed) byDate[p.date] = p;
    });
    const pts = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(({ date, shares }) => ({ date, shares }));
    if (fresh(pts)) return { source: n, kind: "outstanding", ...adjustForSplits(pts) };
  }
  for (const n of TAGS.sharesWeighted) {
    const sr = series(facts, n, "shares");
    if (!sr) continue;
    const pts = sr.facts.filter((f) => f.start && duration(f) >= 80 && duration(f) <= 100).map((f) => ({ date: f.end, shares: f.val }));
    if (fresh(pts)) return { source: n, kind: "weighted", ...adjustForSplits(pts) };
  }
  return null;
}

function changeSince(points, yearsBack) {
  const last = points[points.length - 1];
  const target = new Date(t(last.date) - yearsBack * 365 * DAY).toISOString().slice(0, 10);
  const base = points.filter((p) => Math.abs(days(p.date, target)) <= 75).sort((a, b) => Math.abs(days(a.date, target)) - Math.abs(days(b.date, target)))[0];
  if (!base) return null;
  return { from: base.date, shares: base.shares, pct: Math.round((last.shares / base.shares - 1) * 1000) / 10 };
}

const growth = (a, b) => (a != null && b ? Math.round(((a - b) / Math.abs(b)) * 1000) / 10 : null);

export function buildSnapshot(companyFacts) {
  const facts = companyFacts?.facts || {};
  // The latest balance sheet date anchors every figure, so they all describe the same period.
  const cashS = pick(facts, TAGS.cash, null, "USD");
  const revS = pick(facts, TAGS.revenue, null, "USD");
  const periodEnd = [cashS?.end, revS?.end].filter(Boolean).sort().pop();
  if (!periodEnd) return null;

  const revenue = flowMetric(facts, TAGS.revenue, periodEnd);
  const cost = flowMetric(facts, TAGS.costOfRevenue, periodEnd);
  const gp = flowMetric(facts, TAGS.grossProfit, periodEnd);
  const net = flowMetric(facts, TAGS.netIncome, periodEnd);
  const ocf = flowMetric(facts, TAGS.operatingCashFlow, periodEnd);
  const capex = flowMetric(facts, TAGS.capex, periodEnd);
  const cash = instantMetric(facts, TAGS.cash, periodEnd);
  const sti = instantMetric(facts, TAGS.shortTermInvestments, periodEnd);
  const debtTotal = instantMetric(facts, TAGS.debtTotal, periodEnd);
  // Without a total, add the first non-current and first current debt tag found (never two of each, to avoid double counting).
  const firstOf = (names) => names.map((n) => instantMetric(facts, [n], periodEnd)).find(Boolean);
  const debtParts = [firstOf(TAGS.debtNoncurrent), firstOf(TAGS.debtCurrent)].filter(Boolean);

  const revTtm = revenue?.ttm ?? null;
  const grossTtm = gp?.ttm ?? (revTtm != null && cost?.ttm != null ? revTtm - cost.ttm : null);
  const fcfTtm = ocf?.ttm != null ? ocf.ttm - (capex?.ttm || 0) : null;
  const liquid = cash ? cash.val + (sti?.val || 0) : null;
  const debtLast = debtTotal || debtParts.length ? null : instantMetric(facts, TAGS.debtLastResort, periodEnd);
  const debt = debtTotal?.val ?? (debtParts.length ? debtParts.reduce((a, d) => a + d.val, 0) : debtLast?.val ?? null);
  const burnMonthly = fcfTtm != null && fcfTtm < 0 ? -fcfTtm / 12 : null;

  const shares = shareHistory(facts, periodEnd);
  const pts = shares?.points || [];
  return {
    periodEnd,
    currency: revenue?.unit || cash?.unit || "USD",
    revenue: { ttm: revTtm, ttmGrowth: growth(revTtm, revenue?.ttmPrior), quarter: revenue?.quarter ?? null, quarterGrowth: growth(revenue?.quarter, revenue?.quarterPrior) },
    // Margins on tiny revenue are meaningless (e.g. -9,000%), so only show them above $5M of revenue.
    grossMargin: grossTtm != null && revTtm >= 5e6 && grossTtm / revTtm > -1 ? Math.round((grossTtm / revTtm) * 1000) / 10 : null,
    netIncome: { ttm: net?.ttm ?? null, quarter: net?.quarter ?? null },
    operatingCashFlow: ocf?.ttm ?? null,
    capex: capex?.ttm ?? null,
    freeCashFlow: fcfTtm,
    cash: cash?.val ?? null,
    shortTermInvestments: sti?.val ?? null,
    liquidity: liquid,
    debt,
    runwayMonths: burnMonthly && liquid != null ? Math.round((liquid / burnMonthly) * 10) / 10 : null,
    cashGenerative: fcfTtm != null && fcfTtm >= 0,
    shares: pts.length ? {
      latest: pts[pts.length - 1],
      y1: changeSince(pts, 1),
      y3: changeSince(pts, 3),
      history: pts.filter((p) => days(p.date, pts[pts.length - 1].date) <= 3 * 365 + 45),
      source: shares.source,
      kind: shares.kind,
      splitAdjusted: shares.adjusted,
    } : null,
    tags: { revenue: revenue?.tag, cash: cash?.tag, debt: debtTotal?.tag || debtParts.map((d) => d.tag).join("+") || debtLast?.tag || null },
  };
}
