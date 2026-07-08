function formatBerries(n) {
  return "Ƀ " + Number(n).toLocaleString("en-US");
}

export default function PlayerHUD({ player, fx, onOpenShop, onReset }) {
  if (!player) return null;
  const pct = Math.max(0, Math.min(100, (player.hp / player.max_hp) * 100));
  const low = pct <= 25;

  return (
    <section className="hud" aria-label="Your hunter status">
      <div className="hud-identity">
        <span className="hud-eyebrow">Bounty Hunter</span>
        <span className="hud-wallet" title="Wallet">{formatBerries(player.wallet)}</span>
      </div>

      <div className="hud-health">
        <div
          className={"hud-hp-track" + (low ? " is-low" : "")}
          role="meter"
          aria-label="Your health"
          aria-valuemin={0}
          aria-valuemax={player.max_hp}
          aria-valuenow={player.hp}
        >
          <div className="hud-hp-fill" style={{ width: `${pct}%` }} />
          <span className="hud-hp-num">{player.hp} / {player.max_hp}</span>
        </div>
        {fx && fx.playerDamage > 0 && (
          <span key={fx.ts} className="dmg-float dmg-float-hud">−{fx.playerDamage}</span>
        )}
      </div>

      <div className="hud-stats">
        <span className="hud-stat" title="Attack">ATK {player.attack}</span>
        <span className="hud-stat" title="Defense">DEF {player.defense}</span>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn-shop" onClick={onOpenShop}>Trading Post</button>
        <button
          className="hud-btn"
          onClick={onReset}
          title="Restore every character to full health so their bounties can be hunted again"
        >
          New Voyage
        </button>
      </div>
    </section>
  );
}
