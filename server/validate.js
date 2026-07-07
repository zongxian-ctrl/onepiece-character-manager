const FIELDS = ["name", "epithet", "crew", "devil_fruit", "bounty", "role", "image_url", "description"];

function validateCharacter(body) {
  const errors = [];
  const value = {};

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) errors.push("name is required");
  value.name = name;

  if (body.bounty === undefined || body.bounty === null || body.bounty === "") {
    value.bounty = null;
  } else {
    const n = Number(body.bounty);
    if (!Number.isSafeInteger(n) || n < 0) {
      errors.push("bounty must be a non-negative integer");
      value.bounty = null;
    } else {
      value.bounty = n;
    }
  }

  for (const f of FIELDS) {
    if (f === "name" || f === "bounty") continue;
    value[f] = typeof body[f] === "string" ? body[f].trim() : "";
  }

  return { valid: errors.length === 0, errors, value };
}

module.exports = validateCharacter;
