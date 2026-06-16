import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RsvpGuest {
  id: string
  name: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  plus_one: boolean
  plus_one_name: string | null
  plus_one_attending: boolean
  dietary: string | null
  notes: string | null
  table_number: number | null
  wedding_id: string
  language: 'he' | 'en'
}

interface WeddingInfo {
  name: string
  date: string | null
  venue?: string | null
  venue_address?: string | null
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const HE = {
  loading: 'טוען...',
  notFound: 'הזמנה לא נמצאה',
  notFoundHint: 'ייתכן שהקישור פג תוקף או שגוי.',
  invitedBy: 'שמחים ומתכבדים להזמינכם',
  to: 'לחתונתם של',
  dateLabel: 'תאריך',
  rsvpTitle: 'אישור הגעה',
  yes: '✓  מגיע/ה',
  no: '✕  לא מגיע/ה',
  dietaryLabel: 'העדפות תזונה',
  dietaryPlaceholder: 'למשל: צמחוני, ללא גלוטן...',
  notesLabel: 'הערות',
  notesPlaceholder: 'כל מה שתרצו שנדע...',
  saveBtn: 'שמירת אישור',
  saving: 'שומר...',
  confirmedTitle: 'כמה כיף!',
  confirmedMsg: 'מחכים לראותכם ביום המיוחד שלנו',
  declinedTitle: 'חבל מאוד',
  declinedMsg: 'תודה שהודעתם — נשתדל לשמור לכם קצת עוגה',
  changeAnswer: 'שינוי תשובה',
  tableLabel: 'מספר שולחן',
  calendarBtn: 'הוספה ליומן',
  wazeBtn: 'ניווט לאירוע',
  plusOneLabel: (name: string | null) => name ? `ובן/בת זוג — ${name}` : 'ובן/בת זוג',
  weddingDate: 'תאריך החתונה',
  invitationImage: 'ההזמנה שלנו',
  attendingCountLabel: 'כמה מגיעים?',
  attendingJustMe: 'מגיע/ה לבד',
  attendingMePlusOne: (name: string | null) => name ? `מגיעים, גם ${name}` : 'מגיעים שנינו',
}

const EN = {
  loading: 'Loading...',
  notFound: 'Invitation not found',
  notFoundHint: 'This link may have expired or is incorrect.',
  invitedBy: 'Together with their families',
  to: 'invite you to celebrate the marriage of',
  dateLabel: 'Date',
  rsvpTitle: 'RSVP',
  yes: '✓  Attending',
  no: '✕  Not attending',
  dietaryLabel: 'Dietary requirements',
  dietaryPlaceholder: 'e.g. Vegetarian, Gluten-free...',
  notesLabel: 'Notes',
  notesPlaceholder: 'Anything else we should know...',
  saveBtn: 'Save my response',
  saving: 'Saving...',
  confirmedTitle: "We can't wait!",
  confirmedMsg: 'See you on our special day',
  declinedTitle: "We'll miss you",
  declinedMsg: "Thank you for letting us know — we'll save you some cake",
  changeAnswer: 'Change your answer',
  tableLabel: 'Table number',
  calendarBtn: 'Add to calendar',
  wazeBtn: 'Get directions',
  plusOneLabel: (name: string | null) => name ? `& ${name}` : '& guest',
  weddingDate: 'Wedding date',
  invitationImage: 'Our invitation',
  attendingCountLabel: 'How many are coming?',
  attendingJustMe: 'Just me',
  attendingMePlusOne: (name: string | null) => name ? `We're coming, ${name} too` : "We're both coming",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, lang: 'he' | 'en') {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function buildGoogleCalendarUrl(weddingName: string, date: string, address?: string | null) {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const start = `${ymd}T180000`
  const end   = `${ymd}T230000`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: weddingName,
    dates: `${start}/${end}`,
    location: address ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function buildWazeUrl(address: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
}

function buildGoogleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ─── Divider ornament ─────────────────────────────────────────────────────────

function OrnamentDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #C9A84C55)' }} />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2 L11.5 8 L18 10 L11.5 12 L10 18 L8.5 12 L2 10 L8.5 8 Z" fill="#C9A84C" opacity="0.7" />
      </svg>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #C9A84C55)' }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RsvpPage({ token }: { token: string }) {
  const [guest, setGuest] = useState<RsvpGuest | null>(null)
  const [wedding, setWedding] = useState<WeddingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'declined'>('pending')
  const [plusOneAttending, setPlusOneAttending] = useState(true)
  const [dietary, setDietary] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)

  const lang = guest?.language ?? 'he'
  const tr = lang === 'he' ? HE : EN
  const dir = lang === 'he' ? 'rtl' : 'ltr'

  // Invitation image — replace with your own by placing it at public/invitation.jpg
  const INVITATION_IMAGE = '/invitation.jpg'

  useEffect(() => {
    async function load() {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: guestData, error: guestErr } = await (supabase as any)
        .from('guests')
        .select('id, name, rsvp_status, plus_one, plus_one_name, plus_one_attending, dietary, notes, table_number, wedding_id, language')
        .eq('rsvp_token', token)
        .single()

      if (guestErr || !guestData) { setNotFound(true); setLoading(false); return }

      setGuest(guestData as RsvpGuest)
      setStatus(guestData.rsvp_status)
      setPlusOneAttending(guestData.plus_one_attending ?? true)
      setDietary(guestData.dietary ?? '')
      setNotes(guestData.notes ?? '')
      if (guestData.rsvp_status !== 'pending') setSaved(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: weddingData } = await (supabase as any)
        .from('weddings')
        .select('name, date, venue_address')
        .eq('id', guestData.wedding_id)
        .single()

      if (weddingData) setWedding(weddingData as WeddingInfo)
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSave() {
    if (!guest) return
    setSaving(true); setError(false)
    const safeDietary = dietary.trim().slice(0, 200) || null
    const safeNotes = notes.trim().slice(0, 1000) || null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('guests')
      .update({
        rsvp_status: status,
        plus_one_attending: guest.plus_one ? plusOneAttending : true,
        dietary: safeDietary,
        notes: safeNotes,
      })
      .eq('rsvp_token', token)
    setSaving(false)
    if (updateErr) { setError(true); return }
    setGuest(g => g ? { ...g, rsvp_status: status, plus_one_attending: plusOneAttending, dietary: safeDietary, notes: safeNotes } : g)
    setSaved(true); setEditing(false)
  }

  // ── Shared typography styles ──
  const gold = '#C9A84C'
  const inkDark = '#2C2416'
  const inkMid = '#7A6A50'
  const cream = '#FAF8F3'
  const fontSerif = '"Cormorant Garamond", "Playfair Display", Georgia, serif'
  const fontSans  = '"DM Sans", "Heebo", system-ui, sans-serif'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: `1px solid ${gold}55`,
    borderRadius: 4, background: '#FDFBF7',
    fontSize: 14, color: inkDark, outline: 'none',
    boxSizing: 'border-box', fontFamily: fontSans,
    transition: 'border-color 150ms',
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cream }}>
        <div style={{ textAlign: 'center', fontFamily: fontSerif }}>
          <div style={{ fontSize: 32, marginBottom: 16, color: gold, letterSpacing: '0.3em' }}>✦</div>
          <p style={{ color: inkMid, fontSize: 15, letterSpacing: '0.1em' }}>{tr.loading}</p>
        </div>
      </div>
    )
  }

  // ── Not found ──
  if (notFound || !guest) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cream, padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380, fontFamily: fontSerif }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: gold }}>✦</div>
          <h1 style={{ fontSize: 24, fontWeight: 400, color: inkDark, marginBottom: 10, letterSpacing: '0.05em' }}>{tr.notFound}</h1>
          <p style={{ color: inkMid, fontSize: 14, fontFamily: fontSans }}>{tr.notFoundHint}</p>
        </div>
      </div>
    )
  }

  const showForm = !saved || editing
  const showTable = guest.table_number != null && guest.table_number > 0

  return (
    <div dir={dir} style={{
      minHeight: '100vh',
      background: cream,
      fontFamily: lang === 'he' ? `"Heebo", ${fontSerif}` : fontSerif,
      color: inkDark,
    }}>
      {/* ── Thin gold top bar ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />

      {/* ── Invitation image section ── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={INVITATION_IMAGE}
          alt={tr.invitationImage}
          style={{
            width: '100%',
            maxHeight: 480,
            objectFit: 'cover',
            display: 'block',
            // Fallback gradient if image missing
          }}
          onError={e => {
            const el = e.currentTarget
            el.style.display = 'none'
            const parent = el.parentElement
            if (parent) {
              parent.style.background = `linear-gradient(160deg, #F5EFE0 0%, #EDE0C4 50%, #E5D5B0 100%)`
              parent.style.minHeight = '320px'
              parent.style.display = 'flex'
              parent.style.alignItems = 'center'
              parent.style.justifyContent = 'center'
              const placeholder = document.createElement('div')
              placeholder.style.cssText = `text-align:center; padding: 60px 24px`
              const icon = document.createElement('div')
              icon.style.cssText = `font-size:48px; opacity:0.4; margin-bottom:16px`
              icon.textContent = '💍'
              const nameEl = document.createElement('p')
              nameEl.style.cssText = `font-family:${fontSerif}; font-size:22px; color:${inkMid}; letter-spacing:0.15em; font-style:italic`
              nameEl.textContent = wedding?.name ?? ''
              placeholder.appendChild(icon)
              placeholder.appendChild(nameEl)
              parent.appendChild(placeholder)
            }
          }}
        />
        {/* Dark gradient overlay at bottom of image */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 120,
          background: `linear-gradient(to bottom, transparent, ${cream})`,
        }} />
      </div>

      {/* ── Main content card ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Wedding name + date */}
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          {wedding && (
            <>
              <p style={{
                fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: gold, fontFamily: fontSans, fontWeight: 600, marginBottom: 14,
              }}>
                {tr.invitedBy}
              </p>
              <h1 style={{
                fontSize: 'clamp(32px, 7vw, 52px)',
                fontWeight: 300, color: inkDark,
                fontStyle: 'italic', lineHeight: 1.15,
                marginBottom: 16, letterSpacing: '0.03em',
              }}>
                {wedding.name}
              </h1>
              {wedding.date && (
                <p style={{
                  fontSize: 14, color: inkMid, fontFamily: fontSans,
                  letterSpacing: '0.06em', marginBottom: 4,
                }}>
                  {formatDate(wedding.date, lang)}
                </p>
              )}
            </>
          )}

          {/* Guest name */}
          <OrnamentDivider />
          <p style={{
            fontSize: 13, color: inkMid, fontFamily: fontSans,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            {lang === 'he' ? 'בהזמנה אישית אל' : 'A personal invitation for'}
          </p>
          <p style={{
            fontSize: 'clamp(22px, 5vw, 32px)',
            fontWeight: 400, color: inkDark,
            fontStyle: 'italic', letterSpacing: '0.04em',
            marginBottom: guest.plus_one ? 6 : 0,
          }}>
            {guest.name}
          </p>
          {guest.plus_one && (
            <p style={{ fontSize: 14, color: inkMid, fontFamily: fontSans }}>
              {tr.plusOneLabel(guest.plus_one_name)}
            </p>
          )}
        </div>

        {/* ── Table number (only if assigned) ── */}
        {showTable && (
          <>
            <OrnamentDivider />
            <div style={{
              textAlign: 'center',
              padding: '20px 24px',
              border: `1px solid ${gold}44`,
              borderRadius: 2,
              background: `linear-gradient(135deg, #FDFBF7, #FAF5E8)`,
            }}>
              <p style={{
                fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: gold, fontFamily: fontSans, fontWeight: 600, marginBottom: 10,
              }}>
                {tr.tableLabel}
              </p>
              <p style={{
                fontSize: 56, fontWeight: 300, color: inkDark,
                fontStyle: 'italic', lineHeight: 1,
              }}>
                {guest.table_number}
              </p>
            </div>
          </>
        )}

        {/* ── Action buttons: calendar + waze ── */}
        {wedding?.date && (
          <>
            <OrnamentDivider />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <a
                href={buildGoogleCalendarUrl(wedding.name, wedding.date, wedding.venue_address)}
                target="_blank" rel="noopener noreferrer"
                style={{
                  flex: '1 1 130px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 8, padding: '16px 12px', textDecoration: 'none',
                  border: `1px solid ${gold}55`, borderRadius: 4,
                  background: '#FDFBF7', transition: 'all 150ms', cursor: 'pointer',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span style={{ fontSize: 12, color: inkMid, fontFamily: fontSans, letterSpacing: '0.06em', textAlign: 'center' }}>
                  {tr.calendarBtn}
                </span>
              </a>

              {wedding.venue_address && (
                <>
                  <a
                    href={buildWazeUrl(wedding.venue_address)}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      flex: '1 1 130px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '16px 12px', textDecoration: 'none',
                      border: `1px solid ${gold}55`, borderRadius: 4,
                      background: '#FDFBF7', transition: 'all 150ms', cursor: 'pointer',
                    }}
                  >
                    {/* Waze icon */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <span style={{ fontSize: 12, color: inkMid, fontFamily: fontSans, letterSpacing: '0.06em', textAlign: 'center' }}>
                      Waze
                    </span>
                  </a>
                  <a
                    href={buildGoogleMapsUrl(wedding.venue_address)}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      flex: '1 1 130px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, padding: '16px 12px', textDecoration: 'none',
                      border: `1px solid ${gold}55`, borderRadius: 4,
                      background: '#FDFBF7', transition: 'all 150ms', cursor: 'pointer',
                    }}
                  >
                    {/* Google Maps icon */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span style={{ fontSize: 12, color: inkMid, fontFamily: fontSans, letterSpacing: '0.06em', textAlign: 'center' }}>
                      Google Maps
                    </span>
                  </a>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Already answered banner ── */}
        {saved && !editing && (
          <>
            <OrnamentDivider />
            <div style={{
              padding: '24px',
              border: `1px solid ${gold}44`,
              borderRadius: 2,
              background: status === 'confirmed'
                ? 'linear-gradient(135deg, #F7FAF3, #EDF5E3)'
                : 'linear-gradient(135deg, #FAF5F3, #F5EAE6)',
              textAlign: 'center',
            }}>
              <p style={{
                fontSize: 28, fontWeight: 300, fontStyle: 'italic',
                color: inkDark, marginBottom: 8, letterSpacing: '0.05em',
              }}>
                {status === 'confirmed' ? tr.confirmedTitle : tr.declinedTitle}
              </p>
              <p style={{ fontSize: 14, color: inkMid, fontFamily: fontSans, marginBottom: 18 }}>
                {status === 'confirmed' ? tr.confirmedMsg : tr.declinedMsg}
              </p>
              <button
                onClick={() => setEditing(true)}
                style={{
                  padding: '9px 22px',
                  border: `1px solid ${gold}88`,
                  borderRadius: 2, background: 'transparent',
                  fontSize: 12, letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: inkMid, cursor: 'pointer', fontFamily: fontSans,
                  transition: 'all 150ms',
                }}
              >
                {tr.changeAnswer}
              </button>
            </div>
          </>
        )}

        {/* ── RSVP form ── */}
        {showForm && (
          <>
            <OrnamentDivider />
            <div>
              <p style={{
                fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
                color: gold, fontFamily: fontSans, fontWeight: 600,
                marginBottom: 20, textAlign: 'center',
              }}>
                {tr.rsvpTitle}
              </p>

              {/* Yes / No buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {([
                  { value: 'confirmed' as const, label: tr.yes },
                  { value: 'declined'  as const, label: tr.no  },
                ]).map(({ value, label }) => {
                  const active = status === value
                  return (
                    <button
                      key={value}
                      onClick={() => setStatus(value)}
                      style={{
                        padding: '14px 20px',
                        border: `1px solid ${active ? gold : gold + '44'}`,
                        borderRadius: 2, cursor: 'pointer',
                        background: active
                          ? `linear-gradient(135deg, ${gold}22, ${gold}11)`
                          : 'transparent',
                        color: active ? inkDark : inkMid,
                        fontSize: 15, fontFamily: fontSerif,
                        fontStyle: 'italic', letterSpacing: '0.05em',
                        fontWeight: active ? 600 : 400,
                        transition: 'all 160ms',
                        boxShadow: active ? `0 0 0 1px ${gold}55` : 'none',
                        textAlign: 'center',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* How many are coming (only if a plus-one was invited and they're attending) */}
              {guest.plus_one && status === 'confirmed' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{
                    display: 'block', fontSize: 10, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: gold, fontFamily: fontSans,
                    fontWeight: 600, marginBottom: 8, textAlign: 'center',
                  }}>
                    {tr.attendingCountLabel}
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {([
                      { value: false, label: tr.attendingJustMe },
                      { value: true, label: tr.attendingMePlusOne(guest.plus_one_name) },
                    ]).map(({ value, label }) => {
                      const active = plusOneAttending === value
                      return (
                        <button
                          key={String(value)}
                          onClick={() => setPlusOneAttending(value)}
                          style={{
                            flex: 1, padding: '11px 14px',
                            border: `1px solid ${active ? gold : gold + '44'}`,
                            borderRadius: 2, cursor: 'pointer',
                            background: active
                              ? `linear-gradient(135deg, ${gold}22, ${gold}11)`
                              : 'transparent',
                            color: active ? inkDark : inkMid,
                            fontSize: 13, fontFamily: fontSans,
                            fontWeight: active ? 600 : 400,
                            transition: 'all 160ms',
                            textAlign: 'center',
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Dietary */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: 10, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: gold, fontFamily: fontSans,
                  fontWeight: 600, marginBottom: 8,
                }}>
                  {tr.dietaryLabel}
                </label>
                <input
                  value={dietary}
                  onChange={e => setDietary(e.target.value)}
                  placeholder={tr.dietaryPlaceholder}
                  maxLength={200}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = gold)}
                  onBlur={e => (e.target.style.borderColor = gold + '55')}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block', fontSize: 10, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: gold, fontFamily: fontSans,
                  fontWeight: 600, marginBottom: 8,
                }}>
                  {tr.notesLabel}
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={tr.notesPlaceholder}
                  rows={3}
                  maxLength={1000}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => (e.target.style.borderColor = gold)}
                  onBlur={e => (e.target.style.borderColor = gold + '55')}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12, textAlign: 'center', fontFamily: fontSans }}>
                  {lang === 'he' ? 'אירעה שגיאה, נסו שוב' : 'Something went wrong, please try again.'}
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', padding: '15px 24px',
                  background: saving
                    ? `${gold}88`
                    : `linear-gradient(135deg, ${gold}, #B8922A)`,
                  color: '#fff', border: 'none', borderRadius: 2,
                  fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.2em', textTransform: 'uppercase',
                  fontFamily: fontSans, transition: 'all 160ms',
                  boxShadow: saving ? 'none' : `0 4px 20px ${gold}44`,
                }}
              >
                {saving ? tr.saving : tr.saveBtn}
              </button>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${gold}33, transparent)`, marginBottom: 20 }} />
          <p style={{
            fontSize: 11, color: gold + '99', letterSpacing: '0.18em',
            textTransform: 'uppercase', fontFamily: fontSans,
          }}>
            everafter
          </p>
        </div>
      </div>

      {/* ── Thin gold bottom bar ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
    </div>
  )
}
