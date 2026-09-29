#!/usr/bin/env python3
import json, sys
from pathlib import Path
from PIL import Image, UnidentifiedImageError

def norm(s):
    s = str(s).replace("\\", "/")
    while s.startswith("./"):
        s = s[2:]
    return s.lstrip("/")

def main():
    repo = Path(__file__).resolve().parent.parent
    index = json.loads((repo / "data/techniques/index.json").read_text(encoding="utf-8"))

    referenced = set()
    missing_field = []
    broken = []
    invalid = []

    for entry in index:
        tid = entry["id"]
        meta = json.loads((repo / norm(entry["path"]) / "meta.json").read_text(encoding="utf-8"))
        image = meta.get("image")
        images = meta.get("images", [])

        if images is None:
            images = []

        if not isinstance(images, list):
            print(f"Invalid images field in {tid}: expected array")
            invalid.append((tid, "images", "images must be an array"))
            images = []

        image_refs = []

        if image:
            image_refs.append(image)

        for extra_image in images:
            if extra_image and extra_image not in image_refs:
                image_refs.append(extra_image)

        if not image_refs:

            missing_field.append(tid)
            continue
        for image_ref in image_refs:
            rel = norm(image_ref)
            referenced.add(rel)
            p = repo / rel

            if not p.exists():
                broken.append((tid, rel))
                continue

            try:
                with Image.open(p) as im:
                    im.verify()
            except (OSError, UnidentifiedImageError) as e:
                invalid.append((tid, rel, str(e)))

    roots = [repo / "assets/images/techniques", repo / "assets/images/cards"]
    webps = {p.relative_to(repo).as_posix() for r in roots if r.exists() for p in r.rglob("*.webp")}
    orphans = sorted(webps - referenced)

    gitkeeps = []
    tech_root = repo / "assets/images/techniques"
    if tech_root.exists():
        for g in tech_root.rglob(".gitkeep"):
            if any(x.name != ".gitkeep" for x in g.parent.iterdir()):
                gitkeeps.append(g.relative_to(repo).as_posix())

    print(f"Indexed techniques: {len(index)}")
    print(f"Referenced images:  {len(referenced)}")
    print(f"WebP files:         {len(webps)}")
    print(f"No image in meta:   {len(missing_field)}")
    print(f"Broken paths:       {len(broken)}")
    print(f"Invalid images:     {len(invalid)}")
    print(f"Orphan WebP:        {len(orphans)}")

    if missing_field:
        print("\nTechniques without image:")
        for x in missing_field: print("  -", x)

    if broken:
        print("\nBroken image paths:")
        for tid, rel in broken: print(f"  - {tid}: {rel}")

    if invalid:
        print("\nInvalid images:")
        for tid, rel, err in invalid: print(f"  - {tid}: {rel}: {err}")

    if orphans:
        print("\nUnreferenced WebP files:")
        for x in orphans: print("  -", x)

    if gitkeeps:
        print("\nRedundant .gitkeep files:")
        for x in gitkeeps: print("  -", x)

    convert = repo / "convert"
    if convert.exists():
        src = [p for p in convert.iterdir() if p.is_file() and p.suffix.lower() in {".png",".jpg",".jpeg"}]
        if src:
            size = sum(p.stat().st_size for p in src) / 1024 / 1024
            print(f"\nconvert/: {len(src)} source images, {size:.1f} MB — do not commit this folder.")

    if broken or invalid:
        print("\nRESULT: FAIL")
        return 1

    if missing_field:
        print("\nRESULT: references are valid, but missing-image techniques will show placeholders.")
    else:
        print("\nRESULT: OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
