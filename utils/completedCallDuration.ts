import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@bada/completed-call-durations";

type SavedDuration = [sessionId: string, durationSeconds: number];

let durationsPromise: Promise<Map<string, number>> | null = null;

function loadDurations(): Promise<Map<string, number>> {
  if (!durationsPromise) {
    durationsPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return new Map<string, number>();
        const entries = parsed.filter(
          (entry): entry is SavedDuration =>
            Array.isArray(entry) &&
            typeof entry[0] === "string" &&
            typeof entry[1] === "number" &&
            Number.isFinite(entry[1]) &&
            entry[1] >= 0,
        );
        return new Map<string, number>(entries);
      })
      .catch(() => new Map<string, number>());
  }
  return durationsPromise;
}

export async function saveCompletedCallDuration(
  sessionId: string,
  durationSeconds: number,
): Promise<void> {
  if (!sessionId || !Number.isFinite(durationSeconds)) return;

  const durations = await loadDurations();
  durations.delete(sessionId);
  durations.set(sessionId, Math.max(0, Math.floor(durationSeconds)));
  const savedEntries = Array.from(durations.entries());
  durationsPromise = Promise.resolve(durations);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedEntries));
  } catch {
    // Storage failure leaves the current-session value in memory.
  }
}

export async function getCompletedCallDuration(
  sessionId: string | null | undefined,
): Promise<number | null> {
  if (!sessionId) return null;
  return (await loadDurations()).get(sessionId) ?? null;
}
