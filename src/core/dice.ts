/**
 * A dice-expression roller.
 *
 * Same shape as the HP field's evaluator — lex, shunting-yard, evaluate — with
 * one extra token type. Dice are rolled while lexing, so each `NdM` term keeps
 * the individual faces it produced and the breakdown can be shown in source
 * order without a second pass.
 */

export type Die = { value: number; sides: number };

export type Segment =
  | { kind: "dice"; label: string; dice: Die[] }
  | { kind: "plain"; text: string };

export type RollOutcome = {
  ok: true;
  expression: string;
  total: number;
  segments: Segment[];
  /** Any die landed on its highest face. */
  crit: boolean;
  /** Any die landed on 1. A d1 cannot fumble; it is always also a crit. */
  fumble: boolean;
  /** Plain-text breakdown, e.g. "1d20 (17) + 3". */
  text: string;
};

export type RollResult = RollOutcome | { ok: false; error: string };

export const MAX_DICE_PER_TERM = 100;
export const MAX_SIDES = 1000;
export const MAX_DICE_PER_ROLL = 100;

type Token =
  | { type: "number"; value: number; text: string }
  | { type: "dice"; dice: Die[]; label: string }
  | { type: "operator"; op: Operator }
  | { type: "lparen" }
  | { type: "rparen" };

type Operator = "+" | "-" | "*" | "/" | "u-";

const PRECEDENCE: Record<Operator, number> = {
  "u-": 3,
  "*": 2,
  "/": 2,
  "+": 1,
  "-": 1,
};

/** Uniform integer in [1, sides], free of the modulo bias `% sides` invites. */
function defaultRoll(sides: number): number {
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);
  return (value % sides) + 1;
}

class ParseError extends Error {}

function lex(input: string, rollDie: (sides: number) => number): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let diceRolled = 0;

  const previous = (): Token | undefined => tokens[tokens.length - 1];
  const afterValue = (): boolean => {
    const token = previous();
    return (
      token !== undefined &&
      (token.type === "number" ||
        token.type === "dice" ||
        token.type === "rparen")
    );
  };

  while (index < input.length) {
    const char = input[index] ?? "";

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9]/.test(char) || (char.toLowerCase() === "d" && !afterValue())) {
      // A leading count is optional: "d20" means "1d20".
      let digits = "";
      while (/[0-9]/.test(input[index] ?? "")) {
        digits += input[index];
        index += 1;
      }

      const next = input[index]?.toLowerCase();
      if (next === "d") {
        index += 1;
        let sidesText = "";
        while (/[0-9]/.test(input[index] ?? "")) {
          sidesText += input[index];
          index += 1;
        }
        if (sidesText === "") throw new ParseError("a die needs a size, like d20");

        const count = digits === "" ? 1 : Number.parseInt(digits, 10);
        const sides = Number.parseInt(sidesText, 10);

        if (count < 1) throw new ParseError("roll at least one die");
        if (count > MAX_DICE_PER_TERM) {
          throw new ParseError(`at most ${MAX_DICE_PER_TERM} dice at a time`);
        }
        if (sides < 1) throw new ParseError("a die needs at least one side");
        if (sides > MAX_SIDES) {
          throw new ParseError(`at most d${MAX_SIDES}`);
        }
        diceRolled += count;
        if (diceRolled > MAX_DICE_PER_ROLL) {
          throw new ParseError(`at most ${MAX_DICE_PER_ROLL} dice per roll`);
        }

        const dice: Die[] = [];
        for (let n = 0; n < count; n += 1) {
          dice.push({ value: rollDie(sides), sides });
        }
        tokens.push({ type: "dice", dice, label: `${count}d${sides}` });
        continue;
      }

      if (digits === "") throw new ParseError(`unexpected "${char}"`);
      tokens.push({
        type: "number",
        value: Number.parseInt(digits, 10),
        text: digits,
      });
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen" });
      index += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rparen" });
      index += 1;
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      const unary = char === "-" && !afterValue();
      tokens.push({ type: "operator", op: unary ? "u-" : char });
      index += 1;
      continue;
    }

    throw new ParseError(`"${char}" is not something I can roll`);
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const token of tokens) {
    if (token.type === "number" || token.type === "dice") {
      output.push(token);
      continue;
    }
    if (token.type === "operator") {
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top === undefined || top.type !== "operator") break;
        // Unary minus is right-associative; everything else binds left.
        const higher =
          token.op === "u-"
            ? PRECEDENCE[top.op] > PRECEDENCE[token.op]
            : PRECEDENCE[top.op] >= PRECEDENCE[token.op];
        if (!higher) break;
        output.push(stack.pop() as Token);
      }
      stack.push(token);
      continue;
    }
    if (token.type === "lparen") {
      stack.push(token);
      continue;
    }

    let matched = false;
    while (stack.length > 0) {
      const top = stack.pop() as Token;
      if (top.type === "lparen") {
        matched = true;
        break;
      }
      output.push(top);
    }
    if (!matched) throw new ParseError("unbalanced brackets");
  }

  while (stack.length > 0) {
    const top = stack.pop() as Token;
    if (top.type === "lparen") throw new ParseError("unbalanced brackets");
    output.push(top);
  }

  return output;
}

