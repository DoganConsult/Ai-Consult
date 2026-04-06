import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import PublicHeader from '@/components/shared/PublicHeader';
import { FileText, Send, Loader2, Download, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function RFQAnalyzer() {
  const [rfqText, setRfqText] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me().catch(() => null)
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    // Create conversation with RFQ analyzer agent
    const initConversation = async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'rfq_analyzer',
        metadata: {
          name: 'RFQ Analysis Session',
          description: 'Analyze RFQ and generate proposal guidelines'
        }
      });
      setConversationId(conv.id);
    };
    
    initConversation();
  }, [user]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setIsAnalyzing(false);
    });

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAnalyze = async () => {
    if (!rfqText.trim() || !conversationId) return;

    setIsAnalyzing(true);
    try {
      const conversation = await base44.agents.getConversation(conversationId);
      
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: `Please analyze this RFQ and provide comprehensive proposal guidelines:\n\n${rfqText}`
      });
    } catch (error) {
      toast.error('Failed to analyze RFQ');
      setIsAnalyzing(false);
    }
  };

  const handleAskFollowUp = async (question) => {
    if (!conversationId) return;

    setIsAnalyzing(true);
    try {
      const conversation = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: question
      });
    } catch (error) {
      toast.error('Failed to send message');
      setIsAnalyzing(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <p className="text-slate-600">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <PublicHeader showBackButton backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-emerald-600" />
            RFQ Analyzer & Proposal Generator
          </h1>
          <p className="text-slate-600">AI-powered RFQ analysis, solution mapping, and proposal guidelines</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                RFQ Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={rfqText}
                onChange={(e) => setRfqText(e.target.value)}
                placeholder="Paste the RFQ document here...&#10;&#10;Include:&#10;- Customer requirements&#10;- Technical specifications&#10;- Budget constraints&#10;- Timeline&#10;- Compliance needs&#10;- Integration requirements"
                rows={15}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleAnalyze}
                disabled={!rfqText.trim() || isAnalyzing || !conversationId}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze RFQ & Generate Proposal
                  </>
                )}
              </Button>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Quick Actions:</p>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAskFollowUp('What are the key technical requirements?')}
                    disabled={messages.length === 0 || isAnalyzing}
                  >
                    Identify Key Requirements
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAskFollowUp('Suggest a pricing strategy for this RFQ')}
                    disabled={messages.length === 0 || isAnalyzing}
                  >
                    Suggest Pricing Strategy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAskFollowUp('Create an implementation timeline')}
                    disabled={messages.length === 0 || isAnalyzing}
                  >
                    Create Implementation Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAskFollowUp('What compliance requirements should we address?')}
                    disabled={messages.length === 0 || isAnalyzing}
                  >
                    Compliance Requirements
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Analysis & Proposal Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4" style={{ maxHeight: '600px' }}>
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Paste an RFQ and click analyze to get started</p>
                    <div className="mt-6 text-left">
                      <p className="text-sm font-medium text-slate-700 mb-2">The AI will provide:</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        <li>✓ Requirements analysis & prioritization</li>
                        <li>✓ Solution mapping to SBG products</li>
                        <li>✓ Proposal structure & outline</li>
                        <li>✓ Pricing recommendations</li>
                        <li>✓ Implementation timeline</li>
                        <li>✓ Risk assessment</li>
                        <li>✓ Compliance requirements</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`${
                        msg.role === 'user'
                          ? 'bg-slate-100 ml-8'
                          : 'bg-emerald-50 mr-8'
                      } rounded-lg p-4`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={msg.role === 'user' ? 'outline' : 'default'}>
                          {msg.role === 'user' ? 'You' : 'AI Analyzer'}
                        </Badge>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
                {isAnalyzing && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'rfq-analysis.txt';
                      a.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}