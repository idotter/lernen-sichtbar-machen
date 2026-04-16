export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lsm-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
