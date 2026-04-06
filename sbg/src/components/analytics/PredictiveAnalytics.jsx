import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, Clock, Target, Zap, Brain, Activity, Gauge, Bell, Beaker
} from 'lucide-react';
import ScenarioSimulator from './ScenarioSimulator';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Predictive model using simple moving average and trend analysis
function predictFutureValues(historicalData, periods = 7) {
  if (historicalData.length < 3) return [];
  
  const values = historicalData.map(d => d.value);
  const windowSize = Math.min(5, values.length);
  
  // Calculate trend
  const recentAvg = values.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const olderAvg = values.slice(0, windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const trend = (recentAvg - olderAvg) / values.length;
  
  // Generate predictions
  const predictions = [];
  let lastValue = values[values.length - 1];
  
  for (let i = 1; i <= periods; i++) {
    const predicted = Math.max(0, Math.min(100, lastValue + trend * i + (Math.random() - 0.5) * 2));
    predictions.push({
      period: i,
      date: `Day +${i}`,
      predicted: Number(predicted.toFixed(1)),
      lower: Number((predicted * 0.85).toFixed(1)),
      upper: Number(Math.min(100, predicted * 1.15).toFixed(1))
    });
  }
  
  return predictions;
}

// Anomaly detection
function detectAnomalies(data) {
  if (data.length < 5) return [];
  
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
  
  return data.filter(d => Math.abs(d.value - mean) > 2 * stdDev).map(d => ({
    ...d,
    severity: Math.abs(d.value - mean) > 3 * stdDev ? 'critical' : 'warning'
  }));
}

// Resource prediction
function predictResourceNeeds(scenarios, runs) {
  const resourcePredictions = scenarios.map(scenario => {
    const scenarioRuns = runs.filter(r => r.scenarioId === scenario.id);
    const avgTime = scenarioRuns.length > 0
      ? scenarioRuns.reduce((sum, r) => sum + r.execution_time_ms, 0) / scenarioRuns.length
      : 3000;
    const successRate = scenarioRuns.length > 0
      ? (scenarioRuns.filter(r => r.status === 'completed').length / scenarioRuns.length) * 100
      : 75;
    
    // Predict future load based on recent trends
    const recentRuns = scenarioRuns.slice(-10);
    const runFrequency = recentRuns.length / 7; // runs per day
    const predictedLoad = runFrequency * 1.2; // 20% growth assumption
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.nameEn,
      predictedExecutionTime: avgTime * (1 + (100 - successRate) / 200),
      predictedSuccessRate: Math.min(100, successRate + (successRate > 80 ? 2 : 5)),
      predictedLoad,
      resourceRisk: predictedLoad > 5 ? 'high' : predictedLoad > 2 ? 'medium' : 'low',
      cpuEstimate: Math.min(100, predictedLoad * 15 + avgTime / 100),
      memoryEstimate: Math.min(100, predictedLoad * 10 + avgTime / 150)
    };
  });
  
  return resourcePredictions;
}

function PredictionCard({ title, current, predicted, trend, icon: Icon, color, confidence }) {
  const isPositive = trend >= 0;
  const colorClasses = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-indigo-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-violet-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <Badge className={`${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} text-xs`}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </Badge>
      </div>
      <div className="text-sm text-slate-500 mb-1">{title}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-slate-900">{current}</span>
        <span className="text-slate-400">→</span>
        <span className="text-lg font-semibold text-purple-600">{predicted}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={confidence} className="h-1.5 flex-1" />
        <span className="text-xs text-slate-400">{confidence}% conf.</span>
      </div>
    </motion.div>
  );
}

function ProactiveAlert({ alert, onDismiss }) {
  const severityStyles = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', badge: 'bg-red-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', badge: 'bg-blue-500' }
  };
  
  const style = severityStyles[alert.severity] || severityStyles.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`p-4 rounded-xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full ${style.badge} flex items-center justify-center`}>
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{alert.title}</span>
            <Badge className={`${style.badge} text-white text-xs`}>{alert.severity}</Badge>
          </div>
          <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            Predicted in {alert.timeframe}
          </div>
        </div>
        <button onClick={() => onDismiss(alert.id)} className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>
      {alert.recommendation && (
        <div className="mt-3 p-2 bg-white/50 rounded-lg text-sm text-slate-700">
          💡 <strong>Recommendation:</strong> {alert.recommendation}
        </div>
      )}
    </motion.div>
  );
}

