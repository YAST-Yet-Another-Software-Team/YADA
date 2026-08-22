import fs from 'node:fs';

const HEAD = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap");
    body { margin: 0; font-family: "Plus Jakarta Sans", -apple-system, "Segoe UI", sans-serif; }
    a { color: oklch(52% 0.205 25); } a:hover { color: oklch(44% 0.18 24); }
  </style>
</helmet>`;
const TAIL = `</x-dc>
</body>
</html>
`;

const INK = 'oklch(37% 0.011 50)';
const FAINT = 'oklch(72% 0.011 50)';
const LINE = 'oklch(85% 0.009 50)';
const FILL = 'oklch(96% 0.005 50)';
const HAND = `'Architects Daughter', 'Comic Sans MS', cursive`;

const note = (s) => `      <div style="font-family: ${HAND}; font-size: 14px; color: ${FAINT};">${s}</div>`;

const label = (s) =>
  `      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${FAINT};">${s}</div>`;

const box = (s, h = 54, hand = true) =>
  `      <div style="border: 1.5px dashed ${LINE}; border-radius: 12px; height: ${h}px; display: flex; align-items: center; padding: 0 14px; font-family: ${hand ? HAND : 'inherit'}; font-size: 15px; color: ${INK};">${s}</div>`;

const bar = (w, h = 12) =>
  `      <div style="width: ${w}; height: ${h}px; border-radius: 999px; background: ${FILL};"></div>`;

const btn = (s, accent) =>
  `      <div style="border-radius: 16px; height: 54px; display: flex; align-items: center; justify-content: center; font-family: ${HAND}; font-size: 17px; ${
    accent
      ? `background: oklch(60% 0.215 27); color: #ffffff;`
      : `border: 1.5px dashed ${LINE}; color: ${INK};`
  }">${s}</div>`;

const circle = (d, s = '') =>
  `      <div style="width: ${d}px; height: ${d}px; border-radius: 999px; border: 1.5px dashed ${LINE}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: ${HAND}; font-size: 12px; color: ${FAINT};">${s}</div>`;

const row = (children, gap = 12, align = 'center') =>
  `      <div style="display: flex; gap: ${gap}px; align-items: ${align};">\n${children
    .map((c) => c.replace(/^ {6}/, '        '))
    .join('\n')}\n      </div>`;

const grow = (s) => s.replace('style="', 'style="flex-grow: 1; ');

/** The map stand-in: a hatched block, never a real map. */
const map = (h, caption) => `  <div style="position: relative; height: ${h}px; background: repeating-linear-gradient(45deg, ${FILL}, ${FILL} 11px, #ffffff 11px, #ffffff 22px); border-bottom: 1.5px dashed ${LINE}; display: flex; align-items: center; justify-content: center;">
    <div style="font-family: ${HAND}; font-size: 16px; color: ${FAINT};">${caption}</div>
  </div>`;

function screen({ file, title, mapH, mapNote, blocks }) {
  const body = `<div style="width: 390px; height: 844px; background: #ffffff; color: ${INK}; display: flex; flex-direction: column; overflow: hidden;">
  <div style="display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1.5px dashed ${LINE};">
    ${circle(26, '<').trim()}
    <div style="font-family: ${HAND}; font-size: 20px; color: ${INK};">${title}</div>
  </div>
${map(mapH, mapNote)}
  <div style="flex-grow: 1; padding: 20px 18px; display: flex; flex-direction: column; gap: 14px;">
${blocks.join('\n')}
  </div>
</div>`;
  fs.writeFileSync(file, `${HEAD}\n${body}\n${TAIL}`);
  return file;
}

