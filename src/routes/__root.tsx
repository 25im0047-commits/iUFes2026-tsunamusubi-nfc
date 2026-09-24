import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({ meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: 'iUFes2026 おばけMap' }] }),
  component: Root,
})

function Root() {
  return <Document><Outlet /></Document>
}

function Document({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="ja"><head><HeadContent /></head><body>{children}<Scripts /></body></html>
}
