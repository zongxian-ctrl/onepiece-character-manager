import { useEffect, useState, useCallback } from "react";
import SearchBar from "./components/SearchBar.jsx";
import CharacterList from "./components/CharacterList.jsx";
import CharacterForm from "./components/CharacterForm.jsx";
import PlayerHUD from "./components/PlayerHUD.jsx";
import ShopModal from "./components/ShopModal.jsx";
import {
  listCharacters, createCharacter, updateCharacter, deleteCharacter,
  getPlayer, getShop, buyItem, attackCharacter, resetBattle,
} from "./api.js";

function formatBerries(n) {
  return "Ƀ " + Number(n).toLocaleString("en-US");
}

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [player, setPlayer] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [shopError, setShopError] = useState("");
  const [fx, setFx] = useState(null); // last attack's damage numbers, keyed by ts
  const [ledger, setLedger] = useState("Pick a target and press Attack.");

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

  useEffect(() => {
    getPlayer().then(setPlayer).catch((e) => setError(e.message));
  }, []);

  function openNew() { setEditing(null); setShowForm(true); }
  function openEdit(c) { setEditing(c); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSubmit(body) {
    // Let errors propagate so CharacterForm can surface them inside the modal
    // (a banner here would render hidden behind the modal backdrop).
    if (editing && editing.id) await updateCharacter(editing.id, body);
    else await createCharacter(body);
    closeForm();
    load(search);
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

  async function handleAttack(c) {
    try {
      const { player: p, character, events } = await attackCharacter(c.id);
      setPlayer(p);
      setCharacters((cs) => cs.map((x) => (x.id === character.id ? character : x)));
      setFx({ id: character.id, ...events, ts: Date.now() });
      if (events.captured) {
        setLedger(`${character.name} captured — bounty claimed: ${formatBerries(events.bountyAwarded)}.`);
      } else if (events.playerDefeated) {
        setLedger(`You went down. The ship's doctor charged ${formatBerries(events.medicalFees)} to patch you up.`);
      } else {
        setLedger(`You hit ${character.name} for ${events.characterDamage}; they hit back for ${events.playerDamage}.`);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function openShop() {
    setShopError("");
    try {
      setCatalog(await getShop());
      setShopOpen(true);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleBuy(itemId) {
    setShopError("");
    try {
      const { player: p, purchased } = await buyItem(itemId);
      setPlayer(p);
      setCatalog(await getShop());
      setLedger(`Bought ${purchased.name} — ${purchased.effect}.`);
    } catch (e) {
      setShopError(e.message);
    }
  }

  async function handleReset() {
    if (!window.confirm("Start a new voyage? Every character returns to full health.")) return;
    try {
      await resetBattle();
      load(search);
      setLedger("Fresh bounties posted. Every target is back at full strength.");
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

      <PlayerHUD player={player} fx={fx} onOpenShop={openShop} onReset={handleReset} />
      <p className="ledger-line" role="status">{ledger}</p>

      <SearchBar value={search} onChange={setSearch} />

      {error && <p className="banner-error" role="alert">{error}</p>}
      {loading ? (
        <p className="loading">Setting sail…</p>
      ) : (
        <CharacterList
          characters={characters}
          fx={fx}
          onAttack={handleAttack}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing && editing.id ? "Edit Character" : "New Character"}</h2>
            <CharacterForm initial={editing} onSubmit={handleSubmit} onCancel={closeForm} />
          </div>
        </div>
      )}

      {shopOpen && player && (
        <ShopModal
          catalog={catalog}
          player={player}
          error={shopError}
          onBuy={handleBuy}
          onClose={() => setShopOpen(false)}
        />
      )}
    </div>
  );
}
