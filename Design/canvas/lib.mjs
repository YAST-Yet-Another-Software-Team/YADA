import fs from 'node:fs';

/* Values read off the captures in ../screenshots (2026-08-22). */
export const C = {
  red: 'oklch(60% 0.215 27)',
  redHover: 'oklch(52% 0.205 25)',
  redSoft: 'oklch(97% 0.02 27)',
  redDim: 'oklch(72% 0.16 27)',          // disabled primary button
  orange: 'oklch(60% 0.185 52)',
  orangeText: 'oklch(62% 0.17 55)',
  orangeSoft: 'oklch(95% 0.04 60)',
  ink: 'oklch(18% 0.007 50)',
  sub: 'oklch(47% 0.012 50)',
  mute: 'oklch(58% 0.012 50)',
  faint: 'oklch(72% 0.011 50)',
  line: 'oklch(92% 0.007 50)',
  lineSoft: 'oklch(95% 0.006 50)',
  page: 'oklch(98.2% 0.004 50)',
  surface: '#ffffff',
  desk: 'oklch(92.5% 0.005 60)',
  green: 'oklch(53% 0.15 149)',
  greenSoft: 'oklch(92% 0.07 149)',
  avatar: 'oklch(72% 0.14 22)',
  avatarSoft: 'oklch(94% 0.045 27)',
};
export const MONO = "'JetBrains Mono', ui-monospace, monospace";
export const SANS = "'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif";

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
    @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap");
    body { margin: 0; font-family: ${SANS}; }
    a { color: ${C.redHover}; } a:hover { color: oklch(44% 0.18 24); }
  </style>
</helmet>`;
const TAIL = `</x-dc>
</body>
</html>
`;

export function write(file, body) {
  fs.writeFileSync(file, `${HEAD}\n${body}\n${TAIL}`);
  return file;
}

export const s = (o) =>
  Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ');

/* ---------- primitives ---------------------------------------------- */

export const div = (style, kids = '') => `<div style="${style}">${kids}</div>`;

export const col = (gap, extra = '', kids = '') =>
  div(`display: flex; flex-direction: column; gap: ${gap}px; ${extra}`, kids);

export const rowF = (gap, extra = '', kids = '') =>
  div(`display: flex; align-items: center; gap: ${gap}px; ${extra}`, kids);

export const text = (str, style) => `<div style="${style}">${str}</div>`;

export const eyebrow = (str, color = C.mute) =>
  text(str, `font-size: 12px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${color};`);

export const mono = (str, size = 15, color = C.ink, weight = 400) =>
  text(str, `font-family: ${MONO}; font-size: ${size}px; font-weight: ${weight}; color: ${color};`);

/** Filled primary button. `dim` renders the disabled-until-valid state the app shows. */
export const btn = (label, { dim = false, radius = 16, size = 17, pad = 17 } = {}) =>
  text(label, `background: ${dim ? C.redDim : C.red}; color: #ffffff; border-radius: ${radius}px; padding: ${pad}px; text-align: center; font-size: ${size}px; font-weight: 700;`);

export const btnOutline = (label, { color = C.red, radius = 16, size = 17, pad = 16 } = {}) =>
  text(label, `border: 1.5px solid ${color === C.ink ? C.line : 'oklch(88% 0.085 27)'}; color: ${color}; border-radius: ${radius}px; padding: ${pad}px; text-align: center; font-size: ${size}px; font-weight: 700;`);

export const input = (placeholder, { w = '100%', mono: isMono = false } = {}) =>
  text(placeholder, `width: ${w}; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 12px; padding: 14px 15px; font-size: 15px; ${isMono ? `font-family: ${MONO};` : ''} color: ${C.faint}; background: ${C.surface};`);

export const pill = (label, fg, bg, icon = '') =>
  rowF(8, `background: ${bg}; border-radius: 999px; padding: 9px 16px; align-self: flex-start;`,
    icon + text(label, `font-size: 15px; font-weight: 700; color: ${fg};`));

