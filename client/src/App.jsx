import { useEffect, useState, useCallback } from "react";
import SearchBar from "./components/SearchBar.jsx";
import CharacterList from "./components/CharacterList.jsx";
import CharacterForm from "./components/CharacterForm.jsx";
import { listCharacters, createCharacter, updateCharacter, deleteCharacter } from "./api.js";

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (term) => {
    setLoading(true);
    setError("");
    try {
      setCharacters(await listCharacters(term));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  function openNew() { setEditing(null); setShowForm(true); }
  function openEdit(c) { setEditing(c); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSubmit(body) {
    try {
      if (editing && editing.id) await updateCharacter(editing.id, body);
      else await createCharacter(body);
      closeForm();
      load(search);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try {
      await deleteCharacter(c.id);
      load(search);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>One Piece Character Manager</h1>
        <button className="add-btn" onClick={openNew}>+ Add Character</button>
      </header>

      <SearchBar value={search} onChange={setSearch} />

      {error && <p className="banner-error" role="alert">{error}</p>}
      {loading ? (
        <p className="loading">Setting sail…</p>
      ) : (
        <CharacterList characters={characters} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing && editing.id ? "Edit Character" : "New Character"}</h2>
            <CharacterForm initial={editing} onSubmit={handleSubmit} onCancel={closeForm} />
          </div>
        </div>
      )}
    </div>
  );
}
