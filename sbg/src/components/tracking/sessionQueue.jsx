import { base44 } from '@/api/base44Client';

// Queue to manage session updates and prevent race conditions
class SessionUpdateQueue {
  constructor() {
    this.queue = new Map();
    this.processing = new Set();
  }

  async enqueue(sessionId, updates) {
    // Merge with existing queued updates
    const existing = this.queue.get(sessionId) || {};
    const merged = { ...existing, ...updates };
    this.queue.set(sessionId, merged);

    // Process if not already processing
    if (!this.processing.has(sessionId)) {
      await this.process(sessionId);
    }
  }

  async process(sessionId) {
    if (this.processing.has(sessionId)) return;

    this.processing.add(sessionId);

    try {
      while (this.queue.has(sessionId)) {
        const updates = this.queue.get(sessionId);
        this.queue.delete(sessionId);

        // Find session
        const sessions = await base44.entities.VisitorSession.filter({ session_id: sessionId });
        if (sessions.length > 0) {
          await base44.entities.VisitorSession.update(sessions[0].id, updates);
        }

        // Small delay to batch rapid updates
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Session queue processing error:', error);
    } finally {
      this.processing.delete(sessionId);
    }
  }
}

export const sessionQueue = new SessionUpdateQueue();