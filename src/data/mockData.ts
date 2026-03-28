export const userName = "Alex";

export const streakDays = 12;

export const initialFocusScore = 72;

export const focusLabel = (score: number) => {
  if (score >= 70) return "Deep focus";
  if (score >= 40) return "Getting scattered";
  return "Highly fragmented";
};

export const scoreColor = (score: number) => {
  if (score >= 70) return "high" as const;
  if (score >= 40) return "mid" as const;
  return "low" as const;
};

export const aiMemory =
  "You've had 14 tabs open for the last 20 minutes — that's usually when you're stuck, not exploring.";

export const featuredTask = {
  name: "Fix race condition in useWorkspaceSync hook",
  nudge: "This has been blocking your PR for 2 days — clearing it will unblock 3 downstream tasks.",
  firstStep: {
    file: "src/hooks/useWorkspaceSync.ts",
    line: 47,
    action: "Add AbortController to the fetch call inside the effect cleanup",
  },
};

export const secondaryTasks = [
  { id: "1", name: "Write unit tests for auth middleware", badge: "15 min", done: false },
  { id: "2", name: "Review Kayla's component library PR", badge: "Low energy ok", done: false },
  { id: "3", name: "Update API rate-limit docs", badge: "High focus", done: false },
];

export const focusHistoryData = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  let score = 0;
  if (hour < 7) score = 0;
  else if (hour === 7) score = 45;
  else if (hour === 8) score = 62;
  else if (hour === 9) score = 78;
  else if (hour === 10) score = 85;
  else if (hour === 11) score = 82;
  else if (hour === 12) score = 55;
  else if (hour === 13) score = 48;
  else if (hour === 14) score = 71;
  else if (hour === 15) score = 76;
  else if (hour === 16) score = 68;
  else if (hour === 17) score = 45;
  else score = 0;
  return {
    time: `${hour.toString().padStart(2, "0")}:00`,
    score,
    annotation:
      hour === 12
        ? "12 new tabs opened"
        : hour === 17
        ? "Context switch detected"
        : undefined,
  };
}).filter((d) => d.score > 0);

export const focusSummary = {
  average: 67,
  longestStreak: "2h 15m",
  peakTime: "10:00 AM",
};

export const sessionLog = [
  { date: "Mar 27", task: "Refactored auth middleware", score: 81, completed: true },
  { date: "Mar 26", task: "Debugged WebSocket reconnection", score: 64, completed: true },
  { date: "Mar 25", task: "API rate limiting research", score: 43, completed: false },
  { date: "Mar 24", task: "Component library setup", score: 88, completed: true },
  { date: "Mar 23", task: "Sprint planning & backlog grooming", score: 35, completed: true },
];

export const chatMessages = [
  {
    role: "ai" as const,
    content:
      "Hey Alex. You've been circling the workspace sync bug for two sessions now. Want me to help you break it down into smaller steps?",
  },
];
