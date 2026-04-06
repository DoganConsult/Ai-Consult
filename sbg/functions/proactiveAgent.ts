import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Proactive agent automation - runs periodically to take autonomous actions
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify service role access
    const { action } = await req.json();

    // ACTION: Follow up on abandoned demos
    if (action === 'follow_up_demos') {
      const demos = await base44.asServiceRole.entities.DemoRequest.filter({
        status: 'pending'
      });

      const now = new Date();
      const followUps = [];

      for (const demo of demos) {
        const created = new Date(demo.created_date);
        const hoursSince = (now - created) / (1000 * 60 * 60);

        // If demo request is pending for > 24 hours, escalate
        if (hoursSince > 24) {
          // Send escalation email
          await base44.integrations.Core.SendEmail({
            to: 'sales@saudibusinessgate.com',
            subject: `⚠️ ESCALATION: Demo request pending for 24+ hours - ${demo.company}`,
            body: `Demo request from ${demo.company} has been pending for ${Math.floor(hoursSince)} hours.
            
Customer: ${demo.name}
Email: ${demo.email}
Product: ${demo.product_name}

ACTION REQUIRED: Contact immediately.`
          });

          followUps.push(demo.id);
        }
      }

      return Response.json({ 
        success: true, 
        followed_up: followUps.length,
        demo_ids: followUps
      });
    }

    // ACTION: Score and qualify leads
    if (action === 'score_leads') {
      const visitors = await base44.asServiceRole.entities.VisitorSession.list('-last_visit', 50);
      const scored = [];

      for (const visitor of visitors) {
        // Calculate lead score based on behavior
        let score = 0;
        
        if (visitor.visit_count > 3) score += 2;
        if (visitor.pages_visited?.length > 10) score += 2;
        if (visitor.products_viewed?.length > 3) score += 2;
        if (visitor.time_spent_seconds > 600) score += 2; // 10+ minutes
        if (visitor.conversation_ids?.length > 0) score += 1;
        if (visitor.inquiries_created?.length > 0) score += 1;

        // Update lead score if changed
        if (score !== visitor.lead_score) {
          await base44.asServiceRole.entities.VisitorSession.update(visitor.id, {
            lead_score: score
          });
          scored.push({ id: visitor.id, score });

          // High-value lead notification
          if (score >= 7 && visitor.visitor_email) {
            await base44.integrations.Core.SendEmail({
              to: 'sales@saudibusinessgate.com',
              subject: `🔥 High-Value Lead Detected - Score: ${score}/10`,
              body: `Hot lead identified:
              
Email: ${visitor.visitor_email}
Score: ${score}/10
Visits: ${visitor.visit_count}
Time Spent: ${Math.floor((visitor.time_spent_seconds || 0) / 60)} minutes
Products Viewed: ${visitor.products_viewed?.length || 0}
Journey Stage: ${visitor.journey_stage}

Recommend immediate outreach.`
            });
          }
        }
      }

      return Response.json({ 
        success: true, 
        scored: scored.length,
        leads: scored
      });
    }

    // ACTION: Update journey stages
    if (action === 'update_journey_stages') {
      const visitors = await base44.asServiceRole.entities.VisitorSession.list('-last_visit', 100);
      const updated = [];

      for (const visitor of visitors) {
        let newStage = visitor.journey_stage || 'explorer';

        // Progression logic
        if (visitor.demos_requested?.length > 0) {
          newStage = 'decision_maker';
        } else if (visitor.inquiries_created?.length > 0 || visitor.products_viewed?.length >= 3) {
          newStage = 'evaluator';
        } else if (visitor.pages_visited?.length < 3) {
          newStage = 'explorer';
        }

        if (newStage !== visitor.journey_stage) {
          await base44.asServiceRole.entities.VisitorSession.update(visitor.id, {
            journey_stage: newStage
          });
          updated.push({ id: visitor.id, stage: newStage });
        }
      }

      return Response.json({ 
        success: true, 
        updated: updated.length
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Proactive agent error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});