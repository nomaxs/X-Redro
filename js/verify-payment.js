/* ========================
APPWRITE SETUP
========================= */
const DB_ID = "695c4fce0039f513dc83";
const PAYMENTS = "payments";
const SUBS = "subscriptions";

const client = new Appwrite.Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("695981480033c7a4eb0d");

const databases = new Appwrite.Databases(client);
const account = new Appwrite.Account(client);
const Query = Appwrite.Query;

/* =========================
VERIFY FLOW
========================= */
(async function verifyPayment() {
  try {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");

    if (!reference) throw new Error("Missing reference");

    const token = localStorage.getItem("paymentToken");
    if (!token) throw new Error("Missing payment token");

    const user = await account.get();

    /* =========================
    VERIFY PAYMENT RECORD
    ========================= */
    const paymentRes = await databases.listDocuments(DB_ID, PAYMENTS, [
      Query.equal("userId", user.$id),
      Query.equal("reference", reference),
      Query.equal("token", token),
      Query.equal("status", "pending"),
      Query.limit(1)
    ]);

    if (!paymentRes.documents.length) {
      throw new Error("Invalid or already processed payment");
    }

    const payment = paymentRes.documents[0];

    /* =========================
    CALCULATE SUBSCRIPTION DATES
    ========================= */
    const now = new Date();
    let expiry = new Date();

    const subRes = await databases.listDocuments(DB_ID, SUBS, [
      Query.equal("userId", user.$id),
      Query.orderDesc("expiresAt"),
      Query.limit(1)
    ]);

    if (subRes.documents.length) {
      const currentExpiry = new Date(subRes.documents[0].expiresAt);
      if (currentExpiry > now) {
        expiry = currentExpiry;
      }
    }

    expiry.setDate(expiry.getDate() + payment.durationDays);

    /* =========================
    CREATE SUBSCRIPTION
    ========================= */
    await databases.createDocument(DB_ID, SUBS, Appwrite.ID.unique(), {
      userId: user.$id,
      plan: payment.plan,
      durationDay: payment.durationDays,
      startsAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      status: "active"
    });

    /* =========================
    MARK PAYMENT AS SUCCESS
    ========================= */
    await databases.updateDocument(
      DB_ID,
      PAYMENTS,
      payment.$id,
      {
        status: "success",
        paidAt: now.toISOString()
      }
    );

    /* =========================
    CLEANUP
    ========================= */
    localStorage.removeItem("paymentToken");

    window.location.replace("dashboard.html");

  } catch (err) {
    console.error(err);
    localStorage.removeItem("paymentToken");
    document.body.innerHTML = "<p>Payment verification failed.</p>";
  }
})();
