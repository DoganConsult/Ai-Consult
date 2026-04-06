import { getGraphClient } from './graph.js';
import { processIncomingEmail } from './autoReply.js';
import redis from '../db/redis.js';

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS) || 60000;
const MAIL_USER = () => process.env.GRAPH_MAIL_FROM || 'info@doganconsult.com';

let pollerInterval = null;
let isPolling = false;

async function pollInbox() {
  if (isPolling) return;
  isPolling = true;

  try {
    const client = getGraphClient();
    if (!client) {
      console.warn('Graph not configured, skipping poll');
      return;
    }

    const lastPollKey = 'inbox_poller:last_poll';
    const lastPoll = await redis.get(lastPollKey);
    const since = lastPoll || new Date(Date.now() - POLL_INTERVAL * 2).toISOString();

    const filter = `receivedDateTime ge ${since} and isRead eq false`;

    const result = await client
      .api(`/users/${MAIL_USER()}/mailFolders/inbox/messages`)
      .filter(filter)
      .orderby('receivedDateTime desc')
      .top(20)
      .select('id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments')
      .get();

    const messages = result.value || [];

    let processed = 0;
    let skipped = 0;

    for (const msg of messages) {
      try {
        const outcome = await processIncomingEmail(msg);
        if (outcome.skipped) {
          skipped++;
        } else {
          processed++;
          console.log(`Processed: ${msg.subject?.substring(0, 50)} → ${outcome.category} (${outcome.lang})`);
        }
      } catch (err) {
        console.error(`Failed to process message ${msg.id}:`, err.message);
      }
    }

    await redis.set(lastPollKey, new Date().toISOString());

    if (processed > 0 || messages.length > 0) {
      console.log(`Poll complete: ${messages.length} new, ${processed} processed, ${skipped} skipped`);
    }
  } catch (err) {
    console.error('Inbox poll error:', err.message);
  } finally {
    isPolling = false;
  }
}

export function startInboxPoller() {
  if (pollerInterval) return;

  console.log(`Inbox poller started (interval: ${POLL_INTERVAL / 1000}s)`);
  pollInbox();
  pollerInterval = setInterval(pollInbox, POLL_INTERVAL);
}

export function stopInboxPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log('Inbox poller stopped');
  }
}
