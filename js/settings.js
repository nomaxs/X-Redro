const client = new Appwrite.Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('695981480033c7a4eb0d');

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);
const Query = Appwrite.Query;

const DB_ID = "695c4fce0039f513dc83";
const USERS = "695c501b001d24549b03";
const SUBS = "subscriptions";

let profileDocId = null;
let user;
let res;

async function requireAuth() {
  try {
    return await account.get();
  } catch {
    window.location.href = "login.html";
  }
}

async function loadUser() {
  user = await requireAuth();

  res = await databases.listDocuments(
    DB_ID,
    USERS,
    [
      Query.equal("userId", user.$id),
      Query.orderDesc("$createdAt"),
      Query.limit(1)
    ]
  );

  if (!res.documents.length) return;

  const profile = res.documents[0];
  profileDocId = profile.$id;

  username.value = profile.username || "";
  email.value = profile.email || user.email || "";
     
  //Theme Application    
  profileDocId = res.documents[0].$id;

  const savedTheme = res.documents[0].theme || "light";
  applyTheme(savedTheme);
  
  //Quick Subscription Check
  const subRes = await databases.listDocuments(DB_ID, SUBS, [
    Query.equal("userId", user.$id)
  ]);

  const sub = subRes.documents[0];
  const daysLeft = Math.ceil(
    (new Date(sub.expiresAt) - new Date()) / 86400000
  );

  if (daysLeft <= 0) {
    document.getElementById("subscriptionModal").classList.remove("hidden");
    return;
  }
}

document.getElementById("updateAccount").onclick = async () => {
  const nameVal = username.value.trim();

  await account.updateName(nameVal);

  await databases.updateDocument(DB_ID, USERS, profileDocId, {
    username: nameVal
  });

  alert("Updated");
};

document.getElementById("userUpdate").onclick = () => {
  document.getElementById("username").disabled = false;
  document.getElementById("email").disabled = false;
};

function buySubscription(days) {
  window.location.href =
    days === 7
      ? "https://selar.co/7days"
      : "https://selar.co/30days";
}

async function logout() {
  await account.deleteSession("current");
  window.location.href = "/login.html";
}

function openDeleteModal() {
  document.getElementById("deleteModal").classList.remove("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

async function deleteAccount() {
  await account.delete();
  window.location.href = "/signup.html";
}

function openPasswordModal() {
  document.getElementById("passwordModal").classList.remove("hidden");
}

function closePasswordModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById("passwordModal").classList.add("hidden");
}

async function changePassword() {
  const current = document.getElementById("currentPassword").value.trim();
  const next = document.getElementById("newPassword").value.trim();

  if (!current || !next) {
    alert("Please fill all fields");
    return;
  }

  if (next.length < 8) {
    alert("New password must be at least 8 characters");
    return;
  }

  if (current === next) {
    alert("New password must be different from current password");
    return;
  }

  try {
    await account.updatePassword(next, current);

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";

    closePasswordModal();
    alert("Password updated successfully");
  } catch (err) {
    console.error(err);

    if (err.code === 401) {
      alert("Current password is incorrect");
    } else {
      alert(err.message || "Password update failed");
    }
  }
}

loadUser();
