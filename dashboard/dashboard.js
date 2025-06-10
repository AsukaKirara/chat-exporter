const SUPABASE_URL = 'https://YOUR-SUPABASE-PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR-SUPABASE-ANON-KEY';

const BUCKET = 'chat-exports';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


async function loadUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '../popup.html';
    return;
  }
  document.getElementById('user').textContent = user.email;

  const { data: purchases, error: purchaseError } = await supabase
    .from('purchases')
    .select('product, amount, created_at')
    .eq('user_id', user.id);
  if (purchaseError) {
    console.error(purchaseError);
    return;
  }
  const list = document.getElementById('purchases');
  purchases.forEach(row => {

    const li = document.createElement('li');
    li.textContent = `${row.product} - $${row.amount} on ${row.created_at}`;
    list.appendChild(li);
  });


  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('title, path')
    .eq('user_id', user.id);
  if (recordsError) {
    console.error(recordsError);
    return;
  }
  const recList = document.getElementById('records');
  for (const rec of records) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(rec.path, 60 * 60);
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = signed.signedUrl;
    link.textContent = rec.title;
    link.target = '_blank';
    li.appendChild(link);
    recList.appendChild(li);
  }

}

async function createPurchase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const res = await fetch('/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: user.id })
  });
  const json = await res.json();
  const stripe = Stripe('pk_test_YOUR_PUBLIC_KEY');
  await stripe.redirectToCheckout({ sessionId: json.sessionId });

}

document.getElementById('buyBtn').addEventListener('click', createPurchase);
loadUser();
