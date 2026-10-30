/**
 * The job lifecycle state machine.
 *
 * A job moves: REQUESTED -> SCHEDULED -> ASSIGNED -> EN_ROUTE -> IN_PROGRESS
 *             -> COMPLETED -> INVOICED -> PAID, with CANCELLED reachable while
 * the job is still pre-work.
 *
 * Keeping transitions as explicit data (not scattered `if`s) means:
 *  - one source of truth for "what can happen next"
 *  - trivially testable
 *  - the dispatch board UI can derive available actions from this map
 */
export const JOB_TRANSITIONS = {
  REQUESTED: ["SCHEDULED", "ASSIGNED", "CANCELLED"],
  SCHEDULED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["EN_ROUTE", "SCHEDULED", "CANCELLED"],
  EN_ROUTE: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["INVOICED"],
  INVOICED: ["PAID"],
  PAID: [],
  CANCELLED: [],
};

export function canTransition(from, to) {
  return (JOB_TRANSITIONS[from] || []).includes(to);
}

export function availableTransitions(from) {
  return JOB_TRANSITIONS[from] || [];
}
