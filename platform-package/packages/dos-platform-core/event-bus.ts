// For the DOS Native core, we use an in-memory bus synchronized over memory.
// Built isomorphically to sidestep NodeJS/Vite boundary issues.
class DosEventBus {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  publish(eventName: string, payload: any, context?: any) {
    const list = this.listeners.get(eventName);
    if(list) {
      const eventData = { payload, context, timestamp: new Date().toISOString() };
      list.forEach(cb => cb(eventData));
    }
  }

  subscribe(eventName: string, callback: (data: any) => void) {
    if(!this.listeners.has(eventName)){
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(callback);
  }
}

export const eventBus = new DosEventBus();

// Strongly typed events
export const ERP_EVENTS = {
  OPPORTUNITY_CREATED: 'erp.opportunity.created',
  OPPORTUNITY_APPROVED: 'erp.opportunity.approved',
  DEAL_WON: 'erp.deal.won',
  DEAL_LOST: 'erp.deal.lost'
};
