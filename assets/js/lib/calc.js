// Pure calculation functions — no DOM, unit-tested in tests/calc.test.js.
// The report builders return the same shapes as the SQL views in 004_reports.sql.

export const toLitres = (value, unit) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (unit === 'm3') return v * 1000;
  if (unit === 'L') return v;
  return null;
};

const round = (n, d = 2) => (n === null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Water savings calculator.
 * Inputs in the same unit. Returns values plus a list of notes explaining
 * anything that was deliberately NOT calculated.
 */
export function calcSavings({ baseline, pilot, periodDays, unit = 'L', tariff = null, tariffUnit = 'm3', tariffVerified = false }) {
  const notes = [];
  const b = baseline === '' || baseline === null ? NaN : Number(baseline);
  const p = pilot === '' || pilot === null ? NaN : Number(pilot);
  const days = Number(periodDays);
  const result = { saved: null, savedLitres: null, pct: null, financial: null, annualLitres: null, annualFinancial: null, notes };

  if (!Number.isFinite(b) || !Number.isFinite(p)) {
    notes.push('Enter both baseline and pilot consumption.');
    return result;
  }
  if (b < 0 || p < 0) {
    notes.push('Consumption cannot be negative.');
    return result;
  }
  result.saved = round(b - p);
  result.savedLitres = round(toLitres(b - p, unit));

  if (b === 0) notes.push('Baseline is zero, so a percentage reduction cannot be calculated.');
  else result.pct = round(((b - p) / b) * 100, 1);

  if (result.saved < 0) notes.push('Pilot consumption is higher than baseline, so no saving was recorded for this period.');

  const tariffNum = tariff === '' || tariff === null ? NaN : Number(tariff);
  if (!Number.isFinite(tariffNum) || tariffNum <= 0) {
    notes.push('No water tariff entered, so financial savings are not shown.');
  } else if (!tariffVerified) {
    notes.push('Tariff is not marked as verified, so financial savings are not shown.');
  } else {
    const savedInTariffUnit = tariffUnit === 'm3' ? result.savedLitres / 1000 : result.savedLitres;
    result.financial = round(savedInTariffUnit * tariffNum);
  }

  if (!Number.isFinite(days) || days <= 0) {
    notes.push('Enter the measurement period to consider an annual projection.');
  } else if (days < 7) {
    notes.push(`A ${days}-day period is too short for a reasonable annual projection (minimum 7 days).`);
  } else if (result.saved > 0) {
    const factor = 365 / days;
    result.annualLitres = round(result.savedLitres * factor, 0);
    if (result.financial !== null) result.annualFinancial = round(result.financial * factor);
    notes.push('Annual figures assume the measured period is representative of the whole year. Treat it as an estimate.');
  }
  return result;
}

/** Budget: line totals, category subtotals, grand total. */
export function budgetTotals(items) {
  const lines = items.map((it) => ({ ...it, total: round((Number(it.quantity) || 0) * (Number(it.unit_cost) || 0)) }));
  const byCategory = {};
  for (const l of lines) byCategory[l.category] = round((byCategory[l.category] ?? 0) + l.total);
  const grand = round(lines.reduce((s, l) => s + l.total, 0));
  return { lines, byCategory, grand };
}

// ---------------------------------------------------------------------------
// Report builders (mirror the SQL views)
// ---------------------------------------------------------------------------
const nameOf = (locations) => {
  const m = new Map(locations.map((l) => [l.id, l.name]));
  return (id) => m.get(id) ?? 'Unlisted location';
};

export function reportIssuesByLocationStatus(reports, locations) {
  const name = nameOf(locations);
  const groups = new Map();
  for (const r of reports) {
    const k = `${name(r.location_id)}\u0000${r.status}`;
    const g = groups.get(k) ?? { location_name: name(r.location_id), status: r.status, issue_count: 0,
      high_severity_count: 0, first_reported: r.submitted_at, last_reported: r.submitted_at, includes_demo: false };
    g.issue_count++;
    if (r.severity === 'high' || r.severity === 'critical') g.high_severity_count++;
    if (r.submitted_at < g.first_reported) g.first_reported = r.submitted_at;
    if (r.submitted_at > g.last_reported) g.last_reported = r.submitted_at;
    g.includes_demo ||= !!r.is_demo;
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => a.location_name.localeCompare(b.location_name) || a.status.localeCompare(b.status));
}

export function reportDailyConsumption(readings, locations) {
  const name = nameOf(locations);
  const groups = new Map();
  for (const w of readings) {
    const k = [w.reading_date, w.location_id, w.phase, w.measurement_method].join('\u0000');
    const g = groups.get(k) ?? { reading_date: w.reading_date, location_name: name(w.location_id), phase: w.phase,
      measurement_method: w.measurement_method, consumption_litres: 0, reading_count: 0, includes_demo: false };
    g.consumption_litres = round(g.consumption_litres + (toLitres(w.consumption_value, w.measurement_unit) ?? 0), 3);
    g.reading_count++;
    g.includes_demo ||= !!w.is_demo;
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => a.reading_date.localeCompare(b.reading_date) || a.location_name.localeCompare(b.location_name));
}

export function reportBaselineVsPilot(readings, locations) {
  const name = nameOf(locations);
  // 1) daily litres per (location, method, phase, date)
  const daily = new Map();
  for (const w of readings) {
    if (w.phase !== 'baseline' && w.phase !== 'pilot') continue;
    const k = [w.location_id, w.measurement_method, w.phase, w.reading_date].join('\u0000');
    const d = daily.get(k) ?? { location_id: w.location_id, method: w.measurement_method, phase: w.phase, litres: 0, demo: false };
    d.litres += toLitres(w.consumption_value, w.measurement_unit) ?? 0;
    d.demo ||= !!w.is_demo;
    daily.set(k, d);
  }
  // 2) aggregate per (location, method)
  const agg = new Map();
  for (const d of daily.values()) {
    const k = `${d.location_id}\u0000${d.method}`;
    const a = agg.get(k) ?? { location_id: d.location_id, method: d.method, b: [], p: [], demo: false };
    (d.phase === 'baseline' ? a.b : a.p).push(d.litres);
    a.demo ||= d.demo;
    agg.set(k, a);
  }
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return [...agg.values()].map((a) => {
    const bAvg = avg(a.b);
    const pAvg = avg(a.p);
    const saved = bAvg !== null && pAvg !== null ? bAvg - pAvg : null;
    return {
      location_name: name(a.location_id),
      measurement_method: a.method,
      baseline_avg_daily_l: round(bAvg),
      baseline_days: a.b.length,
      pilot_avg_daily_l: round(pAvg),
      pilot_days: a.p.length,
      saved_per_day_l: round(saved),
      reduction_pct: bAvg > 0 && pAvg !== null ? round((saved / bAvg) * 100, 1) : null,
      meets_minimum_days: a.b.length >= 3 && a.p.length >= 3,
      includes_demo: a.demo,
    };
  }).sort((x, y) => x.location_name.localeCompare(y.location_name) || x.measurement_method.localeCompare(y.measurement_method));
}

export function reportConservationActions(actions) {
  const groups = new Map();
  for (const a of actions) {
    const k = `${a.status}\u0000${a.responsible_team}`;
    const g = groups.get(k) ?? { status: a.status, responsible_team: a.responsible_team, action_count: 0,
      estimated_cost_ghs: 0, actual_cost_ghs: null, linked_to_reports: 0, includes_demo: false };
    g.action_count++;
    g.estimated_cost_ghs = round(g.estimated_cost_ghs + Number(a.estimated_cost || 0));
    if (a.actual_cost !== null && a.actual_cost !== undefined && a.actual_cost !== '') {
      g.actual_cost_ghs = round((g.actual_cost_ghs ?? 0) + Number(a.actual_cost));
    }
    if (a.report_id) g.linked_to_reports++;
    g.includes_demo ||= !!a.is_demo;
    groups.set(k, g);
  }
  return [...groups.values()].sort((a, b) => a.status.localeCompare(b.status) || a.responsible_team.localeCompare(b.responsible_team));
}

/**
 * "Estimated water saved" headline: sum of positive daily savings across
 * comparable groups that meet the 3-day minimum. Null when nothing qualifies.
 */
export function estimatedDailySaving(readings, locations) {
  const rows = reportBaselineVsPilot(readings, locations).filter((r) => r.meets_minimum_days && r.saved_per_day_l !== null);
  if (!rows.length) return null;
  return round(rows.reduce((s, r) => s + Math.max(0, r.saved_per_day_l), 0), 0);
}

/** Aggregates for public stats (demo mode equivalent of public_stats()). */
export function statsFromRows({ reports, pledges, actions }) {
  const count = (arr, key) => arr.reduce((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {});
  return {
    reports_total: reports.length,
    reports_resolved: reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
    reports_open: reports.filter((r) => r.status !== 'resolved' && r.status !== 'closed').length,
    hotspots: new Set(reports.map((r) => r.location_id).filter(Boolean)).size,
    by_issue_type: count(reports, 'issue_type'),
    by_status: count(reports, 'status'),
    by_severity: count(reports, 'severity'),
    pledges_total: pledges.length,
    actions_completed: actions.filter((a) => a.status === 'completed' || a.status === 'verified').length,
    includes_demo: reports.some((r) => r.is_demo),
  };
}

/** Safe embed URL for YouTube / Google Drive. Returns null for anything else. */
export function toEmbedUrl(raw) {
  if (!raw) return null;
  let u;
  try { u = new URL(String(raw).trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  const ytId = /^[A-Za-z0-9_-]{11}$/;
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
      if (m) id = m[1];
    }
  }
  if (id && ytId.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if (host === 'drive.google.com') {
    const m = u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,})/);
    const fileId = m?.[1] ?? u.searchParams.get('id');
    if (fileId && /^[A-Za-z0-9_-]{10,}$/.test(fileId)) return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return null;
}
