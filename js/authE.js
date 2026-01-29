const client = new Appwrite.Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('695981480033c7a4eb0d');

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);

const DB_ID = "695c4fce0039f513dc83";
const USERS = "695c501b001d24549b03";
const FORMS = "form";
const SUBS = "subscriptions";


/* Toggle Password */
function togglePassword(inputId, el) {
  const input = document.getElementById(inputId);
  const img = el.querySelector('img');

  if (input.type === "password") {
    input.type = "text";
    img.src = "assets/eye-off.svg";
  } else {
    input.type = "password";
    img.src = "assets/eye.svg";
  }
  
  if (!input.value) return;
}

/* LOGIN */
async function login() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  
  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  try {
    // create new session
    await account.createEmailSession(email, password);

    const user = await account.get();

    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    alert(err.message);
  }
}

function getUsernameFromEmail(email) {
  return email.split("@")[0]
    .replace(/[^a-zA-Z0-9._]/g, "")
    .toLowerCase();
}

/* SIGNUP + AUTO SETUP */
async function signup() {
  try {
    
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();

    const username = getUsernameFromEmail(email);
    
    if (!email || !password) {
      alert("All fields are required");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    await account.create(
      Appwrite.ID.unique(),
      email,
      password,
      username
    );

    await account.createEmailSession(email, password);

    await account.createVerification(
      `${location.origin}/X-Redro/verify.html`
    );
    
    window.location.href = "verifyInfo.html";

  } catch (err) {
    alert(err.message);
  }
}
/////////////////////
  
/* GOOGLE */
function googleLogin() {
  account.createOAuth2Session(
    'google',
    `${location.origin}/X-Redro/dashboard.html`,
    `${location.origin}/X-Redro//login.html`
  );
}

async function handleGoogleLogin() {
  const user = await account.get();

  // check if user profile exists
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
    subtitle: "Welcome to Redro, place your order",
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

function openResetModal() {
  document.getElementById("resetModal").classList.remove("hidden");
}

function closeResetModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("resetModal").classList.add("hidden");
}

async function sendReset() {
  const email = document.getElementById("resetEmail").value.trim();

  if (!email) {
    alert("Please enter your email"); 
    return;
  }

  try {
    await account.createRecovery(
      email,
      `${location.origin}/reset-password.html`
    );

    alert("Password reset link sent");
    closeResetModal();
  } catch (err) {
    alert(err.message || "Failed to send email");
  }
}
