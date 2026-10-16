import type { IpcMain } from 'electron'
import { apiChannel, type ApiScope } from '../shared/ipc'

type Unknowns<T extends unknown[]> = { [K in keyof T]: unknown }

export type Handlers<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R> ? (...args: Unknowns<A>) => R | Promise<R> : never
}

export function registerHandlers<T>(target: Pick<IpcMain, 'handle'>, scope: ApiScope, handlers: Handlers<T>): void {
  for (const [method, handler] of Object.entries(handlers) as Array<[string, (...args: unknown[]) => unknown]>) {
    target.handle(apiChannel(scope, method), (_event, ...args: unknown[]) => handler(...args))
  }
}
