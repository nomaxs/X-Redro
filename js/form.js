const client = new Appwrite.Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('695981480033c7a4eb0d');

const databases = new Appwrite.Databases(client);

const DB_ID = "695c4fce0039f513dc83";
const FORMS = "form";
const ORDERS = "orders";
const PRODUCT_IMAGES_BUCKET = "696825350032fe17c1eb";

let fields = [];
let formTitle = "";
let formSubtitle = "";

/* ---------------- INIT ---------------- */

let CURRENT_FORM_ID = "";
let FORM_OWNER_ID = "";

async function initForm() {
  const params = new URLSearchParams(window.location.search);
  const fid = params.get("fid");

  if (!fid) {
    alert("Invalid form link");
    return;
  }

  try {
    const doc = await databases.getDocument(DB_ID, FORMS, fid);

    formTitle = doc.title || "";
    formSubtitle = doc.subtitle || "";

    fields = doc.fields.map(f =>
      typeof f === "string" ? JSON.parse(f) : f
    );

    CURRENT_FORM_ID = fid;
    FORM_OWNER_ID = doc.userId || "";

    renderForm();
  } catch (err) {
    console.error("INIT ERROR:", err);
    alert(err.message || "Form not found");
  }
}

initForm();

/* ---------------- RENDER ---------------- */

function renderForm() {
  const container = document.getElementById("formRoot");

  let html = `
    <div class="preview-card">
      <h2 class="business-name">${formTitle}</h2>
      <p class="subtitle">${formSubtitle}</p>
  `;

  fields.forEach(field => {
    html += renderField(field);
  });

  html += `
      <div class="total-box">
        <div>Items <span id="itemCount">0</span></div>
        <div>Total Cost <span id="totalCost">₦0</span></div>
      </div>

      <div class="payment-proof">
        <label>Payment Proof Image</label>
        <label class="upload-proof">
          <input type="file" id="paymentProof" hidden>
          <div class="upload-ui">
            <span class="upload-icon">⬆</span>
            <span class="upload-text">Upload payment proof</span>
          </div>
        </label>
      </div>

      <button class="send-btn" onclick="submitOrder()">Send Order</button>
      <p class="powered">powered by X Redro</p>
    </div>
  `;

  container.innerHTML = html;
}

document.addEventListener("change", e => {
  if (e.target.id === "paymentProof") {
    const text = document.querySelector(".upload-text");
    if (e.target.files.length) {
      text.innerText = e.target.files[0].name;
    }
  }
});

/* ---------------- FIELD RENDERERS ---------------- */

function renderField(field) {
  let html = `<div class="form-group">`;

  if (field.label) {
    html += `<label>${field.label}</label>`;
  }

  if (field.type === "text") {
    html += `<input type="text" data-id="${field.id}">`;
  }

  if (field.type === "number") {
    html += `<input type="number" data-id="${field.id}">`;
  }

  if (field.type === "textarea") {
    html += `<textarea data-id="${field.id}"></textarea>`;
  }

  if (field.type === "dropdown") {
    html += `
      <select data-id="${field.id}">
        ${field.options.map(o => `<option value="${o}">${o}</option>`).join("")}
      </select>
    `;
  }

  if (field.type === "product") {
    html += renderProducts(field);
  }

  html += `</div>`;
  return html;
}

/* ---------------- PRODUCTS ---------------- */
function formatNaira(amount) {
  return amount.toLocaleString("en-NG");
}

