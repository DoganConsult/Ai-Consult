import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

export default function MultiStepExecutor({ workflow, onComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const executeStep = async (node) => {
    try {
      let result = { nodeId: node.id, status: 'success', data: null };

      switch (node.type) {
        case 'entity':
          result.data = await executeEntityAction(node);
          break;
        
        case 'message':
          result.data = await executeSendMessage(node);
          break;
        
        case 'action':
          result.data = await executeCustomAction(node);
          break;
        
        case 'condition':
          result.data = await evaluateCondition(node);
          break;
        
        default:
          result.data = { message: 'Node type not implemented' };
      }

      return result;
    } catch (err) {
      return {
        nodeId: node.id,
        status: 'error',
        error: err.message
      };
    }
  };

  const executeEntityAction = async (node) => {
    const { entityName, operation, data } = node.config;
    
    switch (operation) {
      case 'read':
        return await base44.entities[entityName].list();
      case 'create':
        return await base44.entities[entityName].create(data || {});
      case 'update':
        return await base44.entities[entityName].update(data.id, data);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  };

  const executeSendMessage = async (node) => {
    const { message, userEmail } = node.config;
    
    if (userEmail) {
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: 'رسالة من الوكيل الذكي',
        body: message
      });
    }
    
    return { sent: true, message };
  };

  const executeCustomAction = async (node) => {
    const { actionType, params } = node.config;
    
    // Simulate custom action
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { action: actionType, completed: true, params };
  };

  const evaluateCondition = async (node) => {
    const { expression } = node.config;
    // Simple expression evaluation (in production, use a proper parser)
    return { expression, result: true };
  };

  const runWorkflow = async () => {
    setIsRunning(true);
    setError(null);
    setResults([]);
    
    const nodes = workflow.nodes || [];
    
    for (let i = 0; i < nodes.length; i++) {
      setCurrentStep(i);
      
      const result = await executeStep(nodes[i]);
      setResults(prev => [...prev, result]);
      
      if (result.status === 'error') {
        setError(result.error);
        setIsRunning(false);
        return;
      }
      
      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
    setCurrentStep(nodes.length);
    onComplete?.(results);
  };

  const nodes = workflow.nodes || [];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">تشغيل المسار</h3>
        <Button
          onClick={runWorkflow}
          disabled={isRunning || nodes.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              جاري التنفيذ...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              تشغيل
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <p className="font-medium">خطأ في التنفيذ</p>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {nodes.map((node, idx) => {
          const result = results.find(r => r.nodeId === node.id);
          const isActive = currentStep === idx && isRunning;
          const isDone = result?.status === 'success';
          const isFailed = result?.status === 'error';

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-lg p-4 border-2 transition-all ${
                isActive ? 'border-blue-500 bg-blue-50' :
                isDone ? 'border-green-500 bg-green-50' :
                isFailed ? 'border-red-500 bg-red-50' :
                'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-500' :
                    isDone ? 'bg-green-500' :
                    isFailed ? 'bg-red-500' :
                    'bg-slate-300'
                  }`}>
                    {isActive ? <Loader2 className="w-4 h-4 text-white animate-spin" /> :
                     isDone ? <CheckCircle2 className="w-4 h-4 text-white" /> :
                     isFailed ? <XCircle className="w-4 h-4 text-white" /> :
                     <Clock className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{node.label}</p>
                    <Badge className="mt-1 text-xs">{node.type}</Badge>
                  </div>
                </div>
                
                {result && (
                  <Badge className={
                    result.status === 'success' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {result.status === 'success' ? 'نجح' : 'فشل'}
                  </Badge>
                )}
              </div>

              {result?.data && (
                <div className="mt-3 bg-white/50 rounded p-2">
                  <p className="text-xs text-slate-600">
                    {JSON.stringify(result.data, null, 2).substring(0, 100)}...
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {nodes.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          لا توجد خطوات في المسار
        </div>
      )}
    </Card>
  );
}