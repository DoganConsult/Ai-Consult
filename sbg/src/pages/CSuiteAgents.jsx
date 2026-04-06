import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PublicHeader from '@/components/shared/PublicHeader';
import { Users, Send, Sparkles, Loader2, TrendingUp, Database, Briefcase, Shield, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

const CSUITE_AGENTS = [
  {
    name: 'ceo_agent',
    title: 'AI CEO',
    title_ar: 'الرئيس التنفيذي الذكي',
    icon: Users,
    color: 'from-purple-600 to-indigo-600',
    description: 'Strategic oversight, decision-making, and organizational alignment'
  },
  {
    name: 'cto_agent',
    title: 'AI CTO',
    title_ar: 'مدير التقنية الذكي',
    icon: Database,
    color: 'from-blue-600 to-cyan-600',
    description: 'Technology strategy, ERPNext integration, and infrastructure'
  },
  {
    name: 'cfo_agent',
    title: 'AI CFO',
    title_ar: 'المدير المالي الذكي',
    icon: TrendingUp,
    color: 'from-emerald-600 to-teal-600',
    description: 'Financial oversight, revenue tracking, and ZATCA compliance'
  },
  {
    name: 'coo_agent',
    title: 'AI COO',
    title_ar: 'مدير العمليات الذكي',
    icon: Briefcase,
    color: 'from-orange-600 to-amber-600',
    description: 'Operations management, demo coordination, and customer success'
  },
  {
    name: 'cio_agent',
    title: 'AI CIO',
    title_ar: 'مدير المعلومات الذكي',
    icon: BarChart3,
    color: 'from-pink-600 to-rose-600',
    description: 'Data governance, analytics, and business intelligence'
  }
];

export default function CSuiteAgents() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null)
  });

  useEffect(() => {
    if (selectedAgent && !conversationId) {
      initConversation();
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    if (!selectedAgent) return;
    
    try {
      const conv = await base44.agents.createConversation({
        agent_name: selectedAgent.name,
        metadata: {
          name: `${selectedAgent.title} Consultation`,
          description: 'C-Suite AI Agent Conversation'
        }
      });
      setConversationId(conv.id);
      
      // Initial greeting
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Hello, I need your expertise as ${selectedAgent.title}.`
      });
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    const userMessage = input;
    setInput('');
    setIsLoading(true);

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    setConversationId(null);
    setMessages([]);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            C-Suite AI Agents
          </h1>
          <p className="text-slate-600">Executive AI agents managing your organization with advanced intelligence</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Agents Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Select an Executive Agent</h2>
            {CSUITE_AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <motion.button
                  key={agent.name}
                  onClick={() => handleSelectAgent(agent)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left ${
                    selectedAgent?.name === agent.name
                      ? 'ring-2 ring-purple-500'
                      : ''
                  }`}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900">{agent.title}</h3>
                          <p className="text-sm text-slate-500 mb-1">{agent.title_ar}</p>
                          <p className="text-xs text-slate-600">{agent.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.button>
              );
            })}
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {!selectedAgent ? (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Select a C-Suite agent to start consulting</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex flex-col" style={{ height: '700px' }}>
                <CardHeader className={`bg-gradient-to-r ${selectedAgent.color} text-white`}>
                  <div className="flex items-center gap-3">
                    {React.createElement(selectedAgent.icon, { className: 'w-6 h-6' })}
                    <div>
                      <CardTitle>{selectedAgent.title}</CardTitle>
                      <p className="text-sm text-white/80">{selectedAgent.title_ar}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                      </div>
                    ) : (
                      messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              msg.role === 'user'
                                ? 'bg-purple-600 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-tl-sm shadow-sm'
                            }`}
                          >
                            {msg.role === 'user' ? (
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                              <div className="text-sm prose prose-sm max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder={`Ask ${selectedAgent.title}...`}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`bg-gradient-to-r ${selectedAgent.color} hover:opacity-90`}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Ask about strategy, operations, finances, technology, or data insights
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}