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
// Trigger verification only if URL has params
if (location.search.includes("userId") && location.search.includes("secret")) {
  confirmVerification();
}
