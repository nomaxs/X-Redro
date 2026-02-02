/* ========================
APPWRITE SETUP
========================= */
const DB_ID = "695c4fce0039f513dc83";
const SUBS = "subscriptions";
const PAYMENTS = "payments";

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
    const status = params.get("status");
    const reference = params.get("reference");

    if (status !== "success") {
      throw new Error("Payment not successful");
    }

    const pending = JSON.parse(localStorage.getItem("pendingSubscription"));
    if (!pending) {
      throw new Error("No pending subscription found");
    }

    const user = await account.get();

    if (user.$id !== pending.userId) {
      throw new Error("User mismatch");
    }

    /* =========================
    CHECK EXISTING SUBSCRIPTION
    ========================= */
    const subRes = await databases.listDocuments(DB_ID, SUBS, [
      Query.equal("userId", user.$id),
      Query.orderDesc("expiresAt"),
      Query.limit(1)
    ]);

    let startDate = new Date();
    let expiryDate = new Date();

    if (subRes.documents.length) {
      const currentSub = subRes.documents[0];
      const currentExpiry = new Date(currentSub.expiresAt);

      // If subscription is still active, extend from expiry
      if (currentExpiry > startDate) {
        expiryDate = new Date(currentExpiry);
      }
    }

    // Add new duration
    expiryDate.setDate(expiryDate.getDate() + pending.durationDays);

    /* =========================
    SAVE / UPDATE SUBSCRIPTION
    ========================= */
    await databases.createDocument(
      DB_ID,
      SUBS,
      Appwrite.ID.unique(),
      {
        userId: user.$id,
        plan: pending.plan,
        durationDays: pending.durationDays,
        $startsAt: startDate.toISOString(),
        $expiresAt: expiryDate.toISOString(),
        status: "active",
        provider: "selar",
        reference
      }
    );

    /* =========================
    RECORD PAYMENT
    ========================= */
    await databases.createDocument(
      DB_ID,
      PAYMENTS,
      Appwrite.ID.unique(),
      {
        userId: user.$id,
        amount: pending.amount,
        plan: pending.plan,
        provider: "selar",
        reference,
        status: "success",
        paidAt: new Date().toISOString()
      }
    );

    /* =========================
    CLEANUP (VERY IMPORTANT)
    ========================= */
    localStorage.removeItem("pendingSubscription");

    /* =========================
    REDIRECT
    ========================= */
    window.location.replace("dashboard.html");

  } catch (err) {
    console.error(err);
    localStorage.removeItem("pendingSubscription");
    document.body.innerHTML = "<p>Payment verification failed.</p>";
  }
})();
