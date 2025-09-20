<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";

	interface Props {
		eventId: number;
	}

	let { eventId }: Props = $props();

	async function verifyEvent(action: 'approve' | 'reject') {
		let reason = '';
		if (action === 'reject') {
			const userInput = prompt('Reason for rejection (optional):');
			if (userInput === null) return; // User cancelled
			reason = userInput || '';
		}

		try {
			const token = document.cookie.split('; ').find(row => row.startsWith('jwt_token='))?.split('=')[1];
			const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/verify-event`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					eventId,
					action,
					reason
				})
			});

			const result = await response.json();
			if (result.success) {
				alert(`Event ${action}ed successfully!`);
				location.reload();
			} else {
				alert(`Error: ${result.error}`);
			}
		} catch (error) {
			console.error('Error:', error);
			alert('Failed to verify event');
		}
	}
</script>

<div class="flex space-x-2">
	<Button
		variant="default"
		size="sm"
		class="bg-green-600 text-white hover:bg-green-700"
		onclick={() => verifyEvent('approve')}
	>
		✅ Approve
	</Button>

	<Button
		variant="destructive"
		size="sm"
		onclick={() => verifyEvent('reject')}
	>
		❌ Reject
	</Button>
</div>