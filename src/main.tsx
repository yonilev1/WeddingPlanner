import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { RsvpPage } from './pages/RsvpPage.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Detect /rsvp/:token route before mounting the full app
const rsvpMatch = window.location.pathname.match(/^\/rsvp\/([a-f0-9]{32})$/)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rsvpMatch ? (
      <RsvpPage token={rsvpMatch[1]} />
    ) : (
      <QueryClientProvider client={queryClient}>
        <App />
        <Analytics />
      </QueryClientProvider>
    )}
  </StrictMode>,
)
