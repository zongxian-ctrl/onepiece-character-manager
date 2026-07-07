const BASE = "/api/characters";

async function handle(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.errors ? data.errors.join(", ") : data.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export function listCharacters(search = "") {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return fetch(`${BASE}${qs}`).then(handle);
}

export function createCharacter(body) {
  return fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(handle);
}

export function updateCharacter(id, body) {
  return fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(handle);
}

export function deleteCharacter(id) {
  return fetch(`${BASE}/${id}`, { method: "DELETE" }).then(handle);
}
