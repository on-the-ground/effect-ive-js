export function tableizable<Args extends unknown[], R>(
  fn: (...args: Args) => R
): (...args: Args) => R {
  // with memoization
  return fn;
}
