async function confirmVerification() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const secret = params.get("secret");

  if (!userId || !secret) {
    alert("Invalid or expired verification link");
    return;
  }

  try {
    // ✅ VERIFY EMAIL (CORRECT SIGNATURE)
    await account.updateVerification(userId, secret);

    // ✅ GET USER
    const user = await account.get();

    if (!user.emailVerification) {
      alert("Email verification failed");
      return;
    }

    // ✅ CREATE USER DATA (ONCE)
    await createInitialUserData(user);

    // ✅ REDIRECT
    window.location.replace("dashboard.html");

  } catch (err) {
    console.error(err);
    alert("Verification failed or expired");
  }
}

async function createInitialUserData(user) {
  // Prevent duplicates
  try {
    await databases.getDocument(DB_ID, USERS, user.$id);
    return;
  } catch {}

  // USER PROFILE
  await databases.createDocument(DB_ID, USERS, user.$id, {
    userId: user.$id,
    email: user.email,
    username: user.name || "User",
    theme: "light",
    accountStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // DEFAULT FORM
  await databases.createDocument(DB_ID, FORMS, user.$id, {
    userId: user.$id,
    title: "My Business Name",
    subtitle: "Welcome to X-Redro, place your order",
    fields: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

confirmVerification();
