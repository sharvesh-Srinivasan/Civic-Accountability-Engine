import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'dummy-key');

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
      <div className="glass-panel p-4 mb-6 rounded-2xl shadow-sm hover:shadow-glow-navy transition-all duration-300">
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
  
  const goal = report.crowdfundGoal || 200;
  const [pledged, setPledged] = useState(report.crowdfundRaised || 0);
  const [isPledging, setIsPledging] = useState(false);

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

  const handlePledge = async (e) => {
    e.stopPropagation();
    if (isPledging) return;
    setIsPledging(true);
    try {
      await api.post(`/api/reports/${report.id}/fund`, { amount: 10 });
      setPledged(prev => prev + 10);
      toast.success('Pledged $10! Thank you for your civic action.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process pledge.');
    } finally {
      setIsPledging(false);
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
      if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("No API Key");
      
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const prompt = `You are a legal assistant drafting a formal Right to Information (RTI) request for an Indian citizen. 
      The citizen is escalating an unresolved civic issue.
      Issue Category: ${report.category}
      Description: ${report.description || report.summary}
      Date Reported: ${date.toLocaleDateString()}
      ${commitment ? `The authority (${commitment.authorityName}) made a promise to resolve it by ${new Date(commitment.etaDate?.toDate?.() || commitment.etaDate).toLocaleDateString()}, but the commitment is currently ${commitment.status}.` : 'No official commitment has been made yet.'}
      
      Draft a highly professional, assertive, but polite 3-paragraph RTI request asking for:
      1. The reasons for the delay.
      2. The allocated budget and contractor details for this specific fix.
      3. A definitive timeline for resolution.
      
      Do not include placeholder brackets like [Your Name], just write the body of the letter. Keep it under 150 words.`;
      
      const result = await model.generateContent(prompt);
      setRtiText(result.response.text());
    } catch (err) {
      console.error("RTI AI Error:", err);
      toast.error('API failed. Using offline legal template.');
      
      setRtiText(`Subject: RTI Application under Section 6(1) of the Right to Information Act, 2005

Dear Public Information Officer,

I am writing to formally request information regarding the unresolved civic issue (${report.category}) reported on ${date.toLocaleDateString()}. The issue pertains to: ${report.summary || report.description}.

${commitment ? `The authority (${commitment.authorityName}) committed to resolving this by ${new Date(commitment.etaDate?.toDate?.() || commitment.etaDate).toLocaleDateString()}, but action is still pending.` : ''}

Please provide the following details:
1. The current status of the file/complaint.
2. The name of the contractor/officer responsible for the delay.
3. The exact timeline by which this public hazard will be permanently resolved.

Thank you.`);
    } finally {
      setRtiLoading(false);
    }
  };

  const CardEl = onClick ? 'button' : 'div';

  return (
    <CardEl
      onClick={onClick}
      className={`w-full text-left glass-panel rounded-3xl p-6 block transition-all duration-500 hover:shadow-[0_8px_40px_rgba(31,38,135,0.12)] ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
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
            <div className="mt-4 glass-panel border border-terracotta/20 p-3 rounded-2xl w-fit shadow-glass relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-terracotta/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-terracotta rounded-l-2xl"></div>
              <div className="flex items-center gap-1.5 mb-1 pl-2 relative z-10">
                <span className="material-symbols-outlined text-[14px] text-terracotta">trending_up</span>
                <span className="font-label-md text-[10px] font-bold text-terracotta uppercase tracking-wider">Cost of Delay</span>
              </div>
              <p className="font-body-sm text-[11px] text-muted pl-2 relative z-10">
                Estimated cumulative cost to public: <strong className="text-terracotta text-sm">~₹{estimatedCost.toLocaleString()}</strong> <span className="opacity-50 text-[10px]">(illustrative estimate)</span>
              </p>
            </div>
          )}

          {/* Feature: Auto-Draft Legal Notice (Actionable AI) */}
          {!compact && effectiveStatus !== 'resolved' && (
            <div className="mt-3 w-full" onClick={e => e.stopPropagation()}>
              {!showRTI ? (
                <button onClick={handleGenerateRTI} className="bg-navy text-white text-[11px] font-label-md font-bold uppercase tracking-widest px-4 py-2 rounded-2xl shadow-glass flex items-center gap-1.5 hover:-translate-y-1 hover:shadow-glow-navy transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  <span className="material-symbols-outlined text-[14px] relative z-10">gavel</span>
                  <span className="relative z-10">Auto-Draft Legal Notice</span>
                </button>
              ) : (
                <div className="glass-panel border-navy/30 rounded-2xl p-4 relative shadow-glow-navy animate-fade-in-up">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-label-md text-[11px] font-bold text-navy uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">gavel</span> AI-Generated RTI Notice</span>
                    <button onClick={() => setShowRTI(false)} className="text-muted hover:text-ink transition-colors"><span className="material-symbols-outlined text-[16px]">close</span></button>
                  </div>
                  {rtiLoading ? (
                     <div className="flex items-center gap-2 text-navy text-[11px] py-6 justify-center font-bold tracking-widest uppercase">
                       <span className="material-symbols-outlined animate-spin">sync</span> Drafting legal notice based on ledger evidence...
                     </div>
                  ) : (
                    <div className="relative">
                      <textarea readOnly value={rtiText} className="w-full h-32 bg-white/50 border border-white/40 rounded-xl p-3 text-[10px] font-mono text-ink resize-none focus:outline-none shadow-inner" />
                      <button onClick={() => { navigator.clipboard.writeText(rtiText); toast.success('Notice copied to clipboard!'); }} className="absolute bottom-3 right-3 bg-navy text-white text-[10px] px-3 py-1.5 rounded-lg shadow-sm hover:-translate-y-0.5 hover:shadow-glow-navy transition-all duration-300">Copy</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feature: Civic Crowdfunding */}
          {!compact && commitment && (
            <div className="mt-4 glass-panel border border-terracotta/20 p-4 rounded-2xl w-full text-left relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-terracotta/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <span className="material-symbols-outlined text-[16px] text-terracotta">volunteer_activism</span>
                <span className="font-label-md text-[11px] font-bold text-terracotta uppercase tracking-wider">Crowdfund a Fix</span>
              </div>
              <p className="font-body-sm text-xs text-ink mb-3 leading-relaxed relative z-10">
                The authority broke their promise. Instead of waiting indefinitely, you can pledge funds to hire a private contractor to fix this.
              </p>
              <div className="mb-3">
                <div className="flex justify-between text-[10px] font-bold text-muted mb-1 uppercase tracking-widest">
                  <span>${pledged} Raised</span>
                  <span>Goal: ${goal}</span>
                </div>
                <div className="w-full bg-surface-highest h-2 rounded-full overflow-hidden">
                  <div className="bg-terracotta h-full transition-all duration-1000" style={{ width: `${Math.min((pledged / goal) * 100, 100)}%` }}></div>
                </div>
              </div>
              <button disabled={isPledging} onClick={handlePledge} className="bg-terracotta text-white px-4 py-2 rounded-xl text-xs font-bold hover:-translate-y-0.5 hover:shadow-glow-terracotta transition-all duration-300 disabled:opacity-50 relative z-10">
                {isPledging ? 'Processing...' : 'Pledge $10'}
              </button>
            </div>
          )}

          {/* Feature: Accountability Re-Verification Agent */}
          {!compact && isReverificationDue && (
            <div className="mt-4 glass-panel border border-navy/20 p-4 rounded-2xl w-full text-left relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-navy/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <span className="material-symbols-outlined text-[16px] text-navy">fact_check</span>
                <span className="font-label-md text-[11px] font-bold text-navy uppercase tracking-wider">Accountability Re-Verification</span>
              </div>
              <p className="font-body-sm text-xs text-ink mb-4 leading-relaxed relative z-10">
                This issue was marked resolved over 30 days ago. As a previous reporter, please verify: <strong>Is this still fixed?</strong>
              </p>
              <div className="flex items-center gap-3 relative z-10">
                <button className="bg-white/80 border border-white/40 text-navy px-4 py-2 rounded-xl text-xs font-bold hover:bg-white hover:-translate-y-0.5 hover:shadow-glass transition-all duration-300" onClick={(e) => { e.stopPropagation(); toast('Thanks for confirming!', {icon:'✅'}); }}>Yes, it holds up</button>
                <button disabled={isUpdating} className="bg-terracotta text-white px-4 py-2 rounded-xl text-xs font-bold hover:-translate-y-0.5 hover:shadow-glow-terracotta transition-all duration-300 disabled:opacity-50" onClick={handleReopen}>{isUpdating ? 'Updating...' : 'No, problem returned'}</button>
              </div>
            </div>
          )}

          {isReopened && (
             <div className="mt-4 glass-panel border border-terracotta/20 text-ink p-4 rounded-2xl shadow-glass" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1.5">
                   <span className="material-symbols-outlined text-[16px] text-terracotta">info</span>
                   <span className="font-bold text-xs uppercase tracking-wider text-terracotta">Verification Failed</span>
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
              <div className="grid grid-cols-2 gap-4 h-32 sm:h-48">
                <div className="relative border border-white/40 group overflow-hidden rounded-2xl shadow-glass">
                  <span className="absolute top-2 left-2 bg-white/80 text-navy text-[10px] uppercase px-3 py-1 font-label-md font-bold tracking-widest backdrop-blur-md z-10 rounded-lg shadow-sm">Before</span>
                  <img src={report.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Before" />
                </div>
                <div className="relative border border-sage/40 group overflow-hidden rounded-2xl shadow-glow-sage">
                  <span className="absolute top-2 left-2 bg-sage text-white text-[10px] uppercase px-3 py-1 font-label-md font-bold tracking-widest shadow-sm z-10 rounded-lg">After</span>
                  <img src={commitment.resolutionImageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="After" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </CardEl>
  );
}
