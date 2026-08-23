export const ticketPersonSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

export const TICKET_INCLUDE = {
  station: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  raisedBy: {
    select: {
      ...ticketPersonSelect,
      expoPushTokens: true,
    },
  },
  approvedBy: {
    select: ticketPersonSelect,
  },
  varianceLog: true,
  expense: {
    include: {
      recordedBy: { select: ticketPersonSelect },
      approvedBy: { select: ticketPersonSelect },
    },
  },
} as const;
