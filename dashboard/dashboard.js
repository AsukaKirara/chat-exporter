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

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    document.getElementById('user').innerHTML = `
      <p>${user.email}</p>
      <p style="color: orange;">⚠️ Dashboard access requires an active subscription</p>
      <p>Subscribe to access your chat history and management features.</p>
    `;
    document.getElementById('buyBtn').style.display = 'block';
    return;
  }

  document.getElementById('user').innerHTML = `
    <p>${user.email}</p>
    <p style="color: green;">✓ Active Subscription</p>
  `;

  // Load purchases
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

  // Load chat records (HTML content)
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('id, title, content_type, html_content, json_data, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (recordsError) {
    console.error(recordsError);
    return;
  }

  const recList = document.getElementById('records');
  records.forEach(rec => {
    const li = document.createElement('li');
    li.className = 'record-item';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'record-title';
    titleDiv.textContent = rec.title;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'record-actions';

    // View HTML button
    if (rec.html_content) {
      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View HTML';
      viewBtn.onclick = () => viewHTMLRecord(rec.html_content, rec.title);
      actionsDiv.appendChild(viewBtn);
    }

    // Download JSON button
    if (rec.json_data) {
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download JSON';
      downloadBtn.onclick = () => downloadJSON(rec.json_data, rec.title);
      actionsDiv.appendChild(downloadBtn);
    }

    const dateDiv = document.createElement('div');
    dateDiv.className = 'record-date';
    dateDiv.textContent = new Date(rec.created_at).toLocaleString();

    li.appendChild(titleDiv);
    li.appendChild(actionsDiv);
    li.appendChild(dateDiv);
    recList.appendChild(li);
  });
}

// Function to view HTML record in new window
function viewHTMLRecord(htmlContent, title) {
  const newWindow = window.open('', '_blank');
  newWindow.document.write(htmlContent);
  newWindow.document.title = title;
}

// Function to download JSON data
function downloadJSON(jsonData, title) {
  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function createPurchase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const res = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: user.id })
    });
    const json = await res.json();
    const stripe = Stripe('pk_test_YOUR_PUBLIC_KEY');
    await stripe.redirectToCheckout({ sessionId: json.sessionId });
  } catch (error) {
    console.error('Error creating purchase:', error);
    alert('Error creating purchase. Please try again.');
  }
}

document.getElementById('buyBtn').addEventListener('click', createPurchase);

// Check for successful payment on page load
window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'true') {
    // Payment was successful, update subscription status
    updateSubscriptionAfterPayment();
  }
});

async function updateSubscriptionAfterPayment() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Update subscription status to active
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: 'active' })
    .eq('id', user.id);

  if (!error) {
    // Reload the page to show updated dashboard
    window.location.href = window.location.pathname;
  }
}

loadUser();
