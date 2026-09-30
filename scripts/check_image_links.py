#!/usr/bin/env python3
import json
from pathlib import Path

from PIL import Image, UnidentifiedImageError


def norm(value):
    value = str(value).replace("\\", "/")
    while value.startswith("./"):
        value = value[2:]
    return value.lstrip("/")


def verify_image(repo, technique_id, kind, image_ref, referenced, broken, invalid):
    rel = norm(image_ref)
    referenced.add(rel)
    path = repo / rel

    if not path.exists():
        broken.append((technique_id, kind, rel))
        return

    try:
        with Image.open(path) as image:
            image.verify()
    except (OSError, UnidentifiedImageError) as error:
        invalid.append((technique_id, kind, rel, str(error)))


def main():
    repo = Path(__file__).resolve().parent.parent
    index = json.loads(
        (repo / "data/techniques/index.json").read_text(encoding="utf-8")
    )

    full_referenced = set()
    thumbnail_referenced = set()
    referenced = set()

    missing_image = []
    missing_thumbnail = []
    broken = []
    invalid = []

    for entry in index:
        technique_id = entry["id"]
        meta = json.loads(
            (repo / norm(entry["path"]) / "meta.json").read_text(encoding="utf-8")
        )

        image = meta.get("image")
        thumbnail = meta.get("thumbnail")
        images = meta.get("images", [])
        status = meta.get("status")

        if images is None:
            images = []

        if not isinstance(images, list):
            print(f"Invalid images field in {technique_id}: expected array")
            invalid.append(
                (technique_id, "images", "images", "images must be an array")
            )
            images = []

        if not image:
            missing_image.append(technique_id)
        else:
            verify_image(
                repo,
                technique_id,
                "image",
                image,
                full_referenced,
                broken,
                invalid,
            )

        for extra_image in images:
            if extra_image and extra_image != image:
                verify_image(
                    repo,
                    technique_id,
                    "gallery",
                    extra_image,
                    full_referenced,
                    broken,
                    invalid,
                )

        if thumbnail:
            if thumbnail == image:
                invalid.append(
                    (
                        technique_id,
                        "thumbnail",
                        norm(thumbnail),
                        "thumbnail must differ from full image",
                    )
                )
            verify_image(
                repo,
                technique_id,
                "thumbnail",
                thumbnail,
                thumbnail_referenced,
                broken,
                invalid,
            )
        elif status == "published":
            missing_thumbnail.append(technique_id)

    referenced = full_referenced | thumbnail_referenced

    roots = [
        repo / "assets/images/techniques",
        repo / "assets/images/cards",
    ]
    webps = {
        path.relative_to(repo).as_posix()
        for root in roots
        if root.exists()
        for path in root.rglob("*.webp")
    }
    orphans = sorted(webps - referenced)

    gitkeeps = []
    tech_root = repo / "assets/images/techniques"
    if tech_root.exists():
        for gitkeep in tech_root.rglob(".gitkeep"):
            if any(item.name != ".gitkeep" for item in gitkeep.parent.iterdir()):
                gitkeeps.append(gitkeep.relative_to(repo).as_posix())

    print(f"Indexed techniques:   {len(index)}")
    print(f"Full/gallery refs:    {len(full_referenced)}")
    print(f"Thumbnail refs:       {len(thumbnail_referenced)}")
    print(f"Referenced WebP:      {len(referenced)}")
    print(f"WebP files:           {len(webps)}")
    print(f"No image in meta:     {len(missing_image)}")
    print(f"No thumbnail in meta: {len(missing_thumbnail)}")
    print(f"Broken paths:         {len(broken)}")
    print(f"Invalid images:       {len(invalid)}")
    print(f"Orphan WebP:          {len(orphans)}")

    if missing_image:
        print("\nTechniques without image:")
        for technique_id in missing_image:
            print("  -", technique_id)

    if missing_thumbnail:
        print("\nPublished techniques without thumbnail:")
        for technique_id in missing_thumbnail:
            print("  -", technique_id)

    if broken:
        print("\nBroken image paths:")
        for technique_id, kind, rel in broken:
            print(f"  - {technique_id} [{kind}]: {rel}")

    if invalid:
        print("\nInvalid images:")
        for technique_id, kind, rel, error in invalid:
            print(f"  - {technique_id} [{kind}]: {rel}: {error}")

    if orphans:
        print("\nUnreferenced WebP files:")
        for rel in orphans:
            print("  -", rel)

    if gitkeeps:
        print("\nRedundant .gitkeep files:")
        for rel in gitkeeps:
            print("  -", rel)

    convert = repo / "convert"
    if convert.exists():
        sources = [
            path
            for path in convert.iterdir()
            if path.is_file()
            and path.suffix.lower() in {".png", ".jpg", ".jpeg"}
        ]
        if sources:
            size = sum(path.stat().st_size for path in sources) / 1024 / 1024
            print(
                f"\nconvert/: {len(sources)} source images, "
                f"{size:.1f} MB — do not commit this folder."
            )

    if broken or invalid or missing_thumbnail:
        print("\nRESULT: FAIL")
        return 1

    if missing_image:
        print(
            "\nRESULT: references are valid, but missing-image techniques "
            "will show placeholders."
        )
    else:
        print("\nRESULT: OK")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
