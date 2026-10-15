import { formatAge, formatPrice, typicalListing } from '../../../shared/trade/price'
import { checkPrice, type PriceState } from '../overlayStore'

interface Props {
  price: PriceState
  hotkey: string
}

export function PriceView({ price, hotkey }: Props) {
  if (price.status === 'idle') {
    return (
      <p className="price price-idle">
        <button type="button" className="panel-link" onClick={() => void checkPrice()}>
          ⚖ Check trade price
        </button>
        <span className="price-note">{hotkey}</span>
      </p>
    )
  }

  if (price.status === 'loading') {
    return <p className="price price-note">Searching the trade site…</p>
  }

  const { result } = price
  if (!result.ok) {
    return (
      <section className="price">
        <p className="price-error">{result.error}</p>
        {result.url && <TradeLink url={result.url} />}
      </section>
    )
  }

  const now = Date.now()
  const cheapest = result.listings[0]
  const typical = typicalListing(result.listings)

  return (
    <section className="price">
      <header className="price-head">
        <span className="price-title">Trade · {result.league}</span>
        <TradeLink url={result.url} />
      </header>
      {cheapest && typical ? (
        <>
          <p className="price-summary">
            <span>
              <small>Cheapest</small> {formatPrice(cheapest)}
            </span>
            <span>
              <small>Typical</small> {formatPrice(typical)}
            </span>
          </p>
          <ol className="price-listings">
            {result.listings.slice(0, 6).map((listing, index) => (
              <li key={index} title={listing.indexed && `Listed ${new Date(listing.indexed).toLocaleString()}`}>
                {formatPrice(listing)}
                {formatAge(listing.indexed, now) && <small> {formatAge(listing.indexed, now)}</small>}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="price-note">No priced listings found online.</p>
      )}
      <p className="price-note">
        {result.total} listed
        {result.matched.length > 0 &&
          ` · ${result.relaxed ? `matching ${result.matched.length - 1} of ${result.matched.length}` : `matching all ${result.matched.length}`} mods at 80%+ of your rolls`}
      </p>
      {result.unmatched.length > 0 && (
        <p className="price-note" title={result.unmatched.join('\n')}>
          {result.unmatched.length} mod{result.unmatched.length === 1 ? '' : 's'} not searchable on trade
        </p>
      )}
    </section>
  )
}

function TradeLink({ url }: { url: string }) {
  return (
    <button type="button" className="panel-link price-link" onClick={() => window.overlay.openTrade(url)}>
      Open on trade ↗
    </button>
  )
}
