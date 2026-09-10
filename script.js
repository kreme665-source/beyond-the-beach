/* =========================================================================
   IslandIQ — Beyond the Beach
   Static prototype. No backend, no framework, no build step.

   Contents
     1. Config (form endpoint + image swap points)
     2. Data: vibe dimensions, destinations, questions, personas
     3. THE ALGORITHM (traveler vector → cosine match → ranked destinations)
     4. Analytics (funnel events)
     5. UI: quiz, results, destination detail, founder video, ambient sound
     6. Lead capture + share
     7. Boot
   ========================================================================= */

'use strict';

/* ---------------------------- 1. CONFIG --------------------------------- */

/** Formspree endpoint. Swap this one string to point leads somewhere else. */
const FORM_ENDPOINT = 'https://formspree.io/f/mnjyazby';

/** localStorage key for the never-lose-a-lead fallback. */
const SIGNUP_KEY = 'iq_signups';

/**
 * IMAGES — the only place photography plugs in.
 * Drop a real photo URL (or a local path like 'img/nevis.jpg') next to a key
 * and it replaces the generated placeholder art everywhere it is used.
 * Leave a value empty ('') to keep the placeholder.
 *
 * Recommended: landscape, 2000px wide, golden hour, no text.
 */
const IMAGES = {
  hero:    'img/hero.jpg',   // full-bleed landing image
  nevis:   'img/nevis.jpg',
  juneau:  'img/juneau.jpg',
  turkey:  'img/turkey.jpg',
  barbados:'img/barbados.jpg',
  stlucia: 'img/stlucia.jpg',
  lisbon:  'img/lisbon.jpg'
};

/**
 * Optional smaller copies used only by the result cards, which render at a
 * few hundred pixels wide — four of them load at once, so this keeps the
 * results screen light on a phone. Leave a key empty and that card simply
 * falls back to the full-size image above.
 */
const CARD_IMAGES = {
  nevis:   'img/cards/nevis.jpg',
  juneau:  'img/cards/juneau.jpg',
  turkey:  'img/cards/turkey.jpg',
  barbados:'img/cards/barbados.jpg',
  stlucia: 'img/cards/stlucia.jpg',
  lisbon:  'img/cards/lisbon.jpg'
};

/* ------------------------- PHASE 2 CONFIGURATION ------------------------
   Three additions, each dormant until you fill in the one value it needs.
   Nothing here can break the quiz, the matching or the lead capture.
   ---------------------------------------------------------------------- */

/**
 * ANALYTICS — cookie-free, no consent banner, no Google.
 * Pick a provider and paste your site value; until then nothing loads and
 * no events are sent.
 *   Plausible   → provider: 'plausible',   site: 'kreme665-source.github.io'
 *                 (the domain exactly as you entered it in Plausible)
 *   GoatCounter → provider: 'goatcounter', site: 'beyondthebeach'
 *                 (your code, i.e. the xxx in xxx.goatcounter.com)
 */
const ANALYTICS = {
  provider: 'goatcounter',   // 'plausible' | 'goatcounter' | 'none'
  site: 'islandiq'           // dashboard: https://islandiq.goatcounter.com
};

/**
 * FOUNDER VIDEO — the short intro below the hero.
 * Set `type` and the matching field; the poster shows until someone presses
 * play, and nothing from YouTube or Vimeo loads until they do.
 *   youtube → id: the part after v= or youtu.be/  (e.g. 'dQw4w9WgXcQ')
 *   vimeo   → id: the numeric id                  (e.g. '76979871')
 *   mp4     → src: 'video/founder.mp4'
 * Set show: false to hide the whole section until the video is ready.
 */
const VIDEO = {
  show: false,           // hidden for launch — set true once the founder film exists
  type: 'none',          // 'youtube' | 'vimeo' | 'mp4' | 'none'
  id: '',
  src: '',
  poster: 'img/nevis.jpg',
  title: 'Caribbean roots, global routes',
  blurb: 'Phil Charles — born on Nevis, trained in hospitality at Four Seasons Hotels and Resorts, then twenty years in the U.S. Army, now writing from Alaska — on why IslandIQ asks who you are instead of where you are going.'
};

/**
 * AMBIENT SOUND — opt-in only. The control appears only once `src` points at
 * a real file, so there is never a button that plays nothing. Use a short,
 * seamlessly looping, properly licensed track.
 */
const AUDIO = {
  src: '',               // e.g. 'assets/ambiance.mp3'
  volume: 0.18,          // 0–1, kept low on purpose
  fadeMs: 1000
};

/* Fine grain, so the generated art reads as film rather than as CSS. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E\")";

/* -------------------- PLACEHOLDER POSTER ART ----------------------------
   Until real photography lands, every media block renders a generated SVG
   poster: sky gradient, sun, horizon, and a silhouette shaped like the place.
   Delete nothing here to swap in photos — just fill in IMAGES above.
   ---------------------------------------------------------------------- */

/** A palm silhouette at x, sized by k, standing on the 646 waterline. */
function palm(x, k) {
  const h = 150 * k, t = 5 * k, top = 646 - h;
  const frond = (dx, dy, sweep) =>
    `M${x} ${top + 6} Q${x + dx * 0.5} ${top + dy - sweep} ${x + dx} ${top + dy} ` +
    `Q${x + dx * 0.5} ${top + dy + 10 * k} ${x} ${top + 14 * k} Z`;
  return (
    `M${x - t} 646 L${x + t} 646 Q${x + t * 1.4} ${top + 30} ${x + t * 0.4} ${top + 4} L${x - t * 1.2} ${top + 6} Z` +
    frond(-62 * k, 6 * k, 34 * k) + frond(62 * k, 6 * k, 34 * k) +
    frond(-42 * k, 34 * k, 16 * k) + frond(42 * k, 34 * k, 16 * k) +
    frond(-14 * k, -22 * k, 26 * k) + frond(16 * k, -18 * k, 26 * k)
  );
}

