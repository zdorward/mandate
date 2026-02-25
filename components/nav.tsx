'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/mandate', label: 'Mandate' },
  { href: '/proposals', label: 'Proposals' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-white">
      <div className="container mx-auto px-6 flex h-16 items-center">
        <Link href="/" className="mr-8 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
            <span className="text-background font-bold text-sm">M</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Mandate</span>
        </Link>
        <div className="flex gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