function renderProducts(field) {
  let html = `<div class="product-grid">`;

  field.products.forEach((p, i) => {
    html += `
      <div class="product-card">
        <div class="product-image">
          ${p.imageUrl ? `<img src="${p.imageUrl}">` : ""}
        </div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">₦${formatNaira(Number(p.price || 0))}</div>
        <div class="product-qty">
          <button onclick="changeQty('${field.id}', ${i}, -1)">-</button>
          <span id="qty-${field.id}-${i}">0</span>
          <button onclick="changeQty('${field.id}', ${i}, 1)">+</button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

/* ---------------- PRODUCT LOGIC ---------------- */

const cart = {};

function changeQty(fieldId, index, delta) {
  const key = `${fieldId}_${index}`;
  cart[key] = Math.max(0, (cart[key] || 0) + delta);

  document.getElementById(`qty-${fieldId}-${index}`).innerText = cart[key];
  updateTotal();
}

function updateTotal() {
  let items = 0;
  let total = 0;

  fields.forEach(field => {
    if (field.type === "product") {
      field.products.forEach((p, i) => {
        const key = `${field.id}_${i}`;
        const qty = cart[key] || 0;
        items += qty;
        total += qty * Number(p.price || 0);
      });
    }
  });

  document.getElementById("itemCount").innerText = items;
  document.getElementById("totalCost").innerText = `₦${formatNaira(total)}`;
}

function buildRawFormData() {
  const data = [];

  fields.forEach(field => {
    if (field.type === "product") {
      const selected = [];

      field.products.forEach((p, i) => {
        const qty = cart[`${field.id}_${i}`] || 0;
        if (qty > 0) {
          selected.push({
            name: p.name,
            qty,
            price: Number(p.price || 0)
          });
        }
      });

      if (selected.length) {
        data.push({
          label: field.label,
          type: "product",
          value: selected
        });
      }
    } else {
      const el = document.querySelector(`[data-id="${field.id}"]`);
      if (el && el.value.trim()) {
        data.push({
          label: field.label,
          type: field.type,
          value: el.value.trim()
        });
      }
    }
  });

  return data;
}

function renderSuccessState() {
  const container = document.getElementById("formRoot");

  container.innerHTML = `
    <div class="preview-card success-state">
      <h2 class="business-name">${formTitle}</h2>

      <div class="success-icon">✓</div>

      <h3 class="success-title">Your order has been sent</h3>
      <p class="success-subtitle">
        The seller will contact you shortly.
      </p>

      <p class="powered">powered by X Redro</p>
    </div>
  `;
}


/* ---------------- VALIDATE FORM INPUTS ---------------- */
function validateFormInputs() {
  for (const field of fields) {
    if (field.type === "product") continue;

    const el = document.querySelector(`[data-id="${field.id}"]`);

    if (!el || !el.value || !el.value.trim()) {
      alert(`Please fill "${field.label || "this field"}"`);
      el?.focus();
      return false;
    }
  }

  return true;
}

/* ---------------- SUBMIT ---------------- */
async function submitOrder() {
  // ✅ validate normal inputs first
  if (!validateFormInputs()) return;

  const rawFormData = buildRawFormData();

  // ✅ validate products
  const hasProducts = rawFormData.some(f => f.type === "product");
  if (!hasProducts) {
    alert("Please select at least one product");
    return;
  }

  /* payment proof image */
  const paymentInput = document.getElementById("paymentProof");
  let paymentFileId = null;

  if (paymentInput && paymentInput.files.length > 0) {
    const file = paymentInput.files[0]; // ✅ define in the correct scope
    const storage = new Appwrite.Storage(client);

    try {
      const uploadedFile = await storage.createFile(
        PRODUCT_IMAGES_BUCKET,
        Appwrite.ID.unique(),
        file
      );

      paymentFileId = uploadedFile.$id; // save the file ID
    } catch (err) {
      console.error("Failed to upload payment proof:", err);
      alert("Failed to upload payment proof. Please try again.");
      alert(
        err.message ||
        err.response?.message ||
        JSON.stringify(err)
      );
      return; // stop order if upload fails
    }
  }

  // ✅ compute totals from raw objects
  let totalAmount = 0;
  rawFormData.forEach(f => {
    if (f.type === "product") {
      f.value.forEach(p => {
        totalAmount += p.qty * p.price;
      });
    }
  });

  // ✅ stringify ONLY for storage
  const formData = rawFormData.map(item =>
    JSON.stringify(item)
  );

  const orderPayload = {
    userId: FORM_OWNER_ID,
    formId: CURRENT_FORM_ID,
    formData,
    totalAmount,
    status: "pending",
    paymentProof: paymentFileId
  };

  try {
    const res = await databases.createDocument(
      DB_ID,
      ORDERS,
      Appwrite.ID.unique(),
      orderPayload,
      [
        Appwrite.Permission.write(Appwrite.Role.any()),
        Appwrite.Permission.read(Appwrite.Role.any())
      ]
    );

    console.log("ORDER CREATED:", res);
    renderSuccessState();

  } catch (err) {
    console.error("FAILED TO SEND ORDER:", err);
    alert(
      err.message ||
      err.response?.message ||
      JSON.stringify(err)
    );
  }
}
