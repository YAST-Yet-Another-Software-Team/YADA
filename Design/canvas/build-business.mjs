import { C, MONO, write, div, col, rowF, text, eyebrow, mono, btn, btnOutline, input,
         pill, card, statCard, avatar, I, map, marker, attribution, phone, desktop,
         topNav, mobileHeader, backHeader, sheet, rail, riderRow, divider, ratingBlock } from './lib.mjs';

const made = [];
const out = (f, body) => { write(f, body); made.push(f); };

/* Shared bits read off the captures ---------------------------------- */
const searchPill = (w) => rowF(10, `position: absolute; top: 16px; left: 16px; width: ${w}px; box-sizing: border-box; background: #ffffff; border-radius: 999px; padding: 14px 18px; box-shadow: 0 8px 20px oklch(20% 0.02 30 / 0.10);`,
  I.search({ size: 18, color: C.mute }) +
  text('Where is this going?', `flex-grow: 1; font-size: 16px; color: ${C.mute};`) +
  text('Search', `font-size: 16px; font-weight: 600; color: ${C.redDim};`));

const roundChip = (icon, pos) => div(`position: absolute; ${pos} width: 44px; height: 44px; border-radius: 14px; background: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px oklch(20% 0.02 30 / 0.10);`, icon);

const rings = (cx, cy) =>
  div(`position: absolute; left: ${cx}px; top: ${cy}px; transform: translate(-50%, -50%); width: 250px; height: 250px; border-radius: 999px; background: oklch(60% 0.215 27 / 0.07);`) +
  div(`position: absolute; left: ${cx}px; top: ${cy}px; transform: translate(-50%, -50%); width: 168px; height: 168px; border-radius: 999px; background: oklch(60% 0.215 27 / 0.10); border: 2px solid oklch(60% 0.215 27 / 0.26);`) +
  div(`position: absolute; left: ${cx}px; top: ${cy}px; transform: translate(-50%, -50%); width: 98px; height: 98px; border-radius: 999px; background: oklch(60% 0.215 27 / 0.14); border: 3px solid oklch(60% 0.215 27 / 0.5);`) +
  div(`position: absolute; left: ${cx}px; top: ${cy}px; transform: translate(-50%, -50%); width: 34px; height: 34px; border-radius: 10px; background: ${C.red}; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px oklch(60% 0.215 27 / 0.35);`, I.shop({ size: 19 }));

const routeDashes = (w, h, from, to) =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position: absolute; inset: 0;" aria-hidden="true"><path d="M${from[0]} ${from[1]} C ${(from[0] + to[0]) / 2} ${from[1] + 60}, ${(from[0] + to[0]) / 2} ${to[1] - 60}, ${to[0]} ${to[1]}" stroke="${C.red}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 13" fill="none"/></svg>`;

const orderBlock = (name, price) =>
  col(8, '', eyebrow('Order') +
    rowF(12, 'justify-content: space-between; align-items: baseline;',
      text(name, 'font-size: 17px; font-weight: 600;') + mono(price, 16, C.sub)));

const callRow = (num, size = 56) =>
  rowF(14, '',
    div(`width: ${size}px; height: ${size}px; border-radius: 999px; border: 1.5px solid oklch(88% 0.085 27); display: flex; align-items: center; justify-content: center; flex-shrink: 0;`, I.phone({ size: 23, color: C.red })) +
    mono(num, 17, C.ink));

const statusPill = (kind) => {
  if (kind === 'searching') return pill('Finding rider', C.sub, 'oklch(96% 0.005 50)', I.search({ size: 16, color: C.sub }));
  if (kind === 'enroute') return pill('En route', C.orangeText, C.orangeSoft, I.nav({ size: 16, color: C.orangeText }));
  return pill('Delivered', C.green, C.greenSoft, I.checkCircle({ size: 16, color: C.green }));
};

/* ===================== BUSINESS · MOBILE ============================= */

