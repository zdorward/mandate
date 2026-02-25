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
    <nav className="border-b bg-background">
      <div className="container flex h-14 items-center">
        <div className="mr-8 font-semibold">Mandate</div>
        <div className="flex gap-6">
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
