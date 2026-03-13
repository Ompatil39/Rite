export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export const STATUS = { NONE: 0, DONE: 1, PARTIAL: 2, MISSED: 3 } as const;

export const S: Record<number, { bg: string; border: string; glow: string; label: string }> = {
  [STATUS.NONE]:    { bg: "var(--pill-none)",     border: "var(--pill-none-border)", glow: "none",                          label: "None"    },
  [STATUS.DONE]:    { bg: "var(--status-done)",   border: "var(--status-done)",      glow: "0 0 10px var(--status-done-glow)",    label: "Done"    },
  [STATUS.PARTIAL]: { bg: "var(--status-partial)",border: "var(--status-partial)",   glow: "0 0 10px var(--status-partial-glow)", label: "Partial" },
  [STATUS.MISSED]:  { bg: "var(--status-missed)", border: "var(--status-missed)",    glow: "0 0 10px var(--status-missed-glow)",  label: "Missed"  },
};

export const PILL_W = 26;
export const PILL_H = 26;
export const PILL_GAP = 4;

// Mobile-only pill dimensions (do not use on desktop)
export const MOBILE_PILL_W = 14;
export const MOBILE_PILL_H = 24;
export const MOBILE_PILL_H_SM = 20;
export const MAX_HABIT_NAME_LENGTH = 50;

export const SUGGESTED_HABITS = [
  { name: "Solve 1 LeetCode problem",         category: "DSA"          },
  { name: "Read 10 pages of a tech book",      category: "Growth"       },
  { name: "Code for 1 hour",                   category: "Focus"        },
  { name: "Push code to GitHub",               category: "DSA"          },
  { name: "No social media before noon",       category: "Focus"        },
  { name: "Review notes for 15 minutes",     category: "Study" },
];