/* Main = the screen the whole product starts from. */
out('Main.dc.html', phone(
  backHeader('New request') +
  map(390, 452, searchPill(358) + marker(178, 236, 'shop') + attribution()) +
  sheet(
    rail(
      col(6, '', eyebrow('Pickup') +
        div(`border: 1px solid ${C.line}; border-radius: 12px; padding: 12px 14px;`,
          text('Favoire Kitchen', 'font-size: 17px; font-weight: 700;') +
          text('Ayeduase Gate, near KNUST, Kumasi', `font-size: 15px; color: ${C.sub}; margin-top: 2px;`))),
      col(6, '', eyebrow('Deliver to') +
        text('Search on the map, or tap it to drop the pin.', `background: oklch(96% 0.005 50); border-radius: 12px; padding: 13px 14px; font-size: 15px; color: ${C.mute};`))) +
    rowF(9, `border-top: 1px solid ${C.line}; border-bottom: 1px solid ${C.line}; padding: 13px 0;`,
      div(`width: 9px; height: 9px; border-radius: 999px; background: oklch(50% 0.15 250);`) +
      text('<span style="font-weight: 700;">1 rider</span> within about 10 min', `font-size: 15px; color: ${C.sub};`)) +
    col(10, '', eyebrow('Order') +
      text('Order Name', 'font-size: 15px; font-weight: 700;') + input('Pancakes × 4')) +
    div('margin-top: auto;', btn('Request a rider', { dim: true }))
  )));

out('BizDashboardM.dc.html', phone(
  mobileHeader('Dashboard', avatar(38, 'FK', { photo: false })) +
  col(16, 'padding: 16px 18px; flex-grow: 1;',
    rowF(12, '', statCard('Active', '1', { valueSize: 26 }) + statCard('Today', '2', { valueSize: 26 })) +
    text('Active requests', 'font-size: 19px; font-weight: 700;') +
    card(col(10, '',
      rowF(10, 'justify-content: space-between;',
        mono('#B76B', 14, C.mute) +
        pill('Rider assigned', 'oklch(50% 0.15 250)', 'oklch(94% 0.035 250)', I.user({ size: 15, color: 'oklch(50% 0.15 250)' }))) +
      text('Fried rice + chicken', 'font-size: 17px; font-weight: 700;') +
      text('Ayeduase North Gate, Kumasi', `font-size: 15px; color: ${C.sub};`) +
      divider() +
      rowF(10, 'justify-content: space-between;',
        rowF(8, '', avatar(28, '', {}) + text('Kwabena Mensah', `font-size: 14px; color: ${C.sub};`)) +
        mono('GH¢48.00', 14, C.mute))), 'padding: 16px;')) +
  div(`padding: 14px 18px 20px; border-top: 1px solid ${C.line}; background: ${C.surface};`,
    rowF(10, 'justify-content: center; background: ' + C.red + '; border-radius: 16px; padding: 17px;',
      I.plus({ size: 20, color: '#ffffff' }) + text('New request', 'font-size: 17px; font-weight: 700; color: #ffffff;'))),
  C.page));

out('BizSearchingM.dc.html', phone(
  map(390, 556,
    roundChip(I.back({ size: 22 }), 'top: 16px; left: 16px;') +
    roundChip(I.bell({ size: 21 }), 'top: 16px; right: 16px;') +
    rings(195, 300) +
    marker(62, 150, 'rider') + marker(296, 400, 'rider') + attribution()) +
  sheet(
    div('align-self: center;', statusPill('searching')) +
    text('Finding a rider near you', 'font-size: 24px; font-weight: 700; text-align: center; letter-spacing: -0.01em;') +
    text('Ringing riders near your pickup.', `font-size: 16px; color: ${C.sub}; text-align: center;`) +
    div(`height: 8px; border-radius: 999px; background: oklch(94% 0.045 27); overflow: hidden;`,
      div(`width: 56%; height: 100%; border-radius: 999px; background: ${C.red};`)) +
    rowF(8, 'justify-content: center;',
      text('Ayeduase Gate, n…', `font-size: 15px; color: ${C.sub};`) +
      text('→', `font-size: 15px; color: ${C.faint};`) +
      text('KNUST Comme…', `font-size: 15px; color: ${C.sub};`)) +
    div('margin-top: auto;', btnOutline('Cancel request')),
    { gap: 14, pad: '24px 24px 22px' })));

out('BizEnrouteM.dc.html', phone(
  map(390, 452,
    routeDashes(390, 452, [92, 128], [268, 330]) +
    roundChip(I.back({ size: 22 }), 'top: 16px; left: 16px;') +
    roundChip(I.bell({ size: 21 }), 'top: 16px; right: 16px;') +
    marker(74, 110, 'rider') + marker(252, 314, 'pin') + attribution()) +
  sheet(
    statusPill('enroute') +
    riderRow('Kwabena Mensah', 'On the way to the customer', 'GT 4521-20 · not yet rated',
      text('6 min', `font-family: ${MONO}; font-size: 23px; font-weight: 700; color: ${C.red};`)) +
    divider() +
    orderBlock('Jollof + grilled chicken x2', 'GH¢85.00') +
    text('KNUST Commercial Area · Call on arrival, Room 12', `font-size: 15px; color: ${C.sub};`) +
    div('margin-top: auto;', callRow('+233 24 412 3402')),
    { gap: 17 })));

