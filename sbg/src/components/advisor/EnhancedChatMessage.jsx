import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';

export default function EnhancedChatMessage({ 
  message, 
  isLoading, 
  onRegenerate,
  showActions = true 
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { role, content } = message;
  const isUser = role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/72f2e91e1_B3CACE63-2212-47D8-9A85-A978E4BDF399.png" 
            alt="Star AI"
            className="w-10 h-10 rounded-xl"
          />
        </div>
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-blue-500 rounded-full"
              />
            </div>
            <span className="text-sm text-slate-500">Star is thinking...</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {isUser ? (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-lg">
          <User className="w-5 h-5 text-white" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/72f2e91e1_B3CACE63-2212-47D8-9A85-A978E4BDF399.png" 
            alt="Star AI"
            className="w-10 h-10"
          />
        </div>
      )}
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl p-4 ${
            isUser 
              ? 'bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg' 
              : 'bg-white border border-slate-100 shadow-sm'
          }`}
        >
          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
        
        {/* Action buttons for AI messages */}
        {!isUser && showActions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1 mt-2 ml-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-slate-400 hover:text-slate-600"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedback('up')}
              className={`h-7 px-2 ${feedback === 'up' ? 'text-green-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedback('down')}
              className={`h-7 px-2 ${feedback === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                className="h-7 px-2 text-slate-400 hover:text-slate-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}