"""Merge messy contact exports into one clean, deduplicated list.

Reads every .csv/.tsv/.txt file in a folder, whatever its delimiter, encoding
or column names, and writes:
  clean_contacts.csv  one row per person, most complete data kept
  rejected_rows.csv   rows with no usable email or phone, and why
  report.txt          what was done, with counts

Usage:  python merge_contacts.py INPUT_FOLDER [-o OUTPUT_FOLDER]
Only the Python standard library is needed.
"""
import argparse
import csv
import re
from pathlib import Path

FIELDS = ["name", "email", "phone", "company", "sources"]

# Header spellings seen in real exports -> canonical field
HEADER_MAP = {
    "name": "name", "full name": "name", "fullname": "name", "contact": "name", "contact name": "name",
    "first name": "first", "firstname": "first", "first_name": "first", "given name": "first",
    "last name": "last", "lastname": "last", "last_name": "last", "surname": "last", "family name": "last",
    "email": "email", "e-mail": "email", "email address": "email", "mail": "email", "e_mail": "email",
    "phone": "phone", "tel": "phone", "telephone": "phone", "mobile": "phone", "cell": "phone", "phone number": "phone",
    "company": "company", "organization": "company", "organisation": "company", "employer": "company", "account": "company",
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$")
ENCODINGS = ("utf-8-sig", "cp1255", "latin-1")


def read_rows(path):
    """Yield dicts with canonical keys from one file, detecting encoding and delimiter."""
    for enc in ENCODINGS:
        try:
            text = path.read_text(encoding=enc)
            break
        except UnicodeDecodeError:
            continue
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.reader(text.splitlines(), dialect)
    headers = [HEADER_MAP.get(h.strip().lower().replace("_", " "), HEADER_MAP.get(h.strip().lower())) for h in next(reader)]
    for line_no, values in enumerate(reader, start=2):
        if not any(v.strip() for v in values):
            continue
        row = {}
        for key, value in zip(headers, values):
            if key and value.strip():
                row[key] = value.strip()
        if "name" not in row and ("first" in row or "last" in row):
            row["name"] = f"{row.get('first', '')} {row.get('last', '')}".strip()
        yield line_no, row


def clean_name(name):
    name = re.sub(r"\s+", " ", name or "").strip()
    # Re-case only all-lower / all-upper names; leave "McDonald" or "van der Berg" alone
    return name.title() if name.islower() or name.isupper() else name


def clean_email(email):
    email = (email or "").strip().lower().replace("mailto:", "")
    return email if EMAIL_RE.match(email) else ""


def clean_phone(phone):
    digits = re.sub(r"\D", "", phone or "")
    if phone and phone.strip().startswith("+"):
        return "+" + digits
    if len(digits) == 10:                 # assume North American 10-digit
        return "+1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return "+" + digits
    return "+" + digits if len(digits) > 10 else ""


def merge(existing, new):
    """Fill gaps in an existing record; keep the longer name and company."""
    for field in ("name", "company"):
        if len(new[field]) > len(existing[field]):
            existing[field] = new[field]
    for field in ("email", "phone"):
        existing[field] = existing[field] or new[field]
    existing["sources"] |= new["sources"]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("input", type=Path)
    ap.add_argument("-o", "--output", type=Path, default=Path("output"))
    args = ap.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    people, by_key, rejected = [], {}, []
    stats = {"files": 0, "rows": 0, "duplicates": 0, "bad_emails": 0}
    for path in sorted(p for p in args.input.iterdir() if p.suffix.lower() in (".csv", ".tsv", ".txt")):
        stats["files"] += 1
        for line_no, raw in read_rows(path):
            stats["rows"] += 1
            rec = {
                "name": clean_name(raw.get("name")),
                "email": clean_email(raw.get("email")),
                "phone": clean_phone(raw.get("phone")),
                "company": re.sub(r"\s+", " ", raw.get("company", "")).strip(),
                "sources": {path.name},
            }
            if raw.get("email") and not rec["email"]:
                stats["bad_emails"] += 1
            if not rec["email"] and not rec["phone"]:
                rejected.append({"file": path.name, "line": line_no, "reason": "no valid email or phone", **raw})
                continue
            keys = [k for k in (rec["email"], rec["phone"]) if k]
            match = next((by_key[k] for k in keys if k in by_key), None)
            if match:
                stats["duplicates"] += 1
                merge(match, rec)
            else:
                match = rec
                people.append(rec)
            for k in (match["email"], match["phone"]):
                if k:
                    by_key[k] = match

    people.sort(key=lambda p: (p["company"].lower(), p["name"].lower()))
    with open(args.output / "clean_contacts.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, FIELDS)
        w.writeheader()
        for p in people:
            w.writerow({**p, "sources": "; ".join(sorted(p["sources"]))})

    reject_fields = ["file", "line", "reason"] + sorted({k for r in rejected for k in r} - {"file", "line", "reason"})
    with open(args.output / "rejected_rows.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, reject_fields)
        w.writeheader()
        w.writerows(rejected)

    report = (
        f"Files read:            {stats['files']}\n"
        f"Rows read:             {stats['rows']}\n"
        f"Duplicates merged:     {stats['duplicates']}\n"
        f"Invalid emails fixed/dropped: {stats['bad_emails']}\n"
        f"Rows rejected:         {len(rejected)}\n"
        f"Clean contacts:        {len(people)}\n"
    )
    (args.output / "report.txt").write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
