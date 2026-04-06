import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PublicHeader from '@/components/shared/PublicHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Copy, RefreshCw, Trash2, Plus, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function APISettings() {
  const [showKey, setShowKey] = useState({});
  const [newKeyName, setNewKeyName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api_keys'],
    queryFn: async () => {
      const keys = localStorage.getItem('sbg_api_keys');
      return keys ? JSON.parse(keys) : [];
    }
  });

  const generateKey = () => {
    return 'sbg_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const createKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: generateKey(),
      created: new Date().toISOString(),
      last_used: null
    };

    const updated = [...apiKeys, newKey];
    localStorage.setItem('sbg_api_keys', JSON.stringify(updated));
    queryClient.invalidateQueries(['api_keys']);
    setNewKeyName('');
    toast.success('API key created');
  };

  const deleteKey = (id) => {
    const updated = apiKeys.filter(k => k.id !== id);
    localStorage.setItem('sbg_api_keys', JSON.stringify(updated));
    queryClient.invalidateQueries(['api_keys']);
    toast.success('API key deleted');
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied');
  };

  const testAPI = async () => {
    try {
      const response = await base44.functions.invoke('api', {});
      toast.success('API is working');
    } catch (error) {
      toast.error('API test failed: ' + error.message);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <PublicHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-slate-600">Only administrators can access API settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">API Settings</h1>
          <p className="text-slate-600">Manage API keys and webhooks for external integrations</p>
        </div>

        {/* API Keys */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>API Keys</span>
              <Button onClick={testAPI} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Test API
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create New Key */}
            <div className="flex gap-2">
              <Input
                placeholder="Key name (e.g., Production API)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={createKey} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Key
              </Button>
            </div>

            {/* Keys List */}
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No API keys created yet
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div key={key.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-slate-900">{key.name}</div>
                        <div className="text-xs text-slate-500">
                          Created: {new Date(key.created).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })}
                        >
                          {showKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => copyKey(key.key)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this API key?')) deleteKey(key.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <code className="text-xs bg-white px-3 py-2 rounded border border-slate-200 block font-mono">
                      {showKey[key.id] ? key.key : '••••••••••••••••••••••••••••••••'}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/webhook"
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    localStorage.setItem('sbg_webhook_url', webhookUrl);
                    toast.success('Webhook URL saved');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                This URL will receive webhook events from the platform
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Webhook Secret
              </label>
              <div className="flex gap-2">
                <Input
                  type={showKey['webhook'] ? 'text' : 'password'}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Enter a secure secret"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowKey({ ...showKey, webhook: !showKey['webhook'] })}
                >
                  {showKey['webhook'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={() => {
                    localStorage.setItem('sbg_webhook_secret', webhookSecret);
                    toast.success('Webhook secret saved');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Used to verify webhook signatures (SHA-256 hash)
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Webhook Events</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  inquiry_created - New inquiry submitted
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  demo_requested - Demo request received
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  approval_needed - Approval request pending
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  document_updated - Document status changed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}