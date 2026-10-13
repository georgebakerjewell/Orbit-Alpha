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
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "CashAndCashEquivalents"],
  shortTermInvestments: ["ShortTermInvestments", "MarketableSecuritiesCurrent", "AvailableForSaleSecuritiesDebtSecuritiesCurrent", "ShortTermInvestmentsAndOtherFinancialAssets"],
  debtTotal: ["LongTermDebt", "DebtInstrumentCarryingAmount", "LongTermDebtAndCapitalLeaseObligations"],
  debtNoncurrent: ["LongTermDebtNoncurrent", "ConvertibleNotesPayableNoncurrent", "ConvertibleDebtNoncurrent", "LongTermNotesPayable", "SeniorNotesNoncurrent", "NoncurrentPortionOfNoncurrentBorrowings"],
  debtCurrent: ["LongTermDebtCurrent", "ConvertibleNotesPayableCurrent", "ConvertibleDebtCurrent", "CurrentPortionOfNoncurrentBorrowings"],
  sharesCover: ["EntityCommonStockSharesOutstanding"],
  sharesBalance: ["CommonStockSharesOutstanding"],
};

// All facts for a tag in its main unit, one per period (latest filing wins).
function series(facts, tag, unitPref) {
  for (const ns of ["us-gaap", "ifrs-full", "dei"]) {
    const units = facts?.[ns]?.[tag]?.units;
    if (!units) continue;
    const unit = unitPref && units[unitPref] ? unitPref : Object.keys(units).find((u) => !u.includes("/")) || Object.keys(units)[0];
    const byKey = {};
    for (const f of units[unit] || []) {
      if (f.val == null || !f.end) continue;
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
  if (!fy || !prior) return null;
  return fy.val + ytd.val - prior.val;
}

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
  const s = pick(facts, names, periodEnd, "USD");
  if (!s) return null;
  const fs = s.facts;
  const endFact = findNear(fs, periodEnd, 5);
  const end = endFact?.end || periodEnd;
  const prevEnd = fs.map((f) => f.end).find((e) => near(e, yearBefore(end))) || yearBefore(end);
  return {
    tag: s.tag, unit: s.unit,
    ttm: ttmAt(fs, end), ttmPrior: ttmAt(fs, prevEnd),
    quarter: quarterAt(fs, end), quarterPrior: quarterAt(fs, prevEnd),
  };
}

function instantMetric(facts, names, periodEnd) {
  const s = pick(facts, names, periodEnd, "USD");
  if (!s) return null;
  const f = findNear(s.facts.filter((x) => !x.start), periodEnd, 5) || null;
  return f ? { val: f.val, end: f.end, tag: s.tag, unit: s.unit } : null;
}

// Share count history: the cover-page count from each 10-K/10-Q, summed across share classes.
export function shareHistory(facts) {
  for (const names of [TAGS.sharesCover, TAGS.sharesBalance]) {
    for (const n of names) {
      const units = facts?.dei?.[n]?.units?.shares || facts?.["us-gaap"]?.[n]?.units?.shares;
      if (!units?.length) continue;
      const byAccn = {};
      for (const f of units) {
        if (!/^(10-K|10-Q|20-F|40-F)/.test(f.form || "")) continue;
        const k = f.accn;
        (byAccn[k] ??= { end: f.end, filed: f.filed, vals: new Set() }).vals.add(f.val);
      }
      const pts = Object.values(byAccn)
        .map((x) => ({ date: x.end, filed: x.filed, shares: [...x.vals].reduce((a, b) => a + b, 0) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      // One point per date (latest filing wins).
      const byDate = {};
      pts.forEach((p) => { if (!byDate[p.date] || p.filed > byDate[p.date].filed) byDate[p.date] = p; });
      const out = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(({ date, shares }) => ({ date, shares }));
      if (out.length >= 2) return { source: n, points: out };
    }
  }
  return null;
}

function changeSince(points, yearsBack) {
  const last = points[points.length - 1];
  const target = new Date(t(last.date) - yearsBack * 365 * DAY).toISOString().slice(0, 10);
  const base = points.filter((p) => days(p.date, target) >= -45).pop(); // closest point on or just after the target
  if (!base || days(base.date, last.date) < yearsBack * 365 - 60) return null;
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
  const debt = debtTotal?.val ?? (debtParts.length ? debtParts.reduce((a, d) => a + d.val, 0) : null);
  const burnMonthly = fcfTtm != null && fcfTtm < 0 ? -fcfTtm / 12 : null;

  const shares = shareHistory(facts);
  const pts = shares?.points || [];
  return {
    periodEnd,
    currency: revenue?.unit || cash?.unit || "USD",
    revenue: { ttm: revTtm, ttmGrowth: growth(revTtm, revenue?.ttmPrior), quarter: revenue?.quarter ?? null, quarterGrowth: growth(revenue?.quarter, revenue?.quarterPrior) },
    grossMargin: grossTtm != null && revTtm ? Math.round((grossTtm / revTtm) * 1000) / 10 : null,
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
    } : null,
    tags: { revenue: revenue?.tag, cash: cash?.tag, debt: debtTotal?.tag || debtParts.map((d) => d.tag).join("+") || null },
  };
}
