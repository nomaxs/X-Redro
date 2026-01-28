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

async function requireAuth() {
  try {
    return await account.get();
  } catch {
    window.location.href = "/login.html";
  }
}

async function handleGoogleLogin() {
  try {
    const user = await account.get();
    await createInitialUserData(user);
  } catch {}
}

async function initDashboard() {
  user = await requireAuth();
  handleGoogleLogin();

  res = await databases.listDocuments(DB_ID, USERS, [
    Query.equal("userId", user.$id)
  ]);

  const subRes = await databases.listDocuments(DB_ID, SUBS, [
    Query.equal("userId", user.$id)
  ]);
  
  //Theme Application
  profileDocId = res.documents[0].$id;

  const savedTheme = res.documents[0].theme || "light";
  applyTheme(savedTheme);
  
  //Quick Subscription Check
  const sub = subRes.documents[0];
  const daysLeft = Math.ceil(
    (new Date(sub.expiresAt) - new Date()) / 86400000
  );

  if (daysLeft <= 0) {
    document.getElementById("subscriptionModal").classList.remove("hidden");
    return;
  }

  planDays.innerText = `${sub.plan}`;
  expiresIn.innerText = `${daysLeft} days`;

  const pendingCount = await loadStats(user.$id);
  loadLatestOrders(user.$id);
  updateAttention(pendingCount);
  
  if (!res.documents.length) return;    
}

function parseFormData(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(item => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

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


function updateAttention(pendingCount) {
  const box = document.getElementById("attentionStatus");
  const text = document.getElementById("attentionText");

  if (pendingCount > 0) {
    box.classList.remove("hidden");
    text.textContent = `${pendingCount} orders awaiting payment`;
  } else {
    box.classList.remove("hidden");
    text.textContent = "✓ No pending actions";
    document.getElementById("attentionIcon").textContent = "✓";
  }
}


function updateFormStatus(isPublished, link) {
  const state = document.getElementById("formState");
  const input = document.getElementById("formLinkInput");

  if (isPublished) {
    state.textContent = "Live";
    input.value = link;
  } else {
    state.textContent = "Not published";
  }
}

function updateSystemStatus(ok = true, message = "") {
  const text = document.getElementById("systemText");
  const dot = document.querySelector(".system-status .dot");

  if (!ok) {
    dot.style.background = "#ff5252";
    text.textContent = message;
  }
}

function copyFormLink() {
  const link = `${window.location.origin}/form.html?fid=${user.$id}`;
  navigator.clipboard.writeText(link);
  alert("Form link copied");
}

async function loadLatestOrders(userId) {
  const user = await requireAuth();
  const res = await databases.listDocuments(
    DB_ID,
    ORDERS,
    [
      Query.equal("userId", user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(3)
    ]
  );

  renderOrders(res.documents);
}

function getProductSummary(rawFormData, maxItems = null) {
  const formData = parseFormData(rawFormData);
  const products = [];

  formData.forEach(f => {
    if (f.type === "product" && Array.isArray(f.value)) {
      f.value.forEach(p => {
        products.push(`${p.name} x${p.qty}`);
      });
    }
  });

  return maxItems !== null
    ? products.slice(0, maxItems).join(", ")
    : products.join(", ");
}

function getCardTitle(order) {
  const formData = parseFormData(order.formData);

  // Filter out product types first
  const nonProducts = formData.filter(f => f.type !== "product" && f.value);

  // Use first non-product label's value
  if (nonProducts.length) {
    return nonProducts[0].value;
  }

  // If no non-product values exist, fallback to second field (if exists)
  if (formData.length > 1 && formData[1].value) {
    return formData[1].value;
  }

  // Fallback default
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
        <div class="status ${order.status}"> ${order.status} </div>
      </div>

      <div class="order-summary-line">
        <span class="summary-item">
          ${summary || "No products"}
        </span>
        <span class="order-date">
          ${new Date(order.$createdAt).toDateString()}
        </span>
      </div>

      <div class="meta">
        <span>₦${order.totalAmount || 0}</span>
      </div>
    `;

    wrap.appendChild(card);
  });
}

initDashboard();