out('BizDeliveredM.dc.html', phone(
  map(390, 300,
    div(`position: absolute; inset: 0; background: oklch(98.2% 0.004 50 / 0.6);`) +
    div('position: absolute; left: 195px; top: 150px; transform: translate(-50%, -50%); width: 88px; height: 88px; border-radius: 999px; background: ' + C.greenSoft + '; display: flex; align-items: center; justify-content: center;', I.check({ size: 44, color: C.green, w: 2.6 }))) +
  sheet(
    statusPill('delivered') +
    riderRow('Kwabena Mensah', 'Delivered', 'GT 4521-20 · not yet rated') +
    divider() +
    orderBlock('Jollof + grilled chicken x2', 'GH¢85.00') +
    divider() +
    ratingBlock('How was Kwabena Mensah?', { cta: 'Rate rider' }) +
    text('View in history', `text-align: center; font-size: 16px; font-weight: 700; color: ${C.ink}; margin-top: auto;`),
    { gap: 15 })));

out('BizOrdersM.dc.html', phone(
  mobileHeader('Orders', avatar(38, 'FK', { photo: false })) +
  col(14, 'padding: 16px 18px;',
    rowF(10, '',
      rowF(8, `flex-grow: 1; border: 1px solid ${C.line}; border-radius: 12px; padding: 13px 14px; background: ${C.surface};`,
        text('Status: <span style="font-weight: 700;">All</span>', `font-size: 15px; color: ${C.sub}; flex-grow: 1;`) +
        I.chevron({ size: 16, color: C.faint })) +
      input('Search order #', { w: '52%' })) +
    card(rowF(12, 'align-items: flex-start;',
      col(4, 'flex-grow: 1;',
        mono('#YD-3B13', 14, C.mute) +
        text('Jollof + grilled chicken x2', 'font-size: 17px; font-weight: 700;') +
        text('KNUST Commercial Area, Kumasi', `font-size: 15px; color: ${C.sub};`) +
        rowF(8, '', mono('Aug 22, 10:03 PM', 14, C.mute) + text('·', `color: ${C.faint};`) + mono('GH¢85.00', 14, C.mute))) +
      pill('Delivered', C.green, C.greenSoft, I.checkCircle({ size: 15, color: C.green }))), 'padding: 16px;')),
  C.page));

out('BizProfileM.dc.html', phone(
  mobileHeader('Profile', avatar(38, 'FK', { photo: false })) +
  col(16, 'padding: 20px 18px; flex-grow: 1;',
    col(6, 'align-items: center;',
      avatar(72, 'FK', { photo: false }) +
      text('Favoire Kitchen', 'font-size: 22px; font-weight: 700; margin-top: 8px;') +
      text('Ayeduase Gate, near KNUST, Kumasi', `font-size: 15px; color: ${C.sub};`)) +
    rowF(0, `background: oklch(96% 0.005 50); border-radius: 999px; padding: 4px;`,
      ['Profile', 'Location', 'Password'].map((t, i) =>
        text(t, `flex-grow: 1; text-align: center; padding: 11px 0; border-radius: 999px; font-size: 15px; font-weight: ${i === 0 ? 700 : 500}; color: ${i === 0 ? C.ink : C.sub}; background: ${i === 0 ? C.surface : 'transparent'};`)).join('')) +
    card(col(12, '',
      text('Profile photo', 'font-size: 17px; font-weight: 700;') +
      text('Couriers see this when they pick up from you, so they know they are at the right counter.', `font-size: 14px; color: ${C.sub}; line-height: 1.45;`) +
      rowF(14, '', avatar(58, 'FK', { photo: false }) +
        rowF(8, `border: 1px solid ${C.line}; border-radius: 12px; padding: 12px 16px;`,
          I.camera({ size: 18 }) + text('Add a photo', 'font-size: 15px; font-weight: 700;')))), 'padding: 18px;') +
    card(rowF(12, 'justify-content: space-between; align-items: flex-start;',
      col(4, '', text('Rider rating', 'font-size: 17px; font-weight: 700;') +
        text('How riders scored their deliveries for you.', `font-size: 14px; color: ${C.sub};`)) +
      text('No ratings yet', `font-size: 14px; color: ${C.mute};`)), 'padding: 18px;') +
    card(col(10, '',
      text('Business details', 'font-size: 17px; font-weight: 700;') +
      text('Business name', 'font-size: 14px; font-weight: 700;') +
      input('Favoire Kitchen')), 'padding: 18px;')),
  C.page));

