import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Download, Settings,
  BarChart3, Users, DollarSign,
  FileJson, FileSpreadsheet, Printer, Mail, Eye, Loader2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const REPORT_TEMPLATES = [
  {
    id: 'executive',
    name: 'Executive Summary',
    description: 'High-level KPIs and trends for leadership',
    icon: BarChart3,
    metrics: ['totalExecutions', 'successRate', 'costSavings', 'efficiency'],
    sections: ['kpis', 'trends', 'recommendations']
  },
  {
    id: 'technical',
    name: 'Technical Performance',
    description: 'Detailed technical metrics and system health',
    icon: Settings,
    metrics: ['avgTime', 'errorRate', 'uptime', 'throughput'],
    sections: ['performance', 'anomalies', 'bottlenecks']
  },
  {
    id: 'agent',
    name: 'Agent Analysis',
    description: 'Per-agent breakdown and comparison',
    icon: Users,
    metrics: ['agentExecutions', 'agentSuccess', 'agentEfficiency'],
    sections: ['agentComparison', 'agentTrends', 'agentRecommendations']
  },
  {
    id: 'financial',
    name: 'Financial Impact',
    description: 'Cost savings and ROI analysis',
    icon: DollarSign,
    metrics: ['costSavings', 'roi', 'timesSaved', 'resourceUtilization'],
    sections: ['savings', 'projections', 'optimization']
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Build your own report with selected metrics',
    icon: FileText,
    metrics: [],
    sections: []
  }
];

const AVAILABLE_METRICS = [
  { id: 'totalExecutions', label: 'Total Executions', category: 'Activity' },
  { id: 'successRate', label: 'Success Rate', category: 'Performance' },
  { id: 'avgTime', label: 'Average Execution Time', category: 'Performance' },
  { id: 'efficiency', label: 'System Efficiency', category: 'Performance' },
  { id: 'costSavings', label: 'Cost Savings', category: 'Financial' },
  { id: 'errorRate', label: 'Error Rate', category: 'Health' },
  { id: 'uptime', label: 'System Uptime', category: 'Health' },
  { id: 'agentComparison', label: 'Agent Comparison', category: 'Agents' },
  { id: 'bottlenecks', label: 'Bottleneck Analysis', category: 'Health' },
  { id: 'trends', label: 'Trend Analysis', category: 'Analytics' },
  { id: 'forecasts', label: 'Forecasts', category: 'Analytics' },
  { id: 'anomalies', label: 'Anomaly Detection', category: 'Health' }
];

