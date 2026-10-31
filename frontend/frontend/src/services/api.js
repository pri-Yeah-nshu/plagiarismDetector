const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "clearcopy_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    // An expired or revoked session: drop it and let the app send the user to the landing page.
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event("auth:expired"));
    }
    throw new Error(body.message || "Something went wrong");
  }

  return body;
}

const jsonBody = (payload) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

/* ---------------------------------- auth ---------------------------------- */

// role: "student" | "teacher"   mode: "login" | "signup"
export async function authenticate(role, mode, payload) {
  const body = await request(`/auth/${role}/${mode}`, jsonBody(payload));
  return body.data; // { token, user }
}

export async function getMe() {
  const body = await request("/auth/me");
  return body.data.user;
}

/* ------------------------------- assignments ------------------------------ */

export async function getAssignments() {
  const body = await request("/assignments");
  return body.data?.assignments || [];
}

export async function createAssignment({ title, description, file }) {
  const form = new FormData();
  form.append("title", title);
  form.append("description", description);
  form.append("sourceFile", file);

  const body = await request("/assignments", { method: "POST", body: form });
  return body.data.assignment;
}

export async function getAssignment(id) {
  const body = await request(`/assignments/${id}`);
  return body.data.assignment;
}

/* ---------------------------- student submissions -------------------------- */

export async function submitAssignment({ assignmentId, file }) {
  const form = new FormData();
  form.append("studentFile", file);

  const body = await request(`/plagiarism/check/${assignmentId}`, {
    method: "POST",
    body: form,
  });
  return body.data.submission;
}

export async function getMySubmissions() {
  const body = await request("/plagiarism/my");
  return body.data?.submissions || [];
}

/* ------------------------------ teacher reports ---------------------------- */

export async function getReports(assignmentId) {
  const body = await request(`/plagiarism/assignment/${assignmentId}`);
  return body.data?.reports || [];
}

export async function getReport(reportId) {
  const body = await request(`/plagiarism/reports/${reportId}`);
  return body.data.report;
}

export async function getDuplicateGroups(assignmentId) {
  const body = await request(`/plagiarism/assignment/${assignmentId}/duplicates`);
  return body.data;
}
