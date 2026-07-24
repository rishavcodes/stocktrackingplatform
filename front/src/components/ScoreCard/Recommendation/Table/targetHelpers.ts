/**
 * Format all targets from the targets array for display.
 * Falls back to the legacy single `target` field.
 */
export function formatTargets(item: any): string {
  if (item.targets && item.targets.length > 0) {
    return item.targets
      .map((t: any) => Number(t.price).toFixed(2))
      .join(" / ");
  }
  return Number(item.target || 0).toFixed(2);
}

/**
 * Get the final (highest) target price from the targets array.
 * Used for progress bar endpoint and reward calculations.
 */
export function getFinalTarget(item: any): number {
  if (item.targets && item.targets.length > 0) {
    return Number(item.targets[item.targets.length - 1].price) || 0;
  }
  return Number(item.target) || 0;
}
