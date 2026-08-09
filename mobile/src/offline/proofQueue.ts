import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { api } from "../api/runtime";

const QUEUE_KEY = "amarkrishok.proofQueue.v1";

export type QueuedProof = {
  body: Record<string, unknown>;
  idempotencyKey: string;
  tripId: string;
};

async function readQueue(): Promise<QueuedProof[]> {
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  if (!stored) return [];
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value as QueuedProof[] : [];
  } catch {
    return [];
  }
}

export async function enqueueProof(proof: QueuedProof) {
  const current = await readQueue();
  if (!current.some((item) => item.idempotencyKey === proof.idempotencyKey)) current.push(proof);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(current));
}

export async function flushProofQueue() {
  const current = await readQueue();
  const remaining: QueuedProof[] = [];
  for (const proof of current) {
    try {
      await api.request(`/carrier/trips/${proof.tripId}/proof`, { body: proof.body, idempotencyKey: proof.idempotencyKey, method: "POST" });
    } catch {
      remaining.push(proof);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export function subscribeProofQueue() {
  void flushProofQueue();
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void flushProofQueue();
  });
}