/* ===================== BUSINESS · DESKTOP ============================ */

const page = (kids, pad = '32px 104px') => div(`flex-grow: 1; padding: ${pad}; display: flex; flex-direction: column; gap: 22px; overflow: hidden;`, kids);

const th = (label, w) => text(label, `width: ${w}; font-size: 13px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: ${C.mute};`);
const td = (v, w, opts = '') => text(v, `width: ${w}; font-size: 16px; ${opts}`);

out('BizDashboardD.dc.html', desktop(
  topNav('Dashboard') +
  page(
    rowF(20, '', statCard('Active deliveries', '1') + statCard('Avg. pickup time', 'Live') + statCard('Delivered today', '2')) +
    rowF(14, 'justify-content: space-between;',
      text('Active requests', 'font-size: 21px; font-weight: 700;') +
      rowF(14, '',
        rowF(0, `background: oklch(96% 0.005 50); border-radius: 999px; padding: 4px;`,
          text('Table', `padding: 9px 22px; border-radius: 999px; background: ${C.surface}; font-size: 15px; font-weight: 600;`) +
          text('Board', `padding: 9px 22px; font-size: 15px; color: ${C.sub};`)) +
        rowF(9, `background: ${C.red}; border-radius: 14px; padding: 13px 24px;`,
          I.plus({ size: 19, color: '#ffffff' }) + text('New request', 'font-size: 16px; font-weight: 700; color: #ffffff;')))) +
    col(0, '',
      rowF(0, `border-bottom: 1px solid ${C.line}; padding-bottom: 14px;`,
        th('Order', '25%') + th('Rider', '25%') + th('Destination', '24%') + th('Time taken', '13%') + th('Status', '13%')) +
      rowF(0, `padding: 22px 0; border-bottom: 1px dashed ${C.line};`,
        td('#B76B', '25%', `font-family: ${MONO};`) +
        td('Kwabena Mensah', '25%') +
        td('Ayeduase North Gate, Kumasi', '24%') +
        td('—', '13%', `color: ${C.mute};`) +
        div('width: 13%; white-space: nowrap;', pill('Rider assigned', 'oklch(50% 0.15 250)', 'oklch(94% 0.035 250)', I.user({ size: 15, color: 'oklch(50% 0.15 250)' })))))
  )));

out('BizRequestD.dc.html', desktop(
  topNav('Request') +
  rowF(0, 'flex-grow: 1; align-items: stretch;',
    col(18, `width: 318px; flex-shrink: 0; background: ${C.surface}; padding: 26px 24px; border-right: 1px solid ${C.line};`,
      col(6, '', text('New delivery request', 'font-size: 23px; font-weight: 700; letter-spacing: -0.01em;') +
        text("Search the customer's address, then nudge the pin if it needs it.", `font-size: 15px; color: ${C.sub}; line-height: 1.5;`)) +
      rail(
        col(6, '', eyebrow('Pickup') +
          div(`border: 1px solid ${C.line}; border-radius: 12px; padding: 11px 13px;`,
            text('Favoire Kitchen', 'font-size: 16px; font-weight: 700;') +
            text('Ayeduase Gate, near KNUST, K…', `font-size: 14px; color: ${C.sub};`))),
        col(6, '', eyebrow('Deliver to') +
          text('Search on the map, or tap it to drop the pin.', `background: oklch(96% 0.005 50); border-radius: 12px; padding: 12px 13px; font-size: 14px; color: ${C.mute}; line-height: 1.45;`))) +
      rowF(9, `border-top: 1px solid ${C.line}; border-bottom: 1px solid ${C.line}; padding: 13px 0;`,
        div(`width: 9px; height: 9px; border-radius: 999px; background: oklch(50% 0.15 250);`) +
        text('<span style="font-weight: 700;">1 rider</span> within about 10 min', `font-size: 14px; color: ${C.sub};`)) +
      col(9, '', eyebrow('Order') +
        text('Order Name', 'font-size: 15px; font-weight: 700;') + input('Pancakes × 4') +
        text('Price (GH₵)', 'font-size: 15px; font-weight: 700; margin-top: 4px;') + input('55.00', { mono: true }) +
        text('The rider is not shown the order details.', `font-size: 13px; color: ${C.mute};`)) +
      div('margin-top: auto;', btn('Request a rider', { dim: true, size: 16 }))) +
    div('flex-grow: 1; position: relative;',
      map(1122, 822, searchPill(1090) + marker(534, 396, 'shop') + marker(320, 250, 'rider') + attribution())))));

