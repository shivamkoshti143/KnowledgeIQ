const API = "/api";

export async function request(path, options = {}) {
  const token = localStorage.getItem("taskiq-token");
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, Authorization: token ? `Bearer ${token}` : "", ...options.headers }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Something went wrong");
  return payload;
}
