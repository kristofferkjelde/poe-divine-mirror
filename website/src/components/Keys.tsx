export function Keys({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span className={['keys', className].filter(Boolean).join(' ')}>
      {keys.map((key, i) => (
        <span key={key} className="keys-item">
          {i > 0 && <span className="keys-plus">+</span>}
          <kbd>{key}</kbd>
        </span>
      ))}
    </span>
  )
}
