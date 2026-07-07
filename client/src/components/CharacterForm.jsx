import { useState } from "react";

const EMPTY = {
  name: "", epithet: "", crew: "", devil_fruit: "",
  bounty: "", role: "", image_url: "", description: ""
};

export default function CharacterForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}), bounty: initial?.bounty ?? "" });
  const [error, setError] = useState("");

  function update(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (form.bounty !== "" && (!/^\d+$/.test(String(form.bounty)))) {
      setError("Bounty must be a non-negative whole number.");
      return;
    }
    setError("");
    onSubmit({ ...form, bounty: form.bounty === "" ? null : Number(form.bounty) });
  }

  return (
    <form className="character-form" onSubmit={submit}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label>Name*<input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
      <label>Epithet<input value={form.epithet} onChange={(e) => update("epithet", e.target.value)} /></label>
      <label>Crew<input value={form.crew} onChange={(e) => update("crew", e.target.value)} /></label>
      <label>Devil Fruit<input value={form.devil_fruit} onChange={(e) => update("devil_fruit", e.target.value)} /></label>
      <label>Bounty<input value={form.bounty} onChange={(e) => update("bounty", e.target.value)} inputMode="numeric" /></label>
      <label>Role<input value={form.role} onChange={(e) => update("role", e.target.value)} /></label>
      <label>Image URL<input value={form.image_url} onChange={(e) => update("image_url", e.target.value)} /></label>
      <label>Description<textarea value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
      <div className="form-actions">
        <button type="submit">Save changes</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
