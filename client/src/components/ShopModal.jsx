function formatBerries(n) {
  return "Ƀ " + Number(n).toLocaleString("en-US");
}

export default function ShopModal({ catalog, player, error, onBuy, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal shop" onClick={(e) => e.stopPropagation()}>
        <h2>Trading Post</h2>
        <p className="shop-wallet">Wallet: {formatBerries(player.wallet)}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <ul className="shop-list">
          {catalog.map((item) => {
            const affordable = item.available && player.wallet >= item.price;
            return (
              <li key={item.id} className="shop-item">
                <div className="shop-item-info">
                  <span className="shop-item-name">{item.name}</span>
                  <span className="shop-item-effect">{item.effect}</span>
                </div>
                <div className="shop-item-buy">
                  <span className="shop-item-price">
                    {item.available ? formatBerries(item.price) : "—"}
                  </span>
                  <button
                    onClick={() => onBuy(item.id)}
                    disabled={!affordable}
                    title={
                      !item.available
                        ? "Sold out"
                        : !affordable
                          ? "Not enough berries"
                          : `Buy ${item.name}`
                    }
                  >
                    Buy
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="form-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