function ReportPreview({ config, dailyData, agentPerformance }) {
  const summaryData = useMemo(() => {
    const totalExecutions = dailyData.reduce((sum, d) => sum + d.executions, 0);
    const avgSuccessRate = dailyData.reduce((sum, d) => sum + d.successRate, 0) / dailyData.length;
    const avgTime = dailyData.reduce((sum, d) => sum + d.avgTime, 0) / dailyData.length;
    const totalSavings = dailyData.reduce((sum, d) => sum + d.costSavings, 0);
    
    return { totalExecutions, avgSuccessRate, avgTime, totalSavings };
  }, [dailyData]);

  const agentDistribution = agentPerformance.map(a => ({
    name: a.name.replace(' Agent', ''),
    value: a.executions
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
      {/* Report Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900">{config.title || 'System Analytics Report'}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
          <span>Period: {config.dateRange}</span>
          <span>Generated: {new Date().toLocaleDateString()}</span>
        </div>
        {config.description && (
          <p className="mt-2 text-sm text-slate-600">{config.description}</p>
        )}
      </div>

      {/* KPIs Section */}
      {config.selectedMetrics.includes('totalExecutions') && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Key Performance Indicators</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{summaryData.totalExecutions.toLocaleString()}</div>
              <div className="text-xs text-blue-600">Total Executions</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-700">{summaryData.avgSuccessRate.toFixed(1)}%</div>
              <div className="text-xs text-emerald-600">Success Rate</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{summaryData.avgTime.toFixed(2)}s</div>
              <div className="text-xs text-amber-600">Avg Time</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{(summaryData.totalSavings / 1000).toFixed(0)}K</div>
              <div className="text-xs text-purple-600">Cost Savings (SAR)</div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {config.selectedMetrics.includes('trends') && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Performance Trends</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} name="Success %" />
                <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={2} name="Efficiency %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Agent Comparison */}
      {config.selectedMetrics.includes('agentComparison') && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Agent Performance</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {agentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {agentPerformance.slice(0, 4).map((agent, idx) => (
                <div key={agent.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    <span className="text-sm text-slate-700">{agent.name.replace(' Agent', '')}</span>
                  </div>
                  <span className="text-sm font-medium">{agent.successRate.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Executions Chart */}
      {config.selectedMetrics.includes('totalExecutions') && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Daily Executions</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="executions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricSelector({ selectedMetrics, onToggle }) {
  const groupedMetrics = AVAILABLE_METRICS.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedMetrics).map(([category, metrics]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">{category}</h4>
          <div className="space-y-2">
            {metrics.map(metric => (
              <label key={metric.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Checkbox
                  checked={selectedMetrics.includes(metric.id)}
                  onCheckedChange={() => onToggle(metric.id)}
                />
                <span className="text-sm text-slate-700">{metric.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportGeneratorPanel({ dailyData, agentPerformance }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    title: '',
    description: '',
    dateRange: 'Last 30 days',
    selectedMetrics: [],
    format: 'pdf'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setReportConfig(prev => ({
      ...prev,
      title: template.name,
      selectedMetrics: template.metrics.length > 0 ? template.metrics : prev.selectedMetrics
    }));
  };

  const toggleMetric = (metricId) => {
    setReportConfig(prev => ({
      ...prev,
      selectedMetrics: prev.selectedMetrics.includes(metricId)
        ? prev.selectedMetrics.filter(m => m !== metricId)
        : [...prev.selectedMetrics, metricId]
    }));
  };

  const handleGenerate = async (action) => {
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (action === 'download') {
      // Create a simple text report for download
      const reportContent = generateReportContent();
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportConfig.title || 'report'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    setIsGenerating(false);
  };

  const generateReportContent = () => {
    const totalExecutions = dailyData.reduce((sum, d) => sum + d.executions, 0);
    const avgSuccessRate = dailyData.reduce((sum, d) => sum + d.successRate, 0) / dailyData.length;
    const avgTime = dailyData.reduce((sum, d) => sum + d.avgTime, 0) / dailyData.length;
    const totalSavings = dailyData.reduce((sum, d) => sum + d.costSavings, 0);

    return `
${reportConfig.title || 'System Analytics Report'}
${'='.repeat(50)}

Report Period: ${reportConfig.dateRange}
Generated: ${new Date().toLocaleString()}

${reportConfig.description ? `Description: ${reportConfig.description}\n` : ''}

KEY PERFORMANCE INDICATORS
--------------------------
Total Executions: ${totalExecutions.toLocaleString()}
Average Success Rate: ${avgSuccessRate.toFixed(1)}%
Average Execution Time: ${avgTime.toFixed(2)}s
Total Cost Savings: ${(totalSavings / 1000).toFixed(0)}K SAR

AGENT PERFORMANCE
-----------------
${agentPerformance.map(a => `${a.name}: ${a.successRate.toFixed(1)}% success, ${a.executions} executions`).join('\n')}

---
Report generated by SBG System Analytics
    `.trim();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="customize">Customize</TabsTrigger>
          <TabsTrigger value="preview">Preview & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TEMPLATES.map(template => {
              const Icon = template.icon;
              const isSelected = selectedTemplate?.id === template.id;
              
              return (
                <motion.button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{template.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                  {isSelected && (
                    <Badge className="mt-3 bg-emerald-100 text-emerald-700">Selected</Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="customize" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Report Settings */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Report Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Report Title</label>
                  <Input
                    value={reportConfig.title}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Monthly Performance Report"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Description (Optional)</label>
                  <Textarea
                    value={reportConfig.description}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a brief description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Date Range</label>
                  <Select 
                    value={reportConfig.dateRange} 
                    onValueChange={(value) => setReportConfig(prev => ({ ...prev, dateRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                      <SelectItem value="Last 30 days">Last 30 days</SelectItem>
                      <SelectItem value="Last 90 days">Last 90 days</SelectItem>
                      <SelectItem value="Year to date">Year to date</SelectItem>
                      <SelectItem value="Custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Export Format</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'pdf', icon: FileText, label: 'PDF' },
                      { id: 'excel', icon: FileSpreadsheet, label: 'Excel' },
                      { id: 'json', icon: FileJson, label: 'JSON' }
                    ].map(format => (
                      <button
                        key={format.id}
                        onClick={() => setReportConfig(prev => ({ ...prev, format: format.id }))}
                        className={`flex-1 p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                          reportConfig.format === format.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <format.icon className={`w-5 h-5 ${reportConfig.format === format.id ? 'text-emerald-600' : 'text-slate-500'}`} />
                        <span className="text-xs font-medium">{format.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metric Selection */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  Select Metrics
                  <Badge variant="outline">{reportConfig.selectedMetrics.length} selected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <MetricSelector 
                    selectedMetrics={reportConfig.selectedMetrics} 
                    onToggle={toggleMetric} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button 
                  onClick={() => handleGenerate('download')}
                  disabled={isGenerating || reportConfig.selectedMetrics.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? 'Generating...' : 'Download Report'}
                </Button>
              </div>
            </div>

            {/* Preview */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ReportPreview 
                  config={reportConfig} 
                  dailyData={dailyData} 
                  agentPerformance={agentPerformance} 
                />
              </motion.div>
            )}

            {!showPreview && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Click "Show Preview" to see your report</p>
                <p className="text-sm mt-1">Select metrics and customize settings first</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}