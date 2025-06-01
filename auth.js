// Supabase authentication module
const SUPABASE_URL = 'https://YOUR-SUPABASE-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-SUPABASE-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function signup() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Signing up...';

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    statusDiv.textContent = 'Signup failed: ' + error.message;
  } else {
    statusDiv.textContent = 'Signed up - check your email to confirm';
  }
}

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

async function loginWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) {
    document.getElementById('status').textContent = 'Google login failed: ' + error.message;
  }
}

async function loginWithApple() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
  if (error) {
    document.getElementById('status').textContent = 'Apple login failed: ' + error.message;
  }
}

async function logout() {
  const statusDiv = document.getElementById('status');
  await supabase.auth.signOut();
  statusDiv.textContent = 'Logged out';
}
