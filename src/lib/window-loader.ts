type Gate = {
  promise: Promise<void>;
  resolve: () => void;
};

const gates = new Map<string, Gate>();

function gateFor(key: string): Gate {
  const existing = gates.get(key);
  if (existing) return existing;

  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  const gate = { promise, resolve };
  gates.set(key, gate);
  return gate;
}

/** Hold a lazy window until its code and the loader's bounce sequence are ready. */
export async function withWindowLoader<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const [module] = await Promise.all([loader(), gateFor(key).promise]);
  return module;
}

/** Called after the loader's configured bounce count has completed. */
export function completeWindowLoaderRotation(key: string): void {
  gateFor(key).resolve();
}
