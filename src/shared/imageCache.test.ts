import { describe, expect, it } from 'vitest'
import { cachedImageUrl, remoteImage } from './imageCache'
import { ART_ORIGIN } from './item/art'

describe('image cache urls', () => {
  it('round-trips item art and currency icons', () => {
    const art = `${ART_ORIGIN}Rings/Basetypes/IronRing.webp`
    const icon = 'https://web.poecdn.com/gen/image/WzI1LDE0/abc/CurrencyModValues.png?scale=1'
    expect(cachedImageUrl(art)).toBe('divine-art://repoe/Rings%2FBasetypes%2FIronRing.webp')
    expect(remoteImage(cachedImageUrl(art)!)).toEqual({ url: art, type: 'image/webp' })
    expect(remoteImage(cachedImageUrl(icon)!)).toEqual({ url: icon, type: 'image/png' })
  })

  it('leaves other hosts alone', () => {
    expect(cachedImageUrl('https://example.com/a.png')).toBeUndefined()
    expect(cachedImageUrl(undefined)).toBeUndefined()
  })

  it('refuses paths that escape the source', () => {
    expect(remoteImage('divine-art://repoe/..%2F..%2F..%2Fsecret')).toBeUndefined()
    expect(remoteImage('divine-art://poecdn/%2F%2Fevil.example%2Fx.png')).toBeUndefined()
    expect(remoteImage('divine-art://elsewhere/a.png')).toBeUndefined()
    expect(remoteImage('https://web.poecdn.com/a.png')).toBeUndefined()
  })
})
