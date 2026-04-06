import React from 'react';
import { User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

export default function ChatMessage({ message, isLoading, isFirstMessage }) {
    const { role, content } = message;
    const isUser = role === 'user';

    if (isLoading) {
        return (
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 flex-shrink-0">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/72f2e91e1_B3CACE63-2212-47D8-9A85-A978E4BDF399.png" 
                        alt="Star AI"
                        className="w-12 h-12 rounded-full"
                    />
                </div>
                <div className="bg-slate-200 rounded-lg p-3 max-w-lg">
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}
        >
            {!isUser && (
                <div className="w-12 h-12 flex-shrink-0">
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/72f2e91e1_B3CACE63-2212-47D8-9A85-A978E4BDF399.png" 
                        alt="Star AI"
                        className="w-12 h-12 rounded-full"
                    />
                </div>
            )}
            <div
                className={`rounded-lg p-3 max-w-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
            >
                {!isUser && isFirstMessage && (
                    <div className="text-sm text-slate-600 mb-2 italic">
                        Hi! This is Star, your personal AI helper 🌟
                    </div>
                )}
                <div className="prose prose-sm max-w-none text-current">
                     <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-slate-600" />
                </div>
            )}
        </motion.div>
    );
}