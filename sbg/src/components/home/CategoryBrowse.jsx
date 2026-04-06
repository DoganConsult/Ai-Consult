import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Package, Shield, BarChart3, Users, Wrench, Cpu, TruckIcon, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { id: 'Procurement', label: 'Procurement', icon: ShoppingCart, color: 'from-blue-500 to-cyan-500', desc: 'RFQ, PO, Vendor Management' },
  { id: 'GRC', label: 'GRC', icon: Shield, color: 'from-emerald-500 to-teal-500', desc: 'Compliance & Risk' },
  { id: 'Finance', label: 'Finance', icon: BarChart3, color: 'from-amber-500 to-orange-500', desc: 'Close, Reconciliation, KPIs' },
  { id: 'HR', label: 'HR', icon: Users, color: 'from-purple-500 to-pink-500', desc: 'Hiring, Onboarding, Access' },
  { id: 'ServiceDesk', label: 'Service Desk', icon: Wrench, color: 'from-indigo-500 to-blue-500', desc: 'Tickets, RPA, Auto-fix' },
  { id: 'Robotics', label: 'Robotics', icon: Cpu, color: 'from-rose-500 to-red-500', desc: 'IoT, Motion, Warehouse' },
  { id: 'SupplyChain', label: 'Supply Chain', icon: TruckIcon, color: 'from-teal-500 to-green-500', desc: 'Stock, Reorder, Logistics' },
  { id: 'Sales', label: 'Sales', icon: Package, color: 'from-violet-500 to-purple-500', desc: 'Quote, Contract, Invoice' },
];

export default function CategoryBrowse() {
  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Browse by Category</h2>
        <p className="text-slate-600">Explore solutions tailored to your business needs</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Link 
              to={createPageUrl('Search') + `?domain=${cat.id}`}
              className="block group"
            >
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-300 hover:shadow-xl transition-all h-full flex flex-col">
                <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <cat.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-1">{cat.label}</h3>
                <p className="text-sm text-slate-500 flex-1">{cat.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}