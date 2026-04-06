import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, AlertCircle, CheckCircle, Bell, BellRing, Eye,
  Activity, TrendingDown, TrendingUp,
  Volume2, Settings, X
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

// Statistical functions
const calculateMean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const calculateStdDev = (arr, mean) => Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length);

// Z-score based anomaly detection
const detectAnomalies = (data, key, threshold = 2) => {
  const values = data.map(d => d[key]);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  
  return data.map((d, i) => {
    const zScore = stdDev === 0 ? 0 : (d[key] - mean) / stdDev;
    const isAnomaly = Math.abs(zScore) > threshold;
    return {
      ...d,
      index: i,
      zScore,
      isAnomaly,
      severity: Math.abs(zScore) > 3 ? 'critical' : Math.abs(zScore) > threshold ? 'warning' : 'normal',
      deviation: ((d[key] - mean) / mean * 100).toFixed(1)
    };
  });
};

// Moving average for trend detection
const calculateMovingAverage = (data, key, window = 5) => {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((sum, x) => sum + x[key], 0) / slice.length;
    return { ...d, movingAvg: avg };
  });
};

// Pattern detection (sudden spikes/drops)
const detectPatterns = (data, key) => {
  const patterns = [];
  for (let i = 1; i < data.length; i++) {
    const change = ((data[i][key] - data[i-1][key]) / data[i-1][key]) * 100;
    if (Math.abs(change) > 20) {
      patterns.push({
        index: i,
        date: data[i].date,
        type: change > 0 ? 'spike' : 'drop',
        change: change.toFixed(1),
        value: data[i][key]
      });
    }
  }
  return patterns;
};

function AnomalyAlert({ anomaly, onDismiss, onAcknowledge }) {
  const severityStyles = {
    critical: { bg: 'bg-red-50 border-red-300', text: 'text-red-800', icon: AlertCircle, badge: 'bg-red-100 text-red-700' },
    warning: { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-800', icon: AlertTriangle, badge: 'bg-amber-100 text-amber-700' }
  };

  const style = severityStyles[anomaly.severity] || severityStyles.warning;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      className={`rounded-xl border-2 ${style.bg} p-4 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${anomaly.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${anomaly.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-semibold ${style.text}`}>{anomaly.title}</h4>
            <Badge className={style.badge}>{anomaly.severity}</Badge>
          </div>
          <p className="text-sm text-slate-600">{anomaly.message}</p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => onAcknowledge(anomaly.id)}>
              <Eye className="w-3 h-3 mr-1" /> Acknowledge
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(anomaly.id)}>
              <X className="w-3 h-3 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
        <span className="text-xs text-slate-500">{anomaly.timestamp}</span>
      </div>
    </motion.div>
  );
}

function RealTimeMonitor({ data, metric, label, threshold }) {
  const latestValue = data[data.length - 1]?.[metric] || 0;
  const anomalyData = detectAnomalies(data, metric, threshold);
  const hasAnomaly = anomalyData[anomalyData.length - 1]?.isAnomaly;
  const mean = calculateMean(data.map(d => d[metric]));
  const stdDev = calculateStdDev(data.map(d => d[metric]), mean);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${hasAnomaly ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <Badge className={hasAnomaly ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
          {hasAnomaly ? 'Anomaly Detected' : 'Normal'}
        </Badge>
      </div>
      
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={anomalyData.slice(-20)}>
            <ReferenceArea y1={mean - threshold * stdDev} y2={mean + threshold * stdDev} fill="#10b981" fillOpacity={0.1} />
            <ReferenceLine y={mean} stroke="#64748b" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey={metric} 
              stroke={hasAnomaly ? '#ef4444' : '#10b981'} 
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isAnomaly) {
                  return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                }
                return null;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>Mean: {mean.toFixed(2)}</span>
        <span>Current: {latestValue.toFixed(2)}</span>
        <span>σ: {stdDev.toFixed(2)}</span>
      </div>
    </div>
  );
}

