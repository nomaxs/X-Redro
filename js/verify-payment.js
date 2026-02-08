/* ========================
   APPWRITE SETUP
========================= */
const DB_ID = "695c4fce0039f513dc83";
const PAYMENTS = "payments";
const SUBS = "subscriptions";

const client = new Appwrite.Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("695981480033c7a4eb0d");

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);
const Query = Appwrite.Query;

/* =========================
   VERIFY PAYMENT FLOW
========================= */
(async function verifyPayment() {
  try {
    /* -------------------------
       BASIC CHECKS
    -------------------------- */
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");

    if (!reference) throw new Error("Missing payment reference");

    const token = localStorage.getItem("paymentToken");
    if (!token) throw new Error("Missing local payment token");

    const user = await account.get();
    if (!user) throw new Error("User not authenticated");

    /* -------------------------
       FETCH PAYMENT RECORD
       (reference === payment.$id)
    -------------------------- */
    const payment = await databases.getDocument(
      DB_ID,
      PAYMENTS,
      reference
    );

    /* -------------------------
       PAYMENT VALIDATION
    -------------------------- */
    if (payment.userId !== user.$id)
      throw new Error("Payment does not belong to user");

    if (payment.token !== token)
      throw new Error("Invalid payment token");

    if (payment.status !== "pending")
      throw new Error("Payment already processed");

    if (payment.used === true)
      throw new Error("Payment already used");

    const now = new Date();

    if (payment.expiresAt && new Date(payment.expiresAt) < now)
      throw new Error("Payment token expired");

    /* -------------------------
       CALCULATE SUBSCRIPTION DATES
    -------------------------- */
    let startsAt = now;
    let expiresAt = new Date(now);

    // Fetch latest subscription (if any)
    const subRes = await databases.listDocuments(DB_ID, SUBS, [
      Query.equal("userId", user.$id),
      Query.orderDesc("expiresAt"),
      Query.limit(1)
    ]);

    if (subRes.documents.length) {
      const lastSub = subRes.documents[0];
      const lastExpiry = new Date(lastSub.expiresAt);

      // Stack subscription if still active
      if (lastExpiry > now) {
        startsAt = lastExpiry;
        expiresAt = new Date(lastExpiry);
      }
    }

    expiresAt.setDate(expiresAt.getDate() + payment.durationDay);

    /* -------------------------
       CREATE SUBSCRIPTION
    -------------------------- */
    await databases.createDocument(
      DB_ID,
      SUBS,
      Appwrite.ID.unique(),
      {
        userId: user.$id,
        plan: payment.plan,
        durationDay: payment.durationDay,
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: "active"
      }
    );

    /* -------------------------
       UPDATE PAYMENT RECORD
    -------------------------- */
    await databases.updateDocument(
      DB_ID,
      PAYMENTS,
      payment.$id,
      {
        status: "success",
        used: true
      }
    );

    /* -------------------------
       CLEANUP & REDIRECT
    -------------------------- */
    localStorage.removeItem("paymentToken");
    window.location.replace("dashboard.html");

  } catch (err) {
    console.error("Payment verification failed:", err.message);

    localStorage.removeItem("paymentToken");

    const head2 = document.getElementById("heading");
    const label = document.getElementById("labeling");
  
    head2.innerHTML = `Payment verification failed`;
    label.innerHTML = `${err.message}<a href="dashboard.html">Return to dashboard</a>`;
    /*document.body.innerHTML = `
      <h3>Payment verification failed</h3>
      <p>${err.message}</p>
      <a href="dashboard.html">Return to dashboard</a>
    `;*/
  }
})();
