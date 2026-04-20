'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps {
  href: string
  children: React.ReactNode
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'px-3 min-h-[44px] flex items-center text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-lsm-action text-white'
          : 'text-lsm-text hover:bg-muted'
      )}
    >
      {children}
    </Link>
  )
}
