-- ============================================================
-- Wedding Planner — Default Task Seed
-- Automatically populates a comprehensive task checklist for
-- every newly created wedding.
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ───────────────────────────────────────────────
-- Core seed function
-- SECURITY DEFINER: bypasses RLS so the AFTER INSERT
-- trigger can insert tasks before the user's profile
-- has been linked to the new wedding_id.
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_default_tasks(
  p_wedding_id   UUID,
  p_wedding_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Shorthand: returns wedding_date minus N months, or NULL when date unknown.
  -- Positive months_offset means *after* the wedding (post-wedding tasks).
  v_venue_id       UUID;
  v_budget_id      UUID;
  v_guests_id      UUID;
  v_catering_id    UUID;
  v_photo_id       UUID;
  v_music_id       UUID;
  v_decor_id       UUID;
  v_attire_id      UUID;
  v_ceremony_id    UUID;
  v_transport_id   UUID;
  v_honeymoon_id   UUID;
  v_dayof_id       UUID;
  v_postwed_id     UUID;
BEGIN

-- ── 1. VENUE & LOGISTICS ─────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Venue & Logistics', 5, p_wedding_id, 100,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END
) RETURNING id INTO v_venue_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Research and tour potential venues',
   'Visit at least 3-5 venues; note capacity, catering policy, and exclusivity.',
   5, p_wedding_id, v_venue_id, 110,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END),

  ('Sign venue contract and pay deposit',
   'Review cancellation clauses, overtime fees, and vendor restrictions before signing.',
   5, p_wedding_id, v_venue_id, 120,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '11 months' ELSE NULL END),

  ('Confirm guest capacity and backup rain plan',
   'Ensure the venue can accommodate your headcount; ask about outdoor-to-indoor contingency.',
   4, p_wedding_id, v_venue_id, 130,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Book hotel room block for out-of-town guests',
   'Negotiate a discounted room block at 1-2 nearby hotels.',
   3, p_wedding_id, v_venue_id, 140,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Finalize ceremony and reception floor plans',
   'Confirm table layout, stage/dance-floor placement, and AV positioning with the venue coordinator.',
   3, p_wedding_id, v_venue_id, 150,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 months' ELSE NULL END),

  ('Arrange parking and accessibility logistics',
   'Confirm valet or self-park options; ensure ADA accessibility is covered.',
   3, p_wedding_id, v_venue_id, 160,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END);


-- ── 2. BUDGET MANAGEMENT ─────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Budget Management', 4, p_wedding_id, 200,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END
) RETURNING id INTO v_budget_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Set total wedding budget with families',
   'Align on who is contributing what before committing to any vendors.',
   5, p_wedding_id, v_budget_id, 210,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END),

  ('Create itemized budget spreadsheet',
   'Break down by category: venue, catering, photography, attire, flowers, music, misc.',
   4, p_wedding_id, v_budget_id, 220,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '11 months' ELSE NULL END),

  ('Track all deposits, payment due dates, and contracts',
   'Use a single spreadsheet or app to avoid missed payments.',
   4, p_wedding_id, v_budget_id, 230,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Mid-planning budget review',
   'Compare actuals vs. budget; reallocate if needed.',
   3, p_wedding_id, v_budget_id, 240,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Prepare final vendor payments and gratuity envelopes',
   'Most vendors expect payment in full 1-2 weeks before the wedding.',
   4, p_wedding_id, v_budget_id, 250,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 weeks' ELSE NULL END);


-- ── 3. GUEST LIST & INVITATIONS ───────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Guest List & Invitations', 4, p_wedding_id, 300,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END
) RETURNING id INTO v_guests_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Draft and finalize guest list',
   'Coordinate with both families; set a firm headcount ceiling early.',
   5, p_wedding_id, v_guests_id, 310,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END),

  ('Collect current mailing addresses',
   'Use a Google Form or similar tool; allow 2-3 weeks for responses.',
   4, p_wedding_id, v_guests_id, 320,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '9 months' ELSE NULL END),

  ('Send save-the-dates',
   'Mail or email 8-12 months out for destination weddings, 6-8 months for local.',
   5, p_wedding_id, v_guests_id, 330,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Design, order, and mail formal invitations',
   'Include RSVP card, meal choice, and wedding website URL. Mail 6-8 weeks before the wedding.',
   4, p_wedding_id, v_guests_id, 340,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Track RSVPs and dietary restrictions',
   'Set RSVP deadline 3-4 weeks before the wedding for final headcount.',
   4, p_wedding_id, v_guests_id, 350,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 months' ELSE NULL END),

  ('Create seating chart',
   'Use a spreadsheet or seating app; confirm final counts with caterer before publishing.',
   3, p_wedding_id, v_guests_id, 360,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '3 weeks' ELSE NULL END);


-- ── 4. CATERING & CAKE ───────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Catering & Cake', 5, p_wedding_id, 400,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END
) RETURNING id INTO v_catering_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Research caterers and attend tastings',
   'Taste at least 2-3 caterers; evaluate food quality, presentation, and service.',
   5, p_wedding_id, v_catering_id, 410,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Select menu and confirm dietary accommodations',
   'Collect dietary restriction data from RSVPs; verify vegan, gluten-free, and allergy options.',
   4, p_wedding_id, v_catering_id, 420,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Sign catering contract',
   'Clarify per-head pricing, service staff count, overtime fees, and leftover policy.',
   5, p_wedding_id, v_catering_id, 430,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Book wedding cake tasting and design',
   'Schedule tasting 6-8 months out; confirm flavors, tiers, and delivery time.',
   4, p_wedding_id, v_catering_id, 440,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '7 months' ELSE NULL END),

  ('Plan and book rehearsal dinner catering',
   'Separate from the wedding caterer; confirm headcount and menu.',
   3, p_wedding_id, v_catering_id, 450,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Confirm final guest count with caterer',
   'Most caterers require final numbers 1-2 weeks before the event.',
   5, p_wedding_id, v_catering_id, 460,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 weeks' ELSE NULL END);


-- ── 5. PHOTOGRAPHY & VIDEOGRAPHY ─────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Photography & Videography', 5, p_wedding_id, 500,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END
) RETURNING id INTO v_photo_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Research photographers and review portfolios',
   'Prioritize photographers whose style matches your vision (documentary vs. posed).',
   5, p_wedding_id, v_photo_id, 510,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '12 months' ELSE NULL END),

  ('Book photographer and sign contract',
   'Top photographers book 12-18 months out; confirm hours, album, and digital rights.',
   5, p_wedding_id, v_photo_id, 520,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '11 months' ELSE NULL END),

  ('Book videographer',
   'Confirm highlight reel length, delivery timeline, and drone footage if desired.',
   4, p_wedding_id, v_photo_id, 530,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Share shot list and important people list',
   'Include must-have family groupings and VIPs the photographer should know on sight.',
   3, p_wedding_id, v_photo_id, 540,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END),

  ('Confirm day-of timeline and meeting location with photographer',
   'Review schedule for getting-ready, first look, ceremony, portraits, and reception.',
   4, p_wedding_id, v_photo_id, 550,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 weeks' ELSE NULL END);


-- ── 6. MUSIC & ENTERTAINMENT ─────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Music & Entertainment', 4, p_wedding_id, 600,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END
) RETURNING id INTO v_music_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Decide on DJ vs. live band',
   'Consider budget, venue size, and desired atmosphere.',
   4, p_wedding_id, v_music_id, 610,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Audition and book DJ or band',
   'Ask for references and watch a live performance or demo reel before booking.',
   4, p_wedding_id, v_music_id, 620,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '9 months' ELSE NULL END),

  ('Sign entertainment contract',
   'Clarify set times, break policy, equipment provided, and overtime rates.',
   5, p_wedding_id, v_music_id, 630,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Plan ceremony music (processional, recessional)',
   'Provide specific song choices and timing cues to the musician or DJ.',
   3, p_wedding_id, v_music_id, 640,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '3 months' ELSE NULL END),

  ('Build reception playlist and do-not-play list',
   'Include first dance, parent dances, cake cutting, and bouquet toss songs.',
   3, p_wedding_id, v_music_id, 650,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 months' ELSE NULL END),

  ('Confirm sound equipment and setup time with venue',
   'Ensure AV is compatible with the venue''s system; confirm when load-in is allowed.',
   3, p_wedding_id, v_music_id, 660,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END);


-- ── 7. FLOWERS & DÉCOR ───────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Flowers & Décor', 4, p_wedding_id, 700,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END
) RETURNING id INTO v_decor_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Define floral style, color palette, and inspiration',
   'Create a Pinterest board or mood board to share with florists.',
   4, p_wedding_id, v_decor_id, 710,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Meet with florists and request proposals',
   'Get at least 2-3 quotes; compare design vision, quality, and price.',
   4, p_wedding_id, v_decor_id, 720,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '9 months' ELSE NULL END),

  ('Sign floral contract',
   'Confirm bouquet sizes, centerpiece counts, ceremony arch/chuppah, and delivery terms.',
   5, p_wedding_id, v_decor_id, 730,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Book additional décor rentals (linens, candles, signage)',
   'Coordinate with venue on what is included vs. what must be rented.',
   3, p_wedding_id, v_decor_id, 740,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Finalize centerpiece and bouquet designs',
   'Do a sample centerpiece review with your florist before full production.',
   3, p_wedding_id, v_decor_id, 750,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '3 months' ELSE NULL END),

  ('Confirm delivery, setup, and breakdown timeline with florist',
   'Ensure florist has venue access well before guests arrive.',
   3, p_wedding_id, v_decor_id, 760,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END);


