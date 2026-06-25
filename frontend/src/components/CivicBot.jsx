import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function CivicBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I am CivicBot. You can ask me about city stats, ongoing issues, or recent commitments.' }
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
      const res = await api.post('/api/chat', { message: userMsg });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I am having trouble connecting to the database right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-navy-600 hover:bg-navy-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-50"
      >
        <MessageSquare size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden z-50"
            style={{ height: '500px' }}
          >
            <div className="bg-navy-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-medium font-serif">CivicBot</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-navy-500 p-1 rounded">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-teal-500 text-white rounded-tr-none' : 'bg-white border border-border text-ink-800 rounded-tl-none'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border p-3 rounded-lg rounded-tl-none flex gap-1">
                    <span className="w-2 h-2 bg-navy-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-navy-400 rounded-full animate-bounce delay-75" />
                    <span className="w-2 h-2 bg-navy-400 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-white border-t border-border flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me about city stats..."
                className="flex-1 border-border rounded-lg focus:ring-navy-500 focus:border-navy-500 text-sm"
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-navy-600 hover:bg-navy-700 disabled:bg-navy-300 text-white p-2 rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
