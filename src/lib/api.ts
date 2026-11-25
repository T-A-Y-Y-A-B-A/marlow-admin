// Mock REST-ish API. Persists to localStorage and adds network-like latency,
// so the UI handles loading, errors and validation the same way it would against a real backend.
// shortcut: data lives in one browser only; swap these functions for fetch() calls when a backend exists.
import { SEED_USERS } from "./data";
import { cleanInput, deleteBlocker, validateUser, type User, type UserErrors, type UserInput } from "./users";

const KEY = "marlow:users:v1";

export class ApiError extends Error {
  fields: UserErrors;
  constructor(message: string, fields: UserErrors = {}) {
    super(message);
    this.fields = fields;
  }
}

const latency = () => new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 250));

function load(): User[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as User[];
  } catch {
    // unreadable storage: fall back to the seed
  }
  return SEED_USERS;
}

function save(users: User[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(users));
  } catch {
    // storage full or blocked: changes last until reload
  }
}

function check(input: UserInput, users: User[], id?: string) {
  const errors = validateUser(input, users, id);
  if (Object.keys(errors).length) throw new ApiError("Check the highlighted fields.", errors);
}

export const usersApi = {
  async list(): Promise<User[]> {
    await latency();
    return load();
  },

  async create(input: UserInput): Promise<User> {
    await latency();
    const users = load();
    const data = cleanInput(input);
    check(data, users);
    const user: User = {
      ...data,
      id: `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
    };
    save([user, ...users]);
    return user;
  },

  async update(id: string, input: UserInput): Promise<User> {
    await latency();
    const users = load();
    const existing = users.find((u) => u.id === id);
    if (!existing) throw new ApiError("This user no longer exists. Refresh the page.");
    const data = cleanInput(input);
    check(data, users, id);
    const user = { ...existing, ...data };
    save(users.map((u) => (u.id === id ? user : u)));
    return user;
  },

  async remove(id: string): Promise<void> {
    await latency();
    const users = load();
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const blocker = deleteBlocker(user, users);
    if (blocker) throw new ApiError(blocker);
    save(users.filter((u) => u.id !== id));
  },

  reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing stored
    }
  },
};
