/** True when the full loaded volume was lost (no meaningful delivery distribution). */
export function isCompleteTransportLoadLoss(params: {
  litersCarried: number;
  effectiveLoadedVolume: number;
  distributedVolume: number;
  loggedLostVolume: number;
}): boolean {
  const loaded = Math.max(params.litersCarried, params.effectiveLoadedVolume);
  if (loaded <= 0.001) return false;
  if (params.distributedVolume > 0.001) return false;
  if (params.loggedLostVolume < 0.001) return false;
  return params.loggedLostVolume >= loaded - 0.001;
}

export function formatTransportStatusLabel(status: string): string {
  if (status === "LOSS") return "Complete Loss";
  return status.replace(/_/g, " ");
}