export const card = (kids, extra = '') =>
  div(`background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 18px; box-shadow: 0 1px 2px oklch(20% 0.02 30 / 0.05); ${extra}`, kids);

export const statCard = (label, value, { valueSize = 30 } = {}) =>
  card(col(6, '', eyebrow(label) + mono(value, valueSize, C.ink, 700)), 'padding: 18px 20px; flex-grow: 1;');

export const avatar = (size, label = '', { dot = false, photo = true } = {}) =>
  div(`position: relative; width: ${size}px; height: ${size}px; border-radius: 999px; background: ${photo ? C.avatar : C.avatarSoft}; color: ${C.red}; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size / 3.2)}px; font-weight: 700; flex-shrink: 0;`,
    label + (dot ? div(`position: absolute; right: 1px; bottom: 1px; width: ${Math.max(10, size / 4.5)}px; height: ${Math.max(10, size / 4.5)}px; border-radius: 999px; background: ${C.green}; border: 2.5px solid #ffffff;`) : ''));

/* ---------- icons (stroke, 24-grid) ---------------------------------- */
const ico = (path, { size = 22, color = C.ink, w = 1.9, fill = 'none' } = {}) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${fill === 'none' ? color : 'none'}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

export const I = {
  back: (o) => ico('<path d="M15 18l-6-6 6-6"/>', o),
  chevron: (o) => ico('<path d="M9 18l6-6-6-6"/>', o),
  search: (o) => ico('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>', o),
  bell: (o) => ico('<path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z"/><path d="M10.5 19a2 2 0 0 0 3 0"/>', o),
  phone: (o) => ico('<path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6.5 3z"/>', o),
  nav: (o) => ico('<path d="M3 11l18-8-8 18-2-8z"/>', o),
  box: (o) => ico('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>', o),
  home: (o) => ico('<path d="M4 10.5L12 4l8 6.5V20h-5v-6h-6v6H4z"/>', o),
  clock: (o) => ico('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', o),
  gear: (o) => ico('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7L5 5M19 19l-1.7-1.7M17.3 6.7L19 5M5 19l1.7-1.7"/>', o),
  check: (o) => ico('<path d="M4 12.5l5.5 5.5L20 7"/>', o),
  checkCircle: (o) => ico('<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.7"/>', o),
  plus: (o) => ico('<path d="M12 5v14M5 12h14"/>', o),
  close: (o) => ico('<path d="M6 6l12 12M18 6L6 18"/>', o),
  user: (o) => ico('<circle cx="12" cy="8" r="3.4"/><path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"/>', o),
  mail: (o) => ico('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>', o),
  plate: (o) => ico('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h10"/>', o),
  theme: (o) => ico('<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/><path d="M17.5 4.2l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/>', o),
  shield: (o) => ico('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>', o),
  camera: (o) => ico('<path d="M4 8.5h3.5L9 6h6l1.5 2.5H20v10H4z"/><circle cx="12" cy="13" r="3.2"/>', o),
  warn: (o) => ico('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.2"/>', o),
  star: ({ size = 40, filled = false } = {}) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'oklch(68% 0.19 55)' : 'none'}" stroke="${filled ? 'none' : C.faint}" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>`,
  shop: ({ size = 20, color = '#ffffff' } = {}) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="M3 9l1.5-4.5h15L21 9v1.5H3z"/><path d="M4.5 10.5v9h15v-9h-2.2v4.5h-4.6v-4.5z"/></svg>`,
  helmet: ({ size = 20, color = C.red } = {}) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="M20 13c0-4.4-3.6-8-8-8s-8 3.6-8 8v2h9l2.5-2.5V15H20z"/></svg>`,
  pin: ({ size = 20, color = C.orange } = {}) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.7 2 6 4.7 6 8c0 4.3 6 12 6 12s6-7.7 6-12c0-3.3-2.7-6-6-6zm0 8.2A2.2 2.2 0 1 1 12 5.8a2.2 2.2 0 0 1 0 4.4z"/></svg>`,
  google: ({ size = 20 } = {}) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"/></svg>`,
  /* The app's own wordmark, inlined from App/static/logo.svg. */
  logo: ({ h = 26 } = {}) =>
    `<svg width="${Math.round(h * 1.63)}" height="${h}" viewBox="0 0 283 174" fill="none"><path d='M91.1863 173.75L144.378 113.315V173.75H163.375V83.0978H144.378L64.5903 173.75H91.1863Z' fill='#FF0000'/><path d='M203.269 0L51.2923 173.75H5.69914L77.8883 88.7636L0 0H45.5932L100.685 64.2119L157.676 0H203.269Z' fill='#FF0000'/><path d='M172.874 49.1033V154.864H191.5V80.6594L239.142 136.055V154.816L172.874 154.864V173.75H258.361V126.416L191.5 49.1033H172.874Z' fill='#FF0000'/><path d='M172.874 49.1033V154.864H191.5V80.6594L239.142 136.055V154.816L172.874 154.864V173.75H258.361V126.416L191.5 49.1033H172.874Z' fill='#FF0000'/><path d='M281.491 93.3036L221.715 39.3719L282.145 40.1156L282.379 21.1199L191.734 20.0043L191.5 39L281.163 119.898L281.491 93.3036Z' fill='#FF0000'/><path d='M162.875 83.5977V173.25H144.878V111.99L144.003 112.985L90.96 173.25H65.6963L144.604 83.5977H162.875ZM45.3643 0.5L100.306 64.5371L100.679 64.9727L101.059 64.5439L157.9 0.5H202.168L51.0654 173.25H6.78027L78.2695 89.0869L78.5488 88.7578L78.2637 88.4336L1.10449 0.5H45.3643ZM281.872 21.6133L281.651 39.6084L221.722 38.8721L220.396 38.8555L221.38 39.7432L280.987 93.5225L280.676 118.785L192.002 38.7803L192.227 20.5098L281.872 21.6133ZM239.642 135.87L239.521 135.729L191.879 80.333L191 79.3115V154.351L173.374 154.363V49.6035H191.271L257.861 126.602V173.25H173.374V155.364H192V155.35L239.143 155.316H239.642V135.87Z' stroke='#C70000'/></svg>`,
};

