import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import ConversationSidebar from '../components/advisor/ConversationSidebar';
import EnhancedChatMessage from '../components/advisor/EnhancedChatMessage';
import EnhancedChatInput from '../components/advisor/EnhancedChatInput';
import WelcomeScreen from '../components/advisor/WelcomeScreen';
import SmartSuggestions from '../components/advisor/SmartSuggestions';
import Logo from '../components/ui/Logo';

export default function AdvisorPage() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('business');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const user = await base44.auth.me();
        setIsAuthenticated(true);
        setCurrentUser(user);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-created_date'),
    enabled: isAuthenticated,
    retry: false
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: (data) => base44.entities.Conversation.create(data),
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversation(newConv);
    },
  });

  // Update conversation mutation
  const updateConversation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Delete conversation mutation
  const deleteConversation = useMutation({
    mutationFn: (id) => base44.entities.Conversation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConversation) {
        handleNewChat();
      }
    },
  });

  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setSuggestions([]);
    setSidebarOpen(false);
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    setMessages(conversation.messages || []);
    setMode(conversation.mode || 'business');
    setSidebarOpen(false);
  };

  const handleToggleStar = async (conversation) => {
    await updateConversation.mutateAsync({
      id: conversation.id,
      data: { is_starred: !conversation.is_starred }
    });
  };

  const generateSmartSuggestions = async (context) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this conversation context, suggest 3 brief follow-up questions the user might want to ask. Keep each suggestion under 10 words.
        
Context: ${context}

Return as JSON array of strings.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setSuggestions(result.suggestions?.slice(0, 3) || []);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSendMessage = async (userInput, fileUrls = []) => {
    const userMessage = { role: 'user', content: userInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setSuggestions([]);

    try {
      // Build context from conversation history
      const historyContext = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');

      const systemPrompt = mode === 'legal' 
        ? `You are Star, an expert legal AI assistant. You provide:
- Detailed legal research and analysis
- Case law references and precedents
- Statutory interpretation
- Compliance guidance
- Contract analysis

Always be thorough, cite sources when possible, and include disclaimers about seeking qualified legal counsel.`
        : `You are Star, an expert business AI assistant. You provide:
- Strategic business advice
- Market analysis and insights
- Growth strategies
- Operational efficiency tips
- Client acquisition strategies

Be actionable, practical, and focused on results.`;

      const prompt = `${systemPrompt}

Previous conversation:
${historyContext}

${fileUrls.length > 0 ? 'The user has attached files for analysis.' : ''}

User's question: ${userInput}

Provide a comprehensive, well-structured response.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
      });

      const assistantMessage = { role: 'assistant', content: response };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save conversation if authenticated
      if (isAuthenticated) {
        if (activeConversation) {
          await updateConversation.mutateAsync({
            id: activeConversation.id,
            data: { messages: updatedMessages }
          });
        } else {
          // Generate title for new conversation
          const titleResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Generate a brief 3-5 word title for this conversation: "${userInput}"`,
          });
          
          const newConv = await createConversation.mutateAsync({
            title: titleResult.slice(0, 50),
            mode,
            messages: updatedMessages
          });
          setActiveConversation(newConv);
        }
      }

      // Generate smart suggestions
      generateSmartSuggestions(userInput + ' ' + response.slice(0, 200));

    } catch (error) {
      console.error('Error:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: "I apologize, but I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      setMessages(messages.slice(0, -1));
      handleSendMessage(lastUserMessage.content);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Sidebar */}
      {isAuthenticated && (
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversation?.id}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDelete={(id) => deleteConversation.mutate(id)}
          onToggleStar={handleToggleStar}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Back</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Logo size="small" />
          </div>

          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => base44.auth.redirectToLogin()}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Sign in to Save
              </Button>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <WelcomeScreen 
                onSelectPrompt={(prompt) => handleSendMessage(prompt)} 
                mode={mode} 
              />
            ) : (
              <>
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <EnhancedChatMessage
                      key={index}
                      message={msg}
                      onRegenerate={index === messages.length - 1 && msg.role === 'assistant' ? handleRegenerate : undefined}
                    />
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <EnhancedChatMessage 
                    message={{ role: 'assistant', content: '' }} 
                    isLoading={true} 
                  />
                )}

                {/* Smart Suggestions */}
                <SmartSuggestions
                  suggestions={suggestions}
                  onSelect={handleSendMessage}
                  isVisible={!isLoading && suggestions.length > 0}
                />
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-t border-slate-200">
          <div className="max-w-3xl mx-auto">
            <EnhancedChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              mode={mode}
              onModeChange={setMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}