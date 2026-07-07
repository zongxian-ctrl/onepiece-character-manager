const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='%23d8c7a1'/><text x='50%' y='52%' font-size='48' text-anchor='middle' dominant-baseline='middle' fill='%238a6d3b'>?</text></svg>";

function formatBounty(bounty) {
  if (bounty == null) return "Unknown";
  return "Ƀ " + Number(bounty).toLocaleString("en-US");
}

export default function CharacterCard({ character, onEdit, onDelete }) {
  return (
    <article className="card">
      <img
        className="card-avatar"
        src={character.image_url || PLACEHOLDER}
        alt={character.name}
        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
      />
      <h2 className="card-name">{character.name}</h2>
      {character.epithet && <p className="card-epithet">"{character.epithet}"</p>}
      {character.crew && <p className="card-crew">{character.crew}</p>}
      <p className="card-bounty">{formatBounty(character.bounty)}</p>
      <div className="card-actions">
        <button onClick={() => onEdit(character)}>Edit</button>
        <button onClick={() => onDelete(character)}>Delete</button>
      </div>
    </article>
  );
}
