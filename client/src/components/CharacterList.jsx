import CharacterCard from "./CharacterCard.jsx";

export default function CharacterList({ characters, onEdit, onDelete }) {
  if (characters.length === 0) {
    return <p className="empty">No characters found. Add the first crewmate!</p>;
  }
  return (
    <div className="card-grid">
      {characters.map((c) => (
        <CharacterCard key={c.id} character={c} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
