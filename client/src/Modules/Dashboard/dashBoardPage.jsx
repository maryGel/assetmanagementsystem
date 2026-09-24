import { useState, useMemo } from 'react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

//custom hooks
import { dashItems } from '../../Utils/dashItems';
import { useJO_h } from '../../hooks/useJO_h';
import { useJO_d } from '../../hooks/useJO_d';
import { useTR_h } from '../../hooks/useTR_h';
import { useAD_h } from '../../hooks/useAD_h';
import { useAssetAccH } from '../../hooks/useAssetAccH';
import { useAssetLostH } from '../../hooks/useAssetLostH';
import { useAssetMasterData } from '../../hooks/assetMasterHooks';
import { useRefAssetGroup } from '../../hooks/refAssetGroup';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

// Look up the first populated field name from a list of possible aliases.
// Different endpoints in this project use different casings for the same
// concept (e.g. "status" vs "Status"), so this keeps the UI resilient
// instead of hard failing on one exact key.
const firstDefined = (obj, keys, fallback = null) => {
  if (!obj) return fallback;
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return fallback;
};

const firstDefinedNumber = (obj, keys) => {
  const raw = firstDefined(obj, keys, null);
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const groupByGetter = (arr, getter, unspecifiedLabel = 'Unspecified') => {
  const map = {};
  (arr || []).forEach(item => {
    const key = getter(item) || unspecifiedLabel;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([label, value]) => ({ label, value }));
};

// Resolves the maintenance status label for a single jo_d (joDetails) row.
// Business rule:
//   - Main_Status is null/blank AND eval_status is falsy  -> excluded entirely (return null)
//   - Main_Status is null/blank AND eval_status is truthy -> "Not Started"
//   - Main_Status is "DONE"                               -> "Completed" (relabeled for display)
//   - any other Main_Status (e.g. OPEN, ONGOING)           -> title-cased, e.g. "Open", "Ongoing"
// Returns null when the row should NOT be counted anywhere on the dashboard.
// Formats a status string as "Capitalized, rest lowercase" per word,
// e.g. "OPEN" -> "Open", "on going" -> "On Going".
const toTitleCase = (str) =>
  String(str)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const getMaintenanceStatusLabel = (d) => {
  const rawStatus = firstDefined(d, ['Main_Status']);
  const evalStatus = firstDefined(d, ['eval_status', 'Eval_Status', 'EvalStatus', 'evalStatus'], null);

  if (rawStatus === null) {
    return evalStatus ? 'Not Started' : null;
  }

  const upper = String(rawStatus).toUpperCase();
  if (upper === 'DONE') return 'Completed';

  return toTitleCase(rawStatus);
};

const formatCurrency = (n) =>
  `P ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#6b7280', '#06b6d4', '#ec4899'];

// TargetDate is the maintenance due date, so it is also the most useful
// basis for the status chart's period filter. The API may return either a
// YYYY-MM-DD string or a full timestamp; both normalize to YYYY-MM.
const getMaintenancePeriod = (targetDate) => {
  if (!targetDate) return null;

  const raw = String(targetDate);
  if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);

  const date = new Date(targetDate);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMaintenancePeriod = (period) => {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
};

const openPendingTransactions = (documentType) => {
  const params = new URLSearchParams({ type: documentType });
  params.append('status', '3');
  params.append('status', '2');
  window.open(`/assetMovement/searchTransactions?${params.toString()}`, '_blank', 'noopener,noreferrer');
};

/* ------------------------------------------------------------------ */
/* Presentational pieces                                               */
/* ------------------------------------------------------------------ */

function StatCard({ icon, iconBg, label, value, trend, trendLabel, loading }) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <span className="text-xs font-semibold tracking-wide text-gray-500">{label}</span>
      {loading ? (
        <div className="flex items-center h-8">
          <CircularProgress size={20} thickness={5} />
        </div>
      ) : (
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      )}
      {!loading && trend !== undefined && trend !== null && (
        <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% <span className="font-normal text-gray-400">{trendLabel}</span>
        </span>
      )}
    </div>
  );
}

function OpsCard({ icon, iconSrc, iconBg, label, value, subItems, onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left flex flex-col gap-2 p-4 bg-white border border-gray-100 shadow-sm rounded-xl transition hover:shadow-md ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className={`flex items-center justify-center w-14 h-14 rounded-lg ${iconBg}`}>
        {iconSrc ? (
          <img src={iconSrc} alt={label} className="object-contain w-8 h-18" />
        ) : (
          icon
        )}
      </div>
      <span className="text-xs font-semibold tracking-wide text-gray-500">{label}</span>
      {loading ? (
        <div className="flex items-center h-7">
          <CircularProgress size={18} thickness={5} />
        </div>
      ) : (
        <span className="text-xl font-bold text-gray-900">{value}</span>
      )}
      {!loading && subItems && subItems.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
          {subItems.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.text}
            </span>
          ))}
        </div>
      )}
      <ArrowForwardIcon
        className="absolute text-gray-400 bottom-3 right-3"
        sx={{ fontSize: 16 }}
      />
    </button>
  );
}

function ActionItem({ icon, iconBg, count, label, onView }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50/70">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-bold text-gray-900">{count}</span>
          <span className="text-[11px] text-gray-600">{label}</span>
        </div>
      </div>
      <button
        onClick={onView}
        className="px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-md hover:bg-blue-50"
      >
        View
      </button>
    </div>
  );
}

function Donut({ data, size = 150, thickness = 20, centerLabel, centerSub }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total === 0 ? (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={thickness}
              />
            ) : (
              data.map((d, i) => {
                const dash = (d.value / total) * circumference;
                const dashArray = `${dash} ${circumference - dash}`;
                const dashOffset = -((cumulative / total) * circumference);
                cumulative += d.value;
                return (
                  <circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={d.color || CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={thickness}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                  />
                );
              })
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{centerLabel}</span>
          <span className="text-[10px] text-gray-500">{centerSub}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {data.map((d, i) => {
          const pct = total ? ((d.value / total) * 100).toFixed(1) : '0.0';
          return (
            <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: d.color || CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="truncate w-28">{d.label}</span>
              <span className="font-medium text-gray-800">{d.value}</span>
              <span className="text-gray-400">({pct}%)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Lightweight multi-series line/area chart, zero external dependencies.
function LineChart({ series, labels, height = 180, width = 420, fillFirst = false }) {
  const padding = { top: 10, right: 10, bottom: 20, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap(s => s.data);
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : 0;

  const toPoints = (data) =>
    data.map((v, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + innerH - ((v - min) / range) * innerH;
      return [x, y];
    });

  const toPath = (points) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => min + (range * i) / yTicks);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* gridlines */}
        {tickVals.map((t, i) => {
          const y = padding.top + innerH - ((t - min) / range) * innerH;
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={0} y={y + 3} fontSize="9" fill="#94a3b8">{Math.round(t)}</text>
            </g>
          );
        })}

        {/* series */}
        {series.map((s, si) => {
          const points = toPoints(s.data);
          const path = toPath(points);
          return (
            <g key={si}>
              {fillFirst && si === 0 && (
                <path
                  d={`${path} L ${points[points.length - 1][0]},${padding.top + innerH} L ${points[0][0]},${padding.top + innerH} Z`}
                  fill={s.color}
                  fillOpacity={0.12}
                  stroke="none"
                />
              )}
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
              />
              {points.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="white" stroke={s.color} strokeWidth={1.5} />
              ))}
            </g>
          );
        })}

        {/* x labels */}
        {labels.map((l, i) => (
          <text
            key={l}
            x={padding.left + i * xStep}
            y={height - 4}
            fontSize="9"
            fill="#94a3b8"
            textAnchor="middle"
          >
            {l}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="flex gap-4 mt-1 ml-8 text-xs text-gray-500">
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-0.5"
                style={{ backgroundColor: s.color, borderTop: s.dashed ? `2px dashed ${s.color}` : undefined }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBar({ label, value, pct, color }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-gray-600 truncate w-28">{label}</span>
      <span className="w-20 font-medium text-gray-800">{value} <span className="text-gray-400">({pct}%)</span></span>
      <div className="flex-1 h-2 overflow-hidden bg-gray-100 rounded-full">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* Small inline icon set (keeps this file dependency-free) */
const Icon = {
  Box: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  Check: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M8.5 12.5l2.3 2.3L15.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Dollar: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.8-1.1 1.7-2.5 1.7-2.5.7-2.5 1.8S10.6 15 12 15s2.5-.8 2.5-1.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Bars: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><path d="M5 19V10M12 19V5M19 19v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Wrench: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.3 2.3-2-2 2.3-2.3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  Transfer: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Users: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M16 8a3 3 0 110 6M22 20c0-2.5-2-4.3-4.5-4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Trash: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Alert: (c) => <svg viewBox="0 0 24 24" fill="none" className={c}><path d="M12 4l9 16H3L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};




/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

function DashboardPage(useProps) {
  const [activePage, setActivePage] = useState(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [maintenancePeriod, setMaintenancePeriod] = useState('all');

  // Job Orders Data
  const { joHeaders, isLoading: joLoading, joRefresh } = useJO_h(useProps);
  const { joDetails, isLoading: joDetailsLoading, joDetailsRefresh } = useJO_d(useProps); // used below for Upcoming Maintenance
  // Transfer Data
  const { trHeaders, isLoading: trLoading, trHRefresh } = useTR_h(useProps);
  // Disposal Data
  const { adHeaders, isLoading: adLoading, adHRefresh } = useAD_h(useProps);
  // Asset Accountability Data (Borrow / Issue)
  const { assetAccHeaders, isLoading: accLoading, accHRefresh } = useAssetAccH(useProps);
  // Asset Lost Data
  const { assetLostHeaders, isLoading: aLostLoading, aLostHRefresh } = useAssetLostH(useProps);
  // Asset Master Data (for total counts / status / category breakdowns)
  const { allAssets, allAssetsLoading, refreshAllAssets } = useAssetMasterData();
  // Asset Group lookup (AssetGrpCode -> AssetGroup name), joined against
  // itemlist.AssetGrpCode for the "Asset Summary by Asset Group" panel.
  const { assetGroups, isLoading: assetGroupsLoading, assetGroupsRefresh } = useRefAssetGroup();

  const isAnyLoading =
    joLoading || joDetailsLoading || trLoading || adLoading || accLoading || aLostLoading ||
    allAssetsLoading || assetGroupsLoading;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        joRefresh(),
        joDetailsRefresh(),
        trHRefresh(),
        adHRefresh(),
        accHRefresh(),
        aLostHRefresh(),
        refreshAllAssets(),
        assetGroupsRefresh(),
      ]);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  /* ---------------- Pending-doc counts (real data) ---------------- */
  const joCount = (joHeaders || []).filter(jo => (jo.xpost === 3 || jo.xpost === 2) && jo.DISAPPROVED === 0).length;
  // JO Evaluation: joHeaders rows still pending evaluation — posted (xpost = 1) with no eval_status yet.
  // Uses firstDefined so this survives casing differences (Eval_Status/EvalStatus/evalStatus) and
  // coerces xpost to a Number in case the API returns it as a string ("1" vs 1).
  const joEvalCount = (joHeaders || []).filter(jo => {
    const xpost = Number(firstDefined(jo, ['xpost', 'xPosted'], null));
    const evalStatus = firstDefined(jo, ['eval_status', 'Eval_Status', 'EvalStatus', 'evalStatus'], null);
    return xpost === 1 && evalStatus === null;
  }).length;
  const trCount = (trHeaders || []).filter(tr => (tr.xpost === 3 || tr.xpost === 2) && tr.DISAPPROVED === 0).length;
  const adCount = (adHeaders || []).filter(ad => (ad.xpost === 3 || ad.xpost === 2) && ad.DISAPPROVED === 0).length;
  const aAcctCount = (assetAccHeaders || []).filter(aa => (aa.xPosted === 3 || aa.xPosted === 2) && aa.DISAPPROVED === 0).length;
  const aLostCount = (assetLostHeaders || []).filter(al => (al.xPosted === 3 || al.xPosted === 2) && al.DISAPPROVED === 0).length;

  const items = dashItems({ joCount, maintCount: joEvalCount, trCount, adCount, aAcctCount, aLostCount });
  const itemById = id => items.find(i => i.id === id);

  /* ---------------- Top stat row ----------------
     Confirmed against the itemlist table schema:
       xStatus  -> lifecycle status, e.g. "ACTIVE"
       AAmount  -> acquisition amount (gross asset value)
       Abre     -> accumulated depreciation to date
       CATEGORY -> asset category
     Net book value = AAmount - Abre per asset. The alias lists are kept
     as a fallback for older/renamed fields, but the real column names
     are checked first. */
  const totalAssets = (allAssets || []).length;
  const activeAssets = (allAssets || []).filter(a => {
    const status = String(firstDefined(a, ['xStatus', 'status', 'Status'], '')).toUpperCase();
    return status === 'ACTIVE';
  }).length;
  const totalAssetValue = (allAssets || []).reduce(
    (sum, a) => sum + firstDefinedNumber(a, ['AAmount', 'acqValue', 'value', 'Value']),
    0
  );
  const netBookValue = (allAssets || []).reduce((sum, a) => {
    const acq = firstDefinedNumber(a, ['AAmount', 'acqValue', 'value', 'Value']);
    const depr = firstDefinedNumber(a, ['Abre', 'accumDepreciation']);
    return sum + (acq - depr);
  }, 0);

  /* ---------------- Document Status donut ----------------
     Includes only document states that still require workflow attention:
     xpost/xPosted 0 = Draft, 3 = For Approval, 2 = Partially Approved.
     Posted documents (1) are intentionally excluded. */
  const documentStatusData = useMemo(() => {
    const documents = [
      ...(joHeaders || []),
      ...(trHeaders || []),
      ...(adHeaders || []),
      ...(assetAccHeaders || []),
      ...(assetLostHeaders || []),
    ];
    const counts = { Draft: 0, 'For Approval': 0, 'Partially Approved': 0 };

    documents.forEach(document => {
      const rawStatus = firstDefined(document, ['xpost', 'xPosted'], null);
      const status = rawStatus === null ? null : Number(rawStatus);
      if (status === 0) counts.Draft += 1;
      if (status === 3) counts['For Approval'] += 1;
      if (status === 2) counts['Partially Approved'] += 1;
    });

    return [
      { label: 'Draft', value: counts.Draft, color: '#6b7280' },
      { label: 'For Approval', value: counts['For Approval'], color: '#f59e0b' },
      { label: 'Partially Approved', value: counts['Partially Approved'], color: '#3b82f6' },
    ];
  }, [joHeaders, trHeaders, adHeaders, assetAccHeaders, assetLostHeaders]);
  const documentStatusTotal = documentStatusData.reduce((sum, status) => sum + status.value, 0);

  /* ---------------- Maintenance Status donut (real, from JO details) ---------------- */
  const maintenancePeriodOptions = useMemo(() => {
    const periods = new Set(
      (joDetails || []).map(d => getMaintenancePeriod(d.TargetDate)).filter(Boolean)
    );
    return [...periods].sort((a, b) => b.localeCompare(a));
  }, [joDetails]);

  const maintenanceStatusData = useMemo(() => {
    // Rows with no Main_Status AND no eval_status are not counted at all.
    const countable = (joDetails || []).filter(d =>
      getMaintenanceStatusLabel(d) !== null &&
      (maintenancePeriod === 'all' || getMaintenancePeriod(d.TargetDate) === maintenancePeriod)
    );
    const grouped = groupByGetter(countable, d => getMaintenanceStatusLabel(d));
    return grouped.map((g, i) => ({ ...g, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [joDetails, maintenancePeriod]);
  const maintenanceStatusTotal = maintenanceStatusData.reduce((s, d) => s + d.value, 0);
  // "Overdue Maintenance" basis: total of the Maintenance Status breakdown above,
  // excluding rows already marked Completed (i.e. DONE).
  const overdueMaintenanceCount = maintenanceStatusData
    .filter(d => d.label !== 'Completed')
    .reduce((s, d) => s + d.value, 0);

  /* ---------------- Upcoming Maintenance (real, derived from JO details) ---------------- */
  const upcomingMaintenance = useMemo(() => {
    return (joDetails || [])
      .filter(d => {
        const label = getMaintenanceStatusLabel(d);
        // Not counted: no Main_Status and no eval_status.
        if (label === null) return false;
        const upper = label.toUpperCase();
        return d.TargetDate && upper !== 'COMPLETED' && upper !== 'CLOSED';
      })
      .sort((a, b) => new Date(a.TargetDate) - new Date(b.TargetDate))
      .slice(0, 5)
      .map(d => ({
        asset: firstDefined(d, ['FAC_name', 'FAC_NO'], '—'),
        type: firstDefined(d, ['workDet'], 'Maintenance'),
        due: d.TargetDate ? new Date(d.TargetDate).toLocaleDateString() : '—',
        status: getMaintenanceStatusLabel(d) || 'OPEN',
      }));
  }, [joDetails]);

  /* ---------------- Asset Summary by Category (real, if category field present) ---------------- */
  const categoryData = useMemo(() => {
    const grouped = groupByGetter(allAssets, a => firstDefined(a, ['CATEGORY', 'category', 'ItemClass', 'itemClass']));
    const total = grouped.reduce((s, g) => s + g.value, 0) || 1;
    return grouped
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((g, i) => ({ ...g, pct: ((g.value / total) * 100).toFixed(1), color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [allAssets]);

  /* ---------------- Asset Summary by Asset Group ----------------
     Basis: itemlist.AssetGrpCode, grouped and counted directly from the
     asset master list (not a category — CATEGORY is a separate rollup
     above). Each code is labeled using the refassetgroup lookup table
     (AssetGrpCode -> AssetGroup). If a code has no match in the lookup —
     e.g. the lookup hasn't loaded yet, or a code was retired — it falls
     back to showing the raw code rather than silently dropping the row. */
  const assetGroupData = useMemo(() => {
    const codeToName = new Map(
      (assetGroups || []).map(g => [String(g.AssetGrpCode).trim(), g.AssetGroup])
    );
    const grouped = groupByGetter(allAssets, a => {
      const code = firstDefined(a, ['AssetGrpCode']);
      return typeof code === 'string' ? code.trim() : code;
    });
    const total = grouped.reduce((s, g) => s + g.value, 0) || 1;
    return grouped
      .map(g => ({ ...g, label: codeToName.get(String(g.label)) || g.label }))
      .sort((a, b) => b.value - a.value)
      .map((g, i) => ({ ...g, pct: ((g.value / total) * 100).toFixed(1), color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [allAssets, assetGroups]);

  /* ---------------- SAMPLE DATA -----------------------------------
     No endpoint currently returns time-series activity or a running
     value/depreciation history, so these two charts use placeholder
     shapes purely to preserve the layout. Swap `monthlyActivitySample`
     and `assetValueSample` for real series once an endpoint exists
     (e.g. GET /dashboard/activity, GET /dashboard/assetValueHistory). */
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const monthlyActivitySample = [20, 35, 50, 65, 88, 70, 55, 30]; // SAMPLE DATA
  const bookValueSample = [2.9, 2.85, 2.9, 2.95, 2.88, 2.8, 2.75, 2.7]; // SAMPLE DATA ($M)
  const depreciationSample = [0.5, 0.6, 0.65, 0.75, 0.8, 0.85, 0.9, 0.95]; // SAMPLE DATA ($M)
  const recentActivitySample = [ // SAMPLE DATA — wire to a real activity log endpoint
    { time: '08:42', text: 'Asset transferred to Finance Department', icon: Icon.Transfer, color: 'text-purple-600' },
    { time: '08:30', text: 'Work order created', icon: Icon.Wrench, color: 'text-blue-600' },
    { time: '08:15', text: 'Asset marked as lost', icon: Icon.Alert, color: 'text-red-600' },
    { time: '07:55', text: 'Maintenance completed', icon: Icon.Check, color: 'text-green-600' },
    { time: '07:30', text: 'Asset assigned to HR Department', icon: Icon.Users, color: 'text-purple-600' },
  ];

  /* ---------------- Action Required (real counts only) ---------------- */
  // const actionItems = [
  //   {
  //     key: 'maint',
  //     label: 'Maintenance',
  //     count: overdueMaintenanceCount,
  //     icon: Icon.Wrench('w-4 h-4 text-blue-600'),
  //     iconBg: 'bg-blue-100',
  //     targetId: 2,
  //     onView: () => window.open(
  //       '/assetMovement/pages/maintenancePage?tab=maintenance&date=all&status=ongoing&status=not-started',
  //       '_blank',
  //       'noopener,noreferrer'
  //     )
  //   },
  //   { key: 'tr', label: 'Pending Transfers', count: trCount, icon: Icon.Transfer('w-4 h-4 text-purple-600'), iconBg: 'bg-purple-100', targetId: 3 },
  //   { key: 'lost', label: 'Lost Assets', count: aLostCount, icon: Icon.Alert('w-4 h-4 text-red-600'), iconBg: 'bg-red-100', targetId: 6 },
  //   { key: 'disp', label: 'Assets for Disposal', count: adCount, icon: Icon.Trash('w-4 h-4 text-orange-600'), iconBg: 'bg-orange-100', targetId: 5 },
  // ].filter(a => a.count > 0);

  return (
    <div className="flex flex-col gap-4 p-3 md:p-4">

      {/* ---------------- Header / refresh ---------------- */}
      <div className="flex items-center justify-end">
        <Tooltip title="Refresh dashboard">
          <span>
            <IconButton
              onClick={handleRefresh}
              disabled={isManualRefreshing || isAnyLoading}
              size="small"
              className="bg-white border border-gray-200 shadow-sm"
            >
              <RefreshIcon
                fontSize="small"
                className={isManualRefreshing || isAnyLoading ? 'animate-spin' : ''}
              />
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {/* ---------------- Top stat cards ---------------- */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Icon.Box('w-5 h-5 text-blue-600')}
          iconBg="bg-blue-100"
          label="TOTAL ASSETS"
          value={totalAssets.toLocaleString()}
          loading={allAssetsLoading}
        />
        <StatCard
          icon={Icon.Check('w-5 h-5 text-green-600')}
          iconBg="bg-green-100"
          label="ACTIVE ASSETS"
          value={activeAssets.toLocaleString()}
          loading={allAssetsLoading}
        />
        <StatCard
          icon={Icon.Dollar('w-5 h-5 text-purple-600')}
          iconBg="bg-purple-100"
          label="TOTAL ASSET VALUE"
          value={formatCurrency(totalAssetValue)}
          loading={allAssetsLoading}
        />
        <StatCard
          icon={Icon.Bars('w-5 h-5 text-orange-600')}
          iconBg="bg-orange-100"
          label="NET BOOK VALUE"
          value={formatCurrency(netBookValue)}
          loading={allAssetsLoading}
        />
      </div>

      {/* ---------------- Ops cards (Job Orders / Maintenance / Transfers / Borrow / Disposals / Lost) ---------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-7 md:grid-cols-5">
        <OpsCard
          iconSrc="/dashIcons/jo.png"
          // iconBg="bg-indigo-100"
          label="JOB ORDERS"
          value={joCount}
          onClick={() => openPendingTransactions('Job Order')}
          disabled={!!activePage}
          loading={joLoading}
        />
        <OpsCard
          iconSrc="/dashIcons/joeval.png"
          // iconBg="bg-blue-100"
          label="JO EVALUATION"
          value={joEvalCount}
          onClick={() => window.open(
            '/assetMovement/pages/maintenancePage?tab=evaluate&status=pending&date=all',
            '_blank',
            'noopener,noreferrer'
          )}
          disabled={!!activePage}
          loading={joLoading}
        />
         <OpsCard
          iconSrc="/dashIcons/mechanic.png"
          // iconBg="bg-red-100"
          label="MAINTENANCE"
          value={joEvalCount}
          onClick={() => window.open(
            '/assetMovement/pages/maintenancePage?tab=maintenance&date=all&status=ongoing&status=not-started',
            '_blank',
            'noopener,noreferrer'
          )}
          disabled={!!activePage}
          loading={joLoading}
        />
        <OpsCard
          iconSrc="/dashIcons/transfer.png"
          // iconBg="bg-purple-100"
          label="TRANSFERS"
          value={trCount}
          onClick={() => openPendingTransactions('Transfer Order Form')}
          disabled={!!activePage}
          loading={trLoading}
        />
        <OpsCard
          iconSrc="/dashIcons/issuance.png"
          // iconBg="bg-green-100"
          label="BORROW / ISSUE"
          value={aAcctCount}
          onClick={() => openPendingTransactions('Asset Accountability Form')}
          disabled={!!activePage}
          loading={accLoading}
        />
        <OpsCard
          iconSrc="/dashIcons/garbage.png"
          // iconBg="bg-orange-100"
          label="DISPOSALS"
          value={adCount}
          onClick={() => openPendingTransactions('Disposal Form')}
          disabled={!!activePage}
          loading={adLoading}
        />
        <OpsCard
          iconSrc="/dashIcons/lost.png"
          // iconBg="bg-red-100"
          label="LOST ASSETS"
          value={aLostCount}
          onClick={() => openPendingTransactions('Lost Asset Form')}
          disabled={!!activePage}
          loading={aLostLoading}
        />
      </div>

      {/* ---------------- Action Required ---------------- */}
      {/* {actionItems.length > 0 && (
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-red-600">
            {Icon.Alert('w-4 h-4')}
            ACTION REQUIRED
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actionItems.map(a => (
              <ActionItem
                key={a.key}
                icon={a.icon}
                iconBg={a.iconBg}
                count={a.count}
                label={a.label}
                onView={a.onView || (() => setActivePage(a.targetId))}
              />
            ))}
          </div>
        </div>
      )} */}

      {/* ---------------- Charts row ---------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500">DOCUMENT STATUS</h3>
          <Donut data={documentStatusData} centerLabel={documentStatusTotal.toLocaleString()} centerSub="Documents" />
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-semibold tracking-wide text-gray-500">MAINTENANCE STATUS</h3>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
              Period
              <select
                value={maintenancePeriod}
                onChange={(event) => setMaintenancePeriod(event.target.value)}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md outline-none cursor-pointer focus:border-blue-500"
                aria-label="Filter maintenance status by period"
              >
                <option value="all">All periods</option>
                {maintenancePeriodOptions.map(period => (
                  <option key={period} value={period}>{formatMaintenancePeriod(period)}</option>
                ))}
              </select>
            </label>
          </div>
          {maintenanceStatusData.length > 0 ? (
            <Donut data={maintenanceStatusData} centerLabel={maintenanceStatusTotal} centerSub="Total" />
          ) : (
            <p className="text-xs text-gray-400">No maintenance items for this period.</p>
          )}
        </div>

        {/* <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wide text-gray-500">MONTHLY ACTIVITY</h3>
            <span className="text-[10px] text-gray-400 italic">sample data</span>
          </div>
          <LineChart
            labels={monthLabels}
            series={[{ name: 'All Activities', data: monthlyActivitySample, color: '#3b82f6' }]}
            fillFirst
          />
        </div>

        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wide text-gray-500">ASSET VALUE OVER TIME</h3>
            <span className="text-[10px] text-gray-400 italic">sample data</span>
          </div>
          <LineChart
            labels={monthLabels}
            series={[
              { name: 'Book Value', data: bookValueSample, color: '#7c3aed' },
              { name: 'Depreciation', data: depreciationSample, color: '#a78bfa', dashed: true },
            ]}
          />
        </div> */}
      </div>

      {/* ---------------- Bottom panels ---------------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        {/* Asset Summary by Asset Group */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500">ASSET SUMMARY BY ASSET GROUP</h3>
          {allAssetsLoading || assetGroupsLoading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
              <CircularProgress size={16} thickness={5} />
              Loading asset groups…
            </div>
          ) : assetGroupData.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {assetGroupData.map((g, i) => (
                <CategoryBar key={i} label={g.label} value={g.value} pct={g.pct} color={g.color} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No AssetGrpCode found on asset records yet.</p>
          )}
        </div>

        {/* Asset Summary by Category */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500">ASSET SUMMARY BY CATEGORY</h3>
          {categoryData.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {categoryData.map((c, i) => (
                <CategoryBar key={i} label={c.label} value={c.value} pct={c.pct} color={c.color} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No category field found on asset records yet.</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wide text-gray-500">RECENT ACTIVITY</h3>
            <span className="text-[10px] text-gray-400 italic">sample data</span>
          </div>
          <ul className="flex flex-col gap-3">
            {recentActivitySample.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="w-10 pt-0.5 text-gray-400">{a.time}</span>
                <span className={`pt-0.5 ${a.color}`}>{a.icon('w-3.5 h-3.5')}</span>
                <span className="text-gray-700">{a.text}</span>
              </li>
            ))}
          </ul>
          <button className="mt-3 text-xs font-medium text-blue-600 hover:underline">View all activity →</button>
        </div>

        {/* Upcoming Maintenance */}
        <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
          <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500">UPCOMING MAINTENANCE</h3>
          {upcomingMaintenance.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-2 font-medium">ASSET</th>
                  <th className="pb-2 font-medium">TYPE</th>
                  <th className="pb-2 font-medium">DUE DATE</th>
                  <th className="pb-2 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {upcomingMaintenance.map((m, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="py-2 font-medium text-gray-800">{m.asset}</td>
                    <td className="py-2 text-gray-600">{m.type}</td>
                    <td className="py-2 text-gray-600">{m.due}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">No upcoming maintenance items.</p>
          )}
          <button className="mt-3 text-xs font-medium text-blue-600 hover:underline">View all maintenance →</button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;