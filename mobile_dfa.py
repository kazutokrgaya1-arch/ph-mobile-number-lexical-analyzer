"""Philippine Mobile Number Lexical Analyzer using a DFA.

Accepts ONE or MANY inputs at once:
  python mobile_dfa.py 09171234567 09281234567 0917123       (command-line arguments)
  python mobile_dfa.py -f numbers.txt                        (a file, any layout)
  python mobile_dfa.py                                       (interactive: paste many, blank line to run)

Lexical analysis: the input text is split into lexemes at whitespace and commas.
Each lexeme is then run through the DFA for the regular expression 09[0-9]{9}.
"""
import re
import sys

# ---------------------------------------------------------------- DFA ----
# States: 0..11 count characters read, DEAD is the trap state.
DEAD = "q_dead"
START = 0
ACCEPT = 11


def classify(ch):
    """Map a character to its input class used by the transition table."""
    if ch == "0":
        return "0"
    if ch == "9":
        return "9"
    if ch in "12345678":
        return "1-8"
    return "other"


# Transition table: state -> input class -> next state
DELTA = {
    0: {"0": 1, "9": DEAD, "1-8": DEAD, "other": DEAD},
    1: {"0": DEAD, "9": 2, "1-8": DEAD, "other": DEAD},
}
for _s in range(2, 11):  # q2..q10 just count digits
    DELTA[_s] = {"0": _s + 1, "9": _s + 1, "1-8": _s + 1, "other": DEAD}
DELTA[11] = {c: DEAD for c in ("0", "9", "1-8", "other")}
DELTA[DEAD] = {c: DEAD for c in ("0", "9", "1-8", "other")}


def run_dfa(text):
    """Return (accepted, trace) where trace is the list of states visited."""
    state = START
    trace = [state]
    for ch in text:
        state = DELTA[state][classify(ch)]
        trace.append(state)
        if state == DEAD:
            break
    return state == ACCEPT, trace


def reason(text, trace):
    """Explain a rejection from the state where the DFA failed."""
    if not text:
        return "empty input"
    if trace[-1] == DEAD:
        i = len(trace) - 2  # index of the offending character
        ch = text[i]
        if not ch.isdigit() or not ch.isascii():
            return f"non-digit character {ch!r} at position {i + 1}"
        if i == 0:
            return "must start with 0"
        if i == 1:
            return "second digit must be 9 (prefix must be 09)"
        return "too long (more than 11 digits)"
    return f"too short ({len(text)} characters, need 11)"


# -------------------------------------------------------------- lexer ----
DELIMS = re.compile(r"[\s,;]+")


def tokenize(raw):
    """Split raw text into lexemes at whitespace, commas and semicolons."""
    return [t for t in DELIMS.split(raw) if t]


def analyze(raw):
    """Analyze any amount of text. Returns a list of result dicts."""
    results = []
    for lexeme in tokenize(raw):
        ok, trace = run_dfa(lexeme)
        results.append({
            "lexeme": lexeme,
            "valid": ok,
            "token": "MOBILE_NUMBER" if ok else "INVALID",
            "reason": "" if ok else reason(lexeme, trace),
            "final_state": "q%d" % trace[-1] if trace[-1] != DEAD else DEAD,
            "trace": trace,
        })
    return results


def fmt_trace(trace):
    return " -> ".join(DEAD if s == DEAD else "q%d" % s for s in trace)


def report(results, show_trace=False):
    if not results:
        print("No input found.")
        return
    w = max(len(r["lexeme"]) for r in results)
    print(f"{'#':>3}  {'Input':<{w}}  Result")
    print("-" * (w + 40))
    for i, r in enumerate(results, 1):
        if r["valid"]:
            msg = "Valid Philippine Mobile Number"
        else:
            msg = f"Invalid ({r['reason']})"
        print(f"{i:>3}  {r['lexeme']:<{w}}  {msg}")
        if show_trace:
            print(f"     trace: {fmt_trace(r['trace'])}")
    good = sum(r["valid"] for r in results)
    print("-" * (w + 40))
    print(f"Total: {len(results)}   Valid: {good}   Invalid: {len(results) - good}")


# ---------------------------------------------------------------- CLI ----
def main(argv):
    show_trace = "--trace" in argv
    argv = [a for a in argv if a != "--trace"]
    if argv[:1] == ["-f"]:
        if len(argv) < 2:
            sys.exit("usage: mobile_dfa.py -f FILE")
        with open(argv[1], encoding="utf-8") as fh:
            raw = fh.read()
    elif argv:
        raw = " ".join(argv)
    else:
        print("Enter mobile numbers (spaces, commas or new lines between them).")
        print("Press Enter on an empty line to analyze.")
        lines = []
        while True:
            try:
                line = input()
            except EOFError:
                break
            if not line.strip():
                break
            lines.append(line)
        raw = "\n".join(lines)
    report(analyze(raw), show_trace)


if __name__ == "__main__":
    main(sys.argv[1:])
