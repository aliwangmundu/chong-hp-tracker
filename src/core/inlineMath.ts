/**
 * The inline-math field.
 *
 * A stat input shows its current value; you click in and keep typing:
 *
 *   27 → "-25"        → 2      (leading operator means "apply to current")
 *   27 → "-25 + 8"    → 10
 *   27 → "40"         → 40     (no leading operator means "set to")
 *   27 → "40 - 5"     → 35
 *   27 → "*2"         → 54
 *
 * Parsing is a tokenizer plus shunting-yard, never `eval` — the input is user
 * text that also gets shared through scene metadata.
 */

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

type NumberToken = { kind: "number"; value: number };
type OperatorToken = { kind: "operator"; value: Operator };
type ParenToken = { kind: "paren"; value: "(" | ")" };
type Token = NumberToken | OperatorToken | ParenToken;

type Operator = "+" | "-" | "*" | "/" | "u-" | "u+";

const PRECEDENCE: Record<Operator, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "u+": 3,
  "u-": 3,
};

const RIGHT_ASSOCIATIVE = new Set<Operator>(["u+", "u-"]);

const isBinary = (op: Operator): boolean => op !== "u+" && op !== "u-";

function tokenize(input: string): Token[] | { error: string } {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i] as string;

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j] as string)) j += 1;
      const slice = input.slice(i, j);
      const value = Number.parseFloat(slice);
      if (!Number.isFinite(value)) return { error: `bad number "${slice}"` };
      tokens.push({ kind: "number", value });
      i = j;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      i += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      // Unary if nothing usable precedes it: start, an operator, or "(".
      const previous = tokens[tokens.length - 1];
      const unary =
        previous === undefined ||
        previous.kind === "operator" ||
        (previous.kind === "paren" && previous.value === "(");

      if (unary && (char === "+" || char === "-")) {
        tokens.push({ kind: "operator", value: char === "-" ? "u-" : "u+" });
      } else if (unary) {
        return { error: `"${char}" needs a number before it` };
      } else {
        tokens.push({ kind: "operator", value: char });
      }
      i += 1;
      continue;
    }

    return { error: `unexpected "${char}"` };
  }

  return tokens;
}

/** Shunting-yard: infix tokens to reverse Polish notation. */
function toRpn(tokens: Token[]): Token[] | { error: string } {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const token of tokens) {
    if (token.kind === "number") {
      output.push(token);
      continue;
    }

    if (token.kind === "operator") {
      while (stack.length > 0) {
        const top = stack[stack.length - 1] as Token;
        if (top.kind !== "operator") break;

        const higher = PRECEDENCE[top.value] > PRECEDENCE[token.value];
        const equalAndLeft =
          PRECEDENCE[top.value] === PRECEDENCE[token.value] &&
          !RIGHT_ASSOCIATIVE.has(token.value);
        if (!higher && !equalAndLeft) break;

        output.push(stack.pop() as Token);
      }
      stack.push(token);
      continue;
    }

    if (token.value === "(") {
      stack.push(token);
      continue;
    }

    let matched = false;
    while (stack.length > 0) {
      const top = stack.pop() as Token;
      if (top.kind === "paren" && top.value === "(") {
        matched = true;
        break;
      }
      output.push(top);
    }
    if (!matched) return { error: "unbalanced )" };
  }

  while (stack.length > 0) {
    const top = stack.pop() as Token;
    if (top.kind === "paren") return { error: "unbalanced (" };
    output.push(top);
  }

  return output;
}

function evaluateRpn(rpn: Token[]): EvalResult {
  const stack: number[] = [];

  for (const token of rpn) {
    if (token.kind === "number") {
      stack.push(token.value);
      continue;
    }
    if (token.kind === "paren") return { ok: false, error: "unbalanced ()" };

    if (!isBinary(token.value)) {
      const operand = stack.pop();
      if (operand === undefined) return { ok: false, error: "incomplete" };
      stack.push(token.value === "u-" ? -operand : operand);
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (right === undefined || left === undefined) {
      return { ok: false, error: "incomplete" };
    }

    switch (token.value) {
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
        if (right === 0) return { ok: false, error: "divide by zero" };
        stack.push(left / right);
        break;
    }
  }

  if (stack.length !== 1) return { ok: false, error: "incomplete" };

  const result = stack[0] as number;
  if (!Number.isFinite(result)) return { ok: false, error: "not a number" };

  // Truncate toward zero so "-7/2" reads as -3, matching how tables round.
  return { ok: true, value: Math.trunc(result) };
}

/** True when the expression should be applied relative to the current value. */
function startsWithOperator(input: string): boolean {
  return /^\s*[+\-*/]/.test(input);
}

/**
 * Evaluates what the user typed into a stat field.
 *
 * `currentValue` is only consulted when the expression opens with an operator.
 * An unparseable expression is an error, never a silent 0 — losing a boss's HP
 * to a stray keystroke is a worse failure than making the user retype.
 */
export function evaluateStatInput(
  input: string,
  currentValue: number,
): EvalResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, error: "empty" };

  const expression = startsWithOperator(trimmed)
    ? `${currentValue} ${trimmed}`
    : trimmed;

  const tokens = tokenize(expression);
  if ("error" in tokens) return { ok: false, error: tokens.error };
  if (tokens.length === 0) return { ok: false, error: "empty" };

  const rpn = toRpn(tokens);
  if ("error" in rpn) return { ok: false, error: rpn.error };

  return evaluateRpn(rpn);
}

// ---------------------------------------------------------------------------
// Range limits
// ---------------------------------------------------------------------------

export const HP_LIMIT = 9999;
export const AC_LIMIT = 999;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** HP floors at 0 — nothing is deader than dead. */
export function clampHp(value: number): number {
  return clamp(value, 0, HP_LIMIT);
}

export function clampAc(value: number): number {
  return clamp(value, 0, AC_LIMIT);
}
