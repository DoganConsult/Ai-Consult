import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const base44 = createClientFromRequest(req);
    
    // Extract API key from header
    const apiKey = req.headers.get('X-API-Key');
    
    // Parse request body if present
    let body = null;
    if (req.method !== 'GET') {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    }

    // Route based on path
    const path = body?.path || url.pathname;
    const action = body?.action || req.method;
    
    // Verify API key for production use
    if (apiKey && apiKey !== Deno.env.get('API_KEY')) {
      return Response.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Entity CRUD operations
    if (body?.entity) {
      return await handleEntity(base44, body, action);
    }

    // Integration calls
    if (body?.integration) {
      return await handleIntegration(base44, body);
    }

    // API documentation
    if (path === '/api/docs' || !body) {
      return Response.json({
        version: '1.0',
        endpoints: {
          entity_operations: {
            list: { entity: 'EntityName', action: 'list', limit: 50, sort: '-created_date' },
            get: { entity: 'EntityName', action: 'get', id: 'record_id' },
            create: { entity: 'EntityName', action: 'create', data: {} },
            update: { entity: 'EntityName', action: 'update', id: 'record_id', data: {} },
            delete: { entity: 'EntityName', action: 'delete', id: 'record_id' },
            filter: { entity: 'EntityName', action: 'filter', query: {}, limit: 50 }
          },
          integrations: {
            invoke_llm: { integration: 'Core.InvokeLLM', params: { prompt: 'text' } },
            send_email: { integration: 'Core.SendEmail', params: { to: '', subject: '', body: '' } },
            upload_file: { integration: 'Core.UploadFile', params: { file: 'base64_or_url' } },
            generate_image: { integration: 'Core.GenerateImage', params: { prompt: 'text' } }
          },
          available_entities: [
            'Product', 'Inquiry', 'DemoRequest', 'Document', 'Training',
            'ApprovalRequest', 'ApprovalGate', 'WorkflowRule', 'Notification',
            'VisitorSession', 'AgentConfig', 'AgentRun', 'ProcessDefinition'
          ]
        },
        authentication: {
          header: 'X-API-Key',
          value: 'Your API key from environment variables'
        }
      });
    }

    return Response.json({ error: 'Invalid request. Send POST with entity or integration params, or GET /api/docs' }, { status: 400 });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEntity(base44, body, action) {
  const { entity, id, data, query, limit, sort } = body;

  try {
    switch (action.toUpperCase()) {
      case 'LIST':
        const listResult = await base44.asServiceRole.entities[entity].list(sort || '-created_date', limit || 50);
        return Response.json({ success: true, data: listResult });

      case 'GET':
        if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
        const sessions = await base44.asServiceRole.entities[entity].filter({ id });
        return Response.json({ success: true, data: sessions[0] || null });

      case 'CREATE':
      case 'POST':
        if (!data) return Response.json({ error: 'Data required' }, { status: 400 });
        const created = await base44.asServiceRole.entities[entity].create(data);
        return Response.json({ success: true, data: created });

      case 'UPDATE':
      case 'PUT':
      case 'PATCH':
        if (!id || !data) return Response.json({ error: 'ID and data required' }, { status: 400 });
        const updated = await base44.asServiceRole.entities[entity].update(id, data);
        return Response.json({ success: true, data: updated });

      case 'DELETE':
        if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
        await base44.asServiceRole.entities[entity].delete(id);
        return Response.json({ success: true, message: 'Deleted' });

      case 'FILTER':
        const filtered = await base44.asServiceRole.entities[entity].filter(query || {}, sort, limit);
        return Response.json({ success: true, data: filtered });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleIntegration(base44, body) {
  const { integration, params } = body;

  try {
    const [pkg, method] = integration.split('.');
    const result = await base44.asServiceRole.integrations[pkg][method](params);
    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}