/** Silhouette paths on a 1600 x 1000 canvas, drawn from the horizon down. */
const RIDGES = {
  volcano: [
    'M-40 646 Q240 634 400 548 Q520 484 566 398 Q596 344 626 398 Q690 494 820 570 Q980 640 1180 646 Z',
    'M900 646 Q1060 638 1160 578 Q1240 530 1276 486 Q1300 456 1324 486 Q1380 552 1480 596 Q1560 634 1640 646 Z'
  ],
  fjord: [
    'M0 640 L120 470 L210 545 L330 395 L430 520 L540 430 L660 640 Z',
    'M560 640 L700 455 L790 530 L910 370 L1030 520 L1130 450 L1290 640 Z',
    'M1180 640 L1330 490 L1430 560 L1600 430 L1600 640 Z'
  ],
  cliffs: [
    'M0 640 L0 500 L180 500 L240 560 L420 560 L470 505 L700 505 L760 640 Z',
    'M900 640 L960 520 L1180 520 L1240 470 L1600 470 L1600 640 Z'
  ],
  lowIsland: [
    'M-40 646 Q220 612 520 626 Q900 642 1640 604 L1640 646 Z',
    palm(300, 1) + palm(392, 0.78) + palm(1210, 0.92) + palm(1288, 0.66)
  ],
  pitons: [
    'M200 646 Q330 600 412 430 Q440 356 466 330 Q492 356 520 430 Q604 604 720 646 Z',
    'M600 646 Q740 592 812 372 Q838 282 866 256 Q894 282 920 372 Q996 596 1130 646 Z',
    'M980 646 Q1140 606 1240 520 Q1360 596 1520 646 Z'
  ],
  cityHills: [
    'M-40 646 Q260 536 660 584 Q1060 632 1640 520 L1640 646 Z',
    'M-40 646 L-40 622 Q300 596 700 618 Q1100 640 1640 612 L1640 646 Z',
    // skyline rising off the waterline, plus one domed tower
    'M120 646 L120 590 L186 590 L186 646 Z M212 646 L212 610 L268 610 L268 646 Z' +
    'M296 646 L296 572 L344 572 L344 646 Z M1080 646 L1080 600 L1150 600 L1150 646 Z' +
    'M1180 646 L1180 578 L1232 578 L1232 646 Z M1262 646 L1262 616 L1330 616 L1330 646 Z' +
    'M772 646 L772 528 L790 528 L790 502 Q806 466 822 502 L822 528 L840 528 L840 646 Z'
  ]
};

/** Palettes: sky stops top→horizon, sun, sea, and silhouette inks (far→near). */
const SCENES = {
  hero:     { sky: ['#1b2740', '#5c5170', '#c8794f', '#ffcf95'], sun: '#ffe3b0', sunX: 0.62, sea: ['#2a2f3f', '#151a26'], ridge: 'volcano',    inks: ['#2b2d3a', '#171821'] },
  nevis:    { sky: ['#173042', '#4f6a72', '#d69a63', '#ffe1ac'], sun: '#ffefc8', sunX: 0.58, sea: ['#20494c', '#12262b'], ridge: 'volcano',    inks: ['#1d3a38', '#0f2226'] },
  juneau:   { sky: ['#16263a', '#3f6076', '#8fb0c2', '#dfe9f0'], sun: '#eef4f8', sunX: 0.40, sea: ['#243d50', '#101d29'], ridge: 'fjord',      inks: ['#274156', '#152532', '#0c1620'] },
  turkey:   { sky: ['#123a52', '#2f7d97', '#8fc8cf', '#ffe6bd'], sun: '#fff0cf', sunX: 0.66, sea: ['#1c6f88', '#0d3a4c'], ridge: 'cliffs',     inks: ['#20505f', '#12303c'] },
  barbados: { sky: ['#1e1b3a', '#6b3f66', '#e0655c', '#ffc79a'], sun: '#ffddb2', sunX: 0.52, sea: ['#2b3a63', '#141a33'], ridge: 'lowIsland',  inks: ['#221f38', '#141227'] },
  stlucia:  { sky: ['#14302f', '#3f6a5c', '#c98f62', '#ffe2b4'], sun: '#ffeec6', sunX: 0.55, sea: ['#1d4a45', '#0e2724'], ridge: 'pitons',     inks: ['#1b3b32', '#12271f', '#0b1a15'] },
  lisbon:   { sky: ['#241f38', '#6e4a67', '#e29a72', '#ffe3bb'], sun: '#ffeccb', sunX: 0.58, sea: ['#3b3454', '#1d1830'], ridge: 'cityHills',  inks: ['#2c2541', '#181528', '#0f0d1c'] }
};

