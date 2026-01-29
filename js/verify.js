async function confirmVerification() {
  try {
    let user;

    // --- Check if email/password verification link ---
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    const secret = params.get("secret");

    if (userId && secret) {
      // Email verification flow
      await account.updateVerification(userId, secret);
      // Get user after verification
      user = await account.get();
    } else {
      // Google OAuth flow or already signed in session
      try {
        user = await account.get();
      } catch {
        alert("Please log in first.");
        window.location.href = "login.html";
        return;
      }
    }

    if (!user) {
      alert("Session expired. Please log in again.");
      window.location.href = "login.html";
      return;
    }

    // --- Check if user data already exists ---
    try {
      await databases.getDocument(DB_ID, USERS, user.$id);
      // If exists, redirect immediately
      window.location.replace("dashboard.html");
      return;
    } catch {
      // Not found → first-time user, create data
      await createInitialUserData(user);
    }

    // --- Redirect after setup ---
    window.location.replace("dashboard.html");

  } catch (err) {
    console.error(err);
    alert("Verification or login failed. Please try again.");
  }
}

async function createInitialUserData(user) {
  // USER PROFILE
  await databases.createDocument(DB_ID, USERS, user.$id, {
    userId: user.$id,
    email: user.email,
    username: user.name || user.email.split("@")[0], // fallback username
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

// Trigger the flow
confirmVerification();
