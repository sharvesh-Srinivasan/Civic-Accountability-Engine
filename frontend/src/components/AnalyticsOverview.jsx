import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, CheckCircle } from 'lucide-react';

export default function AnalyticsOverview({ reports }) {
  const stats = useMemo(() => {
    let open = 0;
    let resolved = 0;
    const categoryCounts = {};
    const wardCounts = {};

    reports.forEach(r => {
      if (r.status === 'resolved') resolved++;
      else open++;

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

    return { open, resolved, pieData, barData };
  }, [reports]);

  const COLORS = ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-5 mb-6">
      <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <Activity size={18} className="text-teal-600" /> City Analytics
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-navy-50 p-4 rounded-lg flex items-center gap-4">
          <div className="bg-navy-100 p-2 rounded text-navy-600">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-sm text-ink-500 font-medium">Open Issues</p>
            <p className="text-2xl font-bold text-navy-700">{stats.open}</p>
          </div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg flex items-center gap-4">
          <div className="bg-emerald-100 p-2 rounded text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm text-ink-500 font-medium">Resolved Issues</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.resolved}</p>
          </div>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg flex items-center gap-4">
          <div className="bg-amber-100 p-2 rounded text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm text-ink-500 font-medium">Avg Resolution Time</p>
            <p className="text-2xl font-bold text-amber-700">4.2 Days</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64">
          <h3 className="text-sm font-semibold text-ink-600 mb-2 text-center uppercase tracking-wider">Issues by Category</h3>
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
              >
                {stats.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-64">
          <h3 className="text-sm font-semibold text-ink-600 mb-2 text-center uppercase tracking-wider">Issues by Ward</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.barData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="issues" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
