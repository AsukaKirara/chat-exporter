// Supabase authentication module
const SUPABASE_URL = 'https://YOUR-SUPABASE-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-SUPABASE-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Signing in...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    statusDiv.textContent = 'Login failed: ' + error.message;
  } else {
    statusDiv.textContent = 'Logged in';
  }
}

async function logout() {
  const statusDiv = document.getElementById('status');
  await supabase.auth.signOut();
  statusDiv.textContent = 'Logged out';
}
