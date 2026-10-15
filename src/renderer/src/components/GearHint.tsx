import type { ReactNode } from 'react'

export function GearHint({ children }: { children: ReactNode }) {
  return <p className="gear-hint">{children}</p>
}
