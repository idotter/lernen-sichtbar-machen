export default function Loading() {
  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-32 animate-pulse bg-muted rounded" />
        <div className="h-4 w-96 max-w-full animate-pulse bg-muted rounded" />
        <div className="h-40 w-full animate-pulse bg-muted rounded" />
      </div>
    </div>
  )
}
