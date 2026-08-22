import { C, MONO, write, div, col, rowF, text, eyebrow, mono, btn, btnOutline, input,
         pill, card, statCard, avatar, I, map, marker, attribution, phone, deskPhone,
         desktop, sheet, rail, divider, tabBar, ratingBlock } from './lib.mjs';

const made = [];
const out = (f, body) => { write(f, body); made.push(f); };

const availChip = (online) => rowF(8, `position: absolute; left: 16px; bottom: 18px; background: #ffffff; border-radius: 999px; padding: 9px 15px; box-shadow: 0 2px 6px oklch(20% 0.02 30 / 0.10);`,
  div(`width: 9px; height: 9px; border-radius: 999px; background: ${online ? C.green : C.faint};`) +
  text(online ? 'Online' : 'Offline', `font-size: 14px; font-weight: 600; color: ${C.sub};`));

const notes = (t) => text(t, `background: oklch(96% 0.005 50); border-radius: 999px; padding: 13px 18px; font-size: 15px; color: ${C.sub};`);

const circleBtn = (icon, size = 54) =>
  div(`width: ${size}px; height: ${size}px; border-radius: 999px; border: 1.5px solid oklch(88% 0.085 27); display: flex; align-items: center; justify-content: center; flex-shrink: 0;`, icon);

const routeDashes = (w, h, from, to) =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position: absolute; inset: 0;" aria-hidden="true"><path d="M${from[0]} ${from[1]} C ${(from[0] + to[0]) / 2} ${from[1] + 60}, ${(from[0] + to[0]) / 2} ${to[1] - 60}, ${to[0]} ${to[1]}" stroke="${C.red}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 13" fill="none"/></svg>`;

/* ---- screen bodies, shared between phone and desk-column frames ------ */

/* Sheet sits directly above the tab bar, not under the map: the Go-online
   button is bottom-anchored in the capture, and that was corrected by hand on
   the canvas (version 1787437841-8bd2). Keep this order. */
const offline = (h) => [
  map(390, h, marker(176, Math.round(h * 0.46), 'rider') + availChip(false)),
  div('flex-grow: 1; background: #ffffff;'),
  sheet(btn('Go online'), { gap: 12, pad: '20px 20px 18px', grow: false }),
  tabBar('Home'),
].join('');

const offer = (h) => [
  map(390, h, marker(150, Math.round(h * 0.60), 'rider') + marker(212, Math.round(h * 0.70), 'shop') + availChip(true) + attribution()),
  sheet(
    rowF(12, 'justify-content: space-between;',
      text('New request', 'font-size: 23px; font-weight: 800; letter-spacing: -0.015em;') +
      text('0:50', `background: ${C.redSoft}; color: ${C.redHover}; border-radius: 999px; padding: 7px 15px; font-size: 17px; font-weight: 700; font-family: ${MONO};`)) +
    rail(
      col(3, '', eyebrow('Pickup · 200 m away') +
        text('Favoire Kitchen', 'font-size: 19px; font-weight: 700;') +
        text('Ayeduase Gate, near KNUST, Kumasi', `font-size: 15px; color: ${C.sub};`)),
      col(3, '', eyebrow('Dropoff · 1.2 km trip') +
        text('KNUST Commercial Area, Kumasi', 'font-size: 19px; font-weight: 700;'))) +
    notes('Gate 2, ask for Ama') +
    rowF(12, 'margin-top: auto;',
      div(`width: 62px; height: 56px; border-radius: 14px; border: 1.5px solid ${C.line}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;`, I.close({ size: 22 })) +
      div('flex-grow: 1;', btn('Accept', { size: 19, pad: 16 }))),
    { gap: 15, pad: '20px 20px 16px', grow: false }),
  tabBar('Home'),
].join('');

