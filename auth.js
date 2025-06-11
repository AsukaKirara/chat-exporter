// Supabase authentication module
const SUPABASE_URL = 'https://YOUR-SUPABASE-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-SUPABASE-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function signup() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = 'Signing up...';

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    statusDiv.textContent = 'Signup failed: ' + error.message;
  } else {
    // Create profile with default subscription status
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        subscription_status: 'inactive'
      });
    }
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

// Listen for auth state changes to handle OAuth completion
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Check if profile exists, create if not
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      // Create profile for new OAuth users
      await supabase.from('profiles').insert({
        id: session.user.id,
        subscription_status: 'inactive'
      });
    }

    // Update UI if updateUIState function exists
    if (typeof updateUIState === 'function') {
      await updateUIState();
    }
  }
});

async function logout() {
  const statusDiv = document.getElementById('status');
  await supabase.auth.signOut();
  statusDiv.textContent = 'Logged out';
}

// Function to check subscription status
async function checkSubscriptionStatus(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  return profile ? profile.subscription_status : 'inactive';
}

// Function to update subscription status
async function updateSubscriptionStatus(userId, status) {
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: status })
    .eq('id', userId);

  if (error) {
    console.error('Error updating subscription status:', error);
    return false;
  }
  return true;
}
