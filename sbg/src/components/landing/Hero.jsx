import React, { useState, useEffect, memo } from 'react';
import { Star, Sparkles, ArrowRight, Zap, Shield, Brain, Cpu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from '@/api/base44Client';

// Memoized floating element for performance
const FloatingElement = memo(({ icon: Icon, delay, x, y, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
    transition={{ 
      delay, 
      y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
    }}
    className={`absolute left-1/2 top-1/2 hidden md:block ${color}`}
    style={{ transform: `translate(${x}px, ${y}px)` }}
  >
    <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
      <Icon className="w-6 h-6" aria-hidden="true" />
    </div>
  </motion.div>
));

FloatingElement.displayName = 'FloatingElement';

const floatingElements = [
  { icon: Zap, delay: 0, x: -120, y: -80, color: 'text-amber-500' },
  { icon: Shield, delay: 0.5, x: 150, y: -60, color: 'text-green-500' },
];

// Advanced Agent Protocol Animation
const AgentProtocolAnimation = memo(() => (
  <motion.div
    className="absolute top-20 left-10 hidden xl:block"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 1 }}
  >
    <div className="relative w-64 h-64">
      {/* Central AI Brain */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/50"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <Brain className="w-8 h-8 text-white" />
      </motion.div>
      
      {/* Orbiting Protocol Nodes */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
          style={{ transformOrigin: 'center' }}
        >
          <motion.div
            className="w-10 h-10 bg-slate-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg border border-emerald-400/40"
            style={{
              transform: `rotate(${angle}deg) translateX(80px) rotate(-${angle}deg)`
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0.4)', '0 0 10px 2px rgba(16, 185, 129, 0.6)', '0 0 0 0 rgba(16, 185, 129, 0.4)']
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          >
            <Zap className="w-5 h-5 text-emerald-400" />
          </motion.div>
        </motion.div>
      ))}
      
      {/* Connecting Lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const x1 = 50;
          const y1 = 50;
          const x2 = 50 + 31.25 * Math.cos((angle * Math.PI) / 180);
          const y2 = 50 + 31.25 * Math.sin((angle * Math.PI) / 180);
          return (
            <motion.line
              key={i}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="rgba(16, 185, 129, 0.4)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
            />
          );
        })}
      </svg>
    </div>
    
    <motion.div
      className="mt-2 text-center"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs backdrop-blur-sm">
        Multi-Agent Protocol
      </Badge>
    </motion.div>
  </motion.div>
));

AgentProtocolAnimation.displayName = 'AgentProtocolAnimation';

// Robotics LLM Neural Network Animation
const RoboticsLLMAnimation = memo(() => (
  <motion.div
    className="absolute bottom-20 right-10 hidden xl:block"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 1, delay: 0.3 }}
  >
    <div className="relative w-80 h-72">
      {/* Neural Network Layers */}
      {/* Input Layer */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`input-${i}`}
          className="absolute w-8 h-8 bg-violet-500/90 rounded-full shadow-lg shadow-violet-500/50"
          style={{ top: `${20 + i * 25}%`, left: '10%' }}
          animate={{ 
            scale: [1, 1.3, 1],
            boxShadow: [
              '0 0 0 0 rgba(139, 92, 246, 0.7)', 
              '0 0 15px 5px rgba(139, 92, 246, 0.3)', 
              '0 0 0 0 rgba(139, 92, 246, 0.7)'
            ]
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      
      {/* Hidden Layer */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={`hidden-${i}`}
          className="absolute w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50"
          style={{ top: `${15 + i * 20}%`, left: '45%' }}
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.4 }}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </motion.div>
      ))}
      
      {/* Output Layer - Robotics */}
      {[0, 1].map((i) => (
        <motion.div
          key={`output-${i}`}
          className="absolute w-14 h-14 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-xl shadow-emerald-500/50 border border-white/20"
          style={{ top: `${30 + i * 30}%`, left: '80%' }}
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [0, 5, -5, 0],
            boxShadow: [
              '0 0 20px rgba(16, 185, 129, 0.5)',
              '0 0 40px rgba(16, 185, 129, 0.8)',
              '0 0 20px rgba(16, 185, 129, 0.5)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
        >
          <Cpu className="w-7 h-7 text-white" />
        </motion.div>
      ))}
      
      {/* Animated Connection Lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {[0, 1, 2].map((i) =>
          [0, 1, 2, 3].map((j) => (
            <motion.line
              key={`line-in-${i}-${j}`}
              x1="18%"
              y1={`${20 + i * 25}%`}
              x2="50%"
              y2={`${15 + j * 20}%`}
              stroke="rgba(139, 92, 246, 0.5)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.7, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: (i + j) * 0.15 }}
            />
          ))
        )}
        {[0, 1, 2, 3].map((i) =>
          [0, 1].map((j) => (
            <motion.line
              key={`line-out-${i}-${j}`}
              x1="55%"
              y1={`${15 + i * 20}%`}
              x2="85%"
              y2={`${30 + j * 30}%`}
              stroke="rgba(16, 185, 129, 0.5)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.7, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: (i + j) * 0.2 }}
            />
          ))
        )}
      </svg>
      
      {/* Data Flow Particles */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/80"
          style={{ top: `${20 + i * 15}%`, left: '10%' }}
          animate={{
            left: ['10%', '45%', '80%'],
            top: [`${20 + i * 15}%`, `${15 + (i % 4) * 20}%`, `${30 + (i % 2) * 30}%`],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            delay: i * 0.8,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
    
    <motion.div
      className="mt-2 text-center"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
    >
      <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs backdrop-blur-sm">
        LLM Neural Architecture
      </Badge>
    </motion.div>
  </motion.div>
));

RoboticsLLMAnimation.displayName = 'RoboticsLLMAnimation';

export default function Hero() {
  const [showContent, setShowContent] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  // 4K Quality rotating images - Saudi Arabia & Future Technology
  const heroImages = [
    'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?q=95&w=3840&h=2160', // Riyadh skyline at night
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=95&w=3840&h=2160', // AI Neural Network
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=95&w=3840&h=2160', // Robotics automation
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=95&w=3840&h=2160', // Futuristic Saudi architecture
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=95&w=3840&h=2160', // AI technology circuits
    'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=95&w=3840&h=2160', // Advanced robotics
  ];

  // Rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
        <section className="relative overflow-hidden h-screen w-screen max-w-none" aria-label="Hero Section">
          {/* Rotating 4K Background Images */}
          <div className="absolute inset-0">
            {heroImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: currentImage === index ? 1 : 0 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            ))}
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />
          </div>
      
      {/* Animated accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating icons - Memoized */}
      {floatingElements.map((el, i) => (
        <FloatingElement key={i} {...el} />
      ))}

      {/* Advanced Agent Protocols Animation */}
      <AgentProtocolAnimation />
      
      {/* Robotics LLM Neural Network Animation */}
      <RoboticsLLMAnimation />

      <div className="relative w-full px-6 text-center pt-24 md:pt-32 h-full flex items-start justify-center">
            <div 
              className={`bg-slate-900/20 backdrop-blur-[2px] rounded-2xl border border-white/5 p-8 md:p-10 w-full mx-auto transition-opacity duration-300 cursor-pointer ${showContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setShowContent(false)}
            >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <Star className="w-12 h-12 text-white fill-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-4 border-2 border-dashed border-white/20 rounded-3xl"
              />
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="bg-gradient-to-r from-slate-400/20 to-gray-300/20 text-slate-200 border border-slate-400/30 px-4 py-2 backdrop-blur-sm">
                                                        <Sparkles className="w-4 h-4 mr-2" />
                                                        رؤية 2030 | Vision 2030
                                                      </Badge>
            </motion.div>

            <motion.h1
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="text-4xl md:text-6xl font-bold text-white leading-tight"
                                                dir="rtl"
                                              >
                                               <span className="block mb-2">الأصول الرقمية السعودية</span>
                                               <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                                                 تحول رقمي حقيقي لجميع القطاعات
                                               </span>
                                              </motion.h1>
            <p className="sr-only">Saudi Business Gate - منصة ذكية لإدارة الأعمال تدعم رؤية 2030</p>

            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed space-y-3"
                                                dir="rtl"
                                              >
                                                <p>أصول رقمية شخصية ومؤسسية متقدمة لجميع القطاعات</p>
                                                <p className="text-white font-medium">حلول رقمية واقعية • أتمتة ذكية • أنظمة ERP متكاملة</p>
                                                <a href="https://saudibusinessgate.com" target="_blank" rel="noopener noreferrer" className="inline-block text-emerald-400 hover:text-emerald-300 transition-colors text-base">
                                                  saudibusinessgate.com
                                                </a>
                                              </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
          >
            <Link to={createPageUrl('Advisor')}>
              <Button
                size="lg"
                className="group bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start AI Chat Now
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl backdrop-blur-sm"
              onClick={() => document.getElementById('plan-selector')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View Plans
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap justify-center gap-8 pt-12"
          >
            {[
              { value: '10x', label: 'Faster Automation' },
              { value: '24/7', label: 'Autonomous Ops' },
              { value: '99.9%', label: 'Motion Precision' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-base text-slate-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="pt-8 mt-8 border-t border-white/10"
          >
            <p className="text-sm text-slate-400 mb-4">متوافق مع أحدث التقنيات والمعايير:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { name: 'NCA', icon: '🛡️' },
                { name: 'SAMA', icon: '🏦' },
                { name: 'ZATCA', icon: '📋' },
                { name: 'Nitaqat', icon: '👥' },
                { name: 'IFRS', icon: '📊' },
                { name: 'ISO 27001', icon: '🔐' },
              ].map((badge, i) => (
                <span key={i} className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg text-sm text-white/80 flex items-center gap-2">
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </span>
              ))}
            </div>
          </motion.div>

          {/* Powered By */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="pt-8 flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm">Powered by</span>
              <a 
                href="https://www.doganconsult.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Dogan Consult
              </a>
            </div>
            <a 
              href="https://www.saudibusinessgate.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              www.saudibusinessgate.com
            </a>
          </motion.div>


        </motion.div>
                    </div>
                </div>
              </section>
            );
          }