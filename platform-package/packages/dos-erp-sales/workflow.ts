import { createMachine } from 'xstate';

/**
 * XState machine tracking the Opportunity Lifecycle.
 */
export const OpportunityApprovalMachine = createMachine({
  id: 'opportunityWorkflow',
  initial: 'DRAFT',
  states: {
    DRAFT: {
      on: {
        SUBMIT_FOR_APPROVAL: 'PENDING_APPROVAL'
      }
    },
    PENDING_APPROVAL: {
      on: {
        APPROVE: 'QUALIFIED',
        REJECT: 'DRAFT'
      }
    },
    QUALIFIED: {
      on: {
        WIN_DEAL: 'CLOSED_WON',
        LOSE_DEAL: 'LOST'
      }
    },
    CLOSED_WON: {
      type: 'final' // End of sales loop, hands off to Finance Event Bus
    },
    LOST: {
      type: 'final'
    }
  }
});
