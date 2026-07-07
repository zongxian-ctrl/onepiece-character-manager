export default function SearchBar({ value, onChange }) {
  return (
    <input
      type="search"
      className="search-bar"
      placeholder="Search by name or crew…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search characters"
    />
  );
}
