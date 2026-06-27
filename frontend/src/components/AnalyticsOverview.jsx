import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, CheckCircle, Shield } from 'lucide-react';

export default function AnalyticsOverview({ reports }) {
  const stats = useMemo(() => {
    let open = 0;
    let resolved = 0;
    let totalResolutionDays = 0;
    const categoryCounts = {};
    const wardCounts = {};

    reports.forEach(r => {
      if (r.status === 'resolved') {
        resolved++;
        if (r.createdAt && r.updatedAt) {
          const start = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          const end = r.updatedAt.toDate ? r.updatedAt.toDate() : new Date(r.updatedAt);
          totalResolutionDays += Math.max(0, (end - start) / (1000 * 3600 * 24));
        }
      } else {
        open++;
      }

      const cat = r.category || 'other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const ward = r.wardId || 'Unknown';
      wardCounts[ward] = (wardCounts[ward] || 0) + 1;
    });

    const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value
    }));

    const barData = Object.entries(wardCounts).map(([name, value]) => ({
      name: name.replace(/ward(\d+)/i, 'Ward $1'),
      issues: value
    }));

    const avgResolutionTime = resolved > 0 ? (totalResolutionDays / resolved).toFixed(1) : '0';

    return { open, resolved, pieData, barData, avgResolutionTime };
  }, [reports]);

  const COLORS = ['#00F0FF', '#FF007F', '#10B981', '#F59E0B', '#8B5CF6'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-glow-cyan">
          <p className="font-display font-bold uppercase tracking-wider text-[10px] text-white mb-1">{label || payload[0].name}</p>
          <p className="text-neon-cyan font-bold">{payload[0].value} issues</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-6 mb-6">
      <h2 className="font-display font-bold text-white uppercase tracking-widest flex items-center gap-2 text-sm mb-6">
        <Activity size={16} className="text-neon-cyan" /> City Analytics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-glass-10 border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-neon-cyan/20 text-neon-cyan p-2.5 rounded-lg shadow-glow-cyan">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-display uppercase tracking-widest text-white/50 mb-1">Open Issues</p>
            <p className="text-2xl font-bold text-neon-cyan text-glow-cyan leading-none">{stats.open}</p>
          </div>
        </div>
        
        <div className="bg-glass-10 border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-neon-emerald/20 text-neon-emerald p-2.5 rounded-lg shadow-glow-emerald">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-display uppercase tracking-widest text-white/50 mb-1">Resolved</p>
            <p className="text-2xl font-bold text-neon-emerald text-glow-emerald leading-none">{stats.resolved}</p>
          </div>
        </div>
        
        <div className="bg-glass-10 border border-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-neon-magenta/20 text-neon-magenta p-2.5 rounded-lg shadow-glow-magenta">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-display uppercase tracking-widest text-white/50 mb-1">Avg Resolution</p>
            <p className="text-2xl font-bold text-neon-magenta text-glow-magenta leading-none">{stats.avgResolutionTime} <span className="text-xs text-white/30 font-sans font-normal">Days</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64">
          <h3 className="text-[10px] font-display font-bold text-white/50 mb-4 text-center uppercase tracking-widest">Issues by Category</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {stats.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ filter: `drop-shadow(0px 0px 8px ${COLORS[index % COLORS.length]}80)` }} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="h-64">
          <h3 className="text-[10px] font-display font-bold text-white/50 mb-4 text-center uppercase tracking-widest">Issues by Ward</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.barData}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<CustomTooltip />} />
              <Bar dataKey="issues" fill="#00F0FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
