'use client';

import { useState } from 'react';
import { X, Mail, MessageSquare, ExternalLink, Send } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [feedback, setFeedback] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setSending(true);
    // Mock API call
    setTimeout(() => {
      setSending(false);
      setIsSent(true);
      setFeedback('');
      setTimeout(() => {
        setIsSent(false);
      }, 3000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in backdrop-blur-md z-10 transition-transform duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-cormorant font-bold text-black dark:text-white">
              Customer Support & Feedback
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              Need help or want to share your thoughts? We&apos;re here for you.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70dvh] overflow-y-auto">
          
          {/* Quick Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <a 
              href="mailto:support@blackhand.art"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
                <Mail size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Email</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans mt-0.5 flex items-center gap-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Mail Support <ExternalLink size={10} />
                </p>
              </div>
            </a>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <MessageSquare size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Live Chat</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                  Offline
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 font-sans">
              Send Feedback directly
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write your feedback, bug report, or questions here..."
                rows={4}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all font-sans placeholder-slate-400 text-slate-800 dark:text-slate-200"
                required
              />

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {isSent && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium font-sans flex items-center gap-1 animate-pulse">
                      ✓ Thank you! Feedback sent.
                    </span>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={sending || !feedback.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold text-xs rounded-xl hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                >
                  <span>{sending ? 'Sending...' : 'Send Message'}</span>
                  <Send size={12} className={sending ? 'animate-pulse' : ''} />
                </button>
              </div>
            </form>
          </div>

          {/* FAQ Link */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex items-center justify-between text-xs font-sans text-slate-500 dark:text-slate-400">
            <span>Project version: 0.1.0 (Beta)</span>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>GitHub repository</span>
              <ExternalLink size={10} />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
