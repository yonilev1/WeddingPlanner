import { useState, useEffect, useRef } from 'react'
import type { Wedding } from '../types/database'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useTranslation } from '../i18n/useTranslation'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  wedding: Wedding
  onClose: () => void
}

interface PlaceResult {
  display_name: string
  lat: string
  lon: string
  place_id: number
}

function VenueAutocomplete({
  value,
  onChange,
  inputCls,
}: {
  value: string
  onChange: (address: string) => void
  inputCls: string
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<PlaceResult[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [confirmed, setConfirmed] = useState(!!value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    setConfirmed(false)
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=1&accept-language=he`,
          { headers: { 'Accept-Language': 'he' } }
        )
        const data: PlaceResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 450)
  }

  function handleSelect(place: PlaceResult) {
    setQuery(place.display_name)
    onChange(place.display_name)
    setConfirmed(true)
    setOpen(false)
    setResults([])
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="הקלד שם אולם או כתובת..."
          className={inputCls}
          style={{ paddingLeft: '2rem' }}
          autoComplete="off"
        />
        {/* Status icon */}
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, pointerEvents: 'none',
          color: confirmed ? '#16a34a' : '#aaa',
        }}>
          {searching ? '⟳' : confirmed ? '✓' : '📍'}
        </span>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          maxHeight: 240, overflowY: 'auto', marginTop: 4,
        }}>
          {results.map(place => (
            <button
              key={place.place_id}
              type="button"
              onClick={() => handleSelect(place)}
              style={{
                width: '100%', textAlign: 'right', padding: '10px 14px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6', display: 'flex',
                alignItems: 'flex-start', gap: 8, transition: 'background 120ms',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fef3f2')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📍</span>
              <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4, textAlign: 'right' }}>
                {place.display_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Confirmed address preview with map link */}
      {confirmed && query && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: '#f0fdf4', border: '1px solid #86efac',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 11, color: '#15803d', flex: 1 }}>✓ המיקום אושר</span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            בדוק במפה ↗
          </a>
        </div>
      )}
    </div>
  )
}

export function WeddingSettingsPanel({ wedding, onClose }: Props) {
  const tr = useTranslation()
  const s = tr.settings
  const toast = useToast()
  const qc = useQueryClient()

  const [name, setName] = useState(wedding.name)
  const [date, setDate] = useState(wedding.date ?? '')
  const [budgetTotal, setBudgetTotal] = useState<string>(
    wedding.budget_total != null ? String(wedding.budget_total) : ''
  )
  const [venueAddress, setVenueAddress] = useState(wedding.venue_address ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wb = supabase.from('weddings') as any
    let { error } = await wb
      .update({
        name: name.trim(),
        date: date || null,
        budget_total: budgetTotal !== '' ? Number(budgetTotal) : null,
        venue_address: venueAddress.trim() || null,
      })
      .eq('id', wedding.id)

    // If budget_total column doesn't exist yet in DB, retry without it
    if (error && error.message?.includes('budget_total')) {
      const retry = await wb
        .update({ name: name.trim(), date: date || null, venue_address: venueAddress.trim() || null })
        .eq('id', wedding.id)
      error = retry.error
    }

    setSaving(false)

    if (error) {
      toast.error(s.failedToast)
    } else {
      qc.invalidateQueries({ queryKey: ['wedding', wedding.id] })
      toast.success(s.savedToast)
      onClose()
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 ' +
    'text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-stone-900/25 backdrop-blur-[2px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-stone-900 z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700">
          <h2 className="font-semibold text-stone-800 dark:text-stone-100">{s.title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {s.weddingName}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {s.weddingDate} <span className="normal-case text-stone-300 font-normal">{s.dateOptional}</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-stone-400 mt-1.5">{s.dateHint}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              {s.budgetTotal} <span className="normal-case text-stone-300 font-normal">{s.dateOptional}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">$</span>
              <input
                type="number"
                min={0}
                step={100}
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
                placeholder={s.budgetTotalPlaceholder}
                className={inputCls}
                style={{ paddingLeft: '1.75rem' }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-1.5">{s.budgetTotalHint}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              כתובת האולם{' '}
              <span className="normal-case text-stone-300 font-normal">(לניווט בדף RSVP)</span>
            </label>
            <VenueAutocomplete
              value={venueAddress}
              onChange={setVenueAddress}
              inputCls={inputCls}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-medium rounded-xl transition-colors text-sm"
            >
              {saving ? s.saving : s.save}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium rounded-xl transition-colors text-sm"
            >
              {s.cancel}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