const rightRail = (kids) => col(18, `width: 318px; flex-shrink: 0; background: ${C.surface}; border-left: 1px solid ${C.line}; padding: 24px 22px;`, kids);

out('BizSearchingD.dc.html', desktop(
  topNav('Request') +
  rowF(0, 'flex-grow: 1; align-items: stretch;',
    div('flex-grow: 1; position: relative;',
      map(1122, 822,
        text('Looking for a rider near Ayeduase Gate, near KNUST, Kumasi…', `position: absolute; top: 18px; left: 50%; transform: translateX(-50%); background: #ffffff; border-radius: 10px; padding: 13px 20px; font-size: 15px; color: ${C.ink}; box-shadow: 0 8px 20px oklch(20% 0.02 30 / 0.10);`) +
        roundChip(I.bell({ size: 21 }), 'top: 18px; right: 22px;') +
        rings(561, 420) + marker(300, 250, 'rider') + marker(760, 620, 'pin') + attribution())) +
    rightRail(
      statusPill('searching') +
      text('Finding a rider near you', 'font-size: 22px; font-weight: 700; letter-spacing: -0.01em;') +
      text('Ringing riders near your pickup.', `font-size: 15px; color: ${C.sub};`) +
      div(`height: 7px; border-radius: 999px; background: oklch(94% 0.045 27); overflow: hidden;`,
        div(`width: 52%; height: 100%; border-radius: 999px; background: ${C.red};`)) +
      rowF(8, '', text('Ayeduase Gate, n…', `font-size: 15px; color: ${C.sub};`) + text('→', `color: ${C.faint};`) + text('KNUST Comme…', `font-size: 15px; color: ${C.sub};`)) +
      div('margin-top: auto;', btnOutline('Cancel request', { size: 16 }))))));

out('BizEnrouteD.dc.html', desktop(
  topNav('Request') +
  rowF(0, 'flex-grow: 1; align-items: stretch;',
    div('flex-grow: 1; position: relative;',
      map(1122, 822, routeDashes(1122, 822, [300, 220], [700, 600]) +
        roundChip(I.bell({ size: 21 }), 'top: 18px; right: 22px;') +
        marker(282, 200, 'rider') + marker(684, 584, 'shop') + attribution())) +
    rightRail(
      statusPill('enroute') +
      riderRow('Kwabena Mensah', 'On the way to the customer', 'GT 4521-20 · not yet rated') +
      col(4, '', text('6 min', `font-family: ${MONO}; font-size: 30px; font-weight: 700; color: ${C.red};`) +
        text('estimated when you booked', `font-size: 14px; color: ${C.sub};`)) +
      divider() +
      rowF(10, '', text('Ayeduase Gate, n…', `font-size: 15px; color: ${C.sub};`) + text('→', `color: ${C.faint};`) + text('KNUST Comme…', `font-size: 15px; color: ${C.sub};`)) +
      divider() +
      orderBlock('Jollof + grilled chicken x2', 'GH¢85.00') +
      callRow('+233 24 412 3402', 48)))));

out('BizDeliveredD.dc.html', desktop(
  topNav('Request') +
  rowF(0, 'flex-grow: 1; align-items: stretch;',
    div('flex-grow: 1; position: relative;',
      map(1122, 822,
        text('Location unavailable — showing last known position', `position: absolute; top: 18px; left: 22px; background: #ffffff; border-radius: 10px; padding: 12px 18px; font-size: 14px; color: ${C.sub}; box-shadow: 0 2px 6px oklch(20% 0.02 30 / 0.08);`) +
        roundChip(I.bell({ size: 21 }), 'top: 18px; right: 22px;') +
        marker(760, 130, 'shop') + marker(180, 690, 'rider') + attribution())) +
    rightRail(
      statusPill('delivered') +
      riderRow('Kwabena Mensah', 'Delivered', 'GT 4521-20 · not yet rated') +
      divider() +
      rowF(10, '', text('Ayeduase Gate, n…', `font-size: 15px; color: ${C.sub};`) + text('→', `color: ${C.faint};`) + text('KNUST Comme…', `font-size: 15px; color: ${C.sub};`)) +
      orderBlock('Jollof + grilled chicken x2', 'GH¢85.00') +
      div('margin-top: auto;', col(14, '',
        ratingBlock('How was Kwabena Mensah?', { cta: 'Rate rider' }) +
        text('View in history', `text-align: center; font-size: 16px; font-weight: 700;`)))))));

