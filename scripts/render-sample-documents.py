"""Render the supplied example, never rebuild its contents from mock data.

Requires Pillow, pdfplumber and pypdfium2. Convert the two DOCX files to PDF
with LibreOffice, and XLSX with the calc_pdf_Export SinglePageSheets option;
pass their directory as --office-pdfs. Originals in fixtures are read-only.
The generated manifest and lossless page images are committed, so neither
LibreOffice nor Python is needed by the app or the GitHub Pages build.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "fixtures/synthetic-2027/input"
OUTPUT = ROOT / "src/assets/sample-documents"
MANIFEST = ROOT / "src/data/sample-document-pages.json"

# Scans have no text layer. These rectangles were measured on the actual page,
# in pixels of the reference render (width, height), then visually checked.
# The KFZ amount is the 2027 row, NOT the total for the whole stage.
SCANS = {
    "01": ((1179, 834), {
        "Номер": ("3/7", (710, 90, 16, 11)),
        "Договор": ("SYN-27/04-018", (902, 135, 64, 11)),
        "Сумма": ("7 818 300,00", (1099, 388, 54, 12)),
    }),
    "04": ((834, 1179), {
        "Номер": ("284", (359, 59, 41, 22)),
        "Дата": ("28.01.2027", (439, 59, 115, 22)),
        "Договор": ("SYN-27/04-018", (123, 118, 106, 17)),
        "Сумма": ("186 000,00", (258, 269, 76, 17)),
    }),
    "08": ((834, 1179), {
        "Номер": ("ИА-62", (424, 59, 68, 22)),
        "Дата": ("31.01.2027", (100, 118, 78, 17)),
        "Договор": ("SYN-27/04-018", (123, 150, 106, 17)),
        "Сумма": ("128 000,00", (222, 300, 78, 17)),
    }),
    "12": ((1655, 2341), {
        "Номер": ("СВ-0427", (1045, 118, 183, 43)),
        "Дата": ("29.04.2027", (201, 236, 150, 30)),
        "Договор": ("SYN-27/04-018", (247, 298, 207, 31)),
        "Сумма": ("52 500,00", (337, 597, 133, 32)),
    }),
    "15": ((834, 1179), {
        "Номер": ("ADM-96", (413, 59, 88, 22)),
        "Дата": ("15.05.2027", (100, 118, 79, 17)),
        "Договор": ("SYN-27/04-019", (123, 150, 106, 17)),
        "Сумма": ("255 000,00", (114, 246, 78, 17)),
    }),
}

# Text-layer selectors: exact snippets from the original documents. A missing
# snippet fails generation instead of silently retaining an old mock bbox.
TEXT = {
    "05": ("397", "25.02.2027", "94 000,00"),
    "06": ("КЛ-84", "10.04.2027", "73 500,00"),
    "07": ("0527-92", "22.05.2027", "246 500,00"),
    "09": ("ADM-48", "27.02.2027", "142 000,00"),
    "10": ("ADM-48", "27.02.2027", "142 000,00"),
    "11": ("ИТ 03-27", "март 2027", "97 500,00"),
    "13": ("УПР-83", "29.05.2027", "180 000,00"),
    "14": ("ОРГ-0604", "04.06.2027", "117 000,00"),
}
MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май"]
for i, month in enumerate(MONTHS, 1):
    TEXT[f"02_{i:02}"] = (
        f"ЗП-{i:02}/27", f"{month} 2027",
        ["900 000,00", "950 000,00", "1 000 000,00", "1 050 000,00", "1 100 000,00"][i - 1],
    )
    TEXT[f"03_{i:02}"] = (
        f"СВ-{i:02}/27", f"{month} 2027",
        ["270 000,00", "285 000,00", "300 000,00", "315 000,00", "330 000,00"][i - 1],
    )


def normalized(rect, width, height):
    x, y, w, h = rect
    box = [round(x / width, 6), round(y / height, 6),
           round(w / width, 6), round(h / height, 6)]
    assert min(box) >= 0 and box[0] + box[2] <= 1 and box[1] + box[3] <= 1, box
    return box


def text_fields(path, selectors):
    with pdfplumber.open(path) as pdf:
        result = []
        for label, text in selectors.items():
            pattern = r"\s+".join(re.escape(part) for part in text.split())
            for index, page in enumerate(pdf.pages):
                matches = page.search(pattern, case=False)
                if matches:
                    match = matches[0]
                    # One point of padding includes ascenders/descenders and
                    # leaves the actual printed value visible inside the mark.
                    x = max(0, match["x0"] - 1)
                    y = max(0, match["top"] - 1)
                    right = min(page.width, match["x1"] + 1)
                    bottom = min(page.height, match["bottom"] + 1)
                    result.append({"label": label, "text": text, "page": index + 1,
                                   "bbox": normalized((x, y, right - x, bottom - y), page.width, page.height)})
                    break
            else:
                raise ValueError(f"Missing {label}: {text} in {path.name}")
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--office-pdfs", type=Path, required=True)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    result = {}
    for prefix in sorted(SCANS.keys() | TEXT.keys()):
        matches = list(INPUT.glob(f"{prefix}_*"))
        assert len(matches) == 1, (prefix, matches)
        original = matches[0]
        path = args.office_pdfs / f"{original.stem}.pdf" if original.suffix in (".xlsx", ".docx") else original
        if prefix in SCANS:
            (width, height), annotations = SCANS[prefix]
            fields = [{"label": label, "text": text, "page": 1,
                       "bbox": normalized(rect, width, height)}
                      for label, (text, rect) in annotations.items()]
        else:
            number, date, amount = TEXT[prefix]
            fields = text_fields(path, {"Номер": number, "Дата": date,
                                        "Договор": "SYN-27/04-018", "Сумма": amount})
        if path.suffix == ".png":
            images = [Image.open(path).convert("RGB")]
        else:
            with pdfium.PdfDocument(path) as pdf:
                images = [page.render(scale=2600 / max(page.get_size())).to_pil().convert("RGB")
                          for page in pdf]
        pages = []
        for i, image in enumerate(images, 1):
            file = f"{prefix}-{i}.webp"
            image.save(OUTPUT / file, lossless=True, method=6)
            pages.append({"file": file, "width": image.width, "height": image.height})
        result[prefix] = {"fileName": original.name,
                          "sha256": hashlib.sha256(original.read_bytes()).hexdigest(),
                          "pages": pages, "fields": fields}
        print(f"{prefix}: {len(pages)} page(s), {len(fields)} fields")
    MANIFEST.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
