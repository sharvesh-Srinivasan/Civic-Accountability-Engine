import React from 'react';
import {
  AlertTriangle, Lightbulb, Trash2, Droplets, HelpCircle,
  CheckCircle, Clock, XCircle, Shield
} from 'lucide-react';

/* ── Category config ─────────────────────────────────────── */
const CATEGORY_CFG = {
  pothole:     { label: 'Pothole',       Icon: AlertTriangle, iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
  streetlight: { label: 'Streetlight',   Icon: Lightbulb,     iconBg: 'bg-yellow-50',  iconColor: 'text-yellow-600' },
  garbage:     { label: 'Garbage',       Icon: Trash2,        iconBg: 'bg-green-50',   iconColor: 'text-green-700' },
  water_leak:  { label: 'Water Leak',    Icon: Droplets,      iconBg: 'bg-blue-50',    iconColor: 'text-blue-600' },
  other:       { label: 'Other Issue',   Icon: HelpCircle,    iconBg: 'bg-ink-50',     iconColor: 'text-ink-400' },
};

export function getCategoryConfig(cat) {
  return CATEGORY_CFG[cat] || CATEGORY_CFG.other;
}

/* ── Category icon ───────────────────────────────────────── */
export function CategoryIcon({ category, size = 18 }) {
  const cfg = getCategoryConfig(category);
  return (
    <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
      <cfg.Icon size={size} className={cfg.iconColor} />
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────── */
const STATUS_MAP = {
  open:         { label: 'Open',         className: 'badge-open' },
  acknowledged: { label: 'Acknowledged', className: 'badge-acknowledged' },
  resolved:     { label: 'Resolved',     className: 'badge-resolved' },
  disputed:     { label: 'Disputed',     className: 'badge-disputed' },
};
export function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, className: 'badge' };
  return <span className={cfg.className}>{cfg.label}</span>;
}

/* ── Severity badge ──────────────────────────────────────── */
const SEV_MAP = {
  low:    { label: 'Low',    className: 'badge-low' },
  medium: { label: 'Medium', className: 'badge-medium' },
  high:   { label: 'High',   className: 'badge-high' },
};
export function SeverityBadge({ severity }) {
  const cfg = SEV_MAP[severity] || { label: severity, className: 'badge' };
  return <span className={cfg.className}>{cfg.label}</span>;
}

/* ── Commitment badge ────────────────────────────────────── */
const COMMIT_MAP = {
  pending: { label: 'Pending',   className: 'badge-pending', Icon: Clock },
  honored: { label: 'Honored',   className: 'badge-honored', Icon: CheckCircle },
  broken:  { label: 'Broken',    className: 'badge-broken',  Icon: XCircle },
};
export function CommitmentBadge({ status }) {
  const cfg = COMMIT_MAP[status] || { label: status, className: 'badge', Icon: Clock };
  return (
    <span className={cfg.className}>
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
}

/* ── Promise Timeline ────────────────────────────────────── */
export function PromiseTimeline({ report, commitment }) {
  if (!commitment) return null;

  const steps = [
    { label: 'Reported', active: true, icon: CheckCircle },
    { label: 'Acknowledged', active: ['acknowledged', 'resolved'].includes(report.status), icon: CheckCircle },
    { label: 'Promised', active: true, icon: Clock, desc: new Date(commitment.etaDate?.toDate?.() || commitment.etaDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
    { 
      label: commitment.status === 'honored' ? 'Resolved' : commitment.status === 'broken' ? 'Broken' : 'Pending', 
      active: commitment.status !== 'pending', 
      icon: commitment.status === 'honored' ? CheckCircle : commitment.status === 'broken' ? XCircle : Clock,
      isOutcome: true,
      status: commitment.status
    }
  ];

  // Calculate progress bar width
  const activeSteps = steps.filter(s => s.active).length;
  const progressPct = ((activeSteps - 1) / (steps.length - 1)) * 100;
  const progressColor = commitment.status === 'broken' ? 'bg-amber-400' : 'bg-teal-400';

  return (
    <div className="mt-4 pt-4 border-t border-border" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 mb-3">
        <Shield size={14} className="text-navy-500" />
        <h4 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
          Accountability Timeline
        </h4>
      </div>
      
      {/* Commitment detail */}
      <div className="bg-canvas rounded-md p-3 mb-5 text-sm border border-border/50">
        <p className="font-medium text-ink-800">{commitment.authorityName}</p>
        <p className="text-ink-600 mt-0.5 leading-relaxed">{commitment.promisedAction}</p>
      </div>

      {/* Tracker bar */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-border -z-10" />
        {/* Active track */}
        <div 
          className={`absolute top-3 left-[12%] h-0.5 -z-10 transition-all duration-700 ${progressColor}`}
          style={{ width: `calc(${progressPct}% * 0.76)` }} // roughly adjusting for the left/right 12% padding
        />
        
        <div className="flex justify-between relative z-0 px-2">
          {steps.map((step, i) => {
            const colorClass = !step.active ? 'bg-canvas text-ink-300 border-border' : 
                               step.isOutcome && step.status === 'broken' ? 'bg-amber-50 text-amber-600 border-amber-300' :
                               step.isOutcome && step.status === 'honored' ? 'bg-teal-50 text-teal-600 border-teal-300' :
                               'bg-navy-50 text-navy-600 border-navy-300';
                               
            return (
              <div key={i} className="flex flex-col items-center w-16">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1.5 bg-white ${colorClass}`}>
                  <step.icon size={11} strokeWidth={2.5} />
                </div>
                <span className={`text-[10px] leading-tight text-center font-medium ${step.active ? 'text-ink-800' : 'text-ink-400'}`}>
                  {step.label}
                </span>
                {step.desc && (
                  <span className="text-[9px] text-ink-400 mt-0.5">{step.desc}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main ReportCard ─────────────────────────────────────── */
export default function ReportCard({ report, commitment, onClick, compact = false }) {
  const cfg = getCategoryConfig(report.category);
  let date;
  try {
    date = report.createdAt?.toDate?.() ? report.createdAt.toDate() : new Date(report.createdAt);
  } catch {
    date = new Date();
  }

  const CardEl = onClick ? 'button' : 'div';

  return (
    <CardEl
      onClick={onClick}
      className={`w-full text-left ${onClick ? 'card-hover' : 'card'} p-4 block`}
    >
      <div className="flex items-start gap-3">
        <CategoryIcon category={report.category} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-semibold text-sm text-ink-800">{cfg.label}</span>
            <StatusBadge status={report.status} />
            <SeverityBadge severity={report.severity} />
          </div>

          <p className="text-sm text-ink-500 line-clamp-2 leading-relaxed">
            {report.summary || report.description}
          </p>

          {!compact && (
            <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
              <span>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {report.wardId && report.wardId !== 'unknown' && (
                <span>· {report.wardId.replace(/ward(\d+)/i, 'Ward $1')}</span>
              )}
              {report.confidence > 0 && (
                <span>· AI {Math.round(report.confidence * 100)}% confidence</span>
              )}
            </div>
          )}

          {report.confirmations > 0 && !compact && (
            <div className="mt-3 bg-amber-50/50 border border-amber-200/50 rounded-md p-2 text-xs text-amber-800 font-medium flex items-center gap-1.5 w-max">
              <CheckCircle size={12} className="text-amber-600" /> 
              {Math.floor(report.confirmations)} people confirmed this is still an issue
              {report.lastConfirmedAt && ` as of ${new Date(report.lastConfirmedAt?.toDate?.() || report.lastConfirmedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`}
            </div>
          )}
        </div>

        {report.imageUrl && !compact && (
          <img
            src={report.imageUrl}
            alt="Report photo"
            className="w-14 h-14 rounded object-cover border border-border flex-shrink-0"
          />
        )}
      </div>
      
      {commitment && !compact && (
        <div onClick={e => e.stopPropagation()}>
          <PromiseTimeline report={report} commitment={commitment} />
          {commitment.resolutionImageUrl && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-xs font-semibold text-ink-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-teal-600" /> Proof of Resolution
              </h4>
              <div className="grid grid-cols-2 gap-2 h-32 sm:h-40">
                <div className="relative rounded-lg overflow-hidden border border-border group">
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] uppercase px-1.5 py-0.5 rounded font-medium backdrop-blur-sm z-10">Before</span>
                  <img src={report.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" alt="Before" />
                </div>
                <div className="relative rounded-lg overflow-hidden border border-teal-200 group">
                  <span className="absolute top-2 left-2 bg-teal-600 text-white text-[10px] uppercase px-1.5 py-0.5 rounded font-medium shadow-sm z-10">After</span>
                  <img src={commitment.resolutionImageUrl} className="w-full h-full object-cover" alt="After" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </CardEl>
  );
}