const pickup = (h) => [
  map(390, h, routeDashes(390, h, [90, 96], [270, h - 90]) + marker(72, 78, 'rider') + marker(254, h - 110, 'shop') + attribution()),
  sheet(
    pill('Heading to pickup · Calculating…', C.orangeText, C.orangeSoft, I.nav({ size: 16, color: C.orangeText })) +
    col(4, '',
      text('Favoire Kitchen', 'font-size: 22px; font-weight: 700; letter-spacing: -0.01em;') +
      rowF(8, '', text('Ayeduase Gate, near KNUST, Kumasi', `font-size: 15px; color: ${C.sub};`) + text('·', `color: ${C.faint};`) + mono('#3B13032B', 14, C.mute))) +
    notes('Call on arrival, Room 12') +
    text('235 m to go. Favoire Kitchen confirms the handover when you arrive.', `font-size: 15px; color: ${C.sub}; line-height: 1.5;`) +
    rowF(14, '',
      rowF(9, `border: 1.5px solid oklch(88% 0.085 27); border-radius: 14px; padding: 14px 20px;`,
        I.nav({ size: 19, color: C.red }) + text('Navigate', `font-size: 16px; font-weight: 700; color: ${C.red};`)) +
      circleBtn(I.phone({ size: 21, color: C.red }), 52) +
      text('Back home', 'font-size: 16px; font-weight: 700; margin-left: auto;')) +
    text("Cancel — I can't take this job", `font-size: 15px; color: ${C.sub};`),
    { gap: 14, pad: '20px 20px 18px', grow: false }),
].join('');

const deliver = (h) => [
  map(390, h, routeDashes(390, h, [84, 80], [262, h - 96]) + marker(66, 62, 'rider') + marker(246, h - 116, 'pin') + attribution()),
  sheet(
    pill('Delivering · Calculating…', C.red, C.redSoft, I.nav({ size: 16, color: C.red })) +
    col(4, '',
      text('KNUST Commercial Area, Kumasi', 'font-size: 21px; font-weight: 700; letter-spacing: -0.01em;') +
      text('Favoire Kitchen delivery', `font-size: 15px; color: ${C.sub};`)) +
    notes('Call on arrival, Room 12') +
    rowF(14, 'align-items: center;',
      circleBtn(I.nav({ size: 20, color: C.red }), 50) +
      circleBtn(I.phone({ size: 20, color: C.red }), 50) +
      text('1047 m away — you can confirm this within 31 m', `font-size: 15px; color: ${C.sub}; text-align: right; flex-grow: 1; line-height: 1.4;`)) +
    btn('Complete delivery', { dim: true }),
    { gap: 14, pad: '20px 20px 18px', grow: false }),
].join('');

const done = () => [
  col(18, `padding: 30px 22px 10px; flex-grow: 1; background: ${C.page};`,
    col(8, 'align-items: center;',
      div(`width: 88px; height: 88px; border-radius: 999px; background: ${C.greenSoft}; display: flex; align-items: center; justify-content: center;`, I.check({ size: 44, color: C.green, w: 2.6 })) +
      text('Delivered!', 'font-size: 30px; font-weight: 800; margin-top: 6px; letter-spacing: -0.02em;') +
      text('KNUST Commercial Area, Kumasi', `font-size: 16px; color: ${C.sub};`)) +
    card(col(12, '',
      rowF(0, 'justify-content: space-between;', text('Distance', `font-size: 16px; color: ${C.sub};`) + mono('1.2 km', 16, C.ink, 700)) +
      rowF(0, 'justify-content: space-between;', text('Time', `font-size: 16px; color: ${C.sub};`) + mono('2 min', 16, C.ink, 700)) +
      rowF(0, 'justify-content: space-between;', text('For', `font-size: 16px; color: ${C.sub};`) + text('Favoire Kitchen', 'font-size: 16px; font-weight: 700;')) +
      rowF(0, 'justify-content: space-between;', text('Order', `font-size: 16px; color: ${C.sub};`) + rowF(8, '', mono('#3B13032B', 15, C.ink, 700) + text('·', `color: ${C.faint};`) + mono('22:03', 15, C.mute)))), 'padding: 18px 20px;') +
    card(ratingBlock('How was Favoire Kitchen?', { cta: 'Rate business' }), 'padding: 18px 20px;') +
    div('margin-top: auto;', col(12, '', btn('Back online') + text('See your trips', 'text-align: center; font-size: 16px; font-weight: 700;'))),
  ),
  tabBar('Trips'),
].join('');

/* ===================== COURIER · MOBILE ============================== */