/* ---------- map placeholder ------------------------------------------ */
/* Never a real map: the app renders MapLibre + OSM tiles, which cannot load
   inside a sandboxed artboard. Same road/park geometry at every size. */
export const map = (w, h, overlay = '') => `<div style="position: relative; width: ${w}px; height: ${h}px; overflow: hidden; background: oklch(95.5% 0.025 145);">
  <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position: absolute; inset: 0;" aria-hidden="true">
    <rect width="${w}" height="${h}" fill="oklch(95.5% 0.025 145)"/>
    <path d="M${-0.05 * w} ${0.64 * h} L${0.46 * w} ${0.32 * h} L${1.05 * w} ${0.5 * h}" stroke="#ffffff" stroke-width="${Math.max(9, w * 0.035)}" fill="none"/>
    <path d="M${0.16 * w} ${-10} L${0.31 * w} ${h + 10}" stroke="#ffffff" stroke-width="${Math.max(7, w * 0.026)}" fill="none"/>
    <path d="M${-10} ${0.19 * h} L${w + 10} ${0.13 * h}" stroke="oklch(94% 0.07 85)" stroke-width="${Math.max(8, w * 0.03)}" fill="none"/>
    <path d="M${0.64 * w} ${-10} L${0.77 * w} ${h + 10}" stroke="#ffffff" stroke-width="${Math.max(6, w * 0.022)}" fill="none"/>
    <g fill="oklch(93% 0.006 60)">
      <rect x="${0.06 * w}" y="${0.70 * h}" width="${0.16 * w}" height="${0.085 * h}" rx="3"/>
      <rect x="${0.38 * w}" y="${0.77 * h}" width="${0.12 * w}" height="${0.072 * h}" rx="3"/>
      <rect x="${0.55 * w}" y="${0.69 * h}" width="${0.10 * w}" height="${0.098 * h}" rx="3"/>
      <rect x="${0.81 * w}" y="${0.75 * h}" width="${0.14 * w}" height="${0.081 * h}" rx="3"/>
      <rect x="${0.50 * w}" y="${0.42 * h}" width="${0.12 * w}" height="${0.064 * h}" rx="3"/>
      <rect x="${0.73 * w}" y="${0.32 * h}" width="${0.13 * w}" height="${0.072 * h}" rx="3"/>
      <rect x="${0.09 * w}" y="${0.32 * h}" width="${0.10 * w}" height="${0.060 * h}" rx="3"/>
      <rect x="${0.85 * w}" y="${0.53 * h}" width="${0.11 * w}" height="${0.064 * h}" rx="3"/>
    </g>
  </svg>
  ${overlay}
</div>`;

