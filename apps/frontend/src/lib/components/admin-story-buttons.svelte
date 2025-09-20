<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";

	interface Props {
		storyId: number;
	}

	let { storyId }: Props = $props();

	async function verifyStory(action: 'approve' | 'reject', publish = false) {
		let reason = '';
		if (action === 'reject') {
			const userInput = prompt('Reason for rejection (optional):');
			if (userInput === null) return; // User cancelled
			reason = userInput || '';
		}

		try {
			const token = document.cookie.split('; ').find(row => row.startsWith('jwt_token='))?.split('=')[1];
			const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/verify-story`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					storyId,
					action,
					reason,
					publish
				})
			});

			const result = await response.json();
			if (result.success) {
				alert(result.message);
				location.reload();
			} else {
				alert(`Error: ${result.error}`);
			}
		} catch (error) {
			console.error('Error:', error);
			alert('Failed to verify story');
		}
	}
</script>

<div class="flex flex-col space-y-2">
	<Button
		variant="default"
		size="sm"
		class="bg-green-600 text-white hover:bg-green-700"
		onclick={() => verifyStory('approve', true)}
	>
		✅ Approve & Publish
	</Button>

	<Button
		variant="destructive"
		size="sm"
		onclick={() => verifyStory('reject')}
	>
		❌ Reject
	</Button>
</div>