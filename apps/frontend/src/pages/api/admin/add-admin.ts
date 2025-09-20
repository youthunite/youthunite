import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const id = form.get('id');
  const token = cookies.get('jwt_token')?.value;
  try {
    const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8787';
    const res = await fetch(`${API_BASE}/admin/add-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: Number(id) })
    });
    const data = await res.json();
    if (data.success) {
      return redirect('/admin');
    } else {
      return redirect('/admin?error=Failed to make user admin');
    }
  } catch (e) {
    console.error(e);
    return redirect('/admin?error=Server error');
  }
};
