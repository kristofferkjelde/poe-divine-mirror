import type { Theme } from '../theme'

const SIZES = {
  compare: [880, 1222],
  build: [880, 608],
  worn: [880, 674],
  item: [880, 760],
  filters: [880, 1584],
  listings: [880, 1174],
} as const

export type ScreenName = keyof typeof SIZES

type ScreenProps = {
  name: ScreenName
  theme: Theme
  alt: string
  eager?: boolean
}

export function Screen({ name, theme, alt, eager }: ScreenProps) {
  const [width, height] = SIZES[name]
  return (
    <img
      className="screen"
      src={`/screens/${name}-${theme}.webp`}
      width={width / 2}
      height={height / 2}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}
