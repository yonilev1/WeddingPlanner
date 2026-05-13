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
type GuestSort = 'name' | 'group'

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
  const [sort, setSort] = useState<GuestSort>('name')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<GuestDraft>(emptyGuest())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkGroup, setBulkGroup] = useState('')
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


  // Get all unique groups for the dropdown
  const allGroups = Array.from(new Set(guests.map(g => g.group_name).filter((g): g is string => g !== null && g !== ''))).sort()

  const filtered = guests.filter(guest => {
    if (filter !== 'all' && guest.rsvp_status !== filter) return false
    if (groupFilter && guest.group_name !== groupFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const inName = guest.name.toLowerCase().includes(q)
      const inEmail = guest.email?.toLowerCase().includes(q) ?? false
      const inGroup = guest.group_name?.toLowerCase().includes(q) ?? false
      if (!inName && !inEmail && !inGroup) return false
    }
    return true
  }).sort((a, b) => {
    if (sort === 'group') {
      const groupA = a.group_name ?? ''
      const groupB = b.group_name ?? ''
      if (groupA !== groupB) {
        return groupA.localeCompare(groupB)
      }
      return a.name.localeCompare(b.name)
    }
    return a.name.localeCompare(b.name)
  })

  const total = guests.length
  const confirmed = guests.filter(g => g.rsvp_status === 'confirmed').length
  const declined = guests.filter(g => g.rsvp_status === 'declined').length
  const pending = guests.filter(g => g.rsvp_status === 'pending').length
  const plusOnes = guests.filter(g => g.plus_one).length
  const confirmedPlusOnes = guests.filter(g => g.rsvp_status === 'confirmed' && g.plus_one).length
  const attending = confirmed + confirmedPlusOnes

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
        group_name: bulkGroup.trim() || null,
        notes: null,
      }))
      await bulkAddGuests.mutateAsync(guests)
      const peopleCount = bulkEntries.reduce((sum, e) => sum + (e.isCouple ? 2 : 1), 0)
      toast.success(g.bulkImportSuccess(peopleCount))
      setBulkOpen(false)
      setBulkText('')
      setBulkGroup('')
      setBulkEntries([])
    } catch {
      toast.error(g.failedToast)
    } finally {
      setBulkSaving(false)
    }
  }

  function printGuestList() {
    const rsvpLabel = (status: string) =>
      status === 'confirmed' ? 'Confirmed' : status === 'declined' ? 'Declined' : 'Pending'

    const rows = guests
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(guest => `
        <tr>
          <td>${guest.name}</td>
          <td>${guest.plus_one ? (guest.plus_one_name || '+1') : '—'}</td>
          <td class="rsvp rsvp-${guest.rsvp_status}">${rsvpLabel(guest.rsvp_status)}</td>
          <td>${guest.group_name ?? '—'}</td>
          <td>${guest.table_number != null ? guest.table_number : '—'}</td>
          <td>${guest.dietary ?? '—'}</td>
          <td>${guest.email ?? '—'}</td>
        </tr>
      `).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Guest List</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; color: #1a1a1a; padding: 32px; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .meta { font-size: 13px; color: #666; margin-bottom: 24px; }
        .stats { display: flex; gap: 24px; margin-bottom: 24px; }
        .stat { background: #f5f5f4; border-radius: 8px; padding: 10px 16px; }
        .stat-val { font-size: 20px; font-weight: 700; }
        .stat-lbl { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .05em; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #666; padding: 8px 10px; border-bottom: 2px solid #e5e5e5; }
        td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        .rsvp { font-weight: 600; font-size: 11px; }
        .rsvp-confirmed { color: #16a34a; }
        .rsvp-declined { color: #dc2626; }
        .rsvp-pending { color: #d97706; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>Guest List</h1>
      <p class="meta">Exported ${new Date().toLocaleDateString()} · ${guests.length} guests total</p>
      <div class="stats">
        <div class="stat"><div class="stat-val">${total}</div><div class="stat-lbl">Total</div></div>
        <div class="stat"><div class="stat-val">${confirmed}</div><div class="stat-lbl">Confirmed</div></div>
        <div class="stat"><div class="stat-val">${declined}</div><div class="stat-lbl">Declined</div></div>
        <div class="stat"><div class="stat-val">${pending}</div><div class="stat-lbl">Pending</div></div>
        <div class="stat"><div class="stat-val">${attending}</div><div class="stat-lbl">Attending (incl. +1s)</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Name</th><th>+1</th><th>RSVP</th><th>Group</th><th>Table</th><th>Dietary</th><th>Email</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 300)
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
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{g.title}</h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{g.subtitle}</p>
          </div>
          {/* Primary action — always visible */}
          <button
            onClick={openAdd}
            style={{
              padding: '9px 16px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            + {g.addGuest}
          </button>
        </div>
        {/* Secondary actions row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => { setBulkText(''); setBulkGroup(''); setBulkEntries([]); setBulkOpen(true) }}
            style={{
              padding: '7px 14px', background: 'var(--bg-card)', color: 'var(--ink-2)',
              border: '1px solid var(--line)', borderRadius: 9, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ↑ {g.importList}
          </button>
          {guests.length > 0 && (
            <button
              onClick={printGuestList}
              style={{
                padding: '7px 14px', background: 'var(--bg-card)', color: 'var(--ink-2)',
                border: '1px solid var(--line)', borderRadius: 9, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              PDF
            </button>
          )}
          {isAdmin && guests.length > 0 && (
            confirmDeleteAll ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 10px', borderRadius: 9, background: 'var(--bad-soft, #fee2e2)', border: '1px solid var(--bad)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bad)' }}>{g.deleteAllConfirm}</span>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteAllGuests.isPending}
                  style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'var(--bad)', color: '#fff', border: 'none', fontWeight: 700 }}
                >✓</button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  style={{ padding: '3px 6px', fontSize: 11, borderRadius: 6, cursor: 'pointer', background: 'var(--bg-soft)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                style={{
                  padding: '7px 14px', background: 'transparent', color: 'var(--bad)',
                  border: '1px solid var(--bad)', borderRadius: 9, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {g.deleteAll}
              </button>
            )
          )}
        </div>
      </div>

      {/* Stats tiles — 4 on mobile (drop plusOnes), 5 on desktop */}
      <div className="stat-tiles-grid guest-stat-tiles" style={{ marginBottom: 16 }}>
        {[
          { label: g.total, value: total },
          { label: g.attending, value: attending },
          { label: g.notAttending, value: declined },
          { label: g.awaitingReply, value: pending },
          { label: g.plusOnes, value: plusOnes, mobileHide: true },
        ].map(({ label, value, mobileHide }) => (
          <div key={label} className={mobileHide ? 'guest-stat-desktop' : ''} style={{ padding: '12px 16px', background: 'var(--bg-card)' }}>
            <p className="font-display" style={{ fontSize: 28, fontWeight: 400, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p className="font-mono-ui" style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
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

      {/* Filters + search + sort + group filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {/* Row 1: RSVP filter pills (full width) */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-soft)', borderRadius: 10 }}>
          {FILTERS.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
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
        {/* Row 2: search + group + sort in one line */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={g.searchPlaceholder}
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          />
          <select
            value={groupFilter ?? ''}
            onChange={e => setGroupFilter(e.target.value || null)}
            style={{ ...inputStyle, width: 'auto', minWidth: 0, flexShrink: 1 }}
          >
            <option value="">{g.filterAllGroups}</option>
            {allGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as GuestSort)}
            style={{ ...inputStyle, width: 'auto', minWidth: 0, flexShrink: 1 }}
          >
            <option value="name">{g.sortByName}</option>
            <option value="group">{g.sortByGroup}</option>
          </select>
        </div>
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

            <div style={{ marginBottom: 12 }}>
              <label className="font-mono-ui" style={fieldLabel}>{g.group} <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — applied to all)</span></label>
              <input
                value={bulkGroup}
                onChange={e => setBulkGroup(e.target.value)}
                placeholder={g.groupPlaceholder}
                style={inputStyle}
              />
            </div>

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