/** Build the poster SVG for a scene and return it as a CSS url(). */
function posterArt(key) {
  const s = SCENES[key] || SCENES.hero;
  const ridges = RIDGES[s.ridge];
  const sunX = Math.round(s.sunX * 1600);
  const inkLayers = ridges.map((d, i) =>
    `<path d="${d}" fill="${s.inks[Math.min(i, s.inks.length - 1)]}"/>`).join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">` +
      `<defs>` +
        `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="${s.sky[0]}"/>` +
          `<stop offset="0.38" stop-color="${s.sky[1]}"/>` +
          `<stop offset="0.74" stop-color="${s.sky[2]}"/>` +
          `<stop offset="1" stop-color="${s.sky[3]}"/>` +
        `</linearGradient>` +
        `<radialGradient id="glow" cx="${s.sunX}" cy="0.64" r="0.55">` +
          `<stop offset="0" stop-color="${s.sun}" stop-opacity="0.95"/>` +
          `<stop offset="0.45" stop-color="${s.sun}" stop-opacity="0.28"/>` +
          `<stop offset="1" stop-color="${s.sun}" stop-opacity="0"/>` +
        `</radialGradient>` +
        `<linearGradient id="refl" x1="0" y1="0" x2="1" y2="0">` +
          `<stop offset="0" stop-color="${s.sun}" stop-opacity="0"/>` +
          `<stop offset="0.5" stop-color="${s.sun}" stop-opacity="0.20"/>` +
          `<stop offset="1" stop-color="${s.sun}" stop-opacity="0"/>` +
        `</linearGradient>` +
        `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="${s.sea[0]}"/>` +
          `<stop offset="1" stop-color="${s.sea[1]}"/>` +
        `</linearGradient>` +
      `</defs>` +
      `<rect width="1600" height="646" fill="url(#sky)"/>` +
      `<rect width="1600" height="1000" fill="url(#glow)"/>` +
      `<circle cx="${sunX}" cy="596" r="46" fill="${s.sun}" opacity="0.9"/>` +
      `<rect y="640" width="1600" height="360" fill="url(#sea)"/>` +
      `<rect x="${sunX - 150}" y="646" width="300" height="300" fill="url(#refl)"/>` +
      inkLayers +
    `</svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Resolve a background value for a media block: real photo if there is one,
 * generated poster art if not.
 * @param {string} key   a key in IMAGES / SCENES
 * @param {string} [variant] 'card' to prefer the smaller card-sized copy
 */
function mediaBackground(key, variant) {
  const url = (variant === 'card' && CARD_IMAGES[key]) || IMAGES[key];
  if (url) return `${GRAIN}, url("${url}")`;
  return `${GRAIN}, ${posterArt(key)}`;
}

/* ----------------------------- 2. DATA ---------------------------------- */

/** The ten vibe dimensions. Order matters — vectors are keyed, not indexed. */
const DIMS = ['food', 'nightlife', 'culture', 'nature', 'adventure', 'luxury', 'romance', 'social', 'iconic', 'calm'];

/** Human labels for the dimensions. */
const DIM_LABEL = {
  food: 'Food', nightlife: 'Nightlife', culture: 'Culture', nature: 'Nature',
  adventure: 'Adventure', luxury: 'Luxury', romance: 'Romance', social: 'Social',
  iconic: 'Iconic', calm: 'Calm'
};

/** Phrases used to write the "why this matches" line from shared dimensions. */
const DIM_PHRASE = {
  food: 'food worth planning a whole day around',
  nightlife: 'nights that do not end early',
  culture: 'history you can walk straight into',
  nature: 'landscape that does the talking',
  adventure: 'days that ask something of you',
  luxury: 'comfort handled quietly, without fuss',
  romance: 'the kind of light couples remember',
  social: 'locals who pull you into their evening',
  iconic: 'the view you have seen a hundred times and still want to stand in',
  calm: 'quiet that actually restores you'
};

/** Tie-break priority when two dimensions score equal (earlier wins). */
const DIM_PRIORITY = ['food', 'nightlife', 'culture', 'adventure', 'nature', 'iconic', 'luxury', 'social', 'romance', 'calm'];

/**
 * THE POOL — hand-seeded by the founder. Never hand-ranked.
 * vibe: 0–5 per dimension. This is the only thing the algorithm reads.
 */
const DESTINATIONS = [
  {
    id: 'nevis', name: 'Nevis', country: 'St. Kitts & Nevis · Caribbean', image: 'nevis',
    vibe: { calm: 5, nature: 5, luxury: 4, romance: 4, culture: 3, food: 3, iconic: 2, social: 2, adventure: 2, nightlife: 1 },
    intro: 'A single green volcano with its head in the cloud, ringed by a road you can drive in an hour. Nevis never learned to hurry. Sugar-estate great houses have become small hotels, the monkeys outnumber the people, and by the second evening the bartender at Sunshine\'s knows what you drink.',
    highlights: [
      { kicker: 'Nature', title: 'Nevis Peak', body: 'A 3,232-foot rainforest climb that turns into a rope-assisted scramble. Most people stop at the ridge, sit down, and let the cloud move through them.' },
      { kicker: 'Food', title: 'Sunday at the beach shacks', body: 'Grilled snapper, johnny cakes, goat water stew. The whole island eats outside, and the line is where you meet everyone.' },
      { kicker: 'Culture', title: 'Plantation-era great houses', body: 'Golden Rock, Montpelier, Hermitage — 18th-century estates now run as small hotels, with the history left honestly intact.' },
      { kicker: 'Calm', title: 'Pinney\'s Beach at dusk', body: 'Four miles of sand facing St. Kitts, and almost nobody on it. This is the island\'s actual luxury.' }
    ]
  },
  {
    id: 'juneau', name: 'Juneau', country: 'Alaska, USA', image: 'juneau',
    vibe: { nature: 5, adventure: 5, calm: 4, iconic: 3, culture: 2, food: 2, romance: 2, social: 1, luxury: 1, nightlife: 1 },
    intro: 'A capital city with no road in or out. Juneau sits on a strip of rock between a glacier and a channel, and the scale of it never stops surprising you — humpbacks in the morning, a blue ice face in the afternoon, rain on the tin roofs all night.',
    highlights: [
      { kicker: 'Nature', title: 'Mendenhall Glacier', body: 'Thirteen miles of ice ending in a lake, with an ice cave beneath it that changes shape every season. Kayak in and the silence is total.' },
      { kicker: 'Adventure', title: 'The Mount Roberts ridge', body: 'Tram up, then keep walking until the town is a model below and the alpine opens out toward Canada.' },
      { kicker: 'Wildlife', title: 'Whales at Point Adolphus', body: 'Humpbacks bubble-net feeding within a boat length. Not a scheduled show — just a summer routine you get to witness.' },
      { kicker: 'Culture', title: 'Tlingit Juneau', body: 'The Sealaska Heritage totem walk and carvers working in the open. The oldest story here is not the gold rush.' }
    ]
  },
  {
    id: 'turkey', name: 'The Turquoise Coast', country: 'Türkiye · Aegean & Mediterranean', image: 'turkey',
    vibe: { culture: 5, food: 5, iconic: 4, romance: 4, luxury: 4, calm: 3, social: 3, nature: 3, adventure: 2, nightlife: 2 },
    intro: 'Stone villages above impossible blue, Lycian tombs cut into the cliffs above the harbour, and a long wooden gulet that becomes your hotel for a week. The Turquoise Coast is where ancient and effortless share the same table — and the table is the point.',
    highlights: [
      { kicker: 'Food', title: 'A proper meze table', body: 'Twenty small plates before anyone mentions the fish. Sit near Kaş harbour at sunset and let the waiter decide.' },
      { kicker: 'Culture', title: 'Lycian ruins with no fence', body: 'Xanthos, Patara, the sunken city at Kekova — 2,500 years old and half of it underwater.' },
      { kicker: 'Sea', title: 'A gulet week', body: 'Wooden boat, six cabins, a new bay every afternoon. Swim, eat, sleep on deck, repeat.' },
      { kicker: 'Stay', title: 'Boutique stone hotels', body: 'Restored village houses in Kalkan and Alaçatı — twelve rooms, one pool, no lobby music.' }
    ]
  },
  {
    id: 'barbados', name: 'Barbados', country: 'Caribbean', image: 'barbados',
    vibe: { nightlife: 5, social: 5, food: 4, calm: 3, culture: 3, adventure: 3, nature: 3, luxury: 3, romance: 3, iconic: 2 },
    intro: 'The most sociable island in the Caribbean. Friday night in Oistins is the whole country at one fish fry, and the rum shop on the corner has been open since 1961. Barbados does not perform its warmth for visitors — you are simply included.',
    highlights: [
      { kicker: 'Nightlife', title: 'Oistins Fish Fry, Friday', body: 'Grilled marlin, macaroni pie, three sound systems and dancing on the road until it gets light.' },
      { kicker: 'Food', title: 'Cou-cou, flying fish, cutters', body: 'The national dish on a Saturday, then a fish cutter from a bakery window that costs almost nothing and beats most restaurants.' },
      { kicker: 'Culture', title: 'Rum shop hopping', body: 'There are hundreds. Each one is a living room with a counter. Ask what to drink and you will end up in a conversation.' },
      { kicker: 'Sea', title: 'Two coasts, two moods', body: 'Glass-calm west for swimming, wild Atlantic east at Bathsheba for surfing and standing still in the spray.' }
    ]
  },
  {
    id: 'stlucia', name: 'St. Lucia', country: 'Caribbean', image: 'stlucia',
    vibe: { romance: 5, nature: 5, iconic: 4, adventure: 4, calm: 4, luxury: 4, food: 3, culture: 3, social: 2, nightlife: 2 },
    intro: 'Two volcanic spires rising straight out of the sea, rainforest running down to the water, and sulphur steam drifting off a drive-in volcano. St. Lucia is the most dramatic island in the chain, and it knows exactly how good it looks at 6pm.',
    highlights: [
      { kicker: 'Iconic', title: 'The Pitons', body: 'Gros and Petit Piton. Climb one in the morning or just take the room that faces them and cancel the rest of your plans.' },
      { kicker: 'Adventure', title: 'Sulphur Springs & Tet Paul', body: 'Walk into a collapsed caldera, then a short ridge trail with the best view on the island for the price of a coffee.' },
      { kicker: 'Romance', title: 'Anse Chastanet at dusk', body: 'Dark volcanic sand, reef ten metres out, and the light going gold behind the Pitons.' },
      { kicker: 'Food', title: 'Friday in Anse La Raye', body: 'The fish fry with less polish and more locals than the tourist version. Bring cash.' }
    ]
  },
  {
    id: 'lisbon', name: 'Lisbon', country: 'Portugal', image: 'lisbon',
    vibe: { food: 5, culture: 5, nightlife: 4, social: 4, iconic: 4, romance: 3, luxury: 3, calm: 2, adventure: 2, nature: 2 },
    intro: 'A city built on seven hills that all end in the same wide silver river. Tiled facades, trams that shouldn\'t fit, a fado singer two floors above a tinned-fish shop. Lisbon is Europe\'s best-value great city and it is not a secret any more — go anyway.',
    highlights: [
      { kicker: 'Food', title: 'Time Out Market and then everywhere else', body: 'Start there, then leave: bifana at a counter in Alfama, pastéis in Belém, a grilled sardine in June that ruins other sardines.' },
      { kicker: 'Culture', title: 'Fado in Alfama', body: 'A small room, no microphone, everyone quiet. It is the closest a city gets to admitting how it feels.' },
      { kicker: 'Nightlife', title: 'Bairro Alto, slowly', body: 'The whole neighbourhood is the bar. Doors open at eleven, the street is the dance floor by one.' },
      { kicker: 'Day trip', title: 'Sintra', body: 'Forty minutes by train to a mountain of palaces in the mist. Go early, before the coaches.' }
    ]
  }
];

/**
 * QUIZ — data-driven. Add a question by adding an object; the UI adapts.
 * Each option carries `w`: the points it adds to the traveler's vibe vector.
 */
const QUESTIONS = [
  {
    id: 'pull', text: 'What pulls you to a place first?',
    options: [
      { label: 'The food', w: { food: 3, culture: 1 } },
      { label: 'Music and nightlife', w: { nightlife: 3, social: 2 } },
      { label: 'Culture and history', w: { culture: 3, iconic: 1 } },
      { label: 'Nature and calm', w: { nature: 3, calm: 2 } },
      { label: 'Adventure', w: { adventure: 3, nature: 1 } },
      { label: 'The iconic sights', w: { iconic: 3, culture: 1 } }
    ]
  },
  {
    id: 'evening', text: 'Your ideal evening looks like…',
    options: [
      { label: 'A local food spot nobody wrote about', w: { food: 2, social: 1, culture: 1 } },
      { label: 'Dancing, live music, late', w: { nightlife: 3, social: 2 } },
      { label: 'A quiet view and nothing else', w: { calm: 3, romance: 1 } },
      { label: 'Meeting locals, wherever that leads', w: { social: 3, culture: 1 } },
      { label: 'Still out exploring', w: { adventure: 2, iconic: 1, nature: 1 } }
    ]
  },
  {
    id: 'pace', text: 'What pace do you want?',
    options: [
      { label: 'Slow and restful', w: { calm: 3, luxury: 1, romance: 1 } },
      { label: 'Balanced — some plans, some drift', w: { calm: 1, culture: 1, food: 1 } },
      { label: 'Packed and active', w: { adventure: 3, iconic: 1 } }
    ]
  },
  {
    id: 'who', text: 'Who is travelling?',
    options: [
      { label: 'Just me', w: { social: 2, adventure: 1 } },
      { label: 'Me and my person', w: { romance: 3, calm: 1 } },
      { label: 'The family', w: { nature: 1, iconic: 1, calm: 1 } },
      { label: 'A group of friends', w: { social: 2, nightlife: 2 } }
    ]
  },
  {
    id: 'comfort', text: 'Where do you want to sleep?',
    options: [
      { label: 'Rustic and authentic', w: { culture: 2, adventure: 1, food: 1 } },
      { label: 'Boutique and stylish', w: { luxury: 2, romance: 1, food: 1 } },
      { label: 'Full luxury, handled', w: { luxury: 3, calm: 1, romance: 1 } }
    ]
  },
  {
    id: 'memory', text: 'What makes a trip unforgettable?',
    options: [
      { label: 'A meal', w: { food: 3 } },
      { label: 'A night out', w: { nightlife: 3, social: 1 } },
      { label: 'A person you met', w: { social: 3, culture: 1 } },
      { label: 'A view', w: { nature: 2, iconic: 2, calm: 1 } },
      { label: 'A challenge you conquered', w: { adventure: 3 } }
    ]
  },
  {
    id: 'style', text: 'Are you more…',
    options: [
      { label: 'A planner', w: { iconic: 1, luxury: 1, culture: 1 } },
      { label: 'Spontaneous', w: { social: 2, adventure: 1 } }
    ]
  },
  {
    id: 'climate', text: 'What climate are you craving?',
    options: [
      { label: 'Tropical warm', w: { calm: 1, romance: 1, nature: 1 } },
      { label: 'Cool and wild', w: { nature: 2, adventure: 2 } },
      { label: 'Mediterranean mild', w: { culture: 2, food: 2, romance: 1 } },
      { label: 'Doesn\'t matter', w: {} }
    ]
  }
];

/**
 * PERSONAS — the traveler's dominant dimension maps here.
 * `test` gets the sorted dimension list and the vector; first match wins.
 */
const PERSONAS = [
  {
    id: 'food-explorer', name: 'Food Explorer',
    test: (top) => top[0] === 'food',
    desc: 'You plan trips around tables. A place makes sense to you once you have eaten what it eats on an ordinary Tuesday — and you would rather queue at a counter than book the room with the view.'
  },
  {
    id: 'island-hopper', name: 'Island Hopper',
    test: (top, v) => (top[0] === 'nature' || top[0] === 'social') && v.nature >= 4 && v.social >= 4,
    desc: 'You want the landscape and the people, and you refuse to choose. Water in the morning, strangers who become friends by evening — you travel wide and you travel warm.'
  },
  {
    id: 'vibe-seeker', name: 'Vibe Seeker',
    test: (top) => top[0] === 'nightlife' || top[0] === 'social',
    desc: 'You read a place by its energy after dark. Music, a crowd that lets you in, a night that runs longer than planned — that is the souvenir you are actually collecting.'
  },
  {
    id: 'culture-connector', name: 'Culture Connector',
    test: (top) => top[0] === 'culture',
    desc: 'You want the story underneath the postcard. Markets, language, who built what and why — you leave a place understanding it, not just having seen it.'
  },
  {
    id: 'adventure-social', name: 'Adventure Social',
    test: (top) => top[0] === 'adventure',
    desc: 'A trip should cost you something physical. You want the climb, the crossing, the early start — and the beer afterwards with whoever else was mad enough to be there.'
  },
  {
    id: 'bucket-list-hunter', name: 'Bucket List Hunter',
    test: (top) => top[0] === 'iconic',
    desc: 'You want to stand in front of the thing itself. Not for the photograph — for the scale of it, and the quiet moment of realising it is genuinely that good.'
  },
  {
    id: 'luxe-localist', name: 'Luxe Localist',
    test: (top, v) => top[0] === 'luxury' || (v.luxury >= 3.6 && (v.food >= 3.4 || v.culture >= 3.4 || v.romance >= 3.4)),
    desc: 'You want comfort and the real place, and you have learned they are not opposites. Twelve rooms, not four hundred; the excellent local restaurant, not the hotel one.'
  },
  {
    id: 'quiet-escaper', name: 'Quiet Escaper',
    test: () => true, // fallback: calm, nature, romance
    desc: 'You travel to lower the volume. Space, air, a view that gives you back your own thoughts — and the sense afterwards that you actually rested instead of just relocating.'
  }
];

/* ------------------------- 3. THE ALGORITHM ----------------------------- */
/* Core IP. Deliberately standalone: nothing here touches the DOM.          */

/** Empty vibe vector. */
function emptyVector() {
  const v = {};
  DIMS.forEach((d) => { v[d] = 0; });
  return v;
}

/**
 * Build the traveler's vibe vector from their answers.
 * @param {Array<{qIndex:number, oIndex:number}>} answers
 * @returns {Object} raw vector keyed by dimension
 */
function buildTravelerVector(answers) {
  const v = emptyVector();
  answers.forEach((a) => {
    const opt = QUESTIONS[a.qIndex].options[a.oIndex];
    Object.keys(opt.w).forEach((dim) => { v[dim] += opt.w[dim]; });
  });
  return v;
}

/** Rescale a raw vector onto 0–5 so it is comparable to destination vectors. */
function normalizeTo5(vec) {
  const max = Math.max(...DIMS.map((d) => vec[d]), 1);
  const out = {};
  DIMS.forEach((d) => { out[d] = +(vec[d] / max * 5).toFixed(2); });
  return out;
}

/**
 * Cosine similarity between two vibe vectors. 0 = nothing shared, 1 = identical shape.
 * Magnitude-independent, so a traveler who answered strongly is not penalised.
 */
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  DIMS.forEach((d) => {
    const x = a[d] || 0, y = b[d] || 0;
    dot += x * y; magA += x * x; magB += y * y;
  });
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Presentation scale only — ranking always uses the raw cosine.
 * All-positive vectors sit in a narrow cosine band (~0.55–0.98); this stretches
 * that band into a readable percentage without changing any ordering.
 */
function displayScore(cos) {
  const pct = Math.round(((cos - 0.55) / 0.43) * 62 + 36);
  return Math.max(41, Math.min(99, pct));
}

/** The traveler's dimensions, strongest first, with deterministic tie-breaks. */
function rankDimensions(vec) {
  return DIMS.slice().sort((a, b) => {
    const diff = (vec[b] || 0) - (vec[a] || 0);
    if (diff !== 0) return diff;
    return DIM_PRIORITY.indexOf(a) - DIM_PRIORITY.indexOf(b);
  });
}

/** Assign a persona from the traveler's shape. */
function assignPersona(vec) {
  const top = rankDimensions(vec);
  return PERSONAS.find((p) => p.test(top, vec)) || PERSONAS[PERSONAS.length - 1];
}

/**
 * Write the "why this matches" line: the traveler's strongest dimensions that
 * this destination also scores highly on. Never hand-written per destination.
 */
function explainMatch(travelerVec, dest, used, rank) {
  const candidates = rankDimensions(travelerVec).filter((d) => dest.vibe[d] >= 4);

  // Prefer a pair no other card has used, so four results read as four reasons.
  let shared = candidates.slice(0, 2);
  if (used) {
    const fresh = candidates.filter((d) => !used.has(d));
    if (fresh.length >= 2) shared = fresh.slice(0, 2);
    else if (fresh.length === 1) shared = [fresh[0], candidates.find((d) => d !== fresh[0])].filter(Boolean);
    shared.forEach((d) => used.add(d));
  }

  if (!shared.length) {
    // No dimension of theirs is a headline strength here — say so honestly.
    const best = rankDimensions(dest.vibe)[0];
    return `A softer match — but it delivers ${DIM_PHRASE[best]}.`;
  }

  const a = DIM_LABEL[shared[0]].toLowerCase();
  const pa = DIM_PHRASE[shared[0]];
  if (shared.length === 1) {
    return `You scored high on ${a}. This is ${pa}.`;
  }

  const b = DIM_LABEL[shared[1]].toLowerCase();
  const pb = DIM_PHRASE[shared[1]];
  const templates = [
    `Your ${a} and ${b} scores both land here: ${pa}, and ${pb}.`,
    `Built for the way you scored on ${a} and ${b} — ${pa}, ${pb}.`,
    `You lean ${a} and ${b}. This is ${pa}, with ${pb}.`,
    `Strong overlap on ${a} and ${b}: ${pa}, and ${pb}.`
  ];
  return templates[(rank || 0) % templates.length];
}

/**
 * MATCH — the whole engine in one call.
 * @param {Array} answers
 * @param {number} count how many destinations to return
 * @returns {{vector, persona, matches:Array}}
 */
function matchDestinations(answers, count = 4) {
  const raw = buildTravelerVector(answers);
  const vector = normalizeTo5(raw);
  const persona = assignPersona(vector);

  const used = new Set();
  const matches = DESTINATIONS
    .map((dest) => ({ dest, cos: cosineSimilarity(vector, dest.vibe) }))
    .sort((a, b) => b.cos - a.cos)
    .slice(0, count)
    .map((m, i) => Object.assign(m, {
      score: displayScore(m.cos),
      why: explainMatch(vector, m.dest, used, i)
    }));

  return { vector, persona, matches };
}

/* ------------------------- 4. ANALYTICS --------------------------------- */
/* One small module. Every event in the funnel goes through track().         */

/** Inject the provider's script once, if one is configured. */
function initAnalytics() {
  const { provider, site } = ANALYTICS;
  if (!site || provider === 'none') return;

  const el = document.createElement('script');
  if (provider === 'plausible') {
    el.defer = true;
    el.setAttribute('data-domain', site);
    el.src = 'https://plausible.io/js/script.js';
  } else if (provider === 'goatcounter') {
    el.async = true;
    el.setAttribute('data-goatcounter', `https://${site}.goatcounter.com/count`);
    el.src = 'https://gc.zgo.at/count.js';
  } else {
    return;
  }
  document.head.appendChild(el);
}

