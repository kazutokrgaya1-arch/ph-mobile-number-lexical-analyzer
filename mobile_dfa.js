/*
 * Philippine Mobile Number Lexical Analyzer using a DFA (JavaScript / Node.js)
 *
 * Accepts ONE or MANY inputs at once:
 *   node mobile_dfa.js 09171234567 09281234567 0917123   (command-line arguments)
 *   node mobile_dfa.js -f numbers.txt                     (a file, any layout)
 *   node mobile_dfa.js                                    (interactive: paste many, blank line to run)
 *   add --trace to show the state path of every number
 *
 * Lexical analysis: the input text is split into lexemes at whitespace, commas
 * and semicolons. Each lexeme is run through the DFA for the regex 09[0-9]{9}.
 */
"use strict";

const fs = require("fs");
const readline = require("readline");

// ---------------------------------------------------------------- DFA ----
// States 0..11 count the characters read. DEAD is the trap state.
const DEAD = "q_dead";
const START = 0;
const ACCEPT = 11;

function classify(ch) {
  if (ch === "0") return "0";
  if (ch === "9") return "9";
  if ("12345678".includes(ch)) return "1-8";
  return "other";
}

// Transition table: DELTA[state][inputClass] -> next state
const DELTA = {};
DELTA[0] = { "0": 1, "9": DEAD, "1-8": DEAD, other: DEAD };
DELTA[1] = { "0": DEAD, "9": 2, "1-8": DEAD, other: DEAD };
for (let s = 2; s <= 10; s++) {
  // q2..q10 only count digits
  DELTA[s] = { "0": s + 1, "9": s + 1, "1-8": s + 1, other: DEAD };
}
DELTA[11] = { "0": DEAD, "9": DEAD, "1-8": DEAD, other: DEAD };
DELTA[DEAD] = { "0": DEAD, "9": DEAD, "1-8": DEAD, other: DEAD };

/** Run the DFA on one lexeme. Returns { accepted, trace }. */
function runDfa(text) {
  let state = START;
  const trace = [state];
  for (const ch of text) {
    state = DELTA[state][classify(ch)];
    trace.push(state);
    if (state === DEAD) break;
  }
  return { accepted: state === ACCEPT, trace };
}

/** Explain a rejection from the state where the DFA failed. */
function reason(text, trace) {
  if (text.length === 0) return "empty input";
  const last = trace[trace.length - 1];
  if (last === DEAD) {
    const i = trace.length - 2; // index of the offending character
    const ch = [...text][i];
    if (!/^[0-9]$/.test(ch)) return `non-digit character '${ch}' at position ${i + 1}`;
    if (i === 0) return "must start with 0";
    if (i === 1) return "second digit must be 9 (prefix must be 09)";
    return "too long (more than 11 digits)";
  }
  return `too short, ${[...text].length} characters and 11 are needed`;
}

// -------------------------------------------------------------- lexer ----
/** Split raw text into lexemes at whitespace, commas and semicolons. */
function tokenize(raw) {
  return raw.split(/[\s,;]+/).filter((t) => t.length > 0);
}

/** Analyze any amount of text. Returns one result object per lexeme. */
function analyze(raw) {
  return tokenize(raw).map((lexeme) => {
    const { accepted, trace } = runDfa(lexeme);
    return {
      lexeme,
      valid: accepted,
      token: accepted ? "MOBILE_NUMBER" : "INVALID",
      reason: accepted ? "" : reason(lexeme, trace),
      trace,
    };
  });
}

const fmtTrace = (trace) => trace.map((s) => (s === DEAD ? DEAD : "q" + s)).join(" -> ");

function report(results, showTrace = false) {
  if (results.length === 0) {
    console.log("No input found.");
    return;
  }
  const w = Math.max(...results.map((r) => r.lexeme.length), 5);
  const line = "-".repeat(w + 40);
  console.log(`${"#".padStart(3)}  ${"Input".padEnd(w)}  Result`);
  console.log(line);
  results.forEach((r, i) => {
    const msg = r.valid ? "Valid Philippine Mobile Number" : `Invalid - ${r.reason}`;
    console.log(`${String(i + 1).padStart(3)}  ${r.lexeme.padEnd(w)}  ${msg}`);
    if (showTrace) console.log(`     trace: ${fmtTrace(r.trace)}`);
  });
  const good = results.filter((r) => r.valid).length;
  console.log(line);
  console.log(`Total: ${results.length}   Valid: ${good}   Invalid: ${results.length - good}`);
}

// ---------------------------------------------------------------- CLI ----
function readPasted(done) {
  console.log("Enter mobile numbers (spaces, commas or new lines between them).");
  console.log("Press Enter on an empty line to analyze.");
  const rl = readline.createInterface({ input: process.stdin });
  const lines = [];
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    rl.close();
    done(lines.join("\n"));
  };
  rl.on("line", (line) => (line.trim() === "" ? finish() : lines.push(line)));
  rl.on("close", finish);
}

function main(argv) {
  const showTrace = argv.includes("--trace");
  const args = argv.filter((a) => a !== "--trace");
  if (args[0] === "-f") {
    if (!args[1]) {
      console.error("usage: node mobile_dfa.js -f FILE");
      process.exit(1);
    }
    report(analyze(fs.readFileSync(args[1], "utf8")), showTrace);
  } else if (args.length > 0) {
    report(analyze(args.join(" ")), showTrace);
  } else {
    readPasted((raw) => report(analyze(raw), showTrace));
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { runDfa, tokenize, analyze, reason };
