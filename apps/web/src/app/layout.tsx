import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InterviewsFirst - Land Interviews. Leave the Hard Work to Us.',
  description: 'We manage your entire job search portfolio — from crafting tailored resumes to securing interviews — so you can focus on preparing for success.',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8FB' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1020' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  )
} 