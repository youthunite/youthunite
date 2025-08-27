import type { APIRoute } from 'astro';

export const post: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData();
  const id = form.get('id');
  const token = cookies.get('jwt')?.value;
  try {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/admin/delete-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: Number(id) })
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
