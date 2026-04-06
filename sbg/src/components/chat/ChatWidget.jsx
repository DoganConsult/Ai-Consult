import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, UserCircle, ArrowRight, Sparkles, Zap, TrendingUp, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { getPersonalizedRecommendations, getProactiveChatSuggestions } from '@/components/tracking/AIRecommendationEngine';
import { toast } from 'sonner';

const QUICK_QUESTIONS = [
  'ما هي الوكلاء الأذكياء؟',
  'كيف يعمل وكيل المشتريات؟',
  'هل النظام متوافق مع NCA؟',
  'ما هي تكلفة الاشتراك؟',
  'كيف أطلب عرض توضيحي؟',
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [wantsHuman, setWantsHuman] = useState(false);
  const [humanForm, setHumanForm] = useState({ name: '', email: '', message: '' });
  const [recommendations, setRecommendations] = useState(null);
  const [proactiveSuggestion, setProactiveSuggestion] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [language, setLanguage] = useState('ar');
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const messagesEndRef = useRef(null);
  const proactiveCheckRef = useRef(null);

  useEffect(() => {
    if (isOpen && !conversationId) {
      initConversation();
    }
  }, [isOpen]);

  // Load AI recommendations when chat opens
  useEffect(() => {
    if (isOpen) {
      loadRecommendations();
    }
  }, [isOpen]);

  // Proactive suggestion system
  useEffect(() => {
    const checkProactive = async () => {
      try {
        const sessionId = localStorage.getItem('sbg_session_id');
        if (!sessionId || isOpen || proactiveSuggestion) return;
        
        const suggestions = await getProactiveChatSuggestions(sessionId).catch(() => []);
        if (suggestions.length > 0 && !proactiveSuggestion) {
          setProactiveSuggestion(suggestions[0]);
        }
      } catch (error) {
        console.error('Proactive check error:', error);
      }
    };
    
    if (!isOpen) {
      checkProactive();
      proactiveCheckRef.current = setInterval(checkProactive, 60000);
    }
    
    return () => {
      if (proactiveCheckRef.current) {
        clearInterval(proactiveCheckRef.current);
      }
    };
  }, [isOpen, proactiveSuggestion]);

  const loadRecommendations = async () => {
    try {
      const sessionId = localStorage.getItem('sbg_session_id');
      if (!sessionId) return;
      
      const recs = await getPersonalizedRecommendations(sessionId).catch(() => null);
      if (recs && recs.products) {
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Load recommendations error:', error);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    let unsubscribe;
    try {
      unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages || []);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Subscription error:', error);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Unsubscribe error:', error);
        }
      }
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    try {
      setIsLoading(true);
      // Check if user is authenticated
      const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
      
      if (!isAuthenticated) {
        // Show login prompt for chat
        toast.error(language === 'ar' 
          ? 'يرجى تسجيل الدخول للمحادثة' 
          : 'Please log in to start a conversation', {
          action: {
            label: 'Login',
            onClick: () => window.open('http://20.174.194.240:8080/app/home#login', '_blank')
          }
        });
        setIsLoading(false);
        setIsOpen(false);
        return;
      }

      const sessionId = localStorage.getItem('sbg_session_id');
      
      const conv = await base44.agents.createConversation({
        agent_name: 'visitor_guide',
        metadata: {
          name: 'Visitor Guide Chat',
          description: 'Proactive platform guidance',
          session_id: sessionId || 'unknown',
          language: language
        }
      });
      setConversationId(conv.id);
      
      // Build context string
      let contextMessage = 'Hello! I\'m exploring the SBG platform.';
      
      if (sessionId) {
        try {
          const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
          if (sessions.length > 0) {
            const session = sessions[0];
            contextMessage += `\n\nVisitor Context:\n- Visit #${session.visit_count}\n- Journey stage: ${session.journey_stage || 'explorer'}\n- Interests: ${(session.interests || []).join(', ') || 'exploring'}`;
            
            // Track conversation
            const convs = session.conversation_ids || [];
            convs.push(conv.id);
            await base44.entities.VisitorSession.update(session.id, {
              conversation_ids: convs
            }).catch(err => console.error('Session update error:', err));
          }
        } catch (error) {
          console.error('Session context error:', error);
        }
      }
      
      contextMessage += language === 'ar' 
        ? '\n\nالرجاء تقديم ترحيب ودي واقتراحات مفيدة بالعربية.'
        : '\n\nPlease provide a friendly greeting and helpful suggestions in English.';
      
      // Send initial greeting
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: contextMessage
      });
    } catch (error) {
      console.error('Failed to init conversation:', error);
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (messages.length < 3) {
      toast.error(language === 'ar' ? 'المحادثة قصيرة جداً للتلخيص' : 'Conversation too short to summarize');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: language === 'ar' 
          ? `قم بتحليل وتلخيص هذه المحادثة. قدم:\n1. ملخص قصير\n2. المواضيع الرئيسية\n3. الإجراءات المقترحة\n\nالمحادثة:\n${conversationText}`
          : `Analyze and summarize this conversation. Provide:\n1. Brief summary\n2. Main topics\n3. Suggested actions\n\nConversation:\n${conversationText}`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            topics: { type: 'array', items: { type: 'string' } },
            actions: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      setSummary(result);
      setShowSummary(true);
    } catch (error) {
      console.error('Summary generation failed:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء الملخص' : 'Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const sendMessage = async (text) => {
    if (!text || !text.trim() || isLoading || !conversationId) return;

    const messageText = typeof text === 'string' ? text : text.target?.value || '';
    if (!messageText.trim()) return;

    setInput('');
    setIsLoading(true);

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageText
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('فشل في إرسال الرسالة');
      setIsLoading(false);
    }
  };

  const handleHumanEscalation = async () => {
    if (!humanForm.email || !humanForm.name) {
      toast.error(language === 'ar' ? 'الرجاء إدخال الاسم والبريد الإلكتروني' : 'Please enter name and email');
      return;
    }
    
    setIsLoading(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'support@saudibusinessgate.com',
        subject: `[Chat Support] New inquiry from ${humanForm.name}`,
        body: `Name: ${humanForm.name}\nEmail: ${humanForm.email}\n\nMessage: ${humanForm.message}\n\nChat History:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
      });
      
      toast.success(language === 'ar' 
        ? '✅ تم إرسال طلبك بنجاح! سيتواصل معك الفريق قريباً.' 
        : '✅ Your request has been sent successfully!'
      );
      
      setWantsHuman(false);
      setHumanForm({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Human escalation error:', error);
      toast.error(language === 'ar' 
        ? 'عذراً، حدث خطأ. يرجى التواصل على: support@saudibusinessgate.com' 
        : 'Sorry, an error occurred. Please contact: support@saudibusinessgate.com'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Proactive Suggestion Bubble */}
      <AnimatePresence>
        {proactiveSuggestion && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-50 max-w-xs"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 p-4">
              <button
                onClick={() => setProactiveSuggestion(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 mb-3">{proactiveSuggestion.message}</p>
                  <button
                    onClick={() => {
                      setIsOpen(true);
                      setProactiveSuggestion(null);
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Chat Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Button */}
      <motion.button
        onClick={() => {
          setIsOpen(true);
          setProactiveSuggestion(null);
        }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform ${isOpen ? 'hidden' : ''}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <MessageCircle className="w-6 h-6" />
        {proactiveSuggestion && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold"
          >
            !
          </motion.span>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{language === 'ar' ? 'مساعد SBG الذكي' : 'SBG AI Assistant'}</h3>
                    <div className="flex items-center gap-1 text-xs text-emerald-100">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      {language === 'ar' ? 'AI Guide • متصل الآن' : 'AI Guide • Online now'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title={language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  {messages.length > 2 && (
                    <button
                      onClick={generateSummary}
                      disabled={isGeneratingSummary}
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                      title={language === 'ar' ? 'تلخيص المحادثة' : 'Summarize conversation'}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Conversation Summary */}
            <AnimatePresence>
              {showSummary && summary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-600" />
                      <h4 className="font-semibold text-violet-900 text-sm">
                        {language === 'ar' ? 'ملخص المحادثة' : 'Conversation Summary'}
                      </h4>
                    </div>
                    <button onClick={() => setShowSummary(false)} className="text-violet-400 hover:text-violet-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="text-violet-800">{summary.summary}</p>

                    {summary.topics && summary.topics.length > 0 && (
                      <div>
                        <p className="font-medium text-violet-900 text-xs mb-1">
                          {language === 'ar' ? 'المواضيع:' : 'Topics:'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {summary.topics.map((topic, i) => (
                            <Badge key={i} className="bg-violet-200 text-violet-800 text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {summary.actions && summary.actions.length > 0 && (
                      <div>
                        <p className="font-medium text-violet-900 text-xs mb-1">
                          {language === 'ar' ? 'إجراءات مقترحة:' : 'Suggested Actions:'}
                        </p>
                        <ul className="text-xs text-violet-700 space-y-0.5">
                          {summary.actions.map((action, i) => (
                            <li key={i}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Sparkles className="w-8 h-8 text-emerald-300 animate-pulse" />
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="text-sm prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-slate-600 animate-pulse" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Human Escalation Form */}
            {wantsHuman && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 bg-white z-10 p-4 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">التواصل مع الدعم البشري</h3>
                  <button onClick={() => setWantsHuman(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                
                <div className="space-y-3 flex-1">
                  <input
                    type="text"
                    placeholder="الاسم *"
                    value={humanForm.name}
                    onChange={(e) => setHumanForm({ ...humanForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني *"
                    value={humanForm.email}
                    onChange={(e) => setHumanForm({ ...humanForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <textarea
                    placeholder="رسالتك (اختياري)"
                    value={humanForm.message}
                    onChange={(e) => setHumanForm({ ...humanForm, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </div>
                
                <Button
                  onClick={handleHumanEscalation}
                  disabled={!humanForm.name || !humanForm.email || isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال الطلب'}
                </Button>
              </motion.div>
            )}

            {/* AI Recommendations */}
            {recommendations && recommendations.products && !wantsHuman && (
              <div className="border-t border-slate-100 bg-gradient-to-br from-emerald-50 to-teal-50">
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">AI Recommendations for You</span>
                    {recommendations.urgency === 'high' && (
                      <Badge className="bg-red-500 text-white text-xs">Hot!</Badge>
                    )}
                  </div>
                  <motion.div animate={{ rotate: showRecommendations ? 180 : 0 }}>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {showRecommendations && recommendations.products && recommendations.products.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-3 space-y-2 overflow-hidden"
                        >
                          <p className="text-xs text-emerald-700 mb-2">
                            {language === 'ar' ? 'منتجات مقترحة لك:' : 'Recommended products for you:'}
                          </p>

                          {recommendations.products.slice(0, 2).map((product, i) => (
                            <button
                              key={i}
                              onClick={(e) => {
                                e.preventDefault();
                                sendMessage(language === 'ar' 
                                  ? `أخبرني المزيد عن ${product.name}`
                                  : `Tell me more about ${product.name}`
                                );
                              }}
                              disabled={isLoading}
                              className="w-full bg-white hover:bg-emerald-50 rounded-lg p-2 border border-emerald-200 text-xs transition-colors text-left disabled:opacity-50"
                            >
                              <div className="font-medium text-slate-800">{product.name}</div>
                              <div className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{product.description}</div>
                            </button>
                          ))}

                          {recommendations.nextActions && recommendations.nextActions.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2">
                              {recommendations.nextActions.map((action, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    sendMessage(language === 'ar' 
                                      ? `أخبرني المزيد عن: ${action}`
                                      : `Tell me more about: ${action}`
                                    );
                                  }}
                                  disabled={isLoading}
                                  className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                >
                                  {action}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                </AnimatePresence>
              </div>
            )}

            {/* Quick Questions */}
            {messages.length <= 2 && !wantsHuman && (
              <div className="px-4 py-2 border-t border-slate-100 bg-white">
                <p className="text-xs text-slate-500 mb-2">
                  {language === 'ar' ? 'أسئلة شائعة:' : 'Quick questions:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(language === 'ar' ? QUICK_QUESTIONS : [
                    'What are autonomous agents?',
                    'How does the procurement agent work?',
                    'Is the system NCA compliant?',
                    'What is the subscription cost?',
                    'How can I request a demo?'
                  ]).map((q, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.preventDefault();
                        sendMessage(q);
                      }}
                      disabled={isLoading}
                      className="text-xs bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            {!wantsHuman && (
              <div className="p-3 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWantsHuman(true)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="التحدث مع موظف"
                  >
                    <UserCircle className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                    placeholder={language === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                    className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:bg-slate-200 transition-colors"
                    dir="auto"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (input.trim()) {
                        sendMessage(input);
                      }
                    }}
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}