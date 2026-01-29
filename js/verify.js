const client = new Appwrite.Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('695981480033c7a4eb0d');

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

const DB_ID = "695c4fce0039f513dc83";
const USERS = "695c501b001d24549b03";
const FORMS = "form";
const SUBS = "subscriptions";
const ORDERS = "orders";


async function confirmVerification() {
  const params = new URLSearchParams(location.search);
  const userId = params.get("userId");
  const secret = params.get("secret");

  if (!userId || !secret) {
    alert("Invalid verification link");
    return;
  }

  try {
    await account.updateVerification(userId, secret);

    const user = await account.get();

    // CREATE USER DATA NOW
    await createInitialUserData(user);

    window.location.href = "dashboard.html";

  } catch (err) {
    alert("Verification failed or expired");
  }
}

async function createInitialUserData(user) {
  // prevent duplicates
  try {
    await databases.getDocument(DB_ID, USERS, user.$id);
    return;
  } catch {}

  await databases.createDocument(DB_ID, USERS, user.$id, {
    userId: user.$id,
    email: user.email,
    username: user.name || "User",
    theme: "light",
    trialUsed: "false",
    accountStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await databases.createDocument(DB_ID, FORMS, user.$id, {
    userId: user.$id,
    title: "My Business Name",
    subtitle: "Welcome to X-Redro, place your order",
    fields: [],
    isActive: "true"
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  await databases.createDocument(DB_ID, SUBS, Appwrite.ID.unique(), {
    userId: user.$id,
    plan: "trial",
    durationDay: 7,
    startsAt: new Date().toISOString(),
    expiresAt: expiry.toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

confirmVerification();