function evaluate(rpn: Token[]): number {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }
    if (token.type === "dice") {
      stack.push(token.dice.reduce((sum, die) => sum + die.value, 0));
      continue;
    }
    if (token.type !== "operator") continue;

    if (token.op === "u-") {
      const operand = stack.pop();
      if (operand === undefined) throw new ParseError("that is not finished");
      stack.push(-operand);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      throw new ParseError("that is not finished");
    }

    switch (token.op) {
      case "+":
        stack.push(left + right);
        break;
      case "-":
        stack.push(left - right);
        break;
      case "*":
        stack.push(left * right);
        break;
      case "/":
        if (right === 0) throw new ParseError("cannot divide by zero");
        stack.push(left / right);
        break;
    }
  }

  const result = stack.pop();
  if (result === undefined || stack.length > 0) {
    throw new ParseError("that is not finished");
  }
  if (!Number.isFinite(result)) throw new ParseError("that does not add up");
  return result;
}

function toSegments(tokens: Token[]): Segment[] {
  return tokens.map((token): Segment => {
    switch (token.type) {
      case "dice":
        return { kind: "dice", label: token.label, dice: token.dice };
      case "number":
        return { kind: "plain", text: token.text };
      case "lparen":
        return { kind: "plain", text: "(" };
      case "rparen":
        return { kind: "plain", text: ")" };
      case "operator":
        return { kind: "plain", text: token.op === "u-" ? "-" : token.op };
    }
  });
}

export function segmentText(segment: Segment): string {
  if (segment.kind === "plain") return segment.text;
  const faces = segment.dice.map((die) => die.value).join(", ");
  return `${segment.label} (${faces})`;
}

/** Trims the float that division can introduce without hiding it. */
export function formatTotal(total: number): string {
  return Number.isInteger(total) ? String(total) : total.toFixed(2);
}

export function rollExpression(
  input: string,
  rollDie: (sides: number) => number = defaultRoll,
): RollResult {
  const expression = input.trim();
  if (expression === "") return { ok: false, error: "nothing to roll" };

  try {
    const tokens = lex(expression, rollDie);
    if (tokens.length === 0) return { ok: false, error: "nothing to roll" };

    const total = evaluate(toRpn(tokens));
    const segments = toSegments(tokens);
    const dice = tokens.flatMap((token) =>
      token.type === "dice" ? token.dice : [],
    );

    return {
      ok: true,
      expression,
      total,
      segments,
      crit: dice.some((die) => die.value === die.sides),
      fumble: dice.some((die) => die.value === 1 && die.sides > 1),
      text: segments.map(segmentText).join(" "),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ParseError ? error.message : "I cannot roll that",
    };
  }
}
