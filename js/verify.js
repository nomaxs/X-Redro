async function confirmVerification() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const secret = params.get("secret");

  if (!userId || !secret) {
    alert("Invalid or expired verification link");
    return;
  }

  try {
    alert("Before verification");

    // ✅ Verify email (NO session required)
    await account.updateVerification(userId, secret);

    alert("Email verified");

    // ✅ Create session AFTER verification
    // Appwrite allows login now
    const user = await account.get();

    // ⚠️ If no session yet, force login
    if (!user) {
      alert("Please log in again");
      window.location.href = "login.html";
      return;
    }

    // ✅ Create user data
    await createInitialUserData(user);

    // ✅ Redirect
    window.location.replace("dashboard.html");

  } catch (err) {
    console.error(err);
    alert(err.message || "Verification failed");
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
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString()
  });

  // DEFAULT FORM
  await databases.createDocument(DB_ID, FORMS, user.$id, {
    userId: user.$id,
    title: "My Business Name",
    subtitle: "Welcome to X-Redro, place your order",
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

confirmVerification();
