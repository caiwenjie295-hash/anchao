import type { AnchaoEventMap } from './types';

type Listener<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof AnchaoEventMap, Set<Listener<unknown>>>();

  on<K extends keyof AnchaoEventMap>(eventName: K, listener: Listener<AnchaoEventMap[K]>): () => void {
    const group = this.listeners.get(eventName) ?? new Set<Listener<unknown>>();
    this.listeners.set(eventName, group);
    group.add(listener as Listener<unknown>);
    return () => group.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof AnchaoEventMap>(eventName: K, payload: AnchaoEventMap[K]): void {
    this.listeners.get(eventName)?.forEach((listener) => listener(payload));
  }
}

export const eventBus = new EventBus();
