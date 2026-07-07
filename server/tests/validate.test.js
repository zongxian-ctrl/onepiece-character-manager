const validateCharacter = require("../validate");

describe("validateCharacter", () => {
  test("accepts a valid character and coerces bounty to a number", () => {
    const { valid, errors, value } = validateCharacter({
      name: "Nico Robin",
      bounty: "930000000"
    });
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
    expect(value.bounty).toBe(930000000);
    expect(value.name).toBe("Nico Robin");
  });

  test("rejects missing name", () => {
    const { valid, errors } = validateCharacter({ name: "  " });
    expect(valid).toBe(false);
    expect(errors).toContain("name is required");
  });

  test("rejects negative or non-integer bounty", () => {
    expect(validateCharacter({ name: "X", bounty: -5 }).valid).toBe(false);
    expect(validateCharacter({ name: "X", bounty: "abc" }).valid).toBe(false);
    expect(validateCharacter({ name: "X", bounty: 1.5 }).valid).toBe(false);
  });

  test("allows omitted bounty (null)", () => {
    const { valid, value } = validateCharacter({ name: "X" });
    expect(valid).toBe(true);
    expect(value.bounty).toBeNull();
  });
});
