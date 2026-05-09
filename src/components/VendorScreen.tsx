import { useState } from 'react'
import type { Vendor } from '../types/database'
import { useVendors, useAddVendor, useUpdateVendor, useDeleteVendor } from '../hooks/useVendors'
import { useTaskTree } from '../hooks/useTasks'
import { useTranslation } from '../i18n/useTranslation'
import { useToast } from '../hooks/useToast'

interface Props {
  weddingId: string
}

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

const contractColors: Record<string, { bg: string; color: string }> = {
  signed:  { bg: 'var(--ok)',        color: '#fff'           },
  pending: { bg: 'var(--warn)',       color: '#fff'           },
  none:    { bg: 'var(--bg-soft)',    color: 'var(--ink-3)'   },
}

const CATEGORY_KEYS = ['venue', 'catering', 'photography', 'music', 'flowers', 'attire', 'transport', 'other'] as const
type CategoryKey = typeof CATEGORY_KEYS[number]

const categoryEmoji: Record<CategoryKey, string> = {
  venue: '🏛️', catering: '🍽️', photography: '📷', music: '🎵',
  flowers: '💐', attire: '👗', transport: '🚗', other: '📋',
}

const emptyVendor = (): VendorDraft => ({
  wedding_id: '',
  name: '',
  category: 'other',
  contact_name: null,
  email: null,
  phone: null,
  website: null,
  contract_status: 'none',
  deposit_paid: false,
  deposit_amount: null,
  total_cost: null,
  task_id: null,
  notes: null,
})

type VendorDraft = Omit<Vendor, 'id' | 'created_at'> & { task_id: string | null }

