const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23d8c7a1'/><text x='50%' y='52%' font-size='48' text-anchor='middle' dominant-baseline='middle' fill='%238a6d3b'>?</text></svg>";

function formatBounty(bounty) {
  if (bounty == null) return "Unknown";
  return "Ƀ " + Number(bounty).toLocaleString("en-US");
}

// Seeded images use root-relative paths ("/characters/x.jpg"). On GitHub Pages
// the app is served from a subpath, so prefix those with Vite's BASE_URL.
// Absolute (http) URLs and empty values pass through unchanged.
function resolveSrc(url) {
  if (!url) return PLACEHOLDER;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) {
    return import.meta.env.BASE_URL.replace(/\/$/, "") + url;
  }
  return url;
}

export default function CharacterCard({ character, fx, onAttack, onEdit, onDelete }) {
  const captured = character.max_hp != null && character.hp <= 0;
  const pct =
    character.max_hp > 0
      ? Math.max(0, Math.min(100, (character.hp / character.max_hp) * 100))
      : 0;
  const hit = fx && fx.id === character.id;

  return (
    <article className={"card" + (captured ? " captured" : "") + (hit ? " is-hit" : "")}>
      {captured && <span className="stamp" aria-label="Captured">Captured</span>}
      {hit && fx.characterDamage > 0 && (
        <span key={fx.ts} className="dmg-float">−{fx.characterDamage}</span>
      )}
      <img
        className="card-avatar"
        src={resolveSrc(character.image_url)}
        alt={character.name}
        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
      />
      <h2 className="card-name">{character.name}</h2>
      {character.epithet && <p className="card-epithet">"{character.epithet}"</p>}
      {character.crew && <p className="card-crew">{character.crew}</p>}

      {character.max_hp != null && (
        <>
          <div
            className="hp-track"
            role="meter"
            aria-label={`${character.name} health`}
            aria-valuemin={0}
            aria-valuemax={character.max_hp}
            aria-valuenow={character.hp}
          >
            <div className="hp-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="card-stats">
            HP {character.hp}/{character.max_hp} · ATK {character.attack} · DEF {character.defense}
          </p>
        </>
      )}

      <p className="card-bounty">
        {captured ? <span className="bounty-claimed">Bounty claimed</span> : formatBounty(character.bounty)}
      </p>
      <div className="card-actions">
        {!captured && (
          <button className="attack-btn" onClick={() => onAttack(character)}>Attack</button>
        )}
        <button onClick={() => onEdit(character)}>Edit</button>
        <button onClick={() => onDelete(character)}>Delete</button>
      </div>
    </article>
  );
}
