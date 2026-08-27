'use client'

type VueLoadingStateProps = {
  loading?: boolean
  error?: string
  skeleton?: boolean
  onRetry?: () => void
}

export function VueLoadingState({ loading = false, error = '', skeleton = false, onRetry }: VueLoadingStateProps) {
  if (loading && skeleton) {
    return <div className="anime-grid" aria-label="正在加载">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="rounded-xl overflow-hidden"><div className="skeleton aspect-[2/3]" /><div className="skeleton h-3 mt-2 rounded" /><div className="skeleton h-2 mt-1 rounded w-2/3" /></div>)}
    </div>
  }
  if (loading) return <div className="flex justify-center py-12" aria-label="正在加载"><span className="loading loading-spinner loading-lg text-primary/60" /></div>
  if (error) return <div className="text-center py-12"><p className="mb-2 text-error">{error}</p>{onRetry ? <button className="btn btn-ghost btn-sm text-primary" type="button" onClick={onRetry}>重试</button> : null}</div>
  return null
}