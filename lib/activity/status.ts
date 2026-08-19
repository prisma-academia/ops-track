export type ActivityStatus = "SUCCESS" | "FAILED";

const FAILED_ACTION_PATTERNS = [
  /\.reject$/i,
  /\.fail$/i,
  /\.failed$/i,
  /\.suspend$/i,
  /\.denied$/i,
  /\.error$/i,
  /failed/i,
  /unauthorized/i,
];

/** Classify an audit action as success or failed for display/filtering. */
export function getActivityStatus(action: string): ActivityStatus {
  if (FAILED_ACTION_PATTERNS.some((pattern) => pattern.test(action))) {
    return "FAILED";
  }
  return "SUCCESS";
}

/** Prisma `where` fragment matching failed activity actions. */
export function failedActivityWhere() {
  return {
    OR: [
      { action: { contains: "reject", mode: "insensitive" as const } },
      { action: { contains: "fail", mode: "insensitive" as const } },
      { action: { contains: "suspend", mode: "insensitive" as const } },
      { action: { contains: "denied", mode: "insensitive" as const } },
      { action: { contains: "error", mode: "insensitive" as const } },
      { action: { contains: "unauthorized", mode: "insensitive" as const } },
    ],
  };
}