/**
 * Record one funnel event.
 * @param {string} name  quiz_started | quiz_completed | destination_opened | signup | share_clicked
 * @param {Object} [props] e.g. { persona: 'Food Explorer' }
 */
function track(name, props) {
  try {
    if (ANALYTICS.provider === 'plausible' && window.plausible) {
      window.plausible(name, props ? { props } : undefined);
    } else if (ANALYTICS.provider === 'goatcounter' && window.goatcounter && window.goatcounter.count) {
      // GoatCounter has no event properties, so the value rides in the path.
      const detail = props ? Object.values(props).join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-') : '';
      window.goatcounter.count({ path: detail ? `${name}/${detail}` : name, title: name, event: true });
    }
  } catch (e) {
    /* analytics must never break the experience */
  }
  if (window.IQ_DEBUG) console.log('[track]', name, props || {});
}

/* ------------------------------- 5. UI ---------------------------------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

const state = {
  answers: [],
  q: 0,
  result: null,
  lastFocus: null
};

/* --- theme --- */
function initTheme() {
  const toggle = $('#themeToggle');
  const sync = () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    toggle.querySelector('.theme-toggle-text').textContent = dark ? 'Light' : 'Dark';
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1a1815' : '#f7f4ee');
  };
  toggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('iq_theme', next); } catch (e) {}
    sync();
  });
  sync();
}

