import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "http://localhost:8000";

// ── types ──────────────────────────────────────────────────────────────────

export interface FocusData {
  focus_score: number | null;
  focus_label: string | null;
  tab_count: number;
  updated_at: string | null;
}

export interface Session {
  timestamp: string;
  working_on: string;
  next_action: string;
  stuck_signal: string | null;
  focus_score: number;
  focus_label: string;
}

export interface SessionsData {
  sessions: Session[];
}

export interface MemoryData {
  memory_summary: string | null;
}

// ── helpers ────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

// ── hooks ──────────────────────────────────────────────────────────────────

/** Polls /focus every 15 seconds — drives the live score on the dashboard */
export function useFocus() {
  return useQuery<FocusData>({
    queryKey: ["focus"],
    queryFn: () => get<FocusData>("/focus"),
    refetchInterval: 15_000,
    retry: false,
  });
}

/** Fetches the 10 most recent sessions */
export function useSessions() {
  return useQuery<SessionsData>({
    queryKey: ["sessions"],
    queryFn: () => get<SessionsData>("/sessions"),
    refetchInterval: 30_000,
    retry: false,
  });
}

/** Fetches the latest memory summary for the chat seed */
export function useMemory() {
  return useQuery<MemoryData>({
    queryKey: ["memory"],
    queryFn: () => get<MemoryData>("/memory"),
    retry: false,
  });
}

/** Triggers a manual scan of the current tabs via the backend */
export function useScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/scan`, { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate everything to show the new data instantly
      queryClient.invalidateQueries({ queryKey: ["focus"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

// ── utility helpers ───────────────────────────────────────────────────────

export const focusLabel = (score: number): string => {
  if (score >= 70) return "Deep focus";
  if (score >= 40) return "Getting scattered";
  return "Highly fragmented";
};

export const scoreColor = (score: number): "high" | "mid" | "low" => {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
};
