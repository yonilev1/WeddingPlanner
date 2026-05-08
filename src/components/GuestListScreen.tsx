import { useState } from 'react'
import type { Guest } from '../types/database'
import { useGuests, useAddGuest, useUpdateGuest, useDeleteGuest } from '../hooks/useGuests'
import { useTranslation } from '../i18n/useTranslation'
import { useToast } from '../hooks/useToast'

interface Props {
  weddingId: string
}

type RsvpFilter = 'all' | 'confirmed' | 'declined' | 'pending'

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--ink-4)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
  fontFamily: 'var(--font-mono, monospace)',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  outline: 'none', boxSizing: 'border-box',
}

const rsvpColors: Record<string, { bg: string; color: string }> = {
  confirmed: { bg: 'var(--ok)',   color: '#fff' },
  declined:  { bg: 'var(--bad)',  color: '#fff' },
  pending:   { bg: 'var(--warn)', color: '#fff' },
}

function RsvpPill({ status, label }: { status: string; label: string }) {
  const c = rsvpColors[status] ?? { bg: 'var(--bg-soft)', color: 'var(--ink-3)' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11,
      fontWeight: 600, background: c.bg, color: c.color,
    }}>
      {label}
    </span>
  )
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

export function GuestListScreen({ weddingId }: Props) {
  const tr = useTranslation()
  const g = tr.guests
  const toast = useToast()

  const { data: guests = [], isLoading } = useGuests(weddingId)
  const addGuest = useAddGuest()
  const updateGuest = useUpdateGuest()
  const deleteGuest = useDeleteGuest()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RsvpFilter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<GuestDraft>(emptyGuest())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const rsvpLabels: Record<string, string> = {
    confirmed: g.confirmed,
    declined:  g.declined,
    pending:   g.pending,
  }

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
        <button
          onClick={openAdd}
          style={{
            padding: '9px 18px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          + {g.addGuest}
        </button>
      </div>

      {/* Stats tiles */}
      <div className="stat-tiles-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 28 }}>
        {[
          { label: g.total, value: total },
          { label: g.attending, value: attending },
          { label: g.notAttending, value: declined },
          { label: g.awaitingReply, value: pending },
          { label: g.plusOnes, value: plusOnes },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          </div>
        ))}
      </div>

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

      {/* Guest table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{g.noGuests}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{g.noGuestsHint}</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14,
          border: '1px solid var(--line)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1fr 1.2fr 0.6fr 0.6fr 0.7fr auto',
            gap: '0 16px', padding: '10px 16px',
            background: 'var(--bg-soft)',
            borderBottom: '1px solid var(--line)',
          }}>
            {[g.name, 'RSVP', g.dietary, g.plusOne, g.tableNumber, g.group, ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono,monospace)' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((guest, idx) => (
            <div
              key={guest.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1fr 1.2fr 0.6fr 0.6fr 0.7fr auto',
                gap: '0 16px', padding: '12px 16px', alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--line-soft)' : 'none',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-soft)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 1 }}>{guest.name}</p>
                {guest.email && <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{guest.email}</p>}
              </div>

              <div>
                <RsvpPill status={guest.rsvp_status} label={rsvpLabels[guest.rsvp_status] ?? guest.rsvp_status} />
                {guest.plus_one_name && (
                  <p style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}>+{guest.plus_one_name}</p>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>{guest.dietary ?? '—'}</p>

              <p style={{ fontSize: 12, color: guest.plus_one ? 'var(--ok)' : 'var(--ink-4)', textAlign: 'center' }}>
                {guest.plus_one ? '✓' : '—'}
              </p>

              <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
                {guest.table_number ?? '—'}
              </p>

              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>{guest.group_name ?? '—'}</p>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => openEdit(guest)}
                  style={{
                    padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                    background: 'var(--bg-soft)', color: 'var(--ink-3)',
                    border: '1px solid var(--line)', fontWeight: 500,
                  }}
                >
                  {tr.admin.editComment}
                </button>
                {confirmDeleteId === guest.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleDelete(guest.id)}
                      style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'var(--bad)', color: '#fff', border: 'none', fontWeight: 600 }}
                    >✓</button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'var(--bg-soft)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(guest.id)}
                    style={{
                      padding: '4px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                      background: 'transparent', color: 'var(--bad)',
                      border: '1px solid var(--line)',
                    }}
                  >×</button>
                )}
              </div>
            </div>
          ))}
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
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                {editingId ? g.editGuest : g.addGuest}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Name */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={fieldLabel}>{g.name}</label>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder={g.namePlaceholder} style={inputStyle} />
              </div>

              {/* Email */}
              <div>
                <label style={fieldLabel}>{g.email}</label>
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
