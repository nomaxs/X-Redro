const client = new Appwrite.Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('695981480033c7a4eb0d');

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);
const Query = Appwrite.Query;

const DB_ID = "695c4fce0039f513dc83";
const USERS = "695c501b001d24549b03";
const FORMS = "form";
const SUBS = "subscriptions";
const ORDERS = "orders";

let profileDocId = null;
let user;
let res;

// ---------------------------
// Auth check
// ---------------------------
async function requireAuth() {
  try {
    return await account.get();
  } catch {
    window.location.href = "login.html";
  }
}

// ---------------------------
// Create user data once
// ---------------------------
async function ensureInitialUserData(user) {
  try {
    await databases.getDocument(DB_ID, USERS, user.$id);
    return; // already exists
  } catch {}

  // USER PROFILE
  await databases.createDocument(DB_ID, USERS, user.$id, {
    userId: user.$id,
    email: user.email,
    username: user.name || getUsernameFromEmail(user.email),
    theme: "light",
    accountStatus: "active",
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString()
  });

  // DEFAULT FORM
  await databases.createDocument(DB_ID, FORMS, user.$id, {
    userId: user.$id,
    title: "My Business Name",
    subtitle: "Welcome to Redro, place your order",
    fields: [],
    isActive: true,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString()
  });

  // TRIAL SUBSCRIPTION
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  await databases.createDocument(DB_ID, SUBS, Appwrite.ID.unique(), {
    userId: user.$id,
    plan: "trial",
    durationDay: 7,
    startsAt: new Date().toISOString(),
    expiresAt: expiry.toISOString(),
    status: "active",
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString()
  });
}

// ---------------------------
// Utility: get username from email
// ---------------------------
function getUsernameFromEmail(email) {
  return email.split("@")[0].replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
}

// ---------------------------
// GOOGLE LOGIN HANDLER
// ---------------------------
async function handleGoogleLogin() {
  try {
    const user = await account.get();
    await ensureInitialUserData(user);
  } catch {
    // User is not logged in via Google yet
  }
}

// ---------------------------
// DASHBOARD INIT
// ---------------------------
async function initDashboard() {
  user = await requireAuth();

  // Handle Google login profile creation
  await handleGoogleLogin();

  // Load user profile from DB
  res = await databases.listDocuments(DB_ID, USERS, [
    Query.equal("userId", user.$id),
    Query.limit(1)
  ]);

  if (!res.documents.length) {
    alert("User profile not found");
    return;
  }

  const profile = res.documents[0];
  profileDocId = profile.$id;

  username.value = profile.username || "";
  email.value = profile.email || user.email || "";

  // Theme
  const savedTheme = profile.theme || "light";
  applyTheme(savedTheme);

  // Load subscription
  const subRes = await databases.listDocuments(DB_ID, SUBS, [
    Query.equal("userId", user.$id)
  ]);

  if (!subRes.documents.length) {
    alert("Subscription not found");
    return;
  }

  const sub = subRes.documents[0];
  const daysLeft = Math.ceil(
    (new Date(sub.expiresAt) - new Date()) / 86400000
  );

  if (daysLeft <= 0) {
    document.getElementById("subscriptionModal").classList.remove("hidden");
    return;
  }

  planDays.innerText = sub.plan;
  expiresIn.innerText = `${daysLeft} days`;

  // Load orders and stats
  const pendingCount = await loadStats(user.$id);
  await loadLatestOrders(user.$id);
  updateAttention(pendingCount);
}

// ---------------------------
// STATS / ORDERS
// ---------------------------
async function loadStats(userId) {
  const res = await databases.listDocuments(DB_ID, ORDERS, [
    Query.equal("userId", userId)
  ]);

  const orders = res.documents;
  const pendingCount = orders.filter(o => o.status === "pending").length;

  totalOrders.innerText = orders.length;
  deliveredOrders.innerText = orders.filter(o => o.status === "delivered").length;
  paidOrders.innerText = orders.filter(o => o.status === "paid").length;
  pendingOrders.innerText = pendingCount;

  return pendingCount;
}

async function loadLatestOrders(userId) {
  const res = await databases.listDocuments(DB_ID, ORDERS, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(3)
  ]);

  renderOrders(res.documents);
}

// ---------------------------
// OTHER HELPERS
// ---------------------------
function updateAttention(pendingCount) {
  const box = document.getElementById("attentionStatus");
  const text = document.getElementById("attentionText");

  box.classList.remove("hidden");

  if (pendingCount > 0) {
    text.textContent = `${pendingCount} orders awaiting payment`;
  } else {
    text.textContent = "✓ No pending actions";
    document.getElementById("attentionIcon").textContent = "✓";
  }
}

function parseFormData(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => (typeof item === "string" ? JSON.parse(item) : item))
    .filter(Boolean);
}

function getProductSummary(rawFormData, maxItems = null) {
  const formData = parseFormData(rawFormData);
  const products = [];
  formData.forEach(f => {
    if (f.type === "product" && Array.isArray(f.value)) {
      f.value.forEach(p => products.push(`${p.name} x${p.qty}`));
    }
  });
  return maxItems !== null
    ? products.slice(0, maxItems).join(", ")
    : products.join(", ");
}

function getCardTitle(order) {
  const formData = parseFormData(order.formData);
  const nonProducts = formData.filter(f => f.type !== "product" && f.value);
  if (nonProducts.length) return nonProducts[0].value;
  if (formData.length > 1 && formData[1].value) return formData[1].value;
  return "Order";
}

function renderOrders(orders) {
  const wrap = document.getElementById("ordersList");
  wrap.innerHTML = "";

  if (!orders.length) {
    wrap.innerHTML = "<p>No recent orders.</p>";
    return;
  }

  orders.forEach(order => {
    const card = document.createElement("div");
    card.className = "order-card";

    const title = getCardTitle(order);
    const summary = getProductSummary(order.formData, 2);

    card.innerHTML = `
      <div class="card-header">
        <h3>${title}</h3>
        <div class="status ${order.status}">${order.status}</div>
      </div>
      <div class="order-summary-line">
        <span class="summary-item">${summary || "No products"}</span>
        <span class="order-date">${new Date(order.$createdAt).toDateString()}</span>
      </div>
      <div class="meta">
        <span>₦${order.totalAmount || 0}</span>
      </div>
    `;

    wrap.appendChild(card);
  });
}

// ---------------------------
// INIT
// ---------------------------
initDashboard();
