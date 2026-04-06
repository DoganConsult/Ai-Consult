import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConversionFunnel({ data }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-lg">Conversion Funnel</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((stage, index) => {
            const width = (stage.value / maxValue) * 100;
            const conversionRate = index > 0 ? ((stage.value / data[index - 1].value) * 100).toFixed(1) : 100;
            
            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{stage.value.toLocaleString()}</span>
                    {index > 0 && (
                      <span className="text-xs text-slate-400">({conversionRate}%)</span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`h-full rounded-lg ${stage.color}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}