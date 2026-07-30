<script lang="ts">
	let {
		href = '/dashboard',
		/** sm: nav/mobile header · md: auth · lg: landing hero */
		size = 'sm'
	}: {
		href?: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizeClass = {
		sm: 'h-9 w-auto',
		md: 'h-14 w-auto sm:h-16',
		lg: 'h-20 w-auto sm:h-24'
	};
</script>

<a {href} class="inline-flex shrink-0 items-center" aria-label="YADA home">
	<img
		src="/yada-logo.png"
		alt="YADA by favorie"
		class="{sizeClass[size]} rounded-md object-contain object-left"
	/>
</a>
