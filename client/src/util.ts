export function sample<T>(array: [T, ...T[]]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle<T>(array: readonly T[] | T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function sampleSize<T>(array: readonly T[] | T[], n: number): [T, ...T[]] {
  const result = shuffle(array).slice(0, Math.min(n, array.length));
  return result as [T, ...T[]];
}

// remove diacritics
export function deburr(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
