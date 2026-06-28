import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

async function generateSmartReply(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  const reportsSnap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100)));
  let openCount = 0;
  let resolvedCount = 0;
  const wardCounts = {};
  const categoryCounts = {};
  const recentIssues = [];

  reportsSnap.forEach(doc => {
    const data = doc.data();
    if (data.status === 'resolved') resolvedCount++;
    else openCount++;
    const ward = data.locality || data.wardId || 'Unknown';
    wardCounts[ward] = (wardCounts[ward] || 0) + 1;
    const cat = data.category || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    recentIssues.push({
      title: data.title || data.summary || 'Untitled',
      category: cat,
      status: data.status || 'open',
      ward: ward,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    });
  });

  const totalReports = openCount + resolvedCount;
  const resolutionRate = totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;
  recentIssues.sort((a, b) => b.createdAt - a.createdAt);
  const topWard = Object.entries(wardCounts).sort((a, b) => b[1] - a[1])[0];
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  if (/^(hi|hello|hey|howdy|yo|hola|greetings|good morning|good evening)/i.test(msg)) {
    return `👋 Hello! I'm CivicBot, your civic accountability assistant. I can give you insights based on the **latest ${totalReports} reports** in your city. Ask me about stats, recent issues, ward performance, or how to file a report!`;
  }
  if (/stat|overview|summary|how many|total|dashboard|number/i.test(msg)) {
    return `📊 **Recent City Stats (Last ${totalReports} reports):**\n\n• **Open Issues:** ${openCount}\n• **Resolved:** ${resolvedCount}\n• **Resolution Rate:** ${resolutionRate}%\n${topWard ? `• **Most Active Area:** ${topWard[0]} (${topWard[1]} reports)` : ''}\n${topCategory ? `• **Top Category:** ${topCategory[0]} (${topCategory[1]} reports)` : ''}`;
  }
  if (/recent|latest|new|last|today/i.test(msg)) {
    if (recentIssues.length === 0) return '📭 No reports have been filed yet. Be the first to report an issue!';
    const top5 = recentIssues.slice(0, 5);
    const list = top5.map((r, i) => `${i + 1}. **${r.title}** — ${r.category} (${r.status}) in ${r.ward}`).join('\n');
    return `📋 **Recent Reports:**\n\n${list}`;
  }
  if (/open|pending|unresolved|active issue/i.test(msg)) {
    const openIssues = recentIssues.filter(r => r.status !== 'resolved').slice(0, 5);
    if (openIssues.length === 0) return '🎉 Amazing! There are no open issues right now!';
    const list = openIssues.map((r, i) => `${i + 1}. **${r.title}** — ${r.category} in ${r.ward}`).join('\n');
    return `🔴 **Open Issues (${openCount} total):**\n\n${list}\n\n${openCount > 5 ? `...and ${openCount - 5} more. Check the Dashboard for the full list.` : ''}`;
  }
  if (/resolved|fixed|closed|completed/i.test(msg)) {
    return `✅ **${resolvedCount}** issues have been resolved out of **${totalReports}** total reports. That's a **${resolutionRate}%** resolution rate!`;
  }
  if (/ward|area|zone|locality|location|neighborhood/i.test(msg)) {
    const wardList = Object.entries(wardCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => `• **${name}:** ${count} reports`).join('\n');
    return `🗺️ **Reports by Area:**\n\n${wardList || 'No area data available yet.'}`;
  }
  if (/category|type|kind|breakdown|pothole|road|water|garbage|sewage|drainage|electric|light|sanitation/i.test(msg)) {
    const specificCat = Object.keys(categoryCounts).find(cat => msg.includes(cat.toLowerCase()));
    if (specificCat) return `📁 **${specificCat}** has **${categoryCounts[specificCat]}** reports filed. ${categoryCounts[specificCat] > 3 ? 'This seems to be a recurring issue in your city!' : ''}`;
    const catList = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => `• **${name}:** ${count}`).join('\n');
    return `📁 **Reports by Category:**\n\n${catList || 'No category data available yet.'}`;
  }
  if (/how|report|file|submit|complain|raise/i.test(msg)) {
    return `📝 **How to File a Report:**\n\n1. Click the **"New Report"** button on your Dashboard.\n2. Upload a photo of the issue.\n3. Our AI will automatically classify the issue type and severity.\n4. Add a description and confirm your location.\n5. Hit Submit — your report goes live instantly!\n\nYour report will be visible to all citizens in your area and tracked for resolution.`;
  }
  if (/help|what can you|can you|feature|do you/i.test(msg)) {
    return `🤖 **I can help you with:**\n\n• 📊 City stats & overview\n• 📋 Recent reports\n• 🔴 Open/pending issues\n• ✅ Resolution rates\n• 🗺️ Area-wise breakdown\n• 📁 Category breakdown\n• 📝 How to file reports\n\nJust ask me anything about your city's civic issues!`;
  }
  if (/thank|thanks|thx|great|awesome|cool|nice/i.test(msg)) {
    return `😊 You're welcome! I'm always here to help you stay informed about your city's civic health. Keep reporting issues — every report makes a difference!`;
  }
  return `🤖 I'm not sure I understood that, but here's a quick snapshot:\n\n• **${totalReports}** total reports filed\n• **${openCount}** still open, **${resolvedCount}** resolved\n• **${resolutionRate}%** resolution rate\n\nTry asking me about "recent issues", "stats", "ward breakdown", or "how to report"!`;
}

export default function CivicBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi! I\'m **CivicBot**, your civic accountability assistant. Ask me about city stats, recent issues, ward performance, or how to file a report!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const reply = await generateSmartReply(userMsg);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ Sorry, I had trouble fetching the latest data. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-primary font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-container text-on-primary-container flex items-center justify-center transition-transform hover:scale-105 z-50 rounded-full shadow-lg"
      >
        <span className="material-symbols-outlined text-[24px]">smart_toy</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 bg-surface-container-lowest border border-outline-variant flex flex-col overflow-hidden z-50 rounded-xl shadow-lg"
            style={{ height: '500px' }}
          >
            <div className="bg-surface-container-low border-b border-outline-variant text-on-surface px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                </div>
                <span className="font-label-md text-label-md text-primary">CivicBot</span>
                <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">LIVE DATA</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex flex-shrink-0 items-center justify-center mr-2 mt-1">
                      <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3 text-sm font-body-md leading-relaxed whitespace-pre-line ${
                    m.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm shadow-sm' 
                      : 'bg-surface-container-lowest border border-outline-variant text-on-surface rounded-2xl rounded-tl-sm shadow-sm'
                  }`}>
                    {renderText(m.text)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex flex-shrink-0 items-center justify-center mr-2 mt-1">
                      <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                   </div>
                  <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded-2xl rounded-tl-sm flex gap-1 items-center h-10 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-surface-container-lowest border-t border-outline-variant flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about city stats..."
                className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-primary hover:bg-primary-container text-on-primary rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
