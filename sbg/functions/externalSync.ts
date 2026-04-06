import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { source, target, mapping, syncType } = body;

    // Validate sync configuration
    if (!source || !target || !mapping) {
      return Response.json({ error: 'source, target, and mapping required' }, { status: 400 });
    }

    // Fetch source data
    let sourceData = [];
    if (source.type === 'entity') {
      sourceData = await base44.asServiceRole.entities[source.name].list('-created_date', 1000);
    } else if (source.type === 'external_api') {
      const response = await fetch(source.url, {
        headers: source.headers || {}
      });
      sourceData = await response.json();
      if (source.dataPath) {
        sourceData = sourceData[source.dataPath];
      }
    }

    // Transform data using mapping
    const transformedData = sourceData.map(item => {
      const transformed = {};
      for (const [targetField, sourceField] of Object.entries(mapping)) {
        if (typeof sourceField === 'string') {
          transformed[targetField] = item[sourceField];
        } else if (typeof sourceField === 'function') {
          transformed[targetField] = sourceField(item);
        }
      }
      return transformed;
    });

    // Sync to target
    const results = { created: 0, updated: 0, errors: [] };

    if (target.type === 'entity') {
      for (const data of transformedData) {
        try {
          if (syncType === 'upsert' && data.id) {
            // Try to update
            const existing = await base44.asServiceRole.entities[target.name].filter({ id: data.id });
            if (existing.length > 0) {
              await base44.asServiceRole.entities[target.name].update(data.id, data);
              results.updated++;
            } else {
              await base44.asServiceRole.entities[target.name].create(data);
              results.created++;
            }
          } else {
            // Create new
            await base44.asServiceRole.entities[target.name].create(data);
            results.created++;
          }
        } catch (error) {
          results.errors.push({ data, error: error.message });
        }
      }
    } else if (target.type === 'external_api') {
      for (const data of transformedData) {
        try {
          await fetch(target.url, {
            method: target.method || 'POST',
            headers: { 'Content-Type': 'application/json', ...(target.headers || {}) },
            body: JSON.stringify(data)
          });
          results.created++;
        } catch (error) {
          results.errors.push({ data, error: error.message });
        }
      }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});