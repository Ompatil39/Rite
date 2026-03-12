import { STATUS, MAX_HABIT_NAME_LENGTH } from "./constants";

export function getDaysInMonth(m: number, y: number): number {
  return new Date(y, m + 1, 0).getDate();
}

export function getStreak(days: number[], dim: number): number {
  let s = 0;
  for (let d = dim - 1; d >= 0; d--) {
    if (days[d] === STATUS.DONE) s++;
    else break;
  }
  return s;
}

export function getPct(days: number[], dim: number): number {
  let done = 0, total = 0;
  for (let d = 0; d < dim; d++) {
    if (days[d] !== STATUS.NONE) {
      total++;
      if (days[d] === STATUS.DONE) done++;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function clampHabitName(value: string): string {
  return value.slice(0, MAX_HABIT_NAME_LENGTH);
}

export function hapticFeedback(nextStatus: number): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  switch (nextStatus) {
    case STATUS.DONE:    navigator.vibrate(40);              break;
    case STATUS.PARTIAL: navigator.vibrate([25, 30, 25]);   break;
    case STATUS.MISSED:  navigator.vibrate(80);              break;
    case STATUS.NONE:    navigator.vibrate(10);              break;
  }
}
