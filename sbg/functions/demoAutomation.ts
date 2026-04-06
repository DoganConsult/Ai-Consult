import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const ERPNEXT_URL = Deno.env.get('ERPNEXT_URL');
const ERPNEXT_API_KEY = Deno.env.get('ERPNEXT_API_KEY');
const ERPNEXT_API_SECRET = Deno.env.get('ERPNEXT_API_SECRET');

// AI Agent Helper - Get intelligent insights
async function getAgentInsights(base44, demoData) {
  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this demo request and provide strategic insights:

Customer: ${demoData.company} (${demoData.company_size})
Product: ${demoData.product_name}
Focus Areas: ${demoData.demo_focus?.join(', ')}
Message: ${demoData.message}

Provide JSON with:
1. lead_score (1-10)
2. demo_approach (string)
3. upsell_opportunities (array)
4. risk_factors (array)
5. follow_up_strategy (string)`,
      response_json_schema: {
        type: 'object',
        properties: {
          lead_score: { type: 'number' },
          demo_approach: { type: 'string' },
          upsell_opportunities: { type: 'array', items: { type: 'string' } },
          risk_factors: { type: 'array', items: { type: 'string' } },
          follow_up_strategy: { type: 'string' }
        }
      }
    });
    return response;
  } catch (error) {
    console.error('AI insights error:', error);
    return null;
  }
}

// Helper to call ERPNext API
async function erpCall(endpoint, method = 'GET', data = null) {
  const headers = {
    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers,
    ...(data && { body: JSON.stringify(data) })
  };

  const response = await fetch(`${ERPNEXT_URL}${endpoint}`, options);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ERPNext API error: ${error}`);
  }
  return response.json();
}

// Create or get customer in ERPNext
async function ensureCustomer(company, email, contactName) {
  try {
    // Try to get existing customer
    const existing = await erpCall(`/api/resource/Customer?filters=[["customer_name","=","${company}"]]`);
    if (existing.data && existing.data.length > 0) {
      return existing.data[0].name;
    }
  } catch (error) {
    console.log('Customer not found, creating new one');
  }

  // Create new customer
  const customerData = {
    customer_name: company,
    customer_type: 'Company',
    customer_group: 'Commercial',
    territory: 'Saudi Arabia'
  };

  const result = await erpCall('/api/resource/Customer', 'POST', customerData);
  
  // Create contact
  try {
    await erpCall('/api/resource/Contact', 'POST', {
      first_name: contactName.split(' ')[0] || contactName,
      last_name: contactName.split(' ').slice(1).join(' ') || '',
      email_id: email,
      links: [{
        link_doctype: 'Customer',
        link_name: result.data.name
      }]
    });
  } catch (error) {
    console.error('Failed to create contact:', error);
  }

  return result.data.name;
}

// Create opportunity in ERPNext
async function createOpportunity(demoRequest, customerName) {
  const opportunityData = {
    opportunity_from: 'Customer',
    party_name: customerName,
    opportunity_type: demoRequest.product_name.includes('Autonomous') ? 'Sales' : 'Sales',
    source: 'Website Demo Request',
    status: 'Open',
    title: `Demo Request - ${demoRequest.product_name}`,
    contact_email: demoRequest.email,
    contact_mobile: demoRequest.phone,
    notes: `
Demo Request Details:
- Product: ${demoRequest.product_name}
- Company Size: ${demoRequest.company_size || 'Not specified'}
- Demo Focus: ${demoRequest.demo_focus?.join(', ') || 'Not specified'}
- Preferred Date: ${demoRequest.preferred_date || 'Not specified'}
- Preferred Time: ${demoRequest.preferred_time || 'Not specified'}
- Message: ${demoRequest.message || 'None'}
    `.trim()
  };

  const result = await erpCall('/api/resource/Opportunity', 'POST', opportunityData);
  return result.data.name;
}

// Send automated confirmation email
async function sendConfirmationEmail(base44, demoRequest) {
  const timeSlots = {
    morning: '9:00 AM - 12:00 PM',
    afternoon: '1:00 PM - 5:00 PM',
    evening: '6:00 PM - 9:00 PM'
  };

  const emailBody = `
Dear ${demoRequest.name},

Thank you for your interest in ${demoRequest.product_name}!

We have received your demo request and our team will contact you shortly to schedule your personalized demonstration.

Request Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Product: ${demoRequest.product_name}
🏢 Company: ${demoRequest.company}
👥 Company Size: ${demoRequest.company_size || 'Not specified'}
${demoRequest.demo_focus?.length > 0 ? `🎯 Focus Areas: ${demoRequest.demo_focus.join(', ')}` : ''}
${demoRequest.preferred_date ? `📅 Preferred Date: ${new Date(demoRequest.preferred_date).toLocaleDateString()}` : ''}
${demoRequest.preferred_time ? `⏰ Preferred Time: ${timeSlots[demoRequest.preferred_time] || demoRequest.preferred_time}` : ''}

What Happens Next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Our sales team will review your request within 24 hours
✅ We'll contact you to confirm the best time for your demo
✅ You'll receive a calendar invite with meeting details
✅ A dedicated solutions consultant will be assigned to you

In the meantime, feel free to explore:
🌐 Visit: www.saudibusinessgate.com
📧 Email: sales@saudibusinessgate.com
📞 Call: +966 XX XXX XXXX

Best regards,
Saudi Business Gate Team

────────────────────────────────────────────
🇸🇦 Made in Saudi Arabia | Powered by Dogan Consult
www.saudibusinessgate.com | www.doganconsult.com
  `.trim();

  await base44.integrations.Core.SendEmail({
    to: demoRequest.email,
    subject: `Demo Request Confirmed - ${demoRequest.product_name} | Saudi Business Gate`,
    body: emailBody
  });
}

