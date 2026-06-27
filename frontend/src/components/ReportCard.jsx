import React from 'react';
import {
  AlertTriangle, Lightbulb, Trash2, Droplets, HelpCircle,
  CheckCircle, Clock, XCircle, Shield
} from 'lucide-react';

/* ── Category config ─────────────────────────────────────── */
const CATEGORY_CFG = {
  pothole:     { label: 'Pothole',       Icon: AlertTriangle, iconBg: 'bg-neon-magenta/10 border border-neon-magenta/30', iconColor: 'text-neon-magenta text-glow-magenta' },
  streetlight: { label: 'Streetlight',   Icon: Lightbulb,     iconBg: 'bg-neon-amber/10 border border-neon-amber/30',     iconColor: 'text-neon-amber text-glow-amber' },
  garbage:     { label: 'Garbage',       Icon: Trash2,        iconBg: 'bg-neon-emerald/10 border border-neon-emerald/30',   iconColor: 'text-neon-emerald text-glow-emerald' },
  water_leak:  { label: 'Water Leak',    Icon: Droplets,      iconBg: 'bg-neon-cyan/10 border border-neon-cyan/30',      iconColor: 'text-neon-cyan text-glow-cyan' },
  other:       { label: 'Other Issue',   Icon: HelpCircle,    iconBg: 'bg-glass-10 border border-white/20',             iconColor: 'text-white/70' },
};

export function getCategoryConfig(cat) {
  return CATEGORY_CFG[cat] || CATEGORY_CFG.other;
}

/* ── Category icon ───────────────────────────────────────── */
export function CategoryIcon({ category, size = 18 }) {
  const cfg = getCategoryConfig(category);
  return (
    <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`} style={{ borderRadius: '8px' }}>
      <cfg.Icon size={size} className={cfg.iconColor} strokeWidth={1.5} />
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
  pending: { label: 'Pending',   className: 'badge bg-glass-10 text-white/50 border border-white/10', Icon: Clock },
  honored: { label: 'Honored',   className: 'badge bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/30 shadow-glow-emerald', Icon: CheckCircle },
  broken:  { label: 'Broken',    className: 'badge bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/30 shadow-glow-magenta',  Icon: XCircle },
};
export function CommitmentBadge({ status }) {
  const cfg = COMMIT_MAP[status] || { label: status, className: 'badge', Icon: Clock };
  return (
    <span className={cfg.className}>
      <cfg.Icon size={10} /> {cfg.label}
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

  const activeSteps = steps.filter(s => s.active).length;
  const progressPct = ((activeSteps - 1) / (steps.length - 1)) * 100;
  const progressColor = commitment.status === 'broken' ? 'bg-neon-magenta shadow-[0_0_10px_#FF007F]' : 'bg-neon-emerald shadow-[0_0_10px_#10B981]';

  return (
    <div className="mt-4 pt-4 border-t border-white/10" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 mb-3">
        <Shield size={14} className="text-neon-cyan" />
        <h4 className="text-[10px] font-display font-bold text-white uppercase tracking-wider">
          Accountability Timeline
        </h4>
      </div>
      
      {/* Commitment detail */}
      <div className="bg-glass-10 p-3 mb-5 text-sm border border-white/10 rounded-xl">
        <p className="font-display font-bold text-white">{commitment.authorityName}</p>
        <p className="text-white/60 mt-0.5 leading-relaxed text-xs">{commitment.promisedAction}</p>
      </div>

      {/* Tracker bar */}
      <div className="relative">
        <div className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-white/5 -z-10" />
        <div 
          className={`absolute top-3 left-[12%] h-0.5 -z-10 transition-all duration-700 ${progressColor}`}
          style={{ width: `calc(${progressPct}% * 0.76)` }}
        />
        
        <div className="flex justify-between relative z-0 px-2">
          {steps.map((step, i) => {
            const colorClass = !step.active ? 'bg-background text-white/20 border-white/10' : 
                               step.isOutcome && step.status === 'broken' ? 'bg-background text-neon-magenta border-neon-magenta shadow-[0_0_8px_#FF007F_inset]' :
                               step.isOutcome && step.status === 'honored' ? 'bg-background text-neon-emerald border-neon-emerald shadow-[0_0_8px_#10B981_inset]' :
                               'bg-background text-neon-cyan border-neon-cyan shadow-[0_0_8px_#00F0FF_inset]';
                               
            return (
              <div key={i} className="flex flex-col items-center w-16">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1.5 ${colorClass}`}>
                  <step.icon size={11} strokeWidth={2.5} />
                </div>
                <span className={`text-[9px] font-display tracking-widest uppercase text-center font-bold ${step.active ? 'text-white' : 'text-white/30'}`}>
                  {step.label}
                </span>
                {step.desc && (
                  <span className="text-[9px] font-sans text-white/40 mt-0.5">{step.desc}</span>
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
      className={`w-full text-left ${onClick ? 'glass-panel-hover' : 'glass-panel'} p-4 block`}
    >
      <div className="flex items-start gap-3">
        <CategoryIcon category={report.category} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-display font-bold text-[10px] uppercase tracking-wider text-white">{cfg.label}</span>
            <StatusBadge status={report.status} />
            <SeverityBadge severity={report.severity} />
          </div>

          <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
            {report.summary || report.description}
          </p>

          {!compact && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/40 font-sans">
              <span>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {report.wardId && report.wardId !== 'unknown' && (
                <span>· {report.wardId.replace(/ward(\d+)/i, 'Ward $1')}</span>
              )}
              {report.confidence > 0 && (
                <span>· AI {Math.round(report.confidence * 100)}%</span>
              )}
            </div>
          )}

          {report.confirmations > 0 && !compact && (
            <div className="mt-3 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-display uppercase tracking-widest font-bold flex items-center gap-1.5 w-max shadow-glow-cyan"
                 style={{ borderRadius: '8px', padding: '6px 10px' }}>
              <CheckCircle size={12} strokeWidth={2} /> 
              {Math.floor(report.confirmations)} Verified
            </div>
          )}
        </div>

        {report.imageUrl && !compact && (
          <img
            src={report.imageUrl}
            alt="Report photo"
            className="w-14 h-14 object-cover border border-white/20 flex-shrink-0"
            style={{ borderRadius: '10px' }}
          />
        )}
      </div>
      
      {commitment && !compact && (
        <div onClick={e => e.stopPropagation()}>
          <PromiseTimeline report={report} commitment={commitment} />
          {commitment.resolutionImageUrl && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-[10px] font-display font-bold text-neon-emerald uppercase tracking-wider flex items-center gap-1.5 shadow-glow-emerald"
                  style={{ marginBottom: '12px' }}>
                <CheckCircle size={12} strokeWidth={2} /> Proof of Resolution
              </h4>
              <div className="grid grid-cols-2 gap-2 h-32 sm:h-40">
                <div className="relative border border-white/10 group overflow-hidden" style={{ borderRadius: '10px' }}>
                  <span className="absolute top-2 left-2 bg-background/80 text-white/50 text-[9px] uppercase px-1.5 py-0.5 font-display font-bold tracking-widest backdrop-blur-sm z-10 rounded">Before</span>
                  <img src={report.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" alt="Before" />
                </div>
                <div className="relative border border-neon-emerald group overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ borderRadius: '10px' }}>
                  <span className="absolute top-2 left-2 bg-neon-emerald text-background text-[9px] uppercase px-1.5 py-0.5 font-display font-bold tracking-widest shadow-sm z-10 rounded">After</span>
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