/* --- scroll reveal --- */
function initReveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
}

/* --- header state --- */
function initHeader() {
  const header = $('#siteHeader');
  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* --- quiz --- */
function openQuiz() {
  track('quiz_started');
  state.answers = [];
  state.q = 0;
  state.lastFocus = document.activeElement;
  const quiz = $('#quiz');
  quiz.hidden = false;
  document.body.classList.add('is-locked');
  renderQuestion(true);
}

function closeQuiz() {
  $('#quiz').hidden = true;
  document.body.classList.remove('is-locked');
  if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
}

function renderQuestion(immediate) {
  const q = QUESTIONS[state.q];
  const inner = $('.quiz-inner');
  const paint = () => {
    $('#qCount').textContent = `Question ${state.q + 1} of ${QUESTIONS.length}`;
    $('#qText').textContent = q.text;

    const wrap = $('#qOptions');
    wrap.innerHTML = '';
    q.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.textContent = opt.label;
      const chosen = state.answers[state.q];
      if (chosen && chosen.oIndex === i) b.classList.add('is-picked');
      b.addEventListener('click', () => answer(i));
      wrap.appendChild(b);
    });

    const pct = ((state.q + 1) / QUESTIONS.length) * 100;
    $('#progressFill').style.width = pct + '%';
    $('#progress').setAttribute('aria-valuenow', String(state.q + 1));
    $('#quizBack').disabled = state.q === 0;

    // Rotate the backdrop through the pool so the quiz feels like travel.
    const keys = DESTINATIONS.map((d) => d.image);
    $('#quizMedia').style.backgroundImage = mediaBackground(keys[state.q % keys.length]);

    inner.classList.remove('is-swapping');
    const first = wrap.querySelector('.opt');
    if (first && !immediate) first.focus({ preventScroll: true });
  };

  if (immediate) { paint(); return; }
  inner.classList.add('is-swapping');
  setTimeout(paint, 220);
}