out('RiderOfflineM.dc.html', phone(offline(556)));
out('RiderOfferM.dc.html', phone(offer(430)));
out('RiderPickupM.dc.html', phone(pickup(452)));
out('RiderDeliverM.dc.html', phone(deliver(442)));
out('RiderDoneM.dc.html', phone(done(), C.page));

out('RiderTripsM.dc.html', phone(
  div(`height: 62px; background: ${C.surface}; border-bottom: 1px solid ${C.line}; display: flex; align-items: center; padding: 0 20px; flex-shrink: 0;`,
    text('Trips', 'font-size: 21px; font-weight: 700;')) +
  col(16, 'padding: 18px 18px; flex-grow: 1;',
    rowF(12, '', statCard('Trips', '1', { valueSize: 26 }) + statCard('Today', '1', { valueSize: 26 })) +
    rowF(12, '', statCard('Distance', '1.2 km', { valueSize: 24 }) + statCard('Rating', '—', { valueSize: 26 })) +
    text('History', 'font-size: 19px; font-weight: 700;') +
    card(col(12, '',
      rowF(12, 'align-items: flex-start; justify-content: space-between;',
        col(4, '',
          mono('#3B13032B', 14, C.mute) +
          text('KNUST Commercial Area, Ku…', 'font-size: 17px; font-weight: 700;') +
          text('Favoire Kitchen', `font-size: 15px; color: ${C.sub};`) +
          mono('22 Aug, 22:03', 14, C.mute)) +
        pill('Delivered', C.green, C.greenSoft, I.checkCircle({ size: 15, color: C.green }))) +
      divider() +
      text('Rate business', 'font-size: 16px; font-weight: 700;')), 'padding: 16px;')) +
  tabBar('Trips'), C.page));

out('RiderSettingsM.dc.html', phone(
  div(`height: 62px; background: ${C.surface}; border-bottom: 1px solid ${C.line}; display: flex; align-items: center; padding: 0 20px; flex-shrink: 0;`,
    text('Profile & Settings', 'font-size: 21px; font-weight: 700;')) +
  col(14, 'padding: 16px 18px; flex-grow: 1;',
    card(rowF(16, '',
      avatar(58, '', {}) +
      col(3, 'flex-grow: 1;',
        text('Kwabena Mensah', 'font-size: 19px; font-weight: 700;') +
        rowF(6, '', mono('GT 4521-20', 14, C.mute) + text('· Offline', `font-size: 14px; color: ${C.mute};`))) +
      text('Edit', `border: 1px solid ${C.line}; border-radius: 999px; padding: 9px 18px; font-size: 15px; font-weight: 700;`)), 'padding: 16px;') +
    eyebrow('Account') +
    card(
      [['user', 'Name & password', ''], ['phone', 'Phone', '+233 24 412 3402'], ['mail', 'Email', 'design-rider@…'], ['plate', 'Number plate', 'GT 4521-20']]
        .map(([ic, label, value], i) =>
          div(i ? `border-top: 1px solid ${C.lineSoft};` : '',
            rowF(14, 'padding: 15px 16px;',
              I[ic]({ size: 20, color: C.ink }) +
              text(label, 'font-size: 16px; font-weight: 600; flex-grow: 1;') +
              (value ? mono(value, 13, C.mute) : '') +
              I.chevron({ size: 17, color: C.faint })))).join('')) +
    eyebrow('General') +
    card(
      [['bell', 'Notification Settings', ''], ['theme', 'Theme', 'System'], ['shield', 'Privacy Policy', '']]
        .map(([ic, label, value], i) =>
          div(i ? `border-top: 1px solid ${C.lineSoft};` : '',
            rowF(14, 'padding: 15px 16px;',
              I[ic]({ size: 20, color: C.ink }) +
              text(label, 'font-size: 16px; font-weight: 600; flex-grow: 1;') +
              (value ? text(value, `font-size: 14px; color: ${C.mute};`) : '') +
              I.chevron({ size: 17, color: C.faint })))).join(''))) +
  tabBar('Settings'), C.page));

/* ===================== COURIER · DESKTOP ============================= */
/* The courier app has no desktop layout of its own: the same phone column
   is centred on the shell colour. Captured, not assumed — see
   ../screenshots/desktop/rider-*.png. */

