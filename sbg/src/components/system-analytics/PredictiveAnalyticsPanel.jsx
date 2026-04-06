import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Target,
  Zap, Clock, CheckCircle, ArrowRight, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, ReferenceArea
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Simple linear regression for predictions
const linearRegression = (data, key) => {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.[key] || 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  data.forEach((d, i) => {
    sumX += i;
    sumY += d[key];
    sumXY += i * d[key];
    sumX2 += i * i;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

// Calculate prediction with confidence interval
const predictWithConfidence = (regression, x, data, key) => {
  const predicted = regression.slope * x + regression.intercept;
  const variance = data.reduce((sum, d, i) => {
    const expected = regression.slope * i + regression.intercept;
    return sum + Math.pow(d[key] - expected, 2);
  }, 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    value: predicted,
    lower: predicted - 1.96 * stdDev,
    upper: predicted + 1.96 * stdDev,
    confidence: Math.max(0, 100 - (stdDev / predicted * 100))
  };
};

// Trend classification
const classifyTrend = (slope, avgValue) => {
  const percentChange = (slope * 7 / avgValue) * 100;
  if (percentChange > 5) return { direction: 'up', strength: 'strong', label: 'Strong Uptrend' };
  if (percentChange > 2) return { direction: 'up', strength: 'moderate', label: 'Moderate Uptrend' };
  if (percentChange > 0) return { direction: 'up', strength: 'weak', label: 'Slight Uptrend' };
  if (percentChange > -2) return { direction: 'down', strength: 'weak', label: 'Slight Downtrend' };
  if (percentChange > -5) return { direction: 'down', strength: 'moderate', label: 'Moderate Downtrend' };
  return { direction: 'down', strength: 'strong', label: 'Strong Downtrend' };
};

function PredictionCard({ title, currentValue, prediction, unit, trend, icon: Icon, color }) {
  const colorClasses = {
    emerald: { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    blue: { bg: 'from-blue-500 to-indigo-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    amber: { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    purple: { bg: 'from-purple-500 to-violet-500', light: 'bg-purple-50 border-purple-200', text: 'text-purple-700' }
  };

  const colors = colorClasses[color] || colorClasses.blue;
  const isPositive = prediction.value >= currentValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <Badge className={`${colors.light} ${colors.text} text-xs`}>
          {prediction.confidence.toFixed(0)}% confidence
        </Badge>
      </div>

      <h4 className="text-sm font-medium text-slate-600 mb-2">{title}</h4>
      
      <div className="flex items-end gap-3 mb-3">
        <div>
          <div className="text-xs text-slate-400 mb-0.5">Current</div>
          <div className="text-xl font-bold text-slate-900">{currentValue.toFixed(1)}{unit}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 mb-2" />
        <div>
          <div className="text-xs text-slate-400 mb-0.5">7-Day Forecast</div>
          <div className={`text-xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {prediction.value.toFixed(1)}{unit}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {trend.direction === 'up' ? (
          <TrendingUp className={`w-4 h-4 ${trend.strength === 'strong' ? 'text-emerald-600' : 'text-emerald-400'}`} />
        ) : (
          <TrendingDown className={`w-4 h-4 ${trend.strength === 'strong' ? 'text-red-600' : 'text-red-400'}`} />
        )}
        <span className="text-slate-600">{trend.label}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Range: {prediction.lower.toFixed(1)} - {prediction.upper.toFixed(1)}{unit}</span>
        </div>
        <Progress 
          value={prediction.confidence} 
          className="h-1.5"
        />
      </div>
    </motion.div>
  );
}

function ForecastChart({ data, predictions, metric, title }) {
  const chartData = [
    ...data.map((d, i) => ({
      ...d,
      index: i,
      type: 'actual'
    })),
    ...predictions.map((p, i) => ({
      date: `Day +${i + 1}`,
      [metric]: p.value,
      lower: p.lower,
      upper: p.upper,
      index: data.length + i,
      type: 'predicted'
    }))
  ];

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : value, name]}
              />
              <ReferenceArea
                x1={chartData[data.length - 1]?.date}
                x2={chartData[chartData.length - 1]?.date}
                fill="#8b5cf6"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="#3b82f6"
                fill="url(#actualGradient)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="transparent"
                fill="transparent"
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="#8b5cf6"
                strokeDasharray="4 4"
                fill="url(#predictedGradient)"
                strokeWidth={1}
              />
              <ReferenceLine x={data[data.length - 1]?.date} stroke="#8b5cf6" strokeDasharray="3 3" label={{ value: 'Forecast Start', position: 'top', fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-slate-600">Historical Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-slate-600">Predicted Range</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight }) {
  const [expanded, setExpanded] = useState(false);
  
  const severityStyles = {
    positive: { bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-600' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' },
    critical: { bg: 'bg-red-50 border-red-200', icon: AlertTriangle, iconColor: 'text-red-600' },
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-600' }
  };

  const style = severityStyles[insight.severity] || severityStyles.info;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border ${style.bg} p-4`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} mt-0.5`} />
        <div className="flex-1">
          <h4 className="font-medium text-slate-900 text-sm">{insight.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{insight.message}</p>
          
          {insight.recommendation && (
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-slate-200/50"
                >
                  <div className="text-xs text-slate-500 mb-1">Recommendation:</div>
                  <p className="text-sm text-slate-700">{insight.recommendation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          
          {insight.recommendation && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mt-2"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Show less' : 'Show recommendation'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PredictiveAnalyticsPanel({ dailyData, agentPerformance }) {
  const [forecastMetric, setForecastMetric] = useState('successRate');

  // Calculate predictions for each metric
  const predictions = useMemo(() => {
    const metrics = ['successRate', 'executions', 'avgTime', 'efficiency'];
    const results = {};

    metrics.forEach(metric => {
      const regression = linearRegression(dailyData, metric);
      const avgValue = dailyData.reduce((sum, d) => sum + d[metric], 0) / dailyData.length;
      const currentValue = dailyData[dailyData.length - 1][metric];
      
      // Generate 7-day forecast
      const forecasts = [];
      for (let i = 1; i <= 7; i++) {
        forecasts.push(predictWithConfidence(regression, dailyData.length + i - 1, dailyData, metric));
      }

      const trend = classifyTrend(regression.slope, avgValue);

      results[metric] = {
        current: currentValue,
        forecast: forecasts[6], // 7-day prediction
        forecasts,
        trend,
        regression
      };
    });

    return results;
  }, [dailyData]);

  // Generate AI insights
  const insights = useMemo(() => {
    const insightList = [];

    // Success rate insight
    if (predictions.successRate.trend.direction === 'down' && predictions.successRate.trend.strength !== 'weak') {
      insightList.push({
        severity: 'warning',
        title: 'Success Rate Declining',
        message: `Success rate is trending downward and may drop to ${predictions.successRate.forecast.value.toFixed(1)}% in 7 days.`,
        recommendation: 'Review recent failures and identify common patterns. Consider increasing validation steps or adding retry logic for flaky operations.'
      });
    } else if (predictions.successRate.forecast.value >= 95) {
      insightList.push({
        severity: 'positive',
        title: 'Excellent Success Rate Forecast',
        message: `Success rate is projected to reach ${predictions.successRate.forecast.value.toFixed(1)}% - exceeding targets.`,
        recommendation: null
      });
    }

    // Execution time insight
    if (predictions.avgTime.trend.direction === 'up' && predictions.avgTime.current > 3) {
      insightList.push({
        severity: 'warning',
        title: 'Execution Time Increasing',
        message: `Average execution time may increase to ${predictions.avgTime.forecast.value.toFixed(2)}s, potentially impacting SLAs.`,
        recommendation: 'Investigate slow-running operations. Consider caching frequently accessed data or parallelizing independent tasks.'
      });
    }

    // Efficiency insight
    if (predictions.efficiency.forecast.value > predictions.efficiency.current * 1.1) {
      insightList.push({
        severity: 'positive',
        title: 'Efficiency Improvement Expected',
        message: `System efficiency is projected to improve by ${((predictions.efficiency.forecast.value / predictions.efficiency.current - 1) * 100).toFixed(1)}% over the next week.`,
        recommendation: null
      });
    }

    // Add a general insight if no specific ones
    if (insightList.length === 0) {
      insightList.push({
        severity: 'info',
        title: 'System Operating Normally',
        message: 'All metrics are within expected ranges with no significant trend changes predicted.',
        recommendation: 'Continue monitoring and consider setting up alerts for key thresholds.'
      });
    }

    return insightList;
  }, [predictions]);

  const metricConfig = {
    successRate: { title: 'Success Rate', unit: '%', icon: CheckCircle, color: 'emerald' },
    executions: { title: 'Executions', unit: '', icon: Zap, color: 'blue' },
    avgTime: { title: 'Avg Time', unit: 's', icon: Clock, color: 'amber' },
    efficiency: { title: 'Efficiency', unit: '%', icon: Target, color: 'purple' }
  };

  return (
    <div className="space-y-6">
      {/* Prediction Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(predictions).map(([key, data]) => {
          const config = metricConfig[key];
          return (
            <PredictionCard
              key={key}
              title={`${config.title} Forecast`}
              currentValue={data.current}
              prediction={data.forecast}
              unit={config.unit}
              trend={data.trend}
              icon={config.icon}
              color={config.color}
            />
          );
        })}
      </div>

      {/* Forecast Chart */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  7-Day Forecast
                </CardTitle>
                <Select value={forecastMetric} onValueChange={setForecastMetric}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successRate">Success Rate</SelectItem>
                    <SelectItem value="executions">Executions</SelectItem>
                    <SelectItem value="avgTime">Avg Time</SelectItem>
                    <SelectItem value="efficiency">Efficiency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ForecastChart
                data={dailyData}
                predictions={predictions[forecastMetric].forecasts}
                metric={forecastMetric}
                title={metricConfig[forecastMetric].title}
              />
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}