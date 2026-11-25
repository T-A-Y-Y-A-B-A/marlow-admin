// Tiny bus so the command bar can ask a page to do something, even one that hasn't mounted yet.
export type Command = { type: "new-user" } | { type: "search-users"; q: string };

const listeners = new Set<(c: Command) => void>();
let pending: Command | null = null;

export function sendCommand(command: Command) {
  if (listeners.size) listeners.forEach((l) => l(command));
  else pending = command; // delivered when the target page mounts
}

export function onCommand(listener: (c: Command) => void) {
  listeners.add(listener);
  if (pending) {
    const command = pending;
    pending = null;
    listener(command);
  }
  return () => {
    listeners.delete(listener);
  };
}
