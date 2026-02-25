import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'

export const metadata: Metadata = {
  title: 'Mandate',
  description: 'AI-native decision governance system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Nav />
        <main className="container mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  )
}
