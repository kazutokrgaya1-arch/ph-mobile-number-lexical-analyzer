import re
import unittest

from mobile_dfa import analyze, run_dfa, tokenize

VALID = ["09171234567", "09999999999", "09000000000", "09281234567"]
INVALID = [
    "0917123456",      # too short
    "091712345678",    # too long
    "08171234567",     # wrong prefix
    "9171234567",      # missing leading 0
    "+639171234567",   # international format
    "0917-123-4567",   # separators inside a number
    "0917abc4567",     # letters
    "09171234567a",    # trailing letter
    "0",               # one char
    "09",              # prefix only
    "０９１７１２３４５６７",  # full-width digits
]


class DfaTests(unittest.TestCase):
    def test_valid(self):
        for s in VALID:
            self.assertTrue(run_dfa(s)[0], s)

    def test_invalid(self):
        for s in INVALID:
            self.assertFalse(run_dfa(s)[0], s)

    def test_empty(self):
        self.assertFalse(run_dfa("")[0])

    def test_matches_regex(self):
        rx = re.compile(r"09[0-9]{9}")
        for s in VALID + INVALID + ["", "09" + "1" * 9, "09" + "1" * 10]:
            self.assertEqual(run_dfa(s)[0], bool(rx.fullmatch(s.encode("ascii", "ignore").decode()) and s.isascii()), s)


class BatchTests(unittest.TestCase):
    def test_tokenize_delimiters(self):
        self.assertEqual(tokenize("a b,c;d\ne\t f"), list("abcdef"))

    def test_batch_mixed(self):
        res = analyze("09171234567, 0917123\n09281234567 08171234567")
        self.assertEqual([r["valid"] for r in res], [True, False, True, False])

    def test_batch_empty(self):
        self.assertEqual(analyze("  \n , "), [])

    def test_space_inside_number_splits(self):
        res = analyze("0917 1234567")
        self.assertEqual(len(res), 2)
        self.assertFalse(any(r["valid"] for r in res))


if __name__ == "__main__":
    unittest.main()