function answer(oIndex) {
  state.answers[state.q] = { qIndex: state.q, oIndex };
  if (state.q < QUESTIONS.length - 1) {
    state.q += 1;
    renderQuestion(false);
  } else {
    finishQuiz();
  }
}

function quizBack() {
  if (state.q === 0) return;
  state.q -= 1;
  renderQuestion(false);
}

/* --- results --- */
function finishQuiz() {
  const result = matchDestinations(state.answers, 4);
  state.result = result;
  track('quiz_completed', { persona: result.persona.name });
  renderResults(result);
  closeQuiz();

  const section = $('#results');
  section.hidden = false;
  requestAnimationFrame(() => {
    section.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    // Animate the vibe bars once they are on screen.
    setTimeout(() => {
      $$('#vibeBars .vb-fill').forEach((el) => { el.style.width = el.dataset.w + '%'; });
    }, 260);
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function renderResults(result) {
  $('#personaName').textContent = result.persona.name;
  $('#personaDesc').textContent = result.persona.desc;

  // Top five dimensions, as evidence that the result was computed, not chosen.
  const bars = $('#vibeBars');
  bars.innerHTML = '';
  rankDimensions(result.vector).slice(0, 5).forEach((d) => {
    const li = document.createElement('li');
    const pct = Math.round((result.vector[d] / 5) * 100);
    li.innerHTML =
      `<span class="vb-name">${DIM_LABEL[d]}</span>` +
      `<span class="vb-track"><span class="vb-fill" data-w="${pct}"></span></span>` +
      `<span class="vb-val">${result.vector[d].toFixed(1)}</span>`;
    bars.appendChild(li);
  });

  const cards = $('#matchCards');
  cards.innerHTML = '';
  cards.classList.toggle('count-4', result.matches.length === 4);

  result.matches.forEach((m, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card';
    card.setAttribute('aria-label', `${m.dest.name}, ${m.score} percent match. Open details.`);
    card.innerHTML =
      `<span class="card-media">
         <span class="card-rank">${String(i + 1).padStart(2, '0')}</span>
         <span class="card-score">${m.score}% match</span>
       </span>
       <span class="card-body">
         <span class="card-country">${m.dest.country}</span>
         <span class="card-name">${m.dest.name}</span>
         <span class="card-why">${m.why}</span>
         <span class="card-more">Explore <span aria-hidden="true">→</span></span>
       </span>`;
    card.querySelector('.card-media').style.backgroundImage = mediaBackground(m.dest.image, 'card');
    card.addEventListener('click', () => openDetail(m));
    cards.appendChild(card);
  });
}

/* --- destination detail --- */
function openDetail(match) {
  const d = match.dest;
  track('destination_opened', { destination: d.name });
  state.lastFocus = document.activeElement;

  $('#dMedia').style.backgroundImage = mediaBackground(d.image);
  $('#dCountry').textContent = d.country;
  $('#dName').textContent = d.name;
  $('#dScore').textContent = `${match.score}% match · ranked by your answers, not by us`;
  $('#dIntro').textContent = d.intro;

  const personaName = state.result ? state.result.persona.name : 'traveller';
  $('#dFitLabel').textContent = `Why this fits your ${personaName} vibe`;
  $('#dFit').textContent = match.why;

  const hl = $('#dHighlights');
  hl.innerHTML = '';
  d.highlights.forEach((h) => {
    const el = document.createElement('article');
    el.className = 'hl';
    el.innerHTML =
      `<p class="hl-kicker">${h.kicker}</p>
       <h3 class="hl-title">${h.title}</h3>
       <p class="hl-body">${h.body}</p>`;
    hl.appendChild(el);
  });

  const tags = $('#dTags');
  tags.innerHTML = '';
  rankDimensions(d.vibe).forEach((dim) => {
    const li = document.createElement('li');
    li.textContent = `${DIM_LABEL[dim]} ${d.vibe[dim]}`;
    if (d.vibe[dim] >= 4) li.classList.add('is-strong');
    tags.appendChild(li);
  });

  const panel = $('#detail');
  panel.hidden = false;
  document.body.classList.add('is-locked');
  $('#detailScroll').scrollTop = 0;
  $('#detailBack').focus({ preventScroll: true });
}

function closeDetail() {
  $('#detail').hidden = true;
  document.body.classList.remove('is-locked');
  if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
}

/* --------------------- FOUNDER VIDEO (phase 2) -------------------------- */
/* Nothing from YouTube or Vimeo is requested until the visitor presses play. */

function initFounderVideo() {
  const section = $('#founder');
  if (!VIDEO.show) return;

  section.hidden = false;
  $('#founderTitle').textContent = VIDEO.title;
  $('#founderBlurb').textContent = VIDEO.blurb;
  $('#videoPoster').style.backgroundImage = mediaBackground(
    VIDEO.poster && IMAGES[VIDEO.poster] ? VIDEO.poster : 'nevis'
  );
  if (VIDEO.poster && !IMAGES[VIDEO.poster]) {
    $('#videoPoster').style.backgroundImage = `${GRAIN}, url("${VIDEO.poster}")`;
  }

  const frame = $('#videoFrame');
  const btn = $('#videoPlay');
  const configured = (VIDEO.type === 'youtube' || VIDEO.type === 'vimeo') ? !!VIDEO.id
    : VIDEO.type === 'mp4' ? !!VIDEO.src : false;

  if (!configured) {
    // Honest placeholder: the control says what it is instead of doing nothing.
    frame.classList.add('is-pending');
    $('#videoPlayText').textContent = 'Founder film coming soon';
    btn.setAttribute('aria-disabled', 'true');
    btn.addEventListener('click', (e) => e.preventDefault());
    return;
  }

  btn.addEventListener('click', () => {
    let el;
    if (VIDEO.type === 'youtube') {
      el = document.createElement('iframe');
      el.src = `https://www.youtube-nocookie.com/embed/${VIDEO.id}?autoplay=1&rel=0&modestbranding=1`;
      el.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      el.allowFullscreen = true;
      el.title = VIDEO.title;
    } else if (VIDEO.type === 'vimeo') {
      el = document.createElement('iframe');
      el.src = `https://player.vimeo.com/video/${VIDEO.id}?autoplay=1`;
      el.allow = 'autoplay; fullscreen; picture-in-picture';
      el.allowFullscreen = true;
      el.title = VIDEO.title;
    } else {
      el = document.createElement('video');
      el.src = VIDEO.src;
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.preload = 'none';
    }
    frame.appendChild(el);
    btn.remove();
    track('video_played');
  });
}

/* --------------------- AMBIENT SOUND (phase 2) -------------------------- */
/* Silent on load, always. The control only exists once AUDIO.src is set.    */

let ambient = null;
let ambientFade = null;

function initAmbientSound() {
  if (!AUDIO.src) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sound-toggle';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-label', 'Island ambiance, off');
  btn.innerHTML = '<span class="sound-wave" aria-hidden="true"><i></i><i></i><i></i></span>' +
                  '<span class="sound-toggle-text">Island ambiance</span>';
  document.body.appendChild(btn);

  ambient = new Audio(AUDIO.src);
  ambient.loop = true;
  ambient.preload = 'none';
  ambient.volume = 0;

  const setState = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', `Island ambiance, ${on ? 'on' : 'off'}`);
    try { localStorage.setItem('iq_sound', on ? 'on' : 'off'); } catch (e) {}
  };

  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') === 'true';
    if (on) { fadeAmbient(0, () => ambient.pause()); setState(false); }
    else { ambient.play().then(() => fadeAmbient(AUDIO.volume)).catch(() => {}); setState(true); }
  });

  // A remembered "on" resumes at the visitor's first interaction — browsers
  // block audio before that, and the page must still open silent.
  try {
    if (localStorage.getItem('iq_sound') === 'on') {
      const resume = () => {
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
        ambient.play().then(() => { fadeAmbient(AUDIO.volume); setState(true); }).catch(() => {});
      };
      document.addEventListener('pointerdown', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    }
  } catch (e) {}
}

