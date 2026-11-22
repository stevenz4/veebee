// Scores and quiz settings survive a reload. Storage can be missing or blocked: never throw.
export const persist = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`veebee.${key}`);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(`veebee.${key}`, JSON.stringify(value));
    } catch {
      /* private window or storage disabled: scores just won't persist */
    }
  },
};
