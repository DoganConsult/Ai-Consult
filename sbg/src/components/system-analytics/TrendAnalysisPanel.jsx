import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, Clock, Target, Zap, Calendar, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, ReferenceLine, ComposedChart, Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Calculate moving average
function calculateMovingAverage(data, key, windowSize = 5) {
  return data.map((item, index) => {
    if (index < windowSize - 1) return { ...item, [`${key}MA`]: null };
    const sum = data.slice(index - windowSize + 1, index + 1).reduce((acc, d) => acc + d[key], 0);
    return { ...item, [`${key}MA`]: sum / windowSize };
  });
}

// Detect trend direction
function detectTrend(data, key) {
  if (data.length < 7) return { direction: 'stable', strength: 0 };
  
  const recent = data.slice(-7);
  const previous = data.slice(-14, -7);
  
  const recentAvg = recent.reduce((sum, d) => sum + d[key], 0) / recent.length;
  const previousAvg = previous.reduce((sum, d) => sum + d[key], 0) / previous.length;
  
  const change = ((recentAvg - previousAvg) / previousAvg) * 100;
  
  return {
    direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
    strength: Math.abs(change),
    recentAvg,
    previousAvg,
    change
  };
}

function TrendIndicator({ trend, metric }) {
  const colors = {
    up: metric === 'avgTime' ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50',
    down: metric === 'avgTime' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50',
    stable: 'text-slate-600 bg-slate-50'
  };

  const icons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Activity
  };

  const Icon = icons[trend.direction];
  const colorClass = colors[trend.direction];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colorClass}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">
        {trend.direction === 'stable' ? 'Stable' : `${trend.change.toFixed(1)}%`}
      </span>
    </div>
  );
}

function ForecastSection({ data, metric, label }) {
  // Simple linear regression for forecast
  const forecast = useMemo(() => {
    const n = data.length;
    const values = data.map(d => d[metric]);
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    values.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean);
      denominator += (x - xMean) ** 2;
    });
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    
    // Forecast next 7 days
    const forecastData = [];
    for (let i = 0; i < 7; i++) {
      const x = n + i;
      forecastData.push({
        date: `Day +${i + 1}`,
        predicted: Math.max(0, intercept + slope * x),
        upper: Math.max(0, (intercept + slope * x) * 1.1),
        lower: Math.max(0, (intercept + slope * x) * 0.9)
      });
    }
    
    return forecastData;
  }, [data, metric]);

  const combinedData = [
    ...data.slice(-14).map(d => ({ date: d.date, actual: d[metric] })),
    ...forecast.map(f => ({ ...f, actual: null }))
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <ReferenceLine x={data.slice(-14)[data.slice(-14).length - 1]?.date} stroke="#94a3b8" strokeDasharray="5 5" />
          <Area type="monotone" dataKey="upper" stroke="none" fill="#8b5cf6" fillOpacity={0.1} />
          <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} />
          <Area type="monotone" dataKey="actual" stroke="#10b981" fill="url(#colorActual)" strokeWidth={2} />
          <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#8b5cf6' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TrendAnalysisPanel({ dailyData }) {
  const [selectedMetric, setSelectedMetric] = useState('successRate');

  // Calculate trends for all metrics
  const trends = useMemo(() => ({
    executions: detectTrend(dailyData, 'executions'),
    successRate: detectTrend(dailyData, 'successRate'),
    avgTime: detectTrend(dailyData, 'avgTime'),
    efficiency: detectTrend(dailyData, 'efficiency'),
    costSavings: detectTrend(dailyData, 'costSavings')
  }), [dailyData]);

  // Data with moving averages
  const dataWithMA = useMemo(() => {
    let result = calculateMovingAverage(dailyData, 'successRate');
    result = calculateMovingAverage(result, 'executions');
    result = calculateMovingAverage(result, 'efficiency');
    return result;
  }, [dailyData]);

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < dailyData.length; i += 7) {
      const weekData = dailyData.slice(i, i + 7);
      if (weekData.length > 0) {
        weeks.push({
          week: `Week ${Math.floor(i / 7) + 1}`,
          executions: weekData.reduce((sum, d) => sum + d.executions, 0),
          successRate: weekData.reduce((sum, d) => sum + d.successRate, 0) / weekData.length,
          avgTime: weekData.reduce((sum, d) => sum + d.avgTime, 0) / weekData.length,
          efficiency: weekData.reduce((sum, d) => sum + d.efficiency, 0) / weekData.length
        });
      }
    }
    return weeks;
  }, [dailyData]);

  return (
    <div className="space-y-6">
      {/* Trend Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'executions', label: 'Executions', icon: Activity, color: 'blue' },
          { key: 'successRate', label: 'Success Rate', icon: Target, color: 'emerald' },
          { key: 'avgTime', label: 'Avg Time', icon: Clock, color: 'amber' },
          { key: 'efficiency', label: 'Efficiency', icon: Zap, color: 'purple' },
          { key: 'costSavings', label: 'Cost Savings', icon: BarChart3, color: 'emerald' }
        ].map(({ key, label, icon: Icon, color }) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 text-${color}-600`} />
              <TrendIndicator trend={trends[key]} metric={key} />
            </div>
            <div className="text-sm font-medium text-slate-700">{label}</div>
            <div className="text-xs text-slate-500 mt-1">
              {trends[key].direction === 'up' ? 'Increasing' : trends[key].direction === 'down' ? 'Decreasing' : 'Stable'} trend
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Trend Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Success Rate Trend with MA */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Success Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataWithMA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={1} dot={false} name="Daily" />
                  <Line type="monotone" dataKey="successRateMA" stroke="#10b981" strokeWidth={3} dot={false} name="5-Day MA" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Trend */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Efficiency Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataWithMA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={1} dot={false} name="Daily" />
                  <Line type="monotone" dataKey="efficiencyMA" stroke="#8b5cf6" strokeWidth={3} dot={false} name="5-Day MA" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Comparison */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Weekly Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Legend />
                <Bar yAxisId="left" dataKey="executions" fill="#3b82f6" name="Executions" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} name="Success %" />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={2} name="Efficiency %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Forecast */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            7-Day Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="successRate" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="successRate">Success Rate</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>
            <TabsContent value="successRate">
              <ForecastSection data={dailyData} metric="successRate" label="Success Rate" />
            </TabsContent>
            <TabsContent value="efficiency">
              <ForecastSection data={dailyData} metric="efficiency" label="Efficiency" />
            </TabsContent>
            <TabsContent value="executions">
              <ForecastSection data={dailyData} metric="executions" label="Executions" />
            </TabsContent>
          </Tabs>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-slate-600">Forecast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-purple-300"></div>
              <span className="text-slate-600">Confidence</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}