/** A marker floated over the map. */
export const marker = (x, y, kind) => {
  const base = `position: absolute; left: ${x}px; top: ${y}px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;`;
  if (kind === 'shop')
    return div(`${base} width: 34px; height: 34px; border-radius: 10px; background: ${C.red}; box-shadow: 0 8px 24px oklch(60% 0.215 27 / 0.35);`, I.shop({ size: 19 }));
  if (kind === 'rider')
    return div(`${base} width: 36px; height: 36px; border-radius: 999px; background: #ffffff; box-shadow: 0 8px 20px oklch(20% 0.02 30 / 0.12);`, I.helmet({ size: 21 }));
  return div(`${base} width: 32px; height: 32px; border-radius: 9px; background: ${C.orange}; box-shadow: 0 8px 20px oklch(20% 0.02 30 / 0.12);`, I.pin({ size: 18, color: '#ffffff' }));
};

/** The attribution strip every real map capture carries. */
export const attribution = () =>
  div(`position: absolute; left: 12px; bottom: 10px; background: #ffffff; border-radius: 6px; padding: 4px 9px; font-size: 11px; color: ${C.sub};`, 'OpenFreeMap © OpenMapTiles · OpenStreetMap');

/* ---------- frames ---------------------------------------------------- */

export const phone = (kids, bg = C.surface) =>
  div(`width: 390px; height: 844px; background: ${bg}; color: ${C.ink}; display: flex; flex-direction: column; overflow: hidden;`, kids);

/** Courier on desktop: the same phone column, centred on the shell colour. */
export const deskPhone = (kids) =>
  div(`width: 1440px; height: 900px; background: ${C.desk}; display: flex; align-items: center; justify-content: center;`,
    div(`width: 390px; height: 820px; border-radius: 28px; overflow: hidden; background: ${C.surface}; color: ${C.ink}; display: flex; flex-direction: column; box-shadow: 0 24px 60px oklch(20% 0.02 30 / 0.16);`, kids));

export const desktop = (kids, bg = C.page) =>
  div(`width: 1440px; height: 900px; background: ${bg}; color: ${C.ink}; display: flex; flex-direction: column; overflow: hidden;`, kids);

/** Business desktop chrome: logo, centred nav, avatar. */
export const topNav = (active) => {
  const item = (label) => {
    const on = label === active;
    return div(`padding: 26px 0 24px; border-bottom: 3px solid ${on ? C.red : 'transparent'};`,
      text(label, `font-size: 17px; font-weight: ${on ? 700 : 500}; color: ${on ? C.ink : C.sub};`));
  };
  return div(`height: 78px; background: ${C.surface}; border-bottom: 1px solid ${C.line}; display: flex; align-items: center; padding: 0 28px; flex-shrink: 0;`,
    div('width: 200px; display: flex; align-items: center;', I.logo({ h: 26 })) +
    rowF(34, 'flex-grow: 1; justify-content: center; align-self: stretch;', ['Dashboard', 'Request', 'History'].map(item).join('')) +
    div('width: 200px; display: flex; justify-content: flex-end;', avatar(40, 'FK', { photo: false })));
};