out('BizHistoryD.dc.html', desktop(
  topNav('History') +
  page(
    rowF(14, 'justify-content: space-between;',
      text('History', 'font-size: 21px; font-weight: 700;') +
      rowF(14, '',
        rowF(10, `border: 1px solid ${C.line}; border-radius: 999px; padding: 12px 20px; background: ${C.surface};`,
          text('Status: <span style="font-weight: 700; color: ' + C.ink + ';">All</span>', `font-size: 15px; color: ${C.sub};`) +
          I.chevron({ size: 16, color: C.faint })) +
        input('Search order #', { w: '270px' }))) +
    col(0, '',
      rowF(0, `border-bottom: 1px solid ${C.line}; padding-bottom: 14px;`,
        th('Order', '13%') + th('Item', '19%') + th('Value', '13%') + th('Rider', '15%') + th('Destination', '17%') + th('Completed', '15%') + th('Status', '12%')) +
      rowF(0, `padding: 22px 0; border-bottom: 1px dashed ${C.line};`,
        td('#3B13', '13%', `font-family: ${MONO};`) +
        td('Jollof + grilled chicken…', '19%') +
        td('GH¢85.00', '13%', `font-family: ${MONO};`) +
        td('Kwabena Mensah', '15%') +
        td('KNUST Commercial A…', '17%') +
        td('Aug 22, 10:03 PM', '15%', `font-family: ${MONO}; font-size: 15px;`) +
        div('width: 12%;', pill('Delivered', C.green, C.greenSoft, I.checkCircle({ size: 15, color: C.green }))))))));

out('BizProfileD.dc.html', desktop(
  topNav('') +
  div('flex-grow: 1; display: flex; justify-content: center; padding: 30px 0; overflow: hidden;',
    col(18, 'width: 630px;',
      col(6, 'align-items: center;',
        avatar(72, 'FK', { photo: false }) +
        text('Favoire Kitchen', 'font-size: 26px; font-weight: 700; margin-top: 8px; letter-spacing: -0.01em;') +
        text('Ayeduase Gate, near KNUST, Kumasi', `font-size: 15px; color: ${C.sub};`)) +
      rowF(0, `background: oklch(96% 0.005 50); border-radius: 14px; padding: 5px;`,
        ['Profile', 'Location', 'Password'].map((t, i) =>
          text(t, `flex-grow: 1; text-align: center; padding: 12px 0; border-radius: 10px; font-size: 15px; font-weight: ${i === 0 ? 700 : 500}; color: ${i === 0 ? C.ink : C.sub}; background: ${i === 0 ? C.surface : 'transparent'};`)).join('')) +
      card(col(14, '',
        col(4, '', text('Profile photo', 'font-size: 17px; font-weight: 700;') +
          text('Couriers see this when they pick up from you, so they know they are at the right counter.', `font-size: 14px; color: ${C.sub};`)) +
        rowF(16, '', avatar(62, 'FK', { photo: false }) +
          rowF(8, `border: 1px solid ${C.line}; border-radius: 12px; padding: 12px 18px;`,
            I.camera({ size: 18 }) + text('Add a photo', 'font-size: 15px; font-weight: 700;')))), 'padding: 22px;') +
      card(rowF(14, 'justify-content: space-between; align-items: flex-start;',
        col(4, '', text('Rider rating', 'font-size: 17px; font-weight: 700;') +
          text('How riders scored their deliveries for you.', `font-size: 14px; color: ${C.sub};`)) +
        text('No ratings yet', `font-size: 14px; color: ${C.mute};`)), 'padding: 22px;') +
      card(col(12, '',
        col(4, '', text('Business details', 'font-size: 17px; font-weight: 700;') +
          text('The name here is what couriers and your own dashboard show.', `font-size: 14px; color: ${C.sub};`)) +
        text('Business name', 'font-size: 14px; font-weight: 700;') + input('Favoire Kitchen') +
        text('Phone number', 'font-size: 14px; font-weight: 700;') + input('+233 24 412 3401')), 'padding: 22px;')))));

console.log(made.join('\n'));
