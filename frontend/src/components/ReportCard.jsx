import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

/* ── Category config ─────────────────────────────────────── */
const CATEGORY_CFG = {
  pothole:     { label: 'Pothole',       icon: 'warning',    iconBg: 'bg-error-container text-on-error-container' },
  streetlight: { label: 'Streetlight',   icon: 'lightbulb',  iconBg: 'bg-surface-variant text-on-surface-variant' },
  garbage:     { label: 'Garbage',       icon: 'delete',     iconBg: 'bg-secondary-container text-on-secondary-container' },
  water_leak:  { label: 'Water Leak',    icon: 'water_drop', iconBg: 'bg-primary-container text-on-primary-container' },
  other:       { label: 'Other Issue',   icon: 'help',       iconBg: 'bg-surface-container-high text-on-surface-variant' },
};

export function getCategoryConfig(cat) {
  return CATEGORY_CFG[cat] || CATEGORY_CFG.other;
}

/* ── Category icon ───────────────────────────────────────── */
export function CategoryIcon({ category, size = 20 }) {
  const cfg = getCategoryConfig(category);
  return (
    <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-lg ${cfg.iconBg}`}>
      <span className="material-symbols-outlined" style={{ fontSize: size }}>{cfg.icon}</span>
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────── */
const STATUS_MAP = {
  open:         { label: 'Open',         className: 'bg-surface-variant text-on-surface-variant' },
  acknowledged: { label: 'Acknowledged', className: 'bg-secondary-container text-on-secondary-container' },
  resolved:     { label: 'Resolved',     className: 'bg-secondary text-on-secondary' },
  disputed:     { label: 'Disputed',     className: 'bg-error text-on-error' },
  reopened:     { label: 'Reopened',     className: 'bg-error text-on-error border-2 border-error font-extrabold' },
};
export function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, className: 'bg-surface-container text-on-surface-variant' };
  return <span className={`px-2 py-0.5 rounded font-label-md text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>{cfg.label}</span>;
}

/* ── Severity badge ──────────────────────────────────────── */
const SEV_MAP = {
  low:    { label: 'Low',    className: 'border border-outline-variant text-on-surface-variant' },
  medium: { label: 'Medium', className: 'bg-surface-variant text-on-surface-variant' },
  high:   { label: 'High',   className: 'bg-error-container text-on-error-container' },
};
export function SeverityBadge({ severity }) {
  const cfg = SEV_MAP[severity] || { label: severity, className: 'border border-outline-variant text-on-surface-variant' };
  return <span className={`px-2 py-0.5 rounded font-label-md text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>{cfg.label}</span>;
}

/* ── Promise Timeline ────────────────────────────────────── */
export function PromiseTimeline({ report, commitment }) {
  if (!commitment) return null;

  const steps = [
    { label: 'Reported', active: true, icon: 'campaign' },
    { label: 'Acknowledged', active: ['acknowledged', 'resolved'].includes(report.status), icon: 'mark_email_read' },
    { label: 'Promised', active: true, icon: 'handshake', desc: new Date(commitment.etaDate?.toDate?.() || commitment.etaDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
    { 
      label: commitment.status === 'honored' ? 'Resolved' : commitment.status === 'broken' ? 'Broken' : 'Pending', 
      active: commitment.status !== 'pending', 
      icon: commitment.status === 'honored' ? 'check_circle' : commitment.status === 'broken' ? 'cancel' : 'pending_actions',
      isOutcome: true,
      status: commitment.status
    }
  ];

  const activeSteps = steps.filter(s => s.active).length;
  const progressPct = ((activeSteps - 1) / (steps.length - 1)) * 100;
  
  let progressColor = 'bg-primary';
  if (commitment.status === 'broken') progressColor = 'bg-error';
  if (commitment.status === 'honored') progressColor = 'bg-secondary';

  return (
    <div className="mt-6 pt-5 border-t border-outline-variant" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
        <h4 className="text-[12px] font-label-md font-bold text-on-surface uppercase tracking-wider">
          Accountability Tracker
        </h4>
      </div>
      
      {/* Commitment detail */}
      <div className="bg-surface-container-low p-4 mb-6 border border-outline-variant rounded-xl shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
          <p className="font-label-md font-bold text-on-surface">{commitment.authorityName}</p>
        </div>
        <p className="text-on-surface-variant mt-1 leading-relaxed text-sm pl-6">{commitment.promisedAction}</p>
      </div>

      {/* Tracker bar UI */}
      <div className="relative mx-4 pb-2">
        {/* Background track line */}
        <div className="absolute top-[14px] left-0 right-0 h-1 bg-surface-container-highest rounded-full -z-10" />
        
        {/* Animated progress line */}
        <div 
          className={`absolute top-[14px] left-0 h-1 rounded-full -z-10 transition-all duration-1000 ease-in-out ${progressColor}`}
          style={{ width: `${progressPct}%` }}
        />
        
        <div className="flex justify-between relative z-0">
          {steps.map((step, i) => {
            const isCompleted = step.active;
            const isCurrent = isCompleted && (i === activeSteps - 1);
            
            let colorClass = 'bg-surface-container-lowest text-outline border-outline-variant';
            if (isCompleted) {
              if (step.isOutcome && step.status === 'broken') {
                colorClass = 'bg-error text-on-error border-error shadow-sm';
              } else if (step.isOutcome && step.status === 'honored') {
                colorClass = 'bg-secondary text-on-secondary border-secondary shadow-sm';
              } else {
                colorClass = 'bg-primary text-on-primary border-primary shadow-sm';
              }
            }

            return (
              <div key={i} className="flex flex-col items-center w-20 transform transition-transform duration-300 hover:-translate-y-1">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-colors duration-500 ${colorClass} ${isCurrent ? 'animate-pulse ring-4 ring-primary/20' : ''}`}>
                  <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                </div>
                <span className={`text-[10px] font-label-md tracking-wide uppercase text-center font-bold ${isCompleted ? 'text-on-surface' : 'text-outline'}`}>
                  {step.label}
                </span>
                {step.desc && (
                  <span className="text-[10px] font-body-md text-on-surface-variant mt-0.5">{step.desc}</span>
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
  const [isReopened, setIsReopened] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleReopen = async (e) => {
    e.stopPropagation();
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      if (db) {
        await updateDoc(doc(db, 'reports', report.id), { status: 'reopened' });
      }
      setIsReopened(true);
      toast.success('Report reopened and flagged for authority review.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reopen the report.');
    } finally {
      setIsUpdating(false);
    }
  };

  const cfg = getCategoryConfig(report.category);
  let date;
  try {
    date = report.createdAt?.toDate?.() ? report.createdAt.toDate() : new Date(report.createdAt);
  } catch {
    date = new Date();
  }

  // 1. Cost of Inaction Estimator
  const daysSinceCreation = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  const daysOpen = daysSinceCreation > 0 ? daysSinceCreation : 1;
  const costMultiplier = { pothole: 500, streetlight: 200, garbage: 300, water_leak: 400, other: 100 };
  const estimatedCost = daysOpen * (costMultiplier[report.category] || 100);

  // 2. Re-verification Agent
  const effectiveStatus = isReopened ? 'reopened' : report.status;
  const isResolved = report.status === 'resolved';
  // Mock logic: Trigger reverification if it's resolved and older than ~10 days (simulating 30 days for demo)
  const isReverificationDue = isResolved && daysOpen > 10 && !isReopened;

  const CardEl = onClick ? 'button' : 'div';

  return (
    <CardEl
      onClick={onClick}
      className={`w-full text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-5 block transition-all duration-300 hover:shadow-md ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start gap-4">
        <CategoryIcon category={report.category} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-label-md font-bold text-[12px] uppercase tracking-wider text-on-surface">{cfg.label}</span>
            <StatusBadge status={effectiveStatus} />
            <SeverityBadge severity={report.severity} />
          </div>

          <p className="text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
            {report.summary || report.description}
          </p>

          {!compact && (
            <div className="flex items-center gap-3 mt-3 text-[11px] text-on-surface-variant font-body-md">
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
            <div className="mt-3 bg-secondary-container text-on-secondary-container text-[11px] font-label-md uppercase tracking-widest font-bold flex items-center gap-1.5 w-max px-3 py-1.5 rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> 
              {Math.floor(report.confirmations)} Verified
            </div>
          )}

          {/* Feature: Civic Cost-of-Inaction Estimator */}
          {!compact && effectiveStatus !== 'resolved' && (
            <div className="mt-3 bg-surface-container-lowest border border-outline-variant p-2.5 rounded-lg w-fit shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-error"></div>
              <div className="flex items-center gap-1.5 mb-1 pl-2">
                <span className="material-symbols-outlined text-[14px] text-error">trending_up</span>
                <span className="font-label-md text-[10px] font-bold text-on-surface uppercase tracking-wider">Cost of Inaction</span>
              </div>
              <p className="font-body-sm text-[11px] text-on-surface-variant pl-2">
                Estimated cumulative cost to community so far: <strong className="text-on-surface">~₹{estimatedCost.toLocaleString()}</strong> <span className="opacity-50">(illustrative estimate)</span>
              </p>
            </div>
          )}

          {/* Feature: Accountability Re-Verification Agent */}
          {!compact && isReverificationDue && (
            <div className="mt-4 bg-primary-fixed/20 border border-primary p-3 rounded-lg w-full text-left" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[16px] text-primary">fact_check</span>
                <span className="font-label-md text-[11px] font-bold text-primary uppercase tracking-wider">Accountability Re-Verification</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface mb-3 leading-relaxed">
                This issue was marked resolved over 30 days ago. As a previous reporter, please verify: <strong>Is this still fixed?</strong>
              </p>
              <div className="flex items-center gap-2">
                <button className="bg-surface border border-outline text-on-surface px-4 py-1.5 rounded-md text-xs font-bold hover:bg-surface-variant transition-colors" onClick={(e) => { e.stopPropagation(); toast('Thanks for confirming!', {icon:'✅'}); }}>Yes, it holds up</button>
                <button disabled={isUpdating} className="bg-error text-on-error px-4 py-1.5 rounded-md text-xs font-bold hover:bg-error/90 transition-colors shadow-sm disabled:opacity-50" onClick={handleReopen}>{isUpdating ? 'Updating...' : 'No, problem returned'}</button>
              </div>
            </div>
          )}

          {isReopened && (
             <div className="mt-4 bg-error-container text-on-error-container p-3 rounded-lg border border-error shadow-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1">
                   <span className="material-symbols-outlined text-[16px]">warning</span>
                   <span className="font-bold text-xs uppercase tracking-wider">Authority Trust Score Penalized</span>
                </div>
                <p className="text-[11px] leading-relaxed">This report was automatically reopened because community members flagged the fix as defective. The responsible authority has been notified.</p>
             </div>
          )}
        </div>

        {report.imageUrl && !compact && (
          <img
            src={report.imageUrl}
            alt="Report photo"
            className="w-16 h-16 object-cover border border-outline-variant flex-shrink-0 rounded-xl"
          />
        )}
      </div>
      
      {commitment && !compact && (
        <div onClick={e => e.stopPropagation()}>
          <PromiseTimeline report={report} commitment={commitment} />
          {commitment.resolutionImageUrl && (
            <div className="mt-6 pt-5 border-t border-outline-variant">
              <h4 className="text-[12px] font-label-md font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5"
                  style={{ marginBottom: '16px' }}>
                <span className="material-symbols-outlined text-[16px]">check_circle</span> Proof of Resolution
              </h4>
              <div className="grid grid-cols-2 gap-3 h-32 sm:h-48">
                <div className="relative border border-outline-variant group overflow-hidden rounded-xl bg-surface-container-low">
                  <span className="absolute top-2 left-2 bg-surface-container/80 text-on-surface text-[10px] uppercase px-2 py-1 font-label-md font-bold tracking-widest backdrop-blur-sm z-10 rounded">Before</span>
                  <img src={report.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Before" />
                </div>
                <div className="relative border border-secondary group overflow-hidden shadow-sm rounded-xl bg-secondary-container">
                  <span className="absolute top-2 left-2 bg-secondary text-on-secondary text-[10px] uppercase px-2 py-1 font-label-md font-bold tracking-widest shadow-sm z-10 rounded">After</span>
                  <img src={commitment.resolutionImageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="After" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </CardEl>
  );
}
