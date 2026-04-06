import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Code2, Cpu } from 'lucide-react';
import { Button } from '../ui/button';

export function Hero() {
  return (
    <div className="relative min-h-screen flex items-center bg-black overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black"></div>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-right">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">مختبر الابتكار والذكاء الاصطناعي</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold text-white leading-tight"
            >
              نصنع المستقبل <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-purple-400 to-pink-600">
                بأكواد ذكية
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl ml-auto"
            >
              Where imagination meets code. We experiment, prototype, and build the next generation of digital solutions for Saudi Arabia.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4 justify-end"
            >
              <Button size="lg" variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-950">
                View Experiments
              </Button>
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                Join the Lab
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-2xl shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20">
                    <Code2 className="w-8 h-8 text-purple-400 mb-2" />
                    <h3 className="text-white font-semibold">Generative AI</h3>
                    <p className="text-gray-400 text-sm">LLM Integration & Fine-tuning</p>
                  </div>
                  <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20 mt-8">
                    <Cpu className="w-8 h-8 text-pink-400 mb-2" />
                    <h3 className="text-white font-semibold">IoT Solutions</h3>
                    <p className="text-gray-400 text-sm">Smart City Integration</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20">
                    <Sparkles className="w-8 h-8 text-blue-400 mb-2" />
                    <h3 className="text-white font-semibold">Web3 & Blockchain</h3>
                    <p className="text-gray-400 text-sm">Decentralized Systems</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
