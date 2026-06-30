export function withTimeout(promise, ms) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}
