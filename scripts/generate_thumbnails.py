#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps


def norm(value):
    value = str(value).replace("\\", "/")
    while value.startswith("./"):
        value = value[2:]
    return value.lstrip("/")


def human_size(size):
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / 1024 / 1024:.1f} MB"


def thumbnail_path_for(image_path):
    path = Path(norm(image_path))
    if path.stem.endswith("-thumb"):
        raise ValueError(f"Primary image already looks like a thumbnail: {image_path}")
    return path.with_name(f"{path.stem}-thumb.webp")


def save_meta(meta_path, meta):
    meta_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def main():
    parser = argparse.ArgumentParser(
        description="Generate lightweight WebP thumbnails for technique primary images."
    )
    parser.add_argument("--width", type=int, default=640, help="Maximum thumbnail width.")
    parser.add_argument("--quality", type=int, default=82, help="WebP quality (1-100).")
    parser.add_argument("--dry-run", action="store_true", help="Show planned changes only.")
    args = parser.parse_args()

    if args.width < 64:
        raise SystemExit("ERROR: --width must be >= 64")
    if not 1 <= args.quality <= 100:
        raise SystemExit("ERROR: --quality must be between 1 and 100")

    repo = Path(__file__).resolve().parent.parent
    index = json.loads(
        (repo / "data/techniques/index.json").read_text(encoding="utf-8")
    )

    generated = 0
    meta_updates = 0
    source_total = 0
    thumbnail_total = 0
    failures = []

    print(f"Repository       : {repo}")
    print(f"Techniques       : {len(index)}")
    print(f"Max width        : {args.width}px")
    print(f"WebP quality     : {args.quality}")
    print(f"Dry run          : {args.dry_run}")
    print()

    for entry in index:
        technique_id = entry["id"]
        module_dir = repo / norm(entry["path"])
        meta_path = module_dir / "meta.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

        image_ref = meta.get("image")
        if not image_ref:
            print(f"{technique_id}: SKIP — no primary image")
            continue

        source_rel = Path(norm(image_ref))
        source = repo / source_rel

        if not source.exists():
            failures.append(f"{technique_id}: source image missing: {image_ref}")
            continue

        try:
            thumb_rel = thumbnail_path_for(image_ref)
        except ValueError as exc:
            failures.append(f"{technique_id}: {exc}")
            continue

        target = repo / thumb_rel
        thumb_ref = f"./{thumb_rel.as_posix()}"

        print(f"{technique_id}")
        print(f"  full : {source_rel.as_posix()}")
        print(f"  thumb: {thumb_rel.as_posix()}")

        if meta.get("thumbnail") != thumb_ref:
            print(f"  META thumbnail: {meta.get('thumbnail')!r} -> {thumb_ref!r}")
            if not args.dry_run:
                meta["thumbnail"] = thumb_ref
                save_meta(meta_path, meta)
            meta_updates += 1

        source_total += source.stat().st_size

        if args.dry_run:
            generated += 1
            continue

        target.parent.mkdir(parents=True, exist_ok=True)

        try:
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image)
                original_size = image.size

                if image.width > args.width:
                    height = max(1, round(image.height * args.width / image.width))
                    image = image.resize((args.width, height), Image.Resampling.LANCZOS)

                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

                image.save(
                    target,
                    format="WEBP",
                    quality=args.quality,
                    method=6,
                )

                print(f"  size : {original_size[0]}x{original_size[1]} -> {image.width}x{image.height}")

            thumbnail_total += target.stat().st_size
            print(
                f"  disk : {human_size(source.stat().st_size)} -> "
                f"{human_size(target.stat().st_size)}"
            )
            generated += 1
        except Exception as exc:
            failures.append(f"{technique_id}: thumbnail generation failed: {exc}")

    print()
    print("=== Summary ===")
    print(f"Generated/planned : {generated}")
    print(f"Meta updated      : {meta_updates}")

    if not args.dry_run and source_total:
        saved = source_total - thumbnail_total
        percent = (saved / source_total * 100) if source_total else 0
        print(f"Primary full total: {human_size(source_total)}")
        print(f"Thumbnail total   : {human_size(thumbnail_total)}")
        print(f"Catalog saving    : {human_size(saved)} ({percent:.1f}% smaller)")

    if failures:
        print()
        print("Failures:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