const made = [
  screen({
    file: 'WireRequest.dc.html',
    title: 'New request',
    mapH: 300,
    mapNote: 'map — pin the drop-off',
    blocks: [
      label('Pickup — fixed, from the profile'),
      box('Business name + address (read-only)', 62),
      label('Deliver to'),
      box('search, or tap the map', 50),
      note('supply signal: “3 riders within about 10 min”'),
      row([circle(10), grow(bar('60%'))]),
      label('Order'),
      row([grow(box('what is being sent', 50)), box('GH¢', 50).replace('style="', 'style="width: 96px; ')]),
      `      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">\n${btn('Request a rider', true)}\n      </div>`,
    ],
  }),
  screen({
    file: 'WireSearching.dc.html',
    title: 'Finding a rider',
    mapH: 430,
    mapNote: 'expanding rings — 400 m / 800 m / 6 km',
    blocks: [
      row([grow(box('Finding a rider near you', 46))]),
      note('ring + countdown are computed from dispatch_started_at'),
      row([grow(bar('100%', 10)), circle(34, '0:34')]),
      note('after 60 s: nobody is ringed — the only way on is “Try again”'),
      `      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">\n${btn('Try again', true)}\n${btn('Cancel request', false)}\n      </div>`,
    ],
  }),
  screen({
    file: 'WireTracking.dc.html',
    title: 'Tracking',
    mapH: 360,
    mapNote: 'rider dot + route to the drop-off',
    blocks: [
      row([box('status', 34).replace('style="', 'style="width: 120px; ')]),
      row([circle(58, 'photo'), grow(`      <div style="display: flex; flex-direction: column; gap: 8px;">\n${bar('70%', 14)}\n${bar('50%')}\n${bar('40%', 10)}\n      </div>`), circle(46, 'ETA')]),
      `      <div style="height: 1.5px; border-top: 1.5px dashed ${LINE};"></div>`,
      label('Order — business side only'),
      row([grow(bar('65%', 14)), bar('64px', 14)]),
      note('the price never reaches the courier app'),
      row([circle(50, 'call'), grow(bar('60%'))]),
    ],
  }),
  screen({
    file: 'WireDelivered.dc.html',
    title: 'Delivered',
    mapH: 250,
    mapNote: 'confirmation mark',
    blocks: [
      row([grow(box('Delivered — time, distance, duration', 50))]),
      row([circle(48, 'photo'), grow(`      <div style="display: flex; flex-direction: column; gap: 8px;">\n${bar('60%', 14)}\n${bar('35%')}\n      </div>`)]),
      note('rating is one row per rater — each side rates once'),
      row([circle(40, '1'), circle(40, '2'), circle(40, '3'), circle(40, '4'), circle(40, '5')]),
      box('comment (optional)', 60),
      `      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">\n${btn('Submit rating', true)}\n${btn('Back to dashboard', false)}\n      </div>`,
    ],
  }),
  screen({
    file: 'WireOffer.dc.html',
    title: 'Rider — new request',
    mapH: 300,
    mapNote: 'rider + pickup, availability chip',
    blocks: [
      row([grow(box('New request', 44)), circle(44, '0:48')]),
      label('Pickup · distance away'),
      box('business name + address', 58),
      label('Dropoff · trip length'),
      box('destination', 46),
      box('notes from the business', 44),
      note('decline is remembered — a re-ring never asks twice'),
      `      <div style="margin-top: auto; display: flex; gap: 12px;">\n${circle(54, '×').replace('style="', 'style="border-radius: 16px; ')}\n${grow(btn('Accept', true))}\n      </div>`,
      row([bar('22%', 30), bar('22%', 30), bar('22%', 30), bar('22%', 30)]),
    ],
  }),
  screen({
    file: 'WireDeliver.dc.html',
    title: 'Rider — delivering',
    mapH: 380,
    mapNote: 'route to the customer',
    blocks: [
      label('Deliver to'),
      box('destination + notes', 62),
      row([circle(44, 'pkg'), grow(`      <div style="display: flex; flex-direction: column; gap: 8px;">\n${bar('70%', 14)}\n${bar('45%')}\n      </div>`)]),
      note('no price here — the courier is never shown what it is worth'),
      row([circle(48, 'call'), grow(bar('55%'))]),
      `      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">\n${btn('Complete delivery', false)}\n${note('disabled until the rider is within 31 m').replace(/^ {6}/, '      ')}\n      </div>`,
    ],
  }),
];

console.log(made.join('\n'));
