<script>
	import { onMount } from 'svelte';

	let isDarkMode = false;

	onMount(() => {
		const savedMode = localStorage.getItem('darkMode');
		if (savedMode) {
			isDarkMode = JSON.parse(savedMode);
			document.body.classList.toggle('dark-mode', isDarkMode);
		}
	});

	function toggleDarkMode() {
		isDarkMode = !isDarkMode;
		document.body.classList.toggle('dark-mode', isDarkMode);
		localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
	}
</script>

<nav class="navbar">
	<div class="nav-container">
		<a href="#" class="logo">
			<img src="textlogo.png" alt="">
		</a>
		<ul class="nav-links">
			<li><a href="#home">Home</a></li>
			<li><a href="#events">Event Hub</a></li>
			<li><a href="#submit">Submit an Event</a></li>
			<li><a href="#learn">Learn</a></li>
			<li><a href="#contact">Contact</a></li>
			<li><a href="#login" class="cta-button">Login</a></li>
		</ul>
		<button 
			id="mode-toggle" 
			on:click={toggleDarkMode}
			style="
				position: fixed;
				top: 1rem;
				right: 1rem;
				padding: 0.5rem 1.2rem;
				border-radius: 25px;
				background: var(--blue-light);
				color: white;
				font-size: 1rem;
				border: none;
				cursor: pointer;
				z-index: 1001;
				display: flex;
				align-items: center;
				gap: 0.5rem;
			"
		>
			<span id="mode-icon">{isDarkMode ? '☀️' : '🌙'}</span>
		</button>
	</div>
</nav>

<style>
	:global(:root) {
		--orange-primary: #FF6B35;
		--orange-light: #FF8A5B;
		--blue-dark: #1B365D;
		--blue-light: #4A90E2;
		--blue-sky: #87CEEB;
		--white: #FFFFFF;
		--light-grey: #F8F9FA;
		--dark-grey: #2C3E50;
		--text-dark: #1A1A1A;
	}

	.navbar {
		position: fixed;
		top: 0;
		width: 100%;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		z-index: 1000;
		padding: 1rem 0;
		transition: all 0.3s ease;
	}

	:global(body.dark-mode) .navbar {
		background-color: rgba(30, 30, 30, 0.95);
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		font-size: 1.8rem;
		font-weight: 800;
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		list-style: none;
		gap: 2rem;
		align-items: center;
	}

	.nav-links a {
		text-decoration: none;
		color: var(--text-dark);
		font-weight: 500;
		transition: color 0.3s ease;
	}

	:global(body.dark-mode) .nav-links a {
		color: #e0e0e0;
	}

	.nav-links a:hover {
		color: var(--orange-primary);
	}

	.cta-button {
		background: linear-gradient(135deg, var(--orange-primary), var(--orange-light));
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 50px;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.3s ease;
		box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
	}

	.cta-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
	}

	.navbar img {
		height: 1.5em;
		vertical-align: middle;
	}

	@media (max-width: 768px) {
		.nav-links {
			display: none;
		}
	}
</style>
