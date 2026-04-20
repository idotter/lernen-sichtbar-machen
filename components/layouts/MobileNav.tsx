'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/navigation/config'

interface MobileNavProps {
  items: NavItem[]
  displayName: string
}

export function MobileNav({ items, displayName }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Sheet schliesst automatisch bei Seitenwechsel
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden min-h-[44px] min-w-[44px]"
          aria-label="Navigation öffnen"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 pt-10">
        <nav aria-label="Mobile Navigation">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center min-h-[44px] px-3 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-lsm-action text-white'
                      : 'hover:bg-muted text-lsm-text'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 pt-6 border-t text-sm text-muted-foreground px-3">
          {displayName}
        </div>
      </SheetContent>
    </Sheet>
  )
}
