const SUPABASE_URL = 'https://YOUR-SUPABASE-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-SUPABASE-ANON-KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const STRIPE_PK = 'YOUR-STRIPE-PUBLISHABLE-KEY';

async function loadUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '../popup.html';
    return;
  }
  document.getElementById('user').textContent = user.email;
  const { data, error } = await supabase
    .from('purchases')
    .select('product, amount, created_at')
    .eq('user_id', user.id);
  if (error) {
    console.error(error);
    return;
  }
  const list = document.getElementById('purchases');
  data.forEach(row => {
    const li = document.createElement('li');
    li.textContent = `${row.product} - $${row.amount} on ${row.created_at}`;
    list.appendChild(li);
  });

  await loadExports(user.id);
}

async function createPurchase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const response = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id })
  });
  const { sessionId } = await response.json();
  const stripe = Stripe(STRIPE_PK);
  await stripe.redirectToCheckout({ sessionId });
}

async function loadExports(userId) {
  const { data, error } = await supabase.storage
    .from('chat-exports')
    .list(`${userId}`);
  if (error) {
    console.error(error);
    return;
  }
  const list = document.getElementById('records');
  list.innerHTML = '';
  for (const file of data) {
    const li = document.createElement('li');
    const { data: signed } = await supabase.storage
      .from('chat-exports')
      .createSignedUrl(`${userId}/${file.name}`, 60);
    const a = document.createElement('a');
    a.href = signed.signedUrl;
    a.textContent = file.name;
    a.target = '_blank';
    li.appendChild(a);
    list.appendChild(li);
  }
}

document.getElementById('buyBtn').addEventListener('click', createPurchase);
loadUser();
