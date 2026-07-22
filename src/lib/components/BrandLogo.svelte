<script lang="ts">
	export let href = '/dashboard';
	/** sm: nav/mobile header · md: auth · lg: landing hero */
	export let size: 'sm' | 'md' | 'lg' = 'sm';

	const sizeClass = {
		sm: 'h-8 w-auto',
		md: 'h-12 w-auto sm:h-14',
		lg: 'h-16 w-auto sm:h-20'
	};
</script>

<a {href} class="inline-flex shrink-0 items-center" aria-label="YADA home">
	<img
		src="/yada-logo.png"
		alt="YADA by favorie"
		class="{sizeClass[size]} object-contain object-left"
	/>
</a>