out('RiderOfferD.dc.html', deskPhone(offer(400)));
out('RiderPickupD.dc.html', deskPhone(pickup(430)));
out('RiderDoneD.dc.html', deskPhone(done()));

/* ===================== PUBLIC ======================================== */

const dotGrid = (x, y, cols, rows) => {
  let d = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    d += `<circle cx="${x + c * 14}" cy="${y + r * 14}" r="2.6" fill="#ffffff" opacity="0.5"/>`;
  return d;
};

const brandPanel = (w, h, heading, sub) => div(`position: relative; width: ${w}px; height: ${h}px; background: ${C.red}; overflow: hidden; flex-shrink: 0;`,
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position: absolute; inset: 0;" aria-hidden="true">
     ${dotGrid(40, 44, 8, 5)}
     <rect x="${w - 130}" y="46" width="72" height="72" rx="20" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
     <path d="M${w - 94} 46 v72 M${w - 130} 82 h72" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
     <circle cx="${w - 52}" cy="120" r="8" fill="oklch(68% 0.19 55)"/>
     <path d="M46 ${h * 0.62} H ${w - 60}" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 8" opacity="0.6"/>
     <circle cx="46" cy="${h * 0.62}" r="6" fill="#ffffff"/>
     <circle cx="96" cy="${h * 0.83}" r="46" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 8" opacity="0.6"/>
     <circle cx="96" cy="${h * 0.83}" r="24" fill="oklch(64% 0.2 48)"/>
     <circle cx="140" cy="${h * 0.79}" r="8" fill="#ffffff"/>
   </svg>` +
  (heading ? col(14, `position: absolute; left: 46px; top: ${Math.round(h * 0.33)}px; width: ${w - 100}px;`,
    text(heading, 'font-size: 38px; font-weight: 800; color: #ffffff; line-height: 1.12; letter-spacing: -0.02em;') +
    text(sub, 'font-size: 16px; color: oklch(100% 0 0 / 0.85); line-height: 1.5;')) : ''));

const signInForm = (w) => col(16, `width: ${w}px; box-sizing: border-box; padding: 40px 46px; display: flex; justify-content: center;`,
  col(10, 'align-items: center;', I.logo({ h: 42 }) +
    text('Hello! Welcome back', 'font-size: 24px; font-weight: 700; letter-spacing: -0.01em;')) +
  col(7, '', text('Email', 'font-size: 15px; font-weight: 700;') + input('Enter your email address')) +
  col(7, '', text('Password', 'font-size: 15px; font-weight: 700;') + input('Enter your password')) +
  rowF(10, 'justify-content: space-between;',
    rowF(9, '', div(`width: 19px; height: 19px; border-radius: 5px; border: 1.5px solid ${C.faint};`) + text('Remember me', `font-size: 15px; color: ${C.ink};`)) +
    text('Forgot password?', `font-size: 15px; font-weight: 700; color: ${C.red};`)) +
  btn('Login', { radius: 12 }) +
  rowF(14, '', div(`flex-grow: 1; height: 1px; background: ${C.line};`) + text('OR', `font-size: 13px; letter-spacing: 0.1em; color: ${C.mute};`) + div(`flex-grow: 1; height: 1px; background: ${C.line};`)) +
  rowF(12, `justify-content: center; border: 1px solid ${C.line}; border-radius: 12px; padding: 15px;`,
    I.google({ size: 21 }) + text('Continue with Google', 'font-size: 16px; font-weight: 700;')) +
  rowF(7, 'justify-content: center;',
    text("Don't have an account?", `font-size: 15px; color: ${C.sub};`) +
    text('Create account', `font-size: 15px; font-weight: 700; color: ${C.red};`)));

out('SignInD.dc.html', desktop(
  div(`flex-grow: 1; display: flex; align-items: center; justify-content: center;`,
    rowF(0, `border-radius: 24px; overflow: hidden; background: ${C.surface}; box-shadow: 0 24px 60px oklch(20% 0.02 30 / 0.14); align-items: stretch;`,
      brandPanel(560, 630, 'Find riders,<br>with ease.', 'Sign in to find couriers and track all deliveries.') +
      signInForm(560))), C.desk));

out('SignInM.dc.html', phone(
  brandPanel(390, 200, '', '') +
  signInForm(390)));

const tall = (kids) => div(`width: 1440px; min-height: 1460px; background: ${C.surface}; color: ${C.ink}; display: flex; flex-direction: column; overflow: hidden;`, kids);

out('LandingD.dc.html', tall(
  rowF(0, `height: 74px; background: ${C.surface}; border-bottom: 1px solid ${C.line}; padding: 0 42px; flex-shrink: 0;`,
    div('flex-grow: 1;', I.logo({ h: 26 })) +
    rowF(18, '',
      rowF(4, `background: oklch(96% 0.005 50); border-radius: 999px; padding: 5px;`,
        ['Auto', 'Light', 'Dark'].map((t, i) => text(t, `padding: 6px 13px; border-radius: 999px; font-size: 13px; color: ${i === 0 ? C.ink : C.mute}; background: ${i === 0 ? C.surface : 'transparent'};`)).join('')) +
      text('Sign in', 'font-size: 16px; font-weight: 600;') +
      text('Get started', `background: ${C.red}; color: #ffffff; border-radius: 10px; padding: 12px 22px; font-size: 16px; font-weight: 700;`))) +
  rowF(60, `padding: 60px 104px; align-items: center; background: oklch(96.5% 0.004 60);`,
    col(22, 'width: 560px;',
      text('KUMASI · KNUST &amp; AYEDUASE', `font-family: ${MONO}; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; color: ${C.red};`) +
      text('Find Riders,<br>with ease.', 'font-size: 56px; font-weight: 800; line-height: 1.08; letter-spacing: -0.03em;') +
      text('YADA puts the business that sent the parcel and the courier carrying it on the same map — from the moment a request goes out to the moment it lands.', `font-size: 17px; color: ${C.sub}; line-height: 1.6;`) +
      rowF(14, '',
        text('Create an account', `background: ${C.red}; color: #ffffff; border-radius: 12px; padding: 16px 28px; font-size: 17px; font-weight: 700;`) +
        text('I already have one', `border: 1.5px solid oklch(88% 0.085 27); color: ${C.red}; border-radius: 12px; padding: 16px 28px; font-size: 17px; font-weight: 700;`)) ) +
    div('border-radius: 22px; overflow: hidden; box-shadow: 0 20px 50px oklch(20% 0.02 30 / 0.14);', brandPanel(500, 370, '', ''))) +
  col(20, 'padding: 40px 104px;',
    text('TWO SIDES, ONE DELIVERY', `font-family: ${MONO}; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; color: ${C.mute};`) +
    text('Built for whichever end you are on', 'font-size: 32px; font-weight: 700; letter-spacing: -0.02em;') +
    rowF(22, 'align-items: stretch;',
      [['For businesses', 'Send it, then stop wondering', 'Raise a delivery, get matched to a rider nearby, and follow the parcel to the door — without a single "where is my order?" phone call.', ['Request a delivery in three fields', 'Live rider position on the map', 'Every past delivery kept in history'], 'Sign up as a business'],
       ['For couriers', 'Go online. Get the next job', 'Offers come to you while you are online. Accept the ones that work, follow the route, and your completed trips add themselves up.', ['Accept or decline each offer', 'Turn-by-turn route to pickup and drop-off', 'Trips and distance totalled for you'], 'Sign up as a courier']]
        .map(([kicker, head, body, list, cta]) =>
          card(col(14, '',
            text(kicker.toUpperCase(), `font-family: ${MONO}; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: ${C.red};`) +
            text(head, 'font-size: 21px; font-weight: 700;') +
            text(body, `font-size: 15px; color: ${C.sub}; line-height: 1.55;`) +
            col(10, '', list.map((l) => rowF(10, '', I.check({ size: 16, color: C.red, w: 2.4 }) + text(l, 'font-size: 15px;'))).join('')) +
            div('margin-top: auto; padding-top: 4px;', text(cta, `border: 1.5px solid oklch(88% 0.085 27); color: ${C.red}; border-radius: 12px; padding: 14px; text-align: center; font-size: 15px; font-weight: 700;`))),
            'padding: 26px; flex-grow: 1; width: 50%; box-sizing: border-box; display: flex;')).join('')))));

console.log(made.join('\n'));
