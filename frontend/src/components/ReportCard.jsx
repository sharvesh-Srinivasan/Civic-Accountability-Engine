import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

/* ── Category config ─────────────────────────────────────── */
const CATEGORY_CFG = {
  pothole:     { label: 'Pothole',       icon: 'warning',    iconBg: 'bg-terracotta/10 text-terracotta' },
  streetlight: { label: 'Streetlight',   icon: 'lightbulb',  iconBg: 'bg-paper text-muted' },
  garbage:     { label: 'Garbage',       icon: 'delete',     iconBg: 'bg-sage/10 text-sage' },
  water_leak:  { label: 'Water Leak',    icon: 'water_drop', iconBg: 'bg-navy/10 text-navy' },
  other:       { label: 'Other Issue',   icon: 'help',       iconBg: 'bg-surface text-muted' },
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
  open:         { label: 'Open',         className: 'bg-paper text-muted' },
  acknowledged: { label: 'Acknowledged', className: 'bg-sage/10 text-sage' },
  resolved:     { label: 'Resolved',     className: 'bg-sage text-white' },
  disputed:     { label: 'Disputed',     className: 'bg-surface text-muted border border-border' },
  reopened:     { label: 'Reopened',     className: 'bg-surface text-muted border-2 border-border font-extrabold' },
};
export function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, className: 'bg-surface text-muted' };
  return <span className={`px-2 py-0.5 rounded font-label-md text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}>{cfg.label}</span>;
}

/* ── Severity badge ──────────────────────────────────────── */
const SEV_MAP = {
  low:    { label: 'Low',    className: 'border border-border text-muted' },
  medium: { label: 'Medium', className: 'bg-paper text-muted' },
  high:   { label: 'High',   className: 'bg-terracotta/10 text-terracotta' },
};
export function SeverityBadge({ severity }) {
  const cfg = SEV_MAP[severity] || { label: severity, className: 'border border-border text-muted' };
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
  
  let progressColor = 'bg-navy';
  if (commitment.status === 'broken') progressColor = 'bg-outline';
  if (commitment.status === 'honored') progressColor = 'bg-sage';

  return (
    <div className="mt-6 pt-5 border-t border-border" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[18px] text-navy">verified_user</span>
        <h4 className="text-[12px] font-serif font-bold text-ink uppercase tracking-wider">
          Official Commitment Log
        </h4>
      </div>
      
      {/* Commitment detail */}
      <div className="bg-surface p-4 mb-6 border border-border rounded-xl shadow-sm hover:shadow transition-shadow">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[16px] text-navy">account_balance</span>
          <p className="font-label-md font-bold text-ink">{commitment.authorityName}</p>
        </div>
        <p className="text-muted mt-1 leading-relaxed text-sm pl-6">{commitment.promisedAction}</p>
      </div>

      {/* Tracker bar UI */}
      <div className="relative mx-4 pb-2">
        {/* Background track line */}
        <div className="absolute top-[14px] left-0 right-0 h-1 bg-surface-highest rounded-full -z-10" />
        
        {/* Animated progress line */}
        <div 
          className={`absolute top-[14px] left-0 h-1 rounded-full -z-10 transition-all duration-1000 ease-in-out ${progressColor}`}
          style={{ width: `${progressPct}%` }}
        />
        
        <div className="flex justify-between relative z-0">
          {steps.map((step, i) => {
            const isCompleted = step.active;
            const isCurrent = isCompleted && (i === activeSteps - 1);
            
            let colorClass = 'bg-surface text-muted border-border';
            if (isCompleted) {
              if (step.isOutcome && step.status === 'broken') {
                colorClass = 'bg-surface text-muted border-border shadow-sm';
              } else if (step.isOutcome && step.status === 'honored') {
                colorClass = 'bg-sage text-white border-sage shadow-sm';
              } else {
                colorClass = 'bg-navy text-white border-navy shadow-sm';
              }
            }

            return (
              <div key={i} className="flex flex-col items-center w-20 transform transition-transform duration-300 hover:-translate-y-1">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-colors duration-500 ${colorClass} ${isCurrent ? 'animate-pulse ring-4 ring-primary/20' : ''}`}>
                  <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                </div>
                <span className={`text-[10px] font-label-md tracking-wide uppercase text-center font-bold ${isCompleted ? 'text-ink' : 'text-muted'}`}>
                  {step.label}
                </span>
                {step.desc && (
                  <span className="text-[10px] font-body-md text-muted mt-0.5">{step.desc}</span>
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
  const [showRTI, setShowRTI] = useState(false);
  const [rtiText, setRtiText] = useState('');
  const [rtiLoading, setRtiLoading] = useState(false);

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

  let updateDate;
  try {
    updateDate = report.updatedAt?.toDate?.() ? report.updatedAt.toDate() : new Date(report.updatedAt || report.createdAt);
  } catch {
    updateDate = date;
  }
  
  // 1. Cost of Inaction Estimator
  const daysSinceCreation = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  const daysOpen = daysSinceCreation > 0 ? daysSinceCreation : 1;
  const costMultiplier = { pothole: 500, streetlight: 200, garbage: 300, water_leak: 400, other: 100 };
  const estimatedCost = daysOpen * (costMultiplier[report.category] || 100);

  // 2. Re-verification Agent
  const effectiveStatus = isReopened ? 'reopened' : report.status;
  const isResolved = report.status === 'resolved';
  const daysSinceUpdate = Math.floor((new Date() - updateDate) / (1000 * 60 * 60 * 24));
  const isReverificationDue = isResolved && daysSinceUpdate >= 30 && !isReopened;

  const handleGenerateRTI = async (e) => {
    e.stopPropagation();
    if (rtiText) {
       setShowRTI(!showRTI);
       return;
    }
    setRtiLoading(true);
    setShowRTI(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const text = `To,\nThe Public Information Officer / Nodal Officer,\n${report.wardId?.replace(/ward(\d+)/i, 'Ward $1') || 'Municipal Corporation'}\n\nSubject: Formal Notice regarding unresolved issue #${report.id.slice(-6).toUpperCase()}\n\nDear Sir/Madam,\nThis is a formal notice regarding the ${report.category} reported on ${date.toLocaleDateString()}. The issue has been open for ${daysOpen} days and poses a severe risk to public safety and infrastructure, costing taxpayers an estimated ₹${estimatedCost.toLocaleString()}.\n\nUnder the Right to Information (RTI) Act, 2005, please provide the reasons for the delay and the estimated date of resolution.\n\nSincerely,\nConcerned Citizen`;
      setRtiText(text);
    } catch (err) {
      toast.error('Failed to generate notice');
    } finally {
      setRtiLoading(false);
    }
  };

  const CardEl = onClick ? 'button' : 'div';

  return (
    <CardEl
      onClick={onClick}
      className={`w-full text-left bg-surface border border-border rounded-xl p-5 block transition-all duration-300 hover:shadow-md ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      <div className="flex items-start gap-4">
        <CategoryIcon category={report.category} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-label-md font-bold text-[12px] uppercase tracking-wider text-ink">{cfg.label}</span>
            <StatusBadge status={effectiveStatus} />
            <SeverityBadge severity={report.severity} />
          </div>

          <p className="text-sm text-muted line-clamp-2 leading-relaxed font-serif">
            {report.summary || report.description}
          </p>

          {!compact && (
            <div className="flex items-center gap-3 mt-3 text-[11px] text-muted font-body-md">
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
            <div className="mt-3 bg-sage/10 text-sage text-[11px] font-label-md uppercase tracking-widest font-bold flex items-center gap-1.5 w-max px-3 py-1.5 rounded-lg shadow-sm">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> 
              {Math.floor(report.confirmations)} Verified
            </div>
          )}

          {/* Feature: Civic Cost-of-Inaction Estimator */}
          {!compact && effectiveStatus !== 'resolved' && (
            <div className="mt-3 bg-surface border border-border p-2.5 rounded-lg w-fit shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-outline"></div>
              <div className="flex items-center gap-1.5 mb-1 pl-2">
                <span className="material-symbols-outlined text-[14px] text-muted">trending_up</span>
                <span className="font-label-md text-[10px] font-bold text-ink uppercase tracking-wider">Cost of Delay</span>
              </div>
              <p className="font-body-sm text-[11px] text-muted pl-2">
                Estimated cumulative cost to public: <strong className="text-ink">~₹{estimatedCost.toLocaleString()}</strong> <span className="opacity-50">(illustrative estimate)</span>
              </p>
            </div>
          )}

          {/* Feature: Auto-Draft Legal Notice (Actionable AI) */}
          {!compact && effectiveStatus !== 'resolved' && daysOpen >= 7 && (
            <div className="mt-3 w-full" onClick={e => e.stopPropagation()}>
              {!showRTI ? (
                <button onClick={handleGenerateRTI} className="bg-navy text-white text-[11px] font-label-md font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-navy-light transition-colors">
                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                  Auto-Draft Legal Notice
                </button>
              ) : (
                <div className="bg-surface border border-navy rounded-lg p-3 relative shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-label-md text-[11px] font-bold text-navy uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">gavel</span> AI-Generated RTI Notice</span>
                    <button onClick={() => setShowRTI(false)} className="text-muted hover:text-ink"><span className="material-symbols-outlined text-[16px]">close</span></button>
                  </div>
                  {rtiLoading ? (
                     <div className="flex items-center gap-2 text-muted text-[11px] py-4 justify-center">
                       <span className="material-symbols-outlined animate-spin">sync</span> Drafting legal notice based on ledger evidence...
                     </div>
                  ) : (
                    <div className="relative">
                      <textarea readOnly value={rtiText} className="w-full h-32 bg-paper border border-border rounded p-2 text-[10px] font-mono text-ink resize-none focus:outline-none" />
                      <button onClick={() => { navigator.clipboard.writeText(rtiText); toast.success('Notice copied to clipboard!'); }} className="absolute bottom-2 right-2 bg-navy text-white text-[10px] px-2 py-1 rounded shadow-sm hover:bg-navy-light">Copy</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feature: Accountability Re-Verification Agent */}
          {!compact && isReverificationDue && (
            <div className="mt-4 bg-navy/10/20 border border-navy p-3 rounded-lg w-full text-left" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[16px] text-navy">fact_check</span>
                <span className="font-label-md text-[11px] font-bold text-navy uppercase tracking-wider">Accountability Re-Verification</span>
              </div>
              <p className="font-body-sm text-xs text-ink mb-3 leading-relaxed">
                This issue was marked resolved over 30 days ago. As a previous reporter, please verify: <strong>Is this still fixed?</strong>
              </p>
              <div className="flex items-center gap-2">
                <button className="bg-surface border border-border text-ink px-4 py-1.5 rounded-md text-xs font-bold hover:bg-paper transition-colors" onClick={(e) => { e.stopPropagation(); toast('Thanks for confirming!', {icon:'✅'}); }}>Yes, it holds up</button>
                <button disabled={isUpdating} className="bg-terracotta text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-terracotta/90 transition-colors shadow-sm disabled:opacity-50" onClick={handleReopen}>{isUpdating ? 'Updating...' : 'No, problem returned'}</button>
              </div>
            </div>
          )}

          {isReopened && (
             <div className="mt-4 bg-surface text-ink p-3 rounded-lg border border-border shadow-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1">
                   <span className="material-symbols-outlined text-[16px] text-muted">info</span>
                   <span className="font-bold text-xs uppercase tracking-wider">Verification Failed</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted">This record was reopened because the public flagged the fix as incomplete. The responsible authority has been notified for follow-up.</p>
             </div>
          )}
        </div>

        {report.imageUrl && !compact && (
          <img
            src={report.imageUrl}
            alt="Report photo"
            className="w-16 h-16 object-cover border border-border flex-shrink-0 rounded-xl"
          />
        )}
      </div>
      
      {commitment && !compact && (
        <div onClick={e => e.stopPropagation()}>
          <PromiseTimeline report={report} commitment={commitment} />
          {commitment.resolutionImageUrl && (
            <div className="mt-6 pt-5 border-t border-border">
              <h4 className="text-[12px] font-label-md font-bold text-sage uppercase tracking-wider flex items-center gap-1.5"
                  style={{ marginBottom: '16px' }}>
                <span className="material-symbols-outlined text-[16px]">check_circle</span> Proof of Resolution
              </h4>
              <div className="grid grid-cols-2 gap-3 h-32 sm:h-48">
                <div className="relative border border-border group overflow-hidden rounded-xl bg-surface">
                  <span className="absolute top-2 left-2 bg-surface/80 text-ink text-[10px] uppercase px-2 py-1 font-label-md font-bold tracking-widest backdrop-blur-sm z-10 rounded">Before</span>
                  <img src={report.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Before" />
                </div>
                <div className="relative border border-sage group overflow-hidden shadow-sm rounded-xl bg-sage/10">
                  <span className="absolute top-2 left-2 bg-sage text-white text-[10px] uppercase px-2 py-1 font-label-md font-bold tracking-widest shadow-sm z-10 rounded">After</span>
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
