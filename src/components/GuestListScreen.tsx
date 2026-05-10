import { useState, useEffect } from 'react'
import type { Guest } from '../types/database'
import { useGuests, useAddGuest, useUpdateGuest, useDeleteGuest, useDeleteAllGuests, useBulkAddGuests } from '../hooks/useGuests'
import { useTranslation } from '../i18n/useTranslation'
import { useToast } from '../hooks/useToast'
import { useUIStore } from '../store/uiStore'

interface Props {
  weddingId: string
  isAdmin?: boolean
}

type RsvpFilter = 'all' | 'confirmed' | 'declined' | 'pending'

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
}


const emptyGuest = (): Omit<Guest, 'id' | 'created_at'> & { id?: string; created_at?: string } => ({
  wedding_id: '',
  name: '',
  email: null,
  rsvp_status: 'pending',
  dietary: null,
  plus_one: false,
  plus_one_name: null,
  table_number: null,
  group_name: null,
  notes: null,
})

type GuestDraft = ReturnType<typeof emptyGuest>

export function GuestListScreen({ weddingId, isAdmin = false }: Props) {
  const tr = useTranslation()
  const g = tr.guests
  const toast = useToast()
  const { guestFormOpen, setGuestFormOpen } = useUIStore()

  const { data: guests = [], isLoading } = useGuests(weddingId)
  const addGuest = useAddGuest()
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()
  const deleteAllGuests = useDeleteAllGuests()
  const bulkAddGuests = useBulkAddGuests()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RsvpFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<GuestDraft>(emptyGuest())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkEntries, setBulkEntries] = useState<{ name: string; isCouple: boolean }[]>([])

  // Open add form when triggered from another screen (e.g. Dashboard quick action)
  useEffect(() => {
    if (guestFormOpen) {
      setEditingId(null)
      setDraft(emptyGuest())
      setFormOpen(true)
      setGuestFormOpen(false)
    }
  }, [guestFormOpen]) // eslint-disable-line react-hooks/exhaustive-deps


  const filtered = guests.filter(guest => {
    if (filter !== 'all' && guest.rsvp_status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const inName = guest.name.toLowerCase().includes(q)
      const inEmail = guest.email?.toLowerCase().includes(q) ?? false
      const inGroup = guest.group_name?.toLowerCase().includes(q) ?? false
      if (!inName && !inEmail && !inGroup) return false
    }
    return true
  })

  const total = guests.length
  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length
  const declined = guests.filter(g => g.rsvp_status === 'declined').length
  const pending = guests.filter(g => g.rsvp_status === 'pending').length
  const plusOnes = guests.filter(g => g.plus_one).length
  const attending = confirmed + plusOnes

  function openAdd() {
    setEditingId(null)
    setDraft(emptyGuest())
    setFormOpen(true)
  }

  function openEdit(guest: Guest) {
    setEditingId(guest.id)
    setDraft({ ...guest })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setDraft(emptyGuest())
  }

  async function handleSave() {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { wedding_id: _w, ...guestData } = draft
      if (editingId) {
        await updateGuest.mutateAsync({ id: editingId, wedding_id: weddingId, ...guestData })
      } else {
        await addGuest.mutateAsync({ ...guestData, wedding_id: weddingId })
      }
      toast.success(g.savedToast)
      closeForm()
    } catch {
      toast.error(g.failedToast)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGuest.mutateAsync({ id, wedding_id: weddingId })
      toast.success(g.deletedToast)
    } catch {
      toast.error(g.failedToast)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  async function handleDeleteAll() {
    try {
      await deleteAllGuests.mutateAsync(weddingId)
      toast.success(g.deleteAllToast)
    } catch {
      toast.error(g.failedToast)
    } finally {
      setConfirmDeleteAll(false)
    }
  }

  const COUPLE_PATTERN = /\band\b|\bund\b|\bet\b|\by\b|\boch\b|\bи\b|&|\sו[א-ת]/

  function parseBulkEntries(text: string): { name: string; isCouple: boolean }[] {
    return text
      .split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(name => ({ name, isCouple: COUPLE_PATTERN.test(name) }))
  }

  function handleBulkTextChange(text: string) {
    setBulkText(text)
    setBulkEntries(parseBulkEntries(text))
  }

  function toggleCouple(i: number) {
    setBulkEntries(prev => prev.map((e, idx) => idx === i ? { ...e, isCouple: !e.isCouple } : e))
  }

  async function handleBulkImport() {
    if (bulkEntries.length === 0) { toast.error(g.bulkImportEmpty); return }
    setBulkSaving(true)
    try {
      const guests = bulkEntries.map(({ name, isCouple }) => ({
        wedding_id: weddingId,
        name,
        email: null,
        rsvp_status: 'pending' as const,
        dietary: null,
        plus_one: isCouple,
        plus_one_name: null,
        table_number: null,
        group_name: null,
        notes: null,
      }))
      await bulkAddGuests.mutateAsync(guests)
      const peopleCount = bulkEntries.reduce((sum, e) => sum + (e.isCouple ? 2 : 1), 0)
      toast.success(g.bulkImportSuccess(peopleCount))
      setBulkOpen(false)
      setBulkText('')
      setBulkEntries([])
    } catch {
      toast.error(g.failedToast)
    } finally {
      setBulkSaving(false)
    }
  }

  const FILTERS: [RsvpFilter, string][] = [
    ['all', g.filterAll],
    ['confirmed', g.filterConfirmed],
    ['declined', g.filterDeclined],
    ['pending', g.filterPending],
  ]

  return (
    <div className="dashboard-page" style={{ maxWidth: 1080 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{g.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{g.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && guests.length > 0 && (
            confirmDeleteAll ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px', borderRadius: 10, background: 'var(--bad-soft, #fee2e2)', border: '1px solid var(--bad)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bad)' }}>{g.deleteAllConfirm}</span>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteAllGuests.isPending}
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'var(--bad)', color: '#fff', border: 'none', fontWeight: 700 }}
                >✓</button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'var(--bg-soft)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                style={{
                  padding: '9px 14px', background: 'transparent', color: 'var(--bad)',
                  border: '1px solid var(--bad)', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {g.deleteAll}
              </button>
            )
          )}
          <button
            onClick={() => { setBulkText(''); setBulkOpen(true) }}
            style={{
              padding: '9px 18px', background: 'var(--bg-card)', color: 'var(--ink-2)',
              border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ↑ {g.importList}
          </button>
          <button
            onClick={openAdd}
            style={{
              padding: '9px 18px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + {g.addGuest}
          </button>
        </div>
      </div>

      {/* Stats tiles */}
      <div className="stat-tiles-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: g.total, value: total },
          { label: g.attending, value: attending },
          { label: g.notAttending, value: declined },
          { label: g.awaitingReply, value: pending },
          { label: g.plusOnes, value: plusOnes },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
            <p className="font-display" style={{ fontSize: 32, fontWeight: 400, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p className="font-mono-ui" style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* RSVP ratio bar */}
      {total > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
            {confirmed > 0 && <div style={{ flex: confirmed, background: 'var(--ok)', transition: 'flex 300ms' }} />}
            {declined > 0 && <div style={{ flex: declined, background: 'var(--bad)', transition: 'flex 300ms' }} />}
            {pending > 0 && <div style={{ flex: pending, background: 'var(--line)', transition: 'flex 300ms' }} />}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: 'var(--ink-4)' }}>
            <span><span style={{ color: 'var(--ok)', fontWeight: 700 }}>{confirmed}</span> {g.filterConfirmed.toLowerCase()}</span>
            <span><span style={{ color: 'var(--bad)', fontWeight: 700 }}>{declined}</span> {g.filterDeclined.toLowerCase()}</span>
            <span><span style={{ color: 'var(--ink-3)', fontWeight: 700 }}>{pending}</span> {g.filterPending.toLowerCase()}</span>
          </div>
        </div>
      )}

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-soft)', borderRadius: 10 }}>
          {FILTERS.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 120ms',
                background: filter === val ? 'var(--bg-card)' : 'transparent',
                color: filter === val ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: filter === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={g.searchPlaceholder}
          style={{ ...inputStyle, flex: 1, minWidth: 160, maxWidth: 280 }}
        />
      </div>

      {/* Guest card grid — unified layout for all screen sizes */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{g.noGuests}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{g.noGuestsHint}</p>
        </div>
      ) : (
        <div className="guest-card-grid">
          {filtered.map((guest) => {
            // Avatar color derived from name
            const hue = [...guest.name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360
            const initials = guest.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const rsvpBadge = {
              confirmed: { bg: 'var(--ok-soft)', c: 'var(--ok-ink, var(--ok))', label: g.confirmed },
              declined:  { bg: 'var(--bad-soft)', c: 'var(--bad-ink, var(--bad))', label: g.declined },
              pending:   { bg: 'var(--warn-soft)', c: 'var(--warn-ink, var(--warn))', label: g.pending },
            }[guest.rsvp_status] ?? { bg: 'var(--bg-soft)', c: 'var(--ink-3)', label: guest.rsvp_status }
            return (
            <div key={guest.id} style={{
              background: 'var(--bg-card)', borderRadius: 14,
              border: '1px solid var(--line)',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Card body */}
              <div style={{ padding: '14px 16px', flex: 1 }}>
                {/* Avatar row + RSVP badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 999, flexShrink: 0,
                    background: `oklch(0.88 0.06 ${hue})`,
                    color: `oklch(0.38 0.10 ${hue})`,
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                  }}>{initials}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: rsvpBadge.bg, color: rsvpBadge.c, whiteSpace: 'nowrap' }}>
                    {rsvpBadge.label}
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.name}</p>
                {guest.email && <p style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>{guest.email}</p>}

                {/* Meta chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginBottom: 10 }}>
                  {guest.dietary && (
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-soft)', padding: '2px 7px', borderRadius: 999 }}>{guest.dietary}</span>
                  )}
                  {guest.plus_one && (
                    <span style={{ fontSize: 11, color: 'var(--ok-ink, var(--ok))', background: 'var(--ok-soft)', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
                      +1{guest.plus_one_name ? ` ${guest.plus_one_name}` : ''}
                    </span>
                  )}
                  {guest.table_number != null && (
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-soft)', padding: '2px 7px', borderRadius: 999 }}>
                      T{guest.table_number}
                    </span>
                  )}
                  {guest.group_name && (
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--bg-soft)', padding: '2px 7px', borderRadius: 999, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{guest.group_name}</span>
                  )}
                </div>
              </div>

              {/* Inline RSVP toggle — ✓ Yes / ? Pending / ✕ No */}
              <div style={{ display: 'flex', borderTop: '1px solid var(--line-soft)', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
                {([
                  { status: 'confirmed' as const, icon: '✓', lbl: 'Yes',     a: 'var(--ok)',   s: 'var(--ok-soft)' },
                  { status: 'pending'   as const, icon: '?', lbl: 'Pending', a: 'var(--warn)', s: 'var(--warn-soft)' },
                  { status: 'declined'  as const, icon: '✕', lbl: 'No',      a: 'var(--bad)',  s: 'var(--bad-soft)' },
                ]).map(({ status, icon, lbl, a, s }) => {
                  const active = guest.rsvp_status === status
                  return (
                    <button
                      key={status}
                      onClick={() => updateGuest.mutate({ id: guest.id, wedding_id: weddingId, rsvp_status: status })}
                      style={{
                        flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, transition: 'all 120ms',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        background: active ? s : 'transparent',
                        color: active ? a : 'var(--ink-4)',
                        borderRight: '1px solid var(--line-soft)',
                      }}
                    >
                      <span>{icon}</span><span>{lbl}</span>
                    </button>
                  )
                })}
                <button
                  onClick={() => openEdit(guest)}
                  style={{ padding: '9px 14px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--ink-4)', fontSize: 13, transition: 'color 120ms' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ink)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ink-4)')}
                  title={tr.admin.editComment}
                >
                  <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 013.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {confirmDeleteId === guest.id ? (
                  <>
                    <button onClick={() => handleDelete(guest.id)} style={{ padding: '9px 10px', border: 'none', cursor: 'pointer', background: 'var(--bad)', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '9px 10px', border: 'none', cursor: 'pointer', background: 'var(--bg-soft)', color: 'var(--ink-3)', fontSize: 11 }}>✕</button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(guest.id)}
                    style={{ padding: '9px 12px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--ink-4)', fontSize: 15, transition: 'color 120ms' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--bad)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--ink-4)')}
                  >×</button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Bulk import modal */}
      {bulkOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}
          onClick={e => { if (e.target === e.currentTarget) { setBulkOpen(false) } }}
        >
          <div style={{
            width: '100%', maxWidth: 580,
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            padding: '24px 24px 32px',
            maxHeight: '90vh', overflowY: 'auto',
            '@media (max-width: 480px)': { maxWidth: '100%' }
          } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{g.bulkImportTitle}</h2>
              <button onClick={() => setBulkOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>{g.bulkImportHint}</p>

            <textarea
              value={bulkText}
              onChange={e => handleBulkTextChange(e.target.value)}
              placeholder={g.bulkImportPlaceholder}
              rows={6}
              autoFocus
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}
            />

            {/* Per-row preview with couple toggle */}
            {bulkEntries.length > 0 && (() => {
              const peopleCount = bulkEntries.reduce((sum, e) => sum + (e.isCouple ? 2 : 1), 0)
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <p className="font-mono-ui" style={fieldLabel}>{g.bulkImportPreview}</p>
                    <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                      {g.bulkImportCount(peopleCount)}
                    </p>
                  </div>
                  <div style={{
                    maxHeight: 240, overflowY: 'auto',
                    background: 'var(--bg-soft)', borderRadius: 10,
                    padding: '6px 8px',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    {bulkEntries.map((entry, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', borderRadius: 8,
                        background: 'var(--bg-card)',
                        border: `1px solid ${entry.isCouple ? 'var(--accent)' : 'var(--line)'}`,
                      }}>
                        {/* Couple toggle */}
                        <button
                          onClick={() => toggleCouple(i)}
                          title={entry.isCouple ? g.bulkToggleSingle : g.bulkToggleCouple}
                          style={{
                            flexShrink: 0, width: 44, height: 44, borderRadius: 6,
                            border: `1.5px solid ${entry.isCouple ? 'var(--accent)' : 'var(--line)'}`,
                            background: entry.isCouple ? 'var(--accent)' : 'var(--bg-soft)',
                            cursor: 'pointer', fontSize: 14, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 120ms',
                          }}
                        >
                          {entry.isCouple ? '👫' : '👤'}
                        </button>

                        {/* Name */}
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                          {entry.name}
                        </span>

                        {/* People count badge */}
                        <span style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 700,
                          padding: '2px 7px', borderRadius: 999,
                          background: entry.isCouple ? 'var(--accent)' : 'var(--bg-soft)',
                          color: entry.isCouple ? '#fff' : 'var(--ink-4)',
                          border: entry.isCouple ? 'none' : '1px solid var(--line)',
                        }}>
                          {entry.isCouple ? '×2' : '×1'}
                        </span>

                        {/* Auto-detected label */}
                        {entry.isCouple && COUPLE_PATTERN.test(entry.name) && (
                          <span style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>
                            {g.bulkAutoDetected}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setBulkOpen(false)} style={{
                padding: '9px 18px', background: 'var(--bg-soft)', color: 'var(--ink-2)',
                border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              }}>{g.cancel}</button>
              <button
                onClick={handleBulkImport}
                disabled={bulkSaving || bulkEntries.length === 0}
                style={{
                  padding: '9px 20px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: bulkSaving || bulkEntries.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: bulkSaving || bulkEntries.length === 0 ? 0.6 : 1,
                }}
              >
                {bulkSaving ? g.bulkImportAdding : g.bulkImportAdd}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit form panel */}
      {formOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div style={{
            width: '100%', maxWidth: 560,
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            padding: '24px 24px 32px',
            maxHeight: '90vh', overflowY: 'auto',
            '@media (max-width: 480px)': { maxWidth: '100%' }
          } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                {editingId ? g.editGuest : g.addGuest}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Name */}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="font-mono-ui" style={fieldLabel}>{g.name} <span style={{ color: 'var(--bad)' }}>*</span></label>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder={g.namePlaceholder} style={inputStyle} required />
              </div>

              {/* Email */}
              <div>
                <label className="font-mono-ui" style={fieldLabel}>{g.email}</label>
                <input value={draft.email ?? ''} onChange={e => setDraft(d => ({ ...d, email: e.target.value || null }))}
                  placeholder={g.emailPlaceholder} type="email" style={inputStyle} />
              </div>

              {/* RSVP */}
              <div>
                <label style={fieldLabel}>{g.rsvp}</label>
                <select
                  value={draft.rsvp_status}
                  onChange={e => setDraft(d => ({ ...d, rsvp_status: e.target.value as Guest['rsvp_status'] }))}
                  style={inputStyle}
                >
                  <option value="pending">{g.pending}</option>
                  <option value="confirmed">{g.confirmed}</option>
                  <option value="declined">{g.declined}</option>
                </select>
              </div>

              {/* Dietary */}
              <div>
                <label style={fieldLabel}>{g.dietary}</label>
                <input value={draft.dietary ?? ''} onChange={e => setDraft(d => ({ ...d, dietary: e.target.value || null }))}
                  placeholder={g.dietaryPlaceholder} style={inputStyle} />
              </div>

              {/* Group */}
              <div>
                <label style={fieldLabel}>{g.group}</label>
                <input value={draft.group_name ?? ''} onChange={e => setDraft(d => ({ ...d, group_name: e.target.value || null }))}
                  placeholder={g.groupPlaceholder} style={inputStyle} />
              </div>

              {/* Table # */}
              <div>
                <label style={fieldLabel}>{g.tableNumber}</label>
                <input
                  type="number" min={1}
                  value={draft.table_number ?? ''}
                  onChange={e => setDraft(d => ({ ...d, table_number: e.target.value ? Number(e.target.value) : null }))}
                  style={inputStyle}
                />
              </div>

              {/* Plus one */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={draft.plus_one}
                    onChange={e => setDraft(d => ({ ...d, plus_one: e.target.checked, plus_one_name: e.target.checked ? d.plus_one_name : null }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{g.plusOne}</span>
                </label>
              </div>

              {/* Plus one name */}
              {draft.plus_one && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={fieldLabel}>{g.plusOneName}</label>
                  <input value={draft.plus_one_name ?? ''} onChange={e => setDraft(d => ({ ...d, plus_one_name: e.target.value || null }))}
                    placeholder={g.plusOneNamePlaceholder} style={inputStyle} />
                </div>
              )}

              {/* Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={fieldLabel}>{g.notes}</label>
                <textarea
                  value={draft.notes ?? ''}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value || null }))}
                  placeholder={g.notesPlaceholder}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={closeForm} style={{
                padding: '9px 18px', background: 'var(--bg-soft)', color: 'var(--ink-2)',
                border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              }}>{g.cancel}</button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
                style={{
                  padding: '9px 20px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: saving || !draft.name.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !draft.name.trim() ? 0.6 : 1,
                }}
              >
                {saving ? g.saving : g.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
