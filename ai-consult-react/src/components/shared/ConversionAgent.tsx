import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, User, Phone, ChevronLeft, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { COMPANY_INFO } from './constants';

type Message = {
  id: string;
  type: 'bot' | 'user';
  text: string;
  isTyping?: boolean;
  options?: { label: string; value: string }[];
};

type UserData = {
  interest: string;
  name: string;
  phone: string;
};

export function ConversionAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [step, setStep] = useState<'init' | 'interest' | 'name' | 'phone' | 'completed'>('init');
  const [userData, setUserData] = useState<UserData>({ interest: '', name: '', phone: '' });
  const [isTyping, setIsTyping] = useState(false);
  
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Initial greeting based on route
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startConversation();
    }
  }, [isOpen]);

  const getContextGreeting = () => {
    const path = location.pathname;
    if (path.includes('shahin')) return { en: 'Welcome to Shahin AI.', ar: 'مرحباً بك في شاهين للذكاء الاصطناعي.' };
    if (path.includes('saudi-business')) return { en: 'Welcome to Saudi Business Gate.', ar: 'مرحباً بك في بوابة الأعمال السعودية.' };
    if (path.includes('doganlab')) return { en: 'Welcome to DoganLab.', ar: 'مرحباً بك في مختبر دوجان.' };
    return { en: 'Welcome to Dogan Consult.', ar: 'مرحباً بك في دوجان للاستشارات.' };
  };

  const startConversation = async () => {
    setIsTyping(true);
    const greeting = getContextGreeting();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const initialMessage: Message = {
      id: '1',
      type: 'bot',
      text: `${greeting.ar} ${greeting.en}\n\nI am your intelligent assistant. How can I help you accelerate your business today?\n\nأنا مساعدك الذكي. كيف يمكنني مساعدتك في تسريع أعمالك اليوم؟`,
      options: [
        { label: 'Request Demo / طلب ديمو', value: 'demo' },
        { label: 'Consulting / استشارات', value: 'consulting' },
        { label: 'Technical Support / دعم فني', value: 'support' },
        { label: 'Partnership / شراكة', value: 'partnership' }
      ]
    };
    
    setMessages([initialMessage]);
    setIsTyping(false);
    setStep('interest');
  };

  const handleOptionClick = (option: { label: string; value: string }) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: option.label
    };
    setMessages(prev => [...prev, userMsg]);
    setUserData(prev => ({ ...prev, interest: option.value }));
    
    // Trigger bot response
    handleBotResponse('interest', option.value);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputValue
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    
    handleBotResponse(step, inputValue);
  };

  const handleBotResponse = async (currentStep: string, input: string) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate thinking

    let nextStep = currentStep;
    let botText = '';
    let options = undefined;

    if (currentStep === 'interest') {
      botText = "Excellent choice. To customize your experience, may I have your name?\n\nاختيار ممتاز. لتخصيص تجربتك، هل يمكنني معرفة اسمك؟";
      nextStep = 'name';
    } else if (currentStep === 'name') {
      setUserData(prev => ({ ...prev, name: input }));
      botText = `Nice to meet you, ${input}. Please provide your mobile number (WhatsApp) so our team can reach out instantly.\n\nتشرفت بك يا ${input}. يرجى تزويدنا برقم الجوال (واتساب) ليتواصل معك فريقنا فوراً.`;
      nextStep = 'phone';
    } else if (currentStep === 'phone') {
      setUserData(prev => ({ ...prev, phone: input }));
      botText = "Thank you! I have registered your request. An expert consultant from our team will contact you shortly.\n\nشكراً لك! تم تسجيل طلبك. سيقوم خبير استشاري من فريقنا بالتواصل معك قريباً.";
      nextStep = 'completed';
      
      // Simulate sending data to backend
      console.log('Lead Captured:', { ...userData, phone: input, source: location.pathname });
    }

    const botMsg: Message = {
      id: Date.now().toString(),
      type: 'bot',
      text: botText,
      options
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
    setStep(nextStep as any);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 right-4 md:right-8 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-100 font-sans"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-indigo-900 rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Dogan Assistant</h3>
                  <span className="text-blue-200 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Online | متصل الآن
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              <div className="text-center text-xs text-gray-400 my-4">
                <span>Today {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    msg.type === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-line text-sm leading-relaxed" dir="auto">{msg.text}</p>
                    
                    {msg.options && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {msg.options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleOptionClick(opt)}
                            className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-full transition-colors font-medium"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm w-16 flex items-center justify-center gap-1">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                      className="w-2 h-2 bg-gray-400 rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                      className="w-2 h-2 bg-gray-400 rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                      className="w-2 h-2 bg-gray-400 rounded-full" 
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              {step !== 'interest' && step !== 'completed' && (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={step === 'name' ? 'Type your name...' : 'Type your phone number...'}
                    className="flex-1 focus-visible:ring-blue-600"
                  />
                  <Button 
                    onClick={handleSend}
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              )}
              {step === 'completed' && (
                <div className="text-center p-2">
                  <p className="text-sm text-gray-500 mb-2">Want to contact us directly?</p>
                  <a 
                    href={`tel:${COMPANY_INFO.phone}`} 
                    className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
                  >
                    <Phone className="w-4 h-4" />
                    {COMPANY_INFO.phoneDisplay}
                  </a>
                </div>
              )}
              <div className="text-center mt-2">
                 <span className="text-[10px] text-gray-400">Powered by Shahin AI Engine</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-blue-700 transition-colors group"
      >
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
        <MessageCircle className={`w-8 h-8 transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0 absolute' : 'opacity-100'}`} />
        <X className={`w-8 h-8 transition-all duration-300 ${!isOpen ? '-rotate-90 opacity-0 absolute' : 'opacity-100'}`} />
        
        {/* Tooltip hint */}
        {!isOpen && (
          <div className="absolute right-full mr-4 bg-white text-gray-800 px-4 py-2 rounded-xl shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-sm font-medium">
            Chat with us | تواصل معنا
          </div>
        )}
      </motion.button>
    </>
  );
}
