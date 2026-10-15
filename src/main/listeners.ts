export class Listeners {
  private readonly listeners = new Set<() => void>()

  add(listener: () => void): void {
    this.listeners.add(listener)
  }

  notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}