function AnomalyScatterPlot({ data }) {
  const enrichedData = useMemo(() => {
    const successAnomalies = detectAnomalies(data, 'successRate', 2);
    const timeAnomalies = detectAnomalies(data, 'avgTime', 2);
    
    return data.map((d, i) => ({
      ...d,
      successAnomaly: successAnomalies[i].isAnomaly,
      timeAnomaly: timeAnomalies[i].isAnomaly,
      isAnomaly: successAnomalies[i].isAnomaly || timeAnomalies[i].isAnomaly,
      severity: successAnomalies[i].severity === 'critical' || timeAnomalies[i].severity === 'critical' ? 'critical' : 
                successAnomalies[i].isAnomaly || timeAnomalies[i].isAnomaly ? 'warning' : 'normal'
    }));
  }, [data]);

  const normalData = enrichedData.filter(d => !d.isAnomaly);
  const anomalyData = enrichedData.filter(d => d.isAnomaly);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Anomaly Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="successRate" name="Success Rate" unit="%" tick={{ fontSize: 10 }} />
              <YAxis type="number" dataKey="avgTime" name="Avg Time" unit="s" tick={{ fontSize: 10 }} />
              <ZAxis type="number" dataKey="executions" range={[50, 400]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                formatter={(value) => [typeof value === 'number' ? value.toFixed(2) : value]}
              />
              <Scatter name="Normal" data={normalData} fill="#10b981" fillOpacity={0.6} />
              <Scatter name="Anomaly" data={anomalyData} fill="#ef4444" fillOpacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Normal ({normalData.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600">Anomalies ({anomalyData.length})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertSettings({ settings, onUpdate }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          Alert Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-700">Enable Alerts</span>
          </div>
          <Switch 
            checked={settings.enabled} 
            onCheckedChange={(checked) => onUpdate({ ...settings, enabled: checked })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-700">Sound Alerts</span>
          </div>
          <Switch 
            checked={settings.sound} 
            onCheckedChange={(checked) => onUpdate({ ...settings, sound: checked })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Sensitivity (Z-Score Threshold)</span>
            <span className="text-sm font-medium text-slate-900">{settings.threshold.toFixed(1)}</span>
          </div>
          <Slider
            value={[settings.threshold]}
            onValueChange={([value]) => onUpdate({ ...settings, threshold: value })}
            min={1}
            max={4}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>More Sensitive</span>
            <span>Less Sensitive</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">Alert Types:</div>
          <div className="grid grid-cols-2 gap-2">
            {['Success Rate', 'Execution Time', 'Efficiency', 'Error Rate'].map((type) => (
              <label key={type} className="flex items-center gap-2 text-xs">
                <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                <span className="text-slate-600">{type}</span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnomalyDetectionPanel({ dailyData, agentPerformance }) {
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    sound: false,
    threshold: 2
  });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState(new Set());

  // Detect anomalies across all metrics
  const anomalies = useMemo(() => {
    const results = {
      successRate: detectAnomalies(dailyData, 'successRate', alertSettings.threshold),
      avgTime: detectAnomalies(dailyData, 'avgTime', alertSettings.threshold),
      efficiency: detectAnomalies(dailyData, 'efficiency', alertSettings.threshold)
    };

    // Generate alerts for recent anomalies
    const alerts = [];
    Object.entries(results).forEach(([metric, data]) => {
      const recentAnomalies = data.slice(-5).filter(d => d.isAnomaly);
      recentAnomalies.forEach((anomaly, idx) => {
        const metricLabels = {
          successRate: 'Success Rate',
          avgTime: 'Execution Time',
          efficiency: 'Efficiency'
        };
        alerts.push({
          id: `${metric}-${anomaly.index}-${idx}`,
          metric,
          title: `${metricLabels[metric]} Anomaly`,
          message: `${metricLabels[metric]} deviated by ${anomaly.deviation}% from the mean on ${anomaly.date}.`,
          severity: anomaly.severity,
          timestamp: anomaly.date,
          value: dailyData[anomaly.index][metric]
        });
      });
    });

    return { results, alerts };
  }, [dailyData, alertSettings.threshold]);

  // Update active alerts when anomalies change
  useEffect(() => {
    if (alertSettings.enabled) {
      const newAlerts = anomalies.alerts.filter(
        a => !acknowledgedAlerts.has(a.id)
      );
      setActiveAlerts(newAlerts.slice(-5));
    } else {
      setActiveAlerts([]);
    }
  }, [anomalies.alerts, alertSettings.enabled, acknowledgedAlerts]);

  const handleDismiss = (id) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleAcknowledge = (id) => {
    setAcknowledgedAlerts(prev => new Set([...prev, id]));
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  // System health score
  const healthScore = useMemo(() => {
    const totalAnomalies = Object.values(anomalies.results).reduce(
      (sum, data) => sum + data.filter(d => d.isAnomaly).length, 0
    );
    const totalPoints = dailyData.length * 3;
    return Math.max(0, 100 - (totalAnomalies / totalPoints * 100)).toFixed(0);
  }, [anomalies.results, dailyData.length]);

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <AnimatePresence>
        {activeAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <BellRing className="w-4 h-4 text-amber-500 animate-pulse" />
              Active Alerts ({activeAlerts.length})
            </div>
            {activeAlerts.map(alert => (
              <AnomalyAlert
                key={alert.id}
                anomaly={alert}
                onDismiss={handleDismiss}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Health & Real-time Monitors */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* Health Score */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                  <motion.circle
                    cx="64" cy="64" r="56"
                    stroke={healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 352' }}
                    animate={{ strokeDasharray: `${(healthScore / 100) * 352} 352` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900">{healthScore}</span>
                  <span className="text-xs text-slate-500">Health Score</span>
                </div>
              </div>
              <Badge className={`${healthScore >= 80 ? 'bg-emerald-100 text-emerald-700' : healthScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Degraded' : 'Critical'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Monitors */}
        <RealTimeMonitor 
          data={dailyData} 
          metric="successRate" 
          label="Success Rate" 
          threshold={alertSettings.threshold}
        />
        <RealTimeMonitor 
          data={dailyData} 
          metric="avgTime" 
          label="Avg Time" 
          threshold={alertSettings.threshold}
        />
        <RealTimeMonitor 
          data={dailyData} 
          metric="efficiency" 
          label="Efficiency" 
          threshold={alertSettings.threshold}
        />
      </div>

      {/* Anomaly Visualization & Settings */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnomalyScatterPlot data={dailyData} />
        </div>
        <AlertSettings settings={alertSettings} onUpdate={setAlertSettings} />
      </div>

      {/* Pattern Detection Summary */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Pattern Detection Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {['successRate', 'avgTime', 'efficiency'].map(metric => {
              const patterns = detectPatterns(dailyData, metric);
              const metricLabels = { successRate: 'Success Rate', avgTime: 'Execution Time', efficiency: 'Efficiency' };
              
              return (
                <div key={metric} className="p-4 bg-slate-50 rounded-xl">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">{metricLabels[metric]}</h4>
                  {patterns.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      No significant patterns
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patterns.slice(-3).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{p.date}</span>
                          <Badge className={p.type === 'spike' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {p.type === 'spike' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            {p.change}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}