// Send internal notification to sales team
async function notifySalesTeam(base44, demoRequest, opportunityId, insights = null) {
  const salesEmail = 'sales@saudibusinessgate.com';
  
  const aiSection = insights ? `
🤖 AI AGENT INSIGHTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Lead Quality Score: ${insights.lead_score}/10
💡 Demo Approach: ${insights.demo_approach}

Upsell Opportunities:
${insights.upsell_opportunities?.map(o => `  • ${o}`).join('\n') || 'None'}

Risk Factors:
${insights.risk_factors?.map(r => `  • ${r}`).join('\n') || 'None'}

Follow-up Strategy:
${insights.follow_up_strategy}

` : '';
  
  const emailBody = `
🚨 NEW DEMO REQUEST RECEIVED
${aiSection}
Customer Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${demoRequest.name}
📧 Email: ${demoRequest.email}
📱 Phone: ${demoRequest.phone || 'Not provided'}
🏢 Company: ${demoRequest.company}
👥 Company Size: ${demoRequest.company_size || 'Not specified'}

Demo Request:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Product: ${demoRequest.product_name}
🎯 Focus Areas: ${demoRequest.demo_focus?.join(', ') || 'Not specified'}
📅 Preferred Date: ${demoRequest.preferred_date || 'Not specified'}
⏰ Preferred Time: ${demoRequest.preferred_time || 'Not specified'}

💬 Message:
${demoRequest.message || 'No additional message'}

ERPNext:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Opportunity ID: ${opportunityId}
🔗 View in ERPNext: ${ERPNEXT_URL}/app/opportunity/${opportunityId}

⚡ ACTION REQUIRED: Contact customer within 24 hours to schedule demo.
  `.trim();

  await base44.integrations.Core.SendEmail({
    to: salesEmail,
    subject: `🚨 New Demo Request: ${demoRequest.company} - ${demoRequest.product_name}`,
    body: emailBody
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated for creating demo requests
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, demoRequestId, demoRequestData } = await req.json();

    if (action === 'process_demo_request') {
      // Get demo request from database
      const demoRequest = demoRequestId 
        ? await base44.asServiceRole.entities.DemoRequest.get(demoRequestId)
        : demoRequestData;

      if (!demoRequest) {
        return Response.json({ error: 'Demo request not found' }, { status: 404 });
      }

      // AI Agent Analysis
      const insights = await getAgentInsights(base44.asServiceRole, demoRequest);

      // Step 1: Create/Get customer in ERPNext
      const customerName = await ensureCustomer(
        demoRequest.company,
        demoRequest.email,
        demoRequest.name
      );

      // Step 2: Create opportunity in ERPNext
      const opportunityId = await createOpportunity(demoRequest, customerName);

      // Step 3: Update demo request with ERPNext references and AI insights
      if (demoRequestId) {
        await base44.asServiceRole.entities.DemoRequest.update(demoRequestId, {
          status: 'contacted',
          erp_customer_id: customerName,
          erp_opportunity_id: opportunityId,
          notes: insights ? `AI Insights:\n${JSON.stringify(insights, null, 2)}\n\n${demoRequest.notes || ''}` : demoRequest.notes
        });
      }

      // Step 4: Send confirmation email to customer
      await sendConfirmationEmail(base44, demoRequest);

      // Step 5: Notify sales team with AI insights
      await notifySalesTeam(base44, demoRequest, opportunityId, insights);

      return Response.json({
        success: true,
        message: 'Demo request processed successfully',
        customerName,
        opportunityId,
        ai_insights: insights
      });
    }

    if (action === 'schedule_demo') {
      const { demoRequestId, scheduledDate, scheduledTime, meetingLink, notes } = await req.json();
      
      const demoRequest = await base44.asServiceRole.entities.DemoRequest.get(demoRequestId);
      
      // Update demo request
      await base44.asServiceRole.entities.DemoRequest.update(demoRequestId, {
        status: 'scheduled',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        meeting_link: meetingLink,
        notes: notes
      });

      // Send calendar invite email
      const emailBody = `
Dear ${demoRequest.name},

Great news! Your demo for ${demoRequest.product_name} has been scheduled.

Demo Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: ${new Date(scheduledDate).toLocaleDateString()}
⏰ Time: ${scheduledTime}
🔗 Meeting Link: ${meetingLink}
⏱️ Duration: 45-60 minutes

What to Expect:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Live product demonstration
✓ Q&A session with solutions consultant
✓ Discussion of your specific use cases
✓ Pricing and implementation timeline

${notes ? `Additional Notes:\n${notes}\n` : ''}

Please add this to your calendar and let us know if you need to reschedule.

See you soon!

Best regards,
Saudi Business Gate Team
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: demoRequest.email,
        subject: `Demo Scheduled - ${new Date(scheduledDate).toLocaleDateString()} | ${demoRequest.product_name}`,
        body: emailBody
      });

      return Response.json({
        success: true,
        message: 'Demo scheduled successfully'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Demo automation error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});