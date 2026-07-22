<script lang="ts">
  type ScreenVariant = 'phone' | 'desktop';
  type BlockTone = 'soft' | 'strong' | 'accent';

  type WireframeBlock = {
    label: string;
    value: string;
    tone?: BlockTone;
  };

  type WireframeScreen = {
    title: string;
    subtitle: string;
    variant: ScreenVariant;
    blocks: WireframeBlock[];
  };

  const customerScreens: WireframeScreen[] = [
    {
      title: 'Login',
      subtitle: 'Business access',
      variant: 'phone',
      blocks: [
        { label: 'Logo', value: 'YADA' },
        { label: 'Email', value: 'business@favorie.com' },
        { label: 'Password', value: '••••••••' },
        { label: 'Sign in', value: 'Primary button', tone: 'strong' }
      ]
    },
    {
      title: 'New order',
      subtitle: 'Request a courier',
      variant: 'phone',
      blocks: [
        { label: 'Pickup', value: 'Favorie kitchen' },
        { label: 'Drop-off', value: 'Customer address' },
        { label: 'Package', value: 'Small parcel' },
        { label: 'Confirm request', value: 'Bottom button', tone: 'strong' }
      ]
    },
    {
      title: 'Offer received',
      subtitle: 'Courier matched',
      variant: 'phone',
      blocks: [
        { label: 'Courier', value: 'Rider profile card', tone: 'accent' },
        { label: 'ETA', value: 'Live arrival estimate' },
        { label: 'Accept', value: 'Primary action', tone: 'strong' },
        { label: 'Decline', value: 'Secondary action' }
      ]
    },
    {
      title: 'Trip tracking',
      subtitle: 'Live status',
      variant: 'phone',
      blocks: [
        { label: 'Map', value: 'Courier position' },
        { label: 'Status', value: 'In progress', tone: 'accent' },
        { label: 'Route', value: 'Pickup to drop-off' },
        { label: 'Contact', value: 'Call courier' }
      ]
    },
    {
      title: 'Delivery complete',
      subtitle: 'Rate the trip',
      variant: 'phone',
      blocks: [
        { label: 'Summary', value: 'Completed' },
        { label: 'Rating', value: 'Star input' },
        { label: 'Comment', value: 'Optional note' },
        { label: 'Submit', value: 'Confirm feedback', tone: 'strong' }
      ]
    }
  ];

  const businessScreens: WireframeScreen[] = [
    {
      title: 'Dashboard',
      subtitle: 'Desktop workspace',
      variant: 'desktop',
      blocks: [
        { label: 'Search', value: 'Order, rider, history' },
        { label: 'Trips', value: 'Rows with status pills' },
        { label: 'Actions', value: 'Create request', tone: 'strong' },
        { label: 'Summary', value: 'Stats and filters' }
      ]
    },
    {
      title: 'Delivery board',
      subtitle: 'Kanban state columns',
      variant: 'desktop',
      blocks: [
        { label: 'Requested', value: 'Column one' },
        { label: 'Accepted', value: 'Column two', tone: 'accent' },
        { label: 'In progress', value: 'Column three' },
        { label: 'Completed', value: 'Column four' }
      ]
    },
    {
      title: 'Create request',
      subtitle: 'New courier request form',
      variant: 'desktop',
      blocks: [
        { label: 'Trip details', value: 'Pickup and drop-off fields' },
        { label: 'Notes', value: 'Instruction box' },
        { label: 'Preview', value: 'Route summary panel' },
        { label: 'Submit', value: 'Send request', tone: 'strong' }
      ]
    },
    {
      title: 'Trip detail',
      subtitle: 'Live monitoring',
      variant: 'desktop',
      blocks: [
        { label: 'Map', value: 'Large map region' },
        { label: 'Sidebar', value: 'Courier profile and status', tone: 'accent' },
        { label: 'Timeline', value: 'State events' },
        { label: 'Chat', value: 'Contact thread' }
      ]
    },
    {
      title: 'History',
      subtitle: 'Past deliveries',
      variant: 'desktop',
      blocks: [
        { label: 'Filters', value: 'Date, status, courier' },
        { label: 'Table', value: 'Trip rows' },
        { label: 'Badges', value: 'Status tags' },
        { label: 'Export', value: 'Download report', tone: 'strong' }
      ]
    }
  ];

  const courierScreens: WireframeScreen[] = [
    {
      title: 'Login',
      subtitle: 'Courier access',
      variant: 'phone',
      blocks: [
        { label: 'Logo', value: 'YADA' },
        { label: 'Phone', value: '+233 xxx xxx xxx' },
        { label: 'OTP', value: 'Code entry' },
        { label: 'Sign in', value: 'Primary button', tone: 'strong' }
      ]
    },
    {
      title: 'Availability',
      subtitle: 'Go online',
      variant: 'phone',
      blocks: [
        { label: 'Status', value: 'Online toggle', tone: 'accent' },
        { label: 'Jobs', value: 'Incoming requests' },
        { label: 'Profile', value: 'Name and rating' },
        { label: 'Map', value: 'Nearby areas' }
      ]
    },
    {
      title: 'Offer detail',
      subtitle: 'Accept or reject',
      variant: 'phone',
      blocks: [
        { label: 'Pickup', value: 'Origin address' },
        { label: 'Drop-off', value: 'Destination address' },
        { label: 'Timer', value: 'Acceptance countdown' },
        { label: 'Accept', value: 'Primary button', tone: 'strong' }
      ]
    },
    {
      title: 'Navigation',
      subtitle: 'Active trip',
      variant: 'phone',
      blocks: [
        { label: 'Map', value: 'Turn-by-turn view' },
        { label: 'Status', value: 'En route', tone: 'accent' },
        { label: 'Action', value: 'Mark arrived' },
        { label: 'Contact', value: 'Call business' }
      ]
    },
    {
      title: 'Payment',
      subtitle: 'Trip finished',
      variant: 'phone',
      blocks: [
        { label: 'Summary', value: 'Completed trip' },
        { label: 'Payout', value: 'Earnings panel' },
        { label: 'Rating', value: 'Customer score' },
        { label: 'Done', value: 'Return to dashboard', tone: 'strong' }
      ]
    }
  ];

  const screenGroups = [
    { name: 'Customer - mobile', screens: customerScreens },
    { name: 'Business - desktop', screens: businessScreens },
    { name: 'Courier - mobile', screens: courierScreens }
  ];

  const statusChips = ['Login', 'Requests', 'Offers', 'Tracking', 'History'];

  const toneClass = (tone?: BlockTone) => {
    if (tone === 'strong') return 'wire-block wire-block-strong';
    if (tone === 'accent') return 'wire-block wire-block-accent';
    return 'wire-block';
  };