export function VendorScreen({ weddingId }: Props) {
  const tr = useTranslation()
  const v = tr.vendors
  const toast = useToast()

  const { data: vendors = [], isLoading } = useVendors(weddingId)
  const { categories } = useTaskTree(weddingId)
  const addVendor = useAddVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<VendorDraft>(emptyVendor())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const catLabel = (key: string): string => {
    const map: Record<string, string> = {
      venue: v.catVenue, catering: v.catCatering, photography: v.catPhotography,
      music: v.catMusic, flowers: v.catFlowers, attire: v.catAttire,
      transport: v.catTransport, other: v.catOther,
    }
    return map[key] ?? key
  }

  const contractLabel = (status: string) => {
    if (status === 'signed') return v.signed
    if (status === 'pending') return v.pending
    return v.none
  }

  const fmt = (n: number | null) =>
    n == null ? '—' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const filtered = vendors.filter(vendor => {
    if (catFilter !== 'all' && vendor.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!vendor.name.toLowerCase().includes(q) &&
          !(vendor.contact_name ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalVendors = vendors.length
  const signedCount = vendors.filter(v => v.contract_status === 'signed').length
  const totalBudget = vendors.reduce((s, v) => s + (v.total_cost ?? 0), 0)
  const depositPaid = vendors.filter(v => v.deposit_paid).length

  function openAdd() {
    setEditingId(null)
    setDraft(emptyVendor())
    setFormOpen(true)
  }

  function openEdit(vendor: Vendor) {
    setEditingId(vendor.id)
    setDraft({ ...vendor, task_id: (vendor as any).task_id ?? null })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setDraft(emptyVendor())
  }

  async function handleSave() {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { wedding_id: _w, ...vendorData } = draft
      if (editingId) {
        await updateVendor.mutateAsync({ id: editingId, wedding_id: weddingId, ...vendorData })
      } else {
        await addVendor.mutateAsync({ ...vendorData, wedding_id: weddingId })
      }
      toast.success(v.savedToast)
      closeForm()
    } catch {
      toast.error(v.failedToast)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVendor.mutateAsync({ id, wedding_id: weddingId })
      toast.success(v.deletedToast)
    } catch {
      toast.error(v.failedToast)
    } finally {
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="dashboard-page" style={{ maxWidth: 1080 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{v.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{v.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          style={{
            padding: '9px 18px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          + {v.addVendor}
        </button>
      </div>

      {/* Stats */}
      <div className="stat-tiles-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 28 }}>
        {[
          { label: v.totalVendors, value: String(totalVendors) },
          { label: v.contractsSigned, value: String(signedCount) },
          { label: v.depositPaid, value: String(depositPaid) },
          { label: v.totalBudget, value: fmt(totalBudget) },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Category filter + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-soft)', borderRadius: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setCatFilter('all')}
            style={{
              padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 120ms',
              background: catFilter === 'all' ? 'var(--bg-card)' : 'transparent',
              color: catFilter === 'all' ? 'var(--ink)' : 'var(--ink-3)',
              boxShadow: catFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {v.allCategories}
          </button>
          {CATEGORY_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setCatFilter(key)}
              style={{
                padding: '5px 10px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 120ms',
                background: catFilter === key ? 'var(--bg-card)' : 'transparent',
                color: catFilter === key ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: catFilter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {categoryEmoji[key]} {catLabel(key)}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={v.searchPlaceholder}
          style={{ ...inputStyle, flex: 1, minWidth: 160, maxWidth: 240 }}
        />
      </div>

      {/* Vendor cards grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-3)' }}>…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{v.noVendors}</p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{v.noVendorsHint}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {filtered.map(vendor => {
            const cc = contractColors[vendor.contract_status] ?? contractColors.none
            return (
              <div
                key={vendor.id}
                style={{
                  background: 'var(--bg-card)', borderRadius: 14,
                  border: '1px solid var(--line)', padding: '18px 18px 14px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  transition: 'box-shadow 150ms',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
              >
                {/* Card top */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'var(--accent-soft)', display: 'grid', placeItems: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {categoryEmoji[vendor.category as CategoryKey] ?? '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono,monospace)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{catLabel(vendor.category)}</p>
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: cc.bg, color: cc.color, flexShrink: 0,
                  }}>
                    {contractLabel(vendor.contract_status)}
                  </span>
                </div>

                {/* Contact info */}
                {(vendor.contact_name || vendor.email || vendor.phone) && (
                  <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {vendor.contact_name && (
                      <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>👤 {vendor.contact_name}</p>
                    )}
                    {vendor.email && (
                      <a href={`mailto:${vendor.email}`} style={{ fontSize: 12, color: 'var(--accent-ink)', textDecoration: 'none' }}>✉ {vendor.email}</a>
                    )}
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone}`} style={{ fontSize: 12, color: 'var(--ink-2)', textDecoration: 'none' }}>📞 {vendor.phone}</a>
                    )}
                  </div>
                )}

                {/* Cost + deposit */}
                {(vendor.total_cost != null || vendor.deposit_amount != null) && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {vendor.total_cost != null && (
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono,monospace)', textTransform: 'uppercase', marginBottom: 1 }}>{v.totalCost.replace(' ($)', '')}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fmt(vendor.total_cost)}</p>
                      </div>
                    )}
                    {vendor.deposit_amount != null && (
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono,monospace)', textTransform: 'uppercase', marginBottom: 1 }}>Deposit</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: vendor.deposit_paid ? 'var(--ok)' : 'var(--warn)' }}>
                          {fmt(vendor.deposit_amount)} {vendor.deposit_paid ? '✓' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {vendor.notes && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {vendor.notes}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <button
                    onClick={() => openEdit(vendor)}
                    style={{
                      flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, borderRadius: 7,
                      cursor: 'pointer', background: 'var(--bg-soft)', color: 'var(--ink-2)',
                      border: '1px solid var(--line)', transition: 'background 120ms',
                    }}
                  >
                    {tr.admin.editComment}
                  </button>
                  {confirmDeleteId === vendor.id ? (
                    <>
                      <button onClick={() => handleDelete(vendor.id)}
                        style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 7, cursor: 'pointer', background: 'var(--bad)', color: '#fff', border: 'none' }}>
                        ✓
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        style={{ padding: '6px 12px', fontSize: 11, borderRadius: 7, cursor: 'pointer', background: 'var(--bg-soft)', color: 'var(--ink-3)', border: '1px solid var(--line)' }}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(vendor.id)}
                      style={{ padding: '6px 12px', fontSize: 11, borderRadius: 7, cursor: 'pointer', background: 'transparent', color: 'var(--bad)', border: '1px solid var(--line)' }}
                    >×</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit form */}
      {formOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div style={{
            width: '100%', maxWidth: 600,
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            padding: '24px 24px 32px',
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                {editingId ? v.editVendor : v.addVendor}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Name */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={fieldLabel}>{v.name}</label>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder={v.namePlaceholder} style={inputStyle} />
              </div>

              {/* Category */}
              <div>
                <label style={fieldLabel}>{v.category}</label>
                <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={inputStyle}>
                  {CATEGORY_KEYS.map(k => (
                    <option key={k} value={k}>{categoryEmoji[k]} {catLabel(k)}</option>
                  ))}
                </select>
              </div>

              {/* Link to task (optional) */}
              <div>
                <label style={fieldLabel}>Link to Task (Optional)</label>
                <select
                  value={draft.task_id ?? ''}
                  onChange={e => setDraft(d => ({ ...d, task_id: e.target.value || null }))}
                  style={inputStyle}
                >
                  <option value="">— No task linked —</option>
                  {categories.map(cat => (
                    <optgroup key={cat.id} label={cat.title}>
                      <option value={cat.id}>{cat.title} (Category)</option>
                      {(cat.subtasks ?? []).map(sub => (
                        <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.title}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Contract status */}
              <div>
                <label style={fieldLabel}>{v.contractStatus}</label>
                <select
                  value={draft.contract_status}
                  onChange={e => setDraft(d => ({ ...d, contract_status: e.target.value as Vendor['contract_status'] }))}
                  style={inputStyle}
                >
                  <option value="none">{v.none}</option>
                  <option value="pending">{v.pending}</option>
                  <option value="signed">{v.signed}</option>
                </select>
              </div>

              {/* Contact name */}
              <div>
                <label style={fieldLabel}>{v.contactName}</label>
                <input value={draft.contact_name ?? ''} onChange={e => setDraft(d => ({ ...d, contact_name: e.target.value || null }))}
                  placeholder={v.contactPlaceholder} style={inputStyle} />
              </div>

              {/* Email */}
              <div>
                <label style={fieldLabel}>{v.email}</label>
                <input value={draft.email ?? ''} onChange={e => setDraft(d => ({ ...d, email: e.target.value || null }))}
                  placeholder={v.emailPlaceholder} type="email" style={inputStyle} />
              </div>

              {/* Phone */}
              <div>
                <label style={fieldLabel}>{v.phone}</label>
                <input value={draft.phone ?? ''} onChange={e => setDraft(d => ({ ...d, phone: e.target.value || null }))}
                  placeholder={v.phonePlaceholder} style={inputStyle} />
              </div>

              {/* Website */}
              <div>
                <label style={fieldLabel}>{v.website}</label>
                <input value={draft.website ?? ''} onChange={e => setDraft(d => ({ ...d, website: e.target.value || null }))}
                  placeholder={v.websitePlaceholder} type="url" style={inputStyle} />
              </div>

              {/* Total cost */}
              <div>
                <label style={fieldLabel}>{v.totalCost}</label>
                <input type="number" min={0} value={draft.total_cost ?? ''}
                  onChange={e => setDraft(d => ({ ...d, total_cost: e.target.value ? Number(e.target.value) : null }))}
                  style={inputStyle} />
              </div>

              {/* Deposit amount */}
              <div>
                <label style={fieldLabel}>{v.depositAmount}</label>
                <input type="number" min={0} value={draft.deposit_amount ?? ''}
                  onChange={e => setDraft(d => ({ ...d, deposit_amount: e.target.value ? Number(e.target.value) : null }))}
                  style={inputStyle} />
              </div>

              {/* Deposit paid */}
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox" checked={draft.deposit_paid}
                    onChange={e => setDraft(d => ({ ...d, deposit_paid: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{v.depositPaid}</span>
                </label>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={fieldLabel}>{v.notes}</label>
                <textarea value={draft.notes ?? ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value || null }))}
                  placeholder={v.notesPlaceholder} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={closeForm} style={{
                padding: '9px 18px', background: 'var(--bg-soft)', color: 'var(--ink-2)',
                border: '1px solid var(--line)', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              }}>{v.cancel}</button>
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
                {saving ? v.saving : v.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
