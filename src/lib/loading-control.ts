/** Bound network-dependent UI work without treating a timeout as authorization. */
export function withLoadingDeadline<T>(work: PromiseLike<T>, milliseconds = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Ryšys užtruko. Bandyk dar kartą.")), milliseconds);
    Promise.resolve(work).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Concurrent consumers share a request; failed work is retryable. */
export function singleFlightByKey<T>(request: (key: string) => Promise<T>) {
  const pending = new Map<string, Promise<T>>();
  return (key: string): Promise<T> => {
    const existing = pending.get(key);
    if (existing) return existing;
    const work = Promise.resolve().then(() => request(key)).finally(() => pending.delete(key));
    pending.set(key, work);
    return work;
  };
}