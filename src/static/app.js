document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const authBtn = document.getElementById("auth-btn");
  const authUsername = document.getElementById("auth-username");
  const loginModal = document.getElementById("login-modal");
  const modalOverlay = document.getElementById("modal-overlay");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const loginCancelBtn = document.getElementById("login-cancel-btn");

  // Auth state
  let sessionToken = sessionStorage.getItem("teacherToken") || null;
  let isAuthenticated = false;

  // --- Auth helpers ---

  function authHeaders() {
    return sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {};
  }

  async function checkAuthStatus() {
    const headers = authHeaders();
    const response = await fetch("/auth/status", { headers });
    const data = await response.json();
    isAuthenticated = data.authenticated;
    updateAuthUI(data.username);
    fetchActivities();
  }

  function updateAuthUI(username) {
    if (isAuthenticated) {
      authBtn.textContent = "🔓";
      authBtn.title = `Logged in as ${username} — click to log out`;
      authUsername.textContent = username;
      authUsername.classList.remove("hidden");
      signupContainer.classList.remove("hidden");
    } else {
      authBtn.textContent = "👤";
      authBtn.title = "Teacher login";
      authUsername.classList.add("hidden");
      signupContainer.classList.add("hidden");
    }
  }

  function openLoginModal() {
    loginForm.reset();
    loginError.classList.add("hidden");
    loginModal.classList.remove("hidden");
    modalOverlay.classList.remove("hidden");
    document.getElementById("login-username").focus();
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    modalOverlay.classList.add("hidden");
  }

  async function logout() {
    await fetch("/auth/logout", { method: "POST", headers: authHeaders() });
    sessionToken = null;
    sessionStorage.removeItem("teacherToken");
    isAuthenticated = false;
    updateAuthUI(null);
    fetchActivities();
  }

  // --- Auth button click ---
  authBtn.addEventListener("click", () => {
    if (isAuthenticated) {
      logout();
    } else {
      openLoginModal();
    }
  });

  loginCancelBtn.addEventListener("click", closeLoginModal);
  modalOverlay.addEventListener("click", closeLoginModal);

  // --- Login form submission ---
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (response.ok) {
        sessionToken = data.token;
        sessionStorage.setItem("teacherToken", sessionToken);
        isAuthenticated = true;
        updateAuthUI(data.username);
        closeLoginModal();
        fetchActivities();
      } else {
        loginError.textContent = data.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Login failed. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // --- Activities ---

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      isAuthenticated
                        ? `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                        : `<li><span class="participant-email">${email}</span></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (isAuthenticated) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE", headers: authHeaders() }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST", headers: authHeaders() }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize
  checkAuthStatus();
});
