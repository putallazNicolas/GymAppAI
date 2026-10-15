function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "gym-app-backup-2026-10-15.json" (local date). */
export function backupFileName(date: Date = new Date()): string {
  return `gym-app-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
