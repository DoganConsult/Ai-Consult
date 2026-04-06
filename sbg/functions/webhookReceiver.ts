import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Verify webhook signature if provided
    const signature = req.headers.get('X-Webhook-Signature');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    
    if (webhookSecret && signature) {
      // Basic signature verification
      const expectedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(body) + webhookSecret)
      );
      const hexSignature = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== hexSignature) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Process webhook based on type
    const { type, data, entity, action } = body;

    if (entity && action && data) {
      // Generic entity webhook handler
      switch (action) {
        case 'create':
          await base44.asServiceRole.entities[entity].create(data);
          break;
        case 'update':
          await base44.asServiceRole.entities[entity].update(data.id, data);
          break;
        case 'delete':
          await base44.asServiceRole.entities[entity].delete(data.id);
          break;
      }
      
      return Response.json({ success: true, message: 'Webhook processed' });
    }

    // Custom webhook handlers by type
    switch (type) {
      case 'inquiry_created':
        // Send notification
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'sales@saudibusinessgate.com',
          subject: 'New Inquiry Received',
          body: `New inquiry from ${data.contact_name} (${data.contact_email})`
        });
        break;

      case 'demo_requested':
        // Create CRM opportunity
        await base44.asServiceRole.entities.DemoRequest.update(data.id, {
          status: 'contacted'
        });
        break;

      case 'approval_needed':
        // Send notification to approvers
        const gate = await base44.asServiceRole.entities.ApprovalGate.filter({ id: data.gate_id });
        if (gate[0]) {
          for (const approver of gate[0].approvers) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: approver,
              title: 'New Approval Request',
              message: data.title,
              type: 'pending_approval',
              reference_type: 'approval_request',
              reference_id: data.id
            });
          }
        }
        break;

      default:
        console.log('Unknown webhook type:', type);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});