import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Network, Plus, Play, Save, Trash2, GitBranch, Database, Zap, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NODE_TYPES = {
  trigger: { label: 'محفز', icon: Zap, color: 'bg-green-500' },
  condition: { label: 'شرط', icon: GitBranch, color: 'bg-yellow-500' },
  action: { label: 'إجراء', icon: Play, color: 'bg-blue-500' },
  entity: { label: 'كيان', icon: Database, color: 'bg-purple-500' },
  message: { label: 'رسالة', icon: MessageSquare, color: 'bg-pink-500' }
};

const ACTION_TEMPLATES = {
  create_entity: { label: 'إنشاء سجل', entity: true },
  update_entity: { label: 'تحديث سجل', entity: true },
  send_message: { label: 'إرسال رسالة', message: true },
  api_call: { label: 'استدعاء API', url: true },
  wait: { label: 'انتظار', duration: true }
};

export default function WorkflowDesigner({ workflow = { nodes: [], connections: [] }, onSave }) {
  const [nodes, setNodes] = useState(workflow.nodes || []);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isAddingNode, setIsAddingNode] = useState(false);

  const addNode = (type) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type,
      label: `${NODE_TYPES[type].label} ${nodes.length + 1}`,
      config: {},
      position: { x: 50, y: nodes.length * 120 + 50 }
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
    setIsAddingNode(false);
  };

  const updateNode = (id, updates) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setSelectedNode(null);
  };

  const saveWorkflow = () => {
    onSave({ nodes, connections: [] });
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Canvas */}
      <Card className="lg:col-span-2 p-6 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">مصمم المسار</h3>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddingNode(!isAddingNode)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              عقدة
            </Button>
            <Button onClick={saveWorkflow} size="sm">
              <Save className="w-4 h-4 mr-2" />
              حفظ
            </Button>
          </div>
        </div>

        {/* Add Node Menu */}
        <AnimatePresence>
          {isAddingNode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-lg p-4 mb-4 border border-slate-200 shadow-lg"
            >
              <p className="text-sm font-medium text-slate-700 mb-3">اختر نوع العقدة:</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(NODE_TYPES).map(([key, val]) => {
                  const Icon = val.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => addNode(key)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      <div className={`w-10 h-10 ${val.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{val.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workflow Canvas */}
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 min-h-[500px] p-4 relative overflow-auto">
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[480px] text-center">
              <Network className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500">ابدأ بإضافة عقدة لبناء المسار</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nodes.map((node, idx) => {
                const NodeIcon = NODE_TYPES[node.type].icon;
                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      selectedNode === node.id ? 'border-indigo-500 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedNode(node.id)}
                  >
                    {idx > 0 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <div className="w-0.5 h-6 bg-slate-300" />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${NODE_TYPES[node.type].color} rounded-lg flex items-center justify-center`}>
                          <NodeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{node.label}</p>
                          <Badge className="mt-1 text-xs">{NODE_TYPES[node.type].label}</Badge>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {node.config.description && (
                      <p className="text-sm text-slate-600 mt-2">{node.config.description}</p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Properties Panel */}
      <Card className="p-6 h-fit sticky top-6">
        <h3 className="font-bold text-slate-900 mb-4">خصائص العقدة</h3>
        
        {!selectedNodeData ? (
          <p className="text-slate-500 text-sm">اختر عقدة لتعديل خصائصها</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">التسمية</label>
              <Input
                value={selectedNodeData.label}
                onChange={(e) => updateNode(selectedNode, { label: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف</label>
              <Input
                value={selectedNodeData.config.description || ''}
                onChange={(e) => updateNode(selectedNode, {
                  config: { ...selectedNodeData.config, description: e.target.value }
                })}
                placeholder="وصف الإجراء..."
              />
            </div>

            {selectedNodeData.type === 'action' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">نوع الإجراء</label>
                <select
                  value={selectedNodeData.config.actionType || ''}
                  onChange={(e) => updateNode(selectedNode, {
                    config: { ...selectedNodeData.config, actionType: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">اختر...</option>
                  {Object.entries(ACTION_TEMPLATES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedNodeData.type === 'condition' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">التعبير</label>
                <Input
                  value={selectedNodeData.config.expression || ''}
                  onChange={(e) => updateNode(selectedNode, {
                    config: { ...selectedNodeData.config, expression: e.target.value }
                  })}
                  placeholder="مثال: lead_score > 50"
                />
              </div>
            )}

            {selectedNodeData.type === 'entity' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم الكيان</label>
                  <Input
                    value={selectedNodeData.config.entityName || ''}
                    onChange={(e) => updateNode(selectedNode, {
                      config: { ...selectedNodeData.config, entityName: e.target.value }
                    })}
                    placeholder="Product, User, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">العملية</label>
                  <select
                    value={selectedNodeData.config.operation || 'read'}
                    onChange={(e) => updateNode(selectedNode, {
                      config: { ...selectedNodeData.config, operation: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="read">قراءة</option>
                    <option value="create">إنشاء</option>
                    <option value="update">تحديث</option>
                    <option value="delete">حذف</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}