</script>

<svelte:head>
  <title>YADA | Wireframes</title>
  <meta name="description" content="Wireframe mockups for YADA across customer, business, and courier flows." />
</svelte:head>

<main class="wireframe-canvas min-h-screen px-4 py-6 sm:px-6 lg:px-8">
  <section class="mx-auto flex max-w-[1600px] flex-col gap-8">
    <header class="wireframe-header">
      <div>
        <p class="wireframe-kicker">YADA concept board</p>
        <h1>Wireframe study for customer, business, and courier flows</h1>
      </div>
      <div class="wireframe-status-row">
        {#each statusChips as chip}
          <span class="wireframe-chip">{chip}</span>
        {/each}
      </div>
    </header>

    {#each screenGroups as group}
      <section class="space-y-4">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="wireframe-kicker">{group.name}</p>
            <h2 class="wireframe-group-title">{group.screens.length} screen sequence</h2>
          </div>
        </div>

        <div class="wireframe-grid">
          {#each group.screens as screen}
            <article class={`wireframe-card ${screen.variant === 'phone' ? 'wireframe-phone' : 'wireframe-desktop'}`}>
              <div class="wireframe-screen-top">
                <p>{screen.title}</p>
                <span>{screen.subtitle}</span>
              </div>

              <div class={`wireframe-screen-body ${screen.variant === 'desktop' ? 'wireframe-screen-body-desktop' : ''}`}>
                <div class={screen.variant === 'phone' ? 'wireframe-frame wireframe-frame-phone' : 'wireframe-frame wireframe-frame-desktop'}>
                  <div class="wireframe-frame-header"></div>
                  <div class={screen.variant === 'phone' ? 'wireframe-content wireframe-content-phone' : 'wireframe-content wireframe-content-desktop'}>
                    <div class="wireframe-hero">
                      <div>
                        <p class="wireframe-brand">YADA</p>
                        <h3>{screen.title}</h3>
                        <p class="wireframe-subtitle">{screen.subtitle}</p>
                      </div>
                      <div class="wireframe-badge"></div>
                    </div>

                    <div class={screen.variant === 'phone' ? 'wireframe-list wireframe-list-phone' : 'wireframe-list wireframe-list-desktop'}>
                      {#each screen.blocks as block}
                        <div class={toneClass(block.tone)}>
                          <span>{block.label}</span>
                          <strong>{block.value}</strong>
                        </div>
                      {/each}
                    </div>

                    {#if screen.variant === 'desktop'}
                      <div class="wireframe-desktop-panels">
                        <div class="wireframe-panel"></div>
                        <div class="wireframe-panel wireframe-panel-tall"></div>
                        <div class="wireframe-panel"></div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </section>
</main>