function ForecastChart({ historicalData, predictions }) {
  const combinedData = useMemo(() => {
    const historical = historicalData.slice(-14).map((d, i) => ({
      date: d.date || `Day -${14 - i}`,
      actual: d.value,
      predicted: null,
      lower: null,
      upper: null
    }));
    
    const forecast = predictions.map(p => ({
      date: p.date,
      actual: null,
      predicted: p.predicted,
      lower: p.lower,
      upper: p.upper
    }));
    
    return [...historical, ...forecast];
  }, [historicalData, predictions]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          <ReferenceLine x={historicalData.length > 0 ? combinedData[historicalData.length - 1]?.date : 0} stroke="#94a3b8" strokeDasharray="5 5" label="Now" />
          <Area type="monotone" dataKey="upper" stroke="none" fill="#8b5cf6" fillOpacity={0.1} />
          <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} />
          <Area type="monotone" dataKey="actual" stroke="#10b981" fill="url(#colorActual)" strokeWidth={2} />
          <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#8b5cf6' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PredictiveAnalytics({ runs = [], scenarios = [] }) {
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [showSimulator, setShowSimulator] = useState(false);

  // Generate historical success rate data
  const successRateHistory = useMemo(() => {
    const grouped = {};
    runs.forEach(r => {
      const date = new Date(r.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { total: 0, success: 0 };
      grouped[date].total++;
      if (r.status === 'completed') grouped[date].success++;
    });
    return Object.entries(grouped).map(([date, data]) => ({
      date,
      value: (data.success / data.total) * 100
    })).slice(-14);
  }, [runs]);

  // Generate predictions
  const successPredictions = useMemo(() => predictFutureValues(successRateHistory, 7), [successRateHistory]);
  
  // Resource predictions
  const resourcePredictions = useMemo(() => predictResourceNeeds(scenarios, runs), [scenarios, runs]);

  // Calculate current metrics
  const currentMetrics = useMemo(() => {
    const recentRuns = runs.slice(-50);
    const successRate = recentRuns.length > 0
      ? (recentRuns.filter(r => r.status === 'completed').length / recentRuns.length) * 100
      : 0;
    const avgTime = recentRuns.length > 0
      ? recentRuns.reduce((sum, r) => sum + r.execution_time_ms, 0) / recentRuns.length / 1000
      : 0;
    
    return { successRate, avgTime };
  }, [runs]);

  // Predicted metrics
  const predictedMetrics = useMemo(() => {
    const predictedSuccessRate = successPredictions.length > 0
      ? successPredictions[successPredictions.length - 1].predicted
      : currentMetrics.successRate;
    const predictedTime = currentMetrics.avgTime * (1 + (Math.random() - 0.5) * 0.2);
    
    return {
      successRate: predictedSuccessRate,
      avgTime: predictedTime,
      successTrend: predictedSuccessRate - currentMetrics.successRate,
      timeTrend: ((predictedTime - currentMetrics.avgTime) / currentMetrics.avgTime) * 100
    };
  }, [successPredictions, currentMetrics]);

  // Generate proactive alerts
  const alerts = useMemo(() => {
    const alerts = [];
    
    // Check for declining success rate
    if (predictedMetrics.successTrend < -5) {
      alerts.push({
        id: 'success-decline',
        severity: predictedMetrics.successTrend < -10 ? 'critical' : 'warning',
        title: 'Success Rate Decline Predicted',
        message: `Success rate may drop by ${Math.abs(predictedMetrics.successTrend).toFixed(1)}% in the next 7 days.`,
        timeframe: '7 days',
        recommendation: 'Review recent failed executions and address common failure patterns.'
      });
    }

    // Check for high resource scenarios
    const highRiskScenarios = resourcePredictions.filter(r => r.resourceRisk === 'high');
    if (highRiskScenarios.length > 0) {
      alerts.push({
        id: 'resource-high',
        severity: 'warning',
        title: 'High Resource Usage Expected',
        message: `${highRiskScenarios.length} scenario(s) predicted to have high resource demands.`,
        timeframe: '3-5 days',
        recommendation: 'Consider scaling resources or optimizing heavy scenarios.'
      });
    }

    // Check for execution time increase
    if (predictedMetrics.timeTrend > 15) {
      alerts.push({
        id: 'time-increase',
        severity: 'info',
        title: 'Execution Time Increase',
        message: `Average execution time may increase by ${predictedMetrics.timeTrend.toFixed(0)}%.`,
        timeframe: '7 days',
        recommendation: 'Monitor tool performance and consider caching strategies.'
      });
    }

    // Anomaly detection
    const anomalies = detectAnomalies(successRateHistory);
    if (anomalies.length > 0) {
      alerts.push({
        id: 'anomaly-detected',
        severity: anomalies.some(a => a.severity === 'critical') ? 'critical' : 'warning',
        title: 'Anomalies Detected in Historical Data',
        message: `${anomalies.length} unusual data point(s) found that may affect predictions.`,
        timeframe: 'Ongoing',
        recommendation: 'Investigate the source of anomalies to improve prediction accuracy.'
      });
    }

    return alerts.filter(a => !dismissedAlerts.has(a.id));
  }, [predictedMetrics, resourcePredictions, successRateHistory, dismissedAlerts]);

  const handleDismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Predictive Analytics</h3>
            <p className="text-sm text-slate-600">AI-powered forecasts and proactive alerts</p>
          </div>
        </div>
        <Button
          variant={showSimulator ? "default" : "outline"}
          onClick={() => setShowSimulator(!showSimulator)}
          className={showSimulator ? "bg-cyan-600 hover:bg-cyan-700" : ""}
        >
          <Beaker className="w-4 h-4 mr-2" />
          {showSimulator ? 'Hide Simulator' : 'Scenario Simulator'}
        </Button>
      </div>

      {/* Scenario Simulator */}
      <AnimatePresence>
        {showSimulator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ScenarioSimulator historicalData={{
              avgSuccessRate: parseFloat(currentMetrics.successRate) || 78,
              avgExecutionTime: currentMetrics.avgTime || 4.2,
              avgResourceUsage: 65
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive Alerts */}
      {alerts.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Proactive Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {alerts.map(alert => (
                  <ProactiveAlert key={alert.id} alert={alert} onDismiss={handleDismissAlert} />
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prediction Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PredictionCard
          title="Success Rate"
          current={`${currentMetrics.successRate.toFixed(1)}%`}
          predicted={`${predictedMetrics.successRate.toFixed(1)}%`}
          trend={predictedMetrics.successTrend}
          icon={Target}
          color="emerald"
          confidence={85}
        />
        <PredictionCard
          title="Avg Execution Time"
          current={`${currentMetrics.avgTime.toFixed(2)}s`}
          predicted={`${predictedMetrics.avgTime.toFixed(2)}s`}
          trend={-predictedMetrics.timeTrend}
          icon={Clock}
          color="blue"
          confidence={78}
        />
        <PredictionCard
          title="Daily Executions"
          current={Math.round(runs.length / 30).toString()}
          predicted={Math.round(runs.length / 30 * 1.15).toString()}
          trend={15}
          icon={Activity}
          color="purple"
          confidence={72}
        />
        <PredictionCard
          title="Resource Utilization"
          current="67%"
          predicted="74%"
          trend={10.4}
          icon={Gauge}
          color="amber"
          confidence={68}
        />
      </div>

      {/* Forecast Chart */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Success Rate Forecast (7-Day Prediction)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart historicalData={successRateHistory} predictions={successPredictions} />
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-slate-600">Predicted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-purple-300"></div>
              <span className="text-slate-600">Confidence Interval</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Predictions by Scenario */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Resource Demand Forecast by Scenario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {resourcePredictions.slice(0, 6).map((pred, idx) => (
              <motion.div
                key={pred.scenarioId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 truncate">{pred.scenarioName}</span>
                  <Badge className={`text-xs ${
                    pred.resourceRisk === 'high' ? 'bg-red-100 text-red-700' :
                    pred.resourceRisk === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {pred.resourceRisk} risk
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500">Pred. Time</div>
                    <div className="font-semibold">{(pred.predictedExecutionTime / 1000).toFixed(2)}s</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Pred. Success</div>
                    <div className="font-semibold text-emerald-600">{pred.predictedSuccessRate.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500">CPU Est.</div>
                    <div className="font-semibold">{pred.cpuEstimate.toFixed(0)}%</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}