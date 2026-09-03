export type ActivityStatus = "SUCCESS" | "FAILED";

const FAILED_ACTION_KEYWORDS = [
  "reject",
  "fail",
  "suspend",
  "denied",
  "error",
  "unauthorized",
];

/** Classify an audit action as success or failed for display/filtering. */
export function getActivityStatus(action: string): ActivityStatus {
  if (!action) return "SUCCESS";
  const lower = action.toLowerCase();
  if (FAILED_ACTION_KEYWORDS.some((keyword) => lower.includes(keyword))) {
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