/** Fade the ambient track to a target volume; instant under reduced motion. */
function fadeAmbient(target, done) {
  if (!ambient) return;
  clearInterval(ambientFade);
  if (prefersReducedMotion()) {
    ambient.volume = target;
    if (done) done();
    return;
  }
  const steps = 24;
  const start = ambient.volume;
  const step = (target - start) / steps;
  let i = 0;
  ambientFade = setInterval(() => {
    i += 1;
    ambient.volume = Math.min(1, Math.max(0, start + step * i));
    if (i >= steps) {
      clearInterval(ambientFade);
      ambient.volume = target;
      if (done) done();
    }
  }, AUDIO.fadeMs / steps);
}

/* ------------------- 6. LEAD CAPTURE + SHARE ---------------------------- */

function readSignups() {
  try { return JSON.parse(localStorage.getItem(SIGNUP_KEY) || '[]'); } catch (e) { return []; }
}

function writeSignups(list) {
  try { localStorage.setItem(SIGNUP_KEY, JSON.stringify(list)); } catch (e) {}
}

/** Store first, send second — a lead is never lost, even offline. */
function storeSignup(payload) {
  const list = readSignups();
  list.push(Object.assign({ sent: false }, payload));
  writeSignups(list);
  return list.length - 1;
}

function markSent(index) {
  const list = readSignups();
  if (list[index]) { list[index].sent = true; writeSignups(list); }
}

