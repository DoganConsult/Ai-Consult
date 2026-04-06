import React, { useState, useEffect } from 'react';
import { Code, Copy, Key, Database, Webhook, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PublicHeader from '@/components/shared/PublicHeader';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function APIDocumentation() {
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const apiUrl = window.location.origin.replace('app.', '').replace(':3000', ':8000') + '/api';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const testAPI = async () => {
    setTesting(true);
    try {
      const response = await base44.functions.invoke('api', {
        entity: 'Product',
        action: 'list',
        limit: 5
      });
      setTestResult(response.data);
      toast.success('API test successful');
    } catch (error) {
      toast.error('API test failed: ' + error.message);
      setTestResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const examples = [
    {
      title: 'List Products',
      code: `fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    entity: 'Product',
    action: 'list',
    limit: 50,
    sort: '-created_date'
  })
})`,
    },
    {
      title: 'Create Inquiry',
      code: `fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    entity: 'Inquiry',
    action: 'create',
    data: {
      contact_name: 'John Doe',
      contact_email: 'john@example.com',
      company: 'ACME Corp',
      products: ['prod_123'],
      message: 'Interested in your products'
    }
  })
})`,
    },
    {
      title: 'Filter Documents',
      code: `fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    entity: 'Document',
    action: 'filter',
    query: { category: 'policy', status: 'approved' },
    limit: 20
  })
})`,
    },
    {
      title: 'Invoke LLM',
      code: `fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    integration: 'Core.InvokeLLM',
    params: {
      prompt: 'Analyze this business proposal...',
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommendations: { type: 'array' }
        }
      }
    }
  })
})`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">API Documentation</h1>
          <p className="text-lg text-slate-600">
            Complete REST API access to SBG platform - entities, integrations, and webhooks
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  API Endpoint
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm">
                    {apiUrl}
                  </code>
                  <Button onClick={() => copyToClipboard(apiUrl)} size="sm" variant="outline">
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Test API Connection
                </label>
                <Button onClick={testAPI} disabled={testing} className="bg-emerald-600 hover:bg-emerald-700">
                  <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
                  Test API
                </Button>
                {testResult && (
                  <pre className="mt-3 p-4 bg-white rounded-lg border border-slate-200 text-xs overflow-auto max-h-40">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="entities" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="entities">
              <Database className="w-4 h-4 mr-2" />
              Entities
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Code className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="w-4 h-4 mr-2" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="examples">
              <ExternalLink className="w-4 h-4 mr-2" />
              Examples
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities">
            <Card>
              <CardHeader>
                <CardTitle>Entity CRUD Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Available Entities</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Product', 'Inquiry', 'DemoRequest', 'Document', 'Training', 'ApprovalRequest', 'ApprovalGate', 'WorkflowRule', 'Notification', 'VisitorSession', 'AgentConfig', 'ProcessDefinition'].map(entity => (
                      <Badge key={entity} variant="outline">{entity}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { method: 'LIST', desc: 'Get all records', params: '{ entity, action: "list", limit, sort }' },
                    { method: 'GET', desc: 'Get single record', params: '{ entity, action: "get", id }' },
                    { method: 'CREATE', desc: 'Create new record', params: '{ entity, action: "create", data: {...} }' },
                    { method: 'UPDATE', desc: 'Update record', params: '{ entity, action: "update", id, data: {...} }' },
                    { method: 'DELETE', desc: 'Delete record', params: '{ entity, action: "delete", id }' },
                    { method: 'FILTER', desc: 'Filter records', params: '{ entity, action: "filter", query: {...}, limit }' },
                  ].map(op => (
                    <div key={op.method} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-blue-600">{op.method}</Badge>
                        <span className="text-sm text-slate-700">{op.desc}</span>
                      </div>
                      <code className="text-xs text-slate-600">{op.params}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integration Calls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Core.InvokeLLM', desc: 'Call AI model with prompt' },
                  { name: 'Core.SendEmail', desc: 'Send email notification' },
                  { name: 'Core.UploadFile', desc: 'Upload file to storage' },
                  { name: 'Core.GenerateImage', desc: 'Generate AI image' },
                ].map(int => (
                  <div key={int.name} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-semibold text-slate-900 mb-1">{int.name}</div>
                    <p className="text-sm text-slate-600">{int.desc}</p>
                    <code className="text-xs text-slate-500 mt-2 block">
                      {`{ integration: "${int.name}", params: {...} }`}
                    </code>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-medium text-amber-900 mb-2">Webhook Endpoint</div>
                  <code className="text-sm text-amber-800">
                    {apiUrl.replace('/api', '/webhookReceiver')}
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Supported Events</h3>
                  <div className="space-y-2">
                    {['inquiry_created', 'demo_requested', 'approval_needed', 'document_updated', 'training_enrolled'].map(event => (
                      <div key={event} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <Badge variant="outline" className="mr-2">{event}</Badge>
                        <span className="text-sm text-slate-600">
                          Triggered when {event.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-900 mb-2">Signature Verification</div>
                  <p className="text-sm text-blue-800 mb-2">
                    Set WEBHOOK_SECRET environment variable for signature verification
                  </p>
                  <code className="text-xs text-blue-700 block">
                    Header: X-Webhook-Signature (SHA-256 hash)
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples">
            <div className="grid gap-6">
              {examples.map((example, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {example.title}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(example.code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-auto">
                      {example.code}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}