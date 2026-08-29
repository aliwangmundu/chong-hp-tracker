import { describe, expect, it } from "vitest";
import { MAX_COUNT, parseCommand, summarize } from "./command";

const specs = (input: string) => {
  const [line] = parseCommand(input);
  if (line === undefined || !line.ok) {
    throw new Error(`expected success for "${input}"`);
  }
  return line.specs;
};

const failure = (input: string): string => {
  const [line] = parseCommand(input);
  if (line === undefined || line.ok) {
    throw new Error(`expected failure for "${input}"`);
  }
  return line.error;
};

describe("names", () => {
  it("takes everything before the first modifier as the name", () => {
    expect(specs("Goblin Archer 7")[0]?.name).toBe("Goblin Archer");
  });

  it("does not number a single record", () => {
    expect(specs("Goblin 7").map((s) => s.name)).toEqual(["Goblin"]);
  });

  it("numbers a repeated one", () => {
    expect(specs("Goblin x3 7").map((s) => s.name)).toEqual([
      "Goblin 1",
      "Goblin 2",
      "Goblin 3",
    ]);
  });

  it("does not mistake a name starting with x for a count", () => {
    expect(specs("Xorn 40")[0]?.name).toBe("Xorn");
  });

  it("rejects a line with no name", () => {
    expect(failure("42")).toMatch(/needs a name/);
  });
});

describe("hit points", () => {
  it("reads a bare number as current HP only", () => {
    // Setting max to match would look helpful and then quietly stop a
    // half-health character from healing.
    const [spec] = specs("Aria 22");
    expect(spec?.hp).toBe(22);
    expect(spec?.maxHp).toBe(0);
  });

  it("reads hp/max", () => {
    const [spec] = specs("Boss 40/120");
    expect(spec?.hp).toBe(40);
    expect(spec?.maxHp).toBe(120);
  });
});

describe("armour class", () => {
  it("accepts ac:15", () => {
    expect(specs("Orc ac:15")[0]?.ac).toBe("15");
  });

  it("accepts ac=15", () => {
    expect(specs("Orc ac=15")[0]?.ac).toBe("15");
  });

  it("accepts ac 15 as two words", () => {
    expect(specs("Orc ac 15")[0]?.ac).toBe("15");
  });

  it("keeps letters, since AC is free text", () => {
    expect(specs("Orc ac M")[0]?.ac).toBe("M");
  });

  it("rejects a trailing ac with nothing after it", () => {
    expect(failure("Orc ac")).toMatch(/ac needs a value/);
  });
});

describe("groups", () => {
  it("reads #group", () => {
    expect(specs("Goblin 7 #wave1")[0]?.group).toBe("wave1");
  });

  it("defaults to no group", () => {
    expect(specs("Goblin 7")[0]?.group).toBe(null);
  });
});

describe("order and limits", () => {
  it("does not care about modifier order", () => {
    const a = specs("Goblin x2 7/7 ac 15 #w")[0];
    const b = specs("Goblin #w ac 15 x2 7/7")[0];
    expect(a).toEqual(b);
  });

  it("caps the repeat count", () => {
    expect(specs(`Goblin x999 1`)).toHaveLength(MAX_COUNT);
  });

  it("rejects a stray word after a modifier", () => {
    expect(failure("Goblin 7 banana")).toMatch(/unexpected "banana"/);
  });
});

describe("multiple lines", () => {
  it("parses one record per line", () => {
    const parsed = parseCommand("Goblin x2 7\nAria 22\n\nBoss 120/120");
    expect(parsed).toHaveLength(3);
    expect(summarize(parsed).records).toBe(4);
  });

  it("skips comment lines", () => {
    expect(parseCommand("// the ambush\nGoblin 7")).toHaveLength(1);
  });

  it("keeps good lines when one is bad", () => {
    const summary = summarize(parseCommand("Goblin 7\n42\nAria 22"));
    expect(summary.records).toBe(2);
    expect(summary.errors).toHaveLength(1);
  });

  it("collects the groups it will need", () => {
    const summary = summarize(parseCommand("A 1 #w1\nB 2 #w1\nC 3 #w2"));
    expect(summary.groups.sort()).toEqual(["w1", "w2"]);
  });
});
