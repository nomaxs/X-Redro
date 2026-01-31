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
    showToast("Please enter email and password", "error");  
    return;  
  }  
  
  try {  
    // clear old sessions  
    //await account.deleteSessions();  
    // If session exists, remove it  
    try {  
      await account.deleteSessions();  
    } catch (e) {}  
  
    // create new session  
    await account.createEmailSession(email, password);  
  
    const user = await account.get();  
  
    window.location.href = "dashboard.html";  
  
  } catch (err) {  
    console.error("LOGIN ERROR:", err.message);  
    showToast(err.message);  
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
  
    try {  
      await account.deleteSessions();  
    } catch (e) {}  
      
    const email = signupEmail.value.trim();  
    const password = signupPassword.value.trim();  
  
    const username = getUsernameFromEmail(email);  
      
    if (!email || !password) {  
      showToast("All fields are required");  
      return;  
    }  
  
    if (password.length < 8) {  
      showToast("Password must be at least 8 characters");  
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
    showToast(err.message);  
  }  
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
    showToast("Please enter your email");   
    return;  
  }  
  
  try {  
    await account.createRecovery(  
      email,  
      `${location.origin}/X-Redro/reset-password.html`  
    );  
  
    showToast("Password reset link sent");  
    closeResetModal();  
  } catch (err) {  
    showToast(err.message || "Failed to send email");  
  }  
}

async function resetPassword() {
  const params = new URLSearchParams(window.location.search);

  const userId = params.get("userId");
  const secret = params.get("secret");

  const password = document.getElementById("newPassword").value.trim();
  const confirm = document.getElementById("confirmPassword").value.trim();

  if (!userId || !secret) {
    showToast("Invalid or expired reset link");
    return;
  }

  if (!password || !confirm) {
    showToast("All fields are required");
    return;
  }

  if (password.length < 8) {
    showToast("Password must be at least 8 characters");
    return;
  }

  if (password !== confirm) {
    showToast("Passwords do not match");
    return;
  }

  try {
    await account.updateRecovery(
      userId,
      secret,
      password,
      confirm
    );

    showToast("Password reset successful. Please login.");
    window.location.href = "login.html";

  } catch (err) {
    console.error(err);
    showToast(err.message || "Reset failed");
  }
}
