export const ticketPersonSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const ticketChildSelect = {
  id: true,
  category: true,
  status: true,
  title: true,
  createdAt: true,
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
  pump: { select: { id: true, name: true, status: true } },
  nozzle: { select: { id: true, name: true, status: true } },
  parent: { select: { id: true, title: true, category: true, status: true } },
  children: { select: ticketChildSelect, orderBy: { createdAt: "asc" as const } },
} as const;