/** Business mobile chrome. */
export const mobileHeader = (title, right = '') =>
  div(`height: 62px; background: ${C.surface}; border-bottom: 1px solid ${C.line}; display: flex; align-items: center; gap: 14px; padding: 0 18px; flex-shrink: 0;`,
    ico('<path d="M4 7h16M4 12h16M4 17h16"/>', { size: 24 }) +
    text(title, 'font-size: 21px; font-weight: 700; flex-grow: 1;') + right);

export const backHeader = (title) =>
  div(`height: 62px; display: flex; align-items: center; gap: 12px; padding: 0 16px; flex-shrink: 0;`,
    I.back({ size: 24 }) + text(title, 'font-size: 22px; font-weight: 700;'));

/** Courier bottom tabs. */
export const tabBar = (active) => {
  const tab = (label, icon) => {
    const on = label === active;
    return col(4, `align-items: center; flex-grow: 1;`,
      div(`padding: 7px 20px; border-radius: 999px; background: ${on ? C.avatarSoft : 'transparent'};`, icon({ size: 21, color: on ? C.red : C.mute })) +
      text(label, `font-size: 12px; font-weight: ${on ? 700 : 500}; color: ${on ? C.red : C.mute};`));
  };
  return div(`display: flex; padding: 10px 8px 14px; border-top: 1px solid ${C.line}; background: ${C.surface}; flex-shrink: 0;`,
    tab('Home', I.home) + tab('Orders', I.box) + tab('Trips', I.clock) + tab('Settings', I.gear));
};

/** The white sheet that rides over every map screen. */
export const sheet = (kids, { pad = '22px 20px 20px', gap = 16, grow = true } = {}) =>
  div(`margin-top: -28px; ${grow ? 'flex-grow: 1;' : ''} background: ${C.surface}; border-radius: 28px 28px 0 0; box-shadow: 0 -14px 34px oklch(20% 0.02 30 / 0.10); padding: ${pad}; display: flex; flex-direction: column; gap: ${gap}px; position: relative; z-index: 2;`, kids);

/** Pickup → drop-off rail, as the request and offer screens draw it. */
export const rail = (top, bottom) =>
  rowF(12, 'align-items: stretch;',
    col(4, 'align-items: center; padding-top: 4px;',
      `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="${C.red}" stroke-width="2"/><circle cx="7" cy="7" r="2.5" fill="${C.red}"/></svg>` +
      div(`width: 2px; flex-grow: 1; background: ${C.line};`) +
      I.pin({ size: 17 })) +
    col(14, 'flex-grow: 1;', top + bottom));

export const riderRow = (name, line2, meta, right = '') =>
  rowF(14, '',
    avatar(58, '', { dot: true }) +
    col(3, 'flex-grow: 1;',
      text(name, 'font-size: 18px; font-weight: 700;') +
      text(line2, `font-size: 15px; color: ${C.sub};`) +
      mono(meta, 13, C.mute)) + right);

export const divider = () => div(`height: 1px; background: ${C.line};`);

export const listRow = (icon, label, value = '', chev = true) =>
  rowF(14, `padding: 16px 16px;`,
    icon({ size: 21, color: C.ink }) +
    text(label, 'font-size: 16px; font-weight: 600; flex-grow: 1;') +
    (value ? mono(value, 14, C.mute) : '') +
    (chev ? I.chevron({ size: 18, color: C.faint }) : ''));

export const ratingBlock = (title, { stars = 0, cta = 'Rate rider' } = {}) =>
  col(14, '',
    text(title, 'font-size: 17px; font-weight: 700;') +
    rowF(6, '', [0, 1, 2, 3, 4].map((i) => I.star({ size: 38, filled: i < stars })).join('')) +
    input('Anything worth noting? (optional)') +
    btn(cta, { dim: true }));
