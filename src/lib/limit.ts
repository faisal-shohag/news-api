/**
 * Minimal promise concurrency limiter.
 *
 * A deep topic crawl can ask for 40 pages at once. Without a gate that fans out
 * into 40 simultaneous connections to bbc.com, which is both rude and a good
 * way to get blocked. Everything outbound queues through one of these.
 */
export function createLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  const pump = () => {
    if (active >= max || queue.length === 0) return;
    active += 1;
    queue.shift()!();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            pump();
          });
      });
      pump();
    });
  };
}
