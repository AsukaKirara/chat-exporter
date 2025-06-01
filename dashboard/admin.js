const SUPABASE_URL = 'https://YOUR-SUPABASE-PROJECT.supabase.co';
// NOTE: this file expects to be served from a secure server environment
// that injects SUPABASE_SERVICE_KEY at build or runtime. Do not expose the
// service key in client side code.
const SERVICE_KEY = window.SUPABASE_SERVICE_KEY || '';
const supabase = window.supabase.createClient(SUPABASE_URL, SERVICE_KEY);

async function loadUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }
  const list = document.getElementById('users');
  data.users.forEach(u => {
    const li = document.createElement('li');
    li.textContent = `${u.email} - ${u.id}`;
    list.appendChild(li);
  });
}

loadUsers();