async function postSignup(payload) {
  if (!FORM_ENDPOINT) return false;
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/** Anything stored but never delivered gets retried on the next visit. */
async function flushPendingSignups() {
  const list = readSignups();
  for (let i = 0; i < list.length; i += 1) {
    if (!list[i].sent) {
      /* eslint-disable no-await-in-loop */
      const ok = await postSignup(list[i]);
      if (ok) markSent(i);
    }
  }
}

function initCapture() {
  const form = $('#captureForm');
  const input = $('#email');
  const msg = $('#captureMsg');
  const btn = $('#captureBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

    if (!valid) {
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = 'That email does not look right — check it and try again.';
      msg.classList.add('is-error');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    msg.classList.remove('is-error');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const payload = {
      email,
      persona: state.result ? state.result.persona.name : 'unknown',
      source: 'islandiq-prototype',
      timestamp: new Date().toISOString(),
      matches: state.result ? state.result.matches.map((m) => `${m.dest.name} ${m.score}%`).join(', ') : ''
    };

    const idx = storeSignup(payload);
    const ok = await postSignup(payload);
    if (ok) markSent(idx);

    track('signup', { source: 'results' });

    form.hidden = true;
    msg.textContent = ok
      ? 'You are in. Your full vibe report is on its way.'
      : 'Saved. We could not reach the server just now — it will send itself next time you visit.';
    btn.disabled = false;
    btn.textContent = 'Send it';
  });
}

function initShare() {
  $('#shareBtn').addEventListener('click', async () => {
    const persona = state.result ? state.result.persona.name : 'traveller';
    track('share_clicked', { persona });
    const text = `I'm a ${persona} on IslandIQ — what's your travel vibe?`;
    const url = location.href.split('#')[0];

    if (navigator.share) {
      try { await navigator.share({ title: 'IslandIQ', text, url }); return; } catch (e) { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('Copied — paste it anywhere.');
    } catch (e) {
      toast(text);
    }
  });
}

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-on');
    setTimeout(() => { el.hidden = true; }, 400);
  }, 2600);
}

/* ------------------------------ 7. BOOT --------------------------------- */

function initPoolList() {
  const el = $('#poolList');
  el.innerHTML = DESTINATIONS
    .map((d) => `<span class="pool-name">${d.name}</span>`)
    .join('<span class="dot" aria-hidden="true">·</span>');
}

function init() {
  document.documentElement.setAttribute('data-theme',
    document.documentElement.getAttribute('data-theme') || 'dark');

  $('#heroMedia').style.backgroundImage = mediaBackground('hero');
  $('#year').textContent = new Date().getFullYear();

  initAnalytics();
  initTheme();
  initHeader();
  initFounderVideo();
  initAmbientSound();
  initReveal();
  initPoolList();
  initCapture();
  initShare();

  $$('[data-action="start-quiz"]').forEach((b) => b.addEventListener('click', openQuiz));
  $('#quizBack').addEventListener('click', quizBack);
  $('#quizClose').addEventListener('click', closeQuiz);
  $('#detailBack').addEventListener('click', closeDetail);
  $('#detailBack2').addEventListener('click', closeDetail);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#detail').hidden) closeDetail();
    else if (!$('#quiz').hidden) closeQuiz();
  });

  flushPendingSignups();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* Exposed for QA / console checks — harmless in production. */
window.IslandIQ = {
  DESTINATIONS, QUESTIONS, PERSONAS, DIMS, ANALYTICS, VIDEO, AUDIO,
  matchDestinations, cosineSimilarity, buildTravelerVector, normalizeTo5, assignPersona, track
};
