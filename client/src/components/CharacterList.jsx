import CharacterCard from "./CharacterCard.jsx";

export default function CharacterList({ characters, fx, onAttack, onEdit, onDelete }) {
  if (characters.length === 0) {
    return <p className="empty">No characters found. Add the first crewmate!</p>;
  }
  return (
    <div className="card-grid">
      {characters.map((c) => (
        <CharacterCard
          key={c.id}
          character={c}
          fx={fx}
          onAttack={onAttack}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