-- ── 8. WEDDING ATTIRE ────────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Wedding Attire', 5, p_wedding_id, 800,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END
) RETURNING id INTO v_attire_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Shop for and order wedding dress or suit',
   'Order at least 6-8 months out to allow production and alteration time.',
   5, p_wedding_id, v_attire_id, 810,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Select and order bridesmaid dresses',
   'Coordinate color and style; order together to ensure dye-lot matching.',
   4, p_wedding_id, v_attire_id, 820,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Select groomsmen and wedding party attire',
   'Decide on tuxedos, suits, or coordinated separates; book fittings.',
   4, p_wedding_id, v_attire_id, 830,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '6 months' ELSE NULL END),

  ('Shop for wedding accessories (shoes, jewelry, veil)',
   'Allow time to break in shoes; coordinate jewelry with neckline and dress style.',
   3, p_wedding_id, v_attire_id, 840,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Schedule dress fittings and alterations',
   'Typically 2-3 fittings are needed; last fitting should be 1-2 weeks before the wedding.',
   4, p_wedding_id, v_attire_id, 850,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '6 months' ELSE NULL END),

  ('Final fitting and pick up all attire',
   'Steam or press garments; store safely away from pets and dust.',
   5, p_wedding_id, v_attire_id, 860,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 weeks' ELSE NULL END);


-- ── 9. CEREMONY PLANNING ─────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Ceremony Planning', 4, p_wedding_id, 900,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END
) RETURNING id INTO v_ceremony_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Choose and book officiant',
   'Confirm legal authority to marry in your state/country; align on ceremony tone.',
   5, p_wedding_id, v_ceremony_id, 910,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Apply for marriage license',
   'Check your local requirements — many jurisdictions have waiting periods.',
   5, p_wedding_id, v_ceremony_id, 920,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END),

  ('Write or personalize wedding vows',
   'If writing personal vows, start drafting at least 2 months out.',
   3, p_wedding_id, v_ceremony_id, 930,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 months' ELSE NULL END),

  ('Plan ceremony order and design printed programs',
   'Include processional order, readings, musical selections, and recessional.',
   3, p_wedding_id, v_ceremony_id, 940,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 months' ELSE NULL END),

  ('Assign ceremony roles (readers, candle lighters, ushers)',
   'Confirm each person understands their cue and responsibility.',
   3, p_wedding_id, v_ceremony_id, 950,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '2 months' ELSE NULL END),

  ('Schedule and run wedding rehearsal',
   'Hold the rehearsal the evening before; include all wedding party members and officiant.',
   4, p_wedding_id, v_ceremony_id, 960,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 day' ELSE NULL END);


-- ── 10. TRANSPORTATION ───────────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Transportation', 3, p_wedding_id, 1000,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END
) RETURNING id INTO v_transport_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Book bridal party transportation',
   'Limousine, party bus, or vintage car for getting-ready location to ceremony.',
   4, p_wedding_id, v_transport_id, 1010,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Book couple''s getaway car',
   'Coordinate departure timing with photographer for the send-off shot.',
   3, p_wedding_id, v_transport_id, 1020,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '6 months' ELSE NULL END),

  ('Arrange guest shuttle between venues',
   'Provide shuttle between hotel, ceremony, and reception if venues differ.',
   3, p_wedding_id, v_transport_id, 1030,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Confirm all transportation pickup times and addresses',
   'Share a detailed schedule with each driver at least 1 week before the wedding.',
   4, p_wedding_id, v_transport_id, 1040,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END);


-- ── 11. HONEYMOON PLANNING ───────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Honeymoon Planning', 3, p_wedding_id, 1100,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END
) RETURNING id INTO v_honeymoon_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Choose honeymoon destination and travel dates',
   'Factor in passport expiry, visa requirements, and best travel season.',
   4, p_wedding_id, v_honeymoon_id, 1110,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '10 months' ELSE NULL END),

  ('Book flights and accommodations',
   'Use honeymoon registries or travel agents for upgrades; book early for peak seasons.',
   5, p_wedding_id, v_honeymoon_id, 1120,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '8 months' ELSE NULL END),

  ('Arrange travel insurance',
   'Covers cancellation, medical emergencies, and lost luggage.',
   3, p_wedding_id, v_honeymoon_id, 1130,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '6 months' ELSE NULL END),

  ('Research and book excursions or special experiences',
   'Dinner reservations, spa, tours — book popular experiences well in advance.',
   2, p_wedding_id, v_honeymoon_id, 1140,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '4 months' ELSE NULL END),

  ('Confirm all reservations and pack',
   'Print or download offline copies of all bookings; check passport validity.',
   3, p_wedding_id, v_honeymoon_id, 1150,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 week' ELSE NULL END);


-- ── 12. WEEK-OF & DAY-OF COORDINATION ───────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Week-of & Day-of Coordination', 5, p_wedding_id, 1200,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END
) RETURNING id INTO v_dayof_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Create detailed wedding day timeline',
   'Minute-by-minute schedule from wake-up through last dance; share with all vendors.',
   5, p_wedding_id, v_dayof_id, 1210,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END),

  ('Send final confirmation to all vendors',
   'Reconfirm arrival times, addresses, contacts, and any last-minute changes.',
   5, p_wedding_id, v_dayof_id, 1220,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 week' ELSE NULL END),

  ('Delegate day-of responsibilities to coordinator or wedding party',
   'Designate a point-of-contact for vendors so the couple can be present.',
   4, p_wedding_id, v_dayof_id, 1230,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 month' ELSE NULL END),

  ('Prepare bridal emergency kit',
   'Include: safety pins, stain remover, pain reliever, blister pads, sewing kit, mints.',
   3, p_wedding_id, v_dayof_id, 1240,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 week' ELSE NULL END),

  ('Prepare vendor payment and gratuity envelopes',
   'Label each envelope with vendor name; hand off to coordinator or trusted family member.',
   4, p_wedding_id, v_dayof_id, 1250,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '3 days' ELSE NULL END),

  ('Host rehearsal dinner',
   'Include all wedding party members and immediate family; keep it relaxed.',
   4, p_wedding_id, v_dayof_id, 1260,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date - INTERVAL '1 day' ELSE NULL END);


-- ── 13. POST-WEDDING TASKS ───────────────────────────────────
INSERT INTO public.tasks (title, priority, wedding_id, display_order, due_date)
VALUES (
  'Post-Wedding Tasks', 2, p_wedding_id, 1300,
  CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '2 weeks' ELSE NULL END
) RETURNING id INTO v_postwed_id;

INSERT INTO public.tasks (title, description, priority, wedding_id, parent_task_id, display_order, due_date)
VALUES
  ('Return rented items (attire, equipment, décor)',
   'Check contract deadlines to avoid late fees.',
   4, p_wedding_id, v_postwed_id, 1310,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '3 days' ELSE NULL END),

  ('Send personalized thank-you notes',
   'Aim to send within 2-3 weeks of the wedding; personalize each note.',
   4, p_wedding_id, v_postwed_id, 1320,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '3 weeks' ELSE NULL END),

  ('Begin legal name change process',
   'Start with Social Security card, then driver''s license, passport, and financial accounts.',
   3, p_wedding_id, v_postwed_id, 1330,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '1 month' ELSE NULL END),

  ('Write and submit vendor reviews',
   'Post reviews on Google, The Knot, and WeddingWire to help future couples.',
   2, p_wedding_id, v_postwed_id, 1340,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '1 month' ELSE NULL END),

  ('Preserve and store wedding dress',
   'Professional cleaning and archival boxing extends the life of the gown.',
   2, p_wedding_id, v_postwed_id, 1350,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '6 weeks' ELSE NULL END),

  ('Order wedding photo album and video delivery',
   'Follow up with photographer on delivery timeline; approve proofs promptly.',
   2, p_wedding_id, v_postwed_id, 1360,
   CASE WHEN p_wedding_date IS NOT NULL THEN p_wedding_date + INTERVAL '2 months' ELSE NULL END);

END;
$$;


-- ───────────────────────────────────────────────
-- Trigger: call seed function after every new wedding
-- ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_seed_default_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_tasks(NEW.id, NEW.date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_default_tasks
  AFTER INSERT ON public.weddings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_default_tasks();
