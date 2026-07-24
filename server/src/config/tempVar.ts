export function setTemporaryGlobalVariable(
  name: string,
  value: boolean,
  duration: number
): void {
  (global as any)[name] = value;

  setTimeout(() => {
    delete (global as any)[name];
  }, duration);
}
