#!/usr/bin/env python3
"""
Convert Open-Massage-Guide source images to WebP, place them in the
repository's asset folders, and update matching technique meta.json files.

Default repository layout:
  <repo>/convert/*
  <repo>/assets/images/techniques/...
  <repo>/assets/images/cards/
  <repo>/data/techniques/...

Examples:
  python scripts/convert_images_to_webp.py
  python scripts/convert_images_to_webp.py --quality 90
  python scripts/convert_images_to_webp.py --dry-run
  python scripts/convert_images_to_webp.py --no-update-meta
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageOps, UnidentifiedImageError
except ImportError:
    print(
        "Pillow is required.\n"
        "Install it with:\n"
        "  py -m pip install Pillow\n",
        file=sys.stderr,
    )
    raise SystemExit(2)


SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg"}


@dataclass(frozen=True)
class Route:
    asset_dir: str
    data_dir: str | None


ROUTES: dict[str, Route] = {
    "arms": Route(
        "assets/images/techniques/arms",
        "data/techniques/arms",
    ),
    "back": Route(
        "assets/images/techniques/back",
        "data/techniques/back",
    ),
    "face": Route(
        "assets/images/techniques/face-head",
        "data/techniques/face-head",
    ),
    "feet": Route(
        "assets/images/techniques/feet",
        "data/techniques/feet",
    ),
    "legs": Route(
        "assets/images/techniques/legs",
        "data/techniques/legs",
    ),
    "neck": Route(
        "assets/images/techniques/neck-shoulders",
        "data/techniques/neck-shoulders",
    ),
    "program": Route(
        "assets/images/techniques/programs",
        "data/techniques/programs",
    ),
    "safety": Route(
        "assets/images/techniques/safety",
        "data/techniques/safety",
    ),
    "self": Route(
        "assets/images/techniques/self-massage",
        "data/techniques/self-massage",
    ),
    # Overview images are not technique modules.
    "overview": Route(
        "assets/images/cards",
        None,
    ),
}


def human_size(value: int) -> str:
    size = float(value)
    units = ("B", "KB", "MB", "GB")
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{value} B"


def detect_prefix(stem: str) -> str | None:
    # "neck-001" -> "neck"
    if "-" not in stem:
        return None
    return stem.split("-", 1)[0].lower()


def repo_relative_web_path(path: Path, repo_root: Path) -> str:
    """
    Return a browser-safe relative URL from index.html at repository root.
    Example:
      ./assets/images/techniques/arms/arms-001.webp
    """
    rel = path.relative_to(repo_root).as_posix()
    return f"./{rel}"


def convert_image(source: Path, destination: Path, quality: int) -> tuple[int, int]:
    source_size = source.stat().st_size

    with Image.open(source) as raw:
        image = ImageOps.exif_transpose(raw)

        # Generated guide images do not need source metadata.
        # Preserve alpha only when it really exists.
        has_alpha = (
            image.mode in {"RGBA", "LA"}
            or (image.mode == "P" and "transparency" in image.info)
        )

        if has_alpha:
            image = image.convert("RGBA")
        else:
            image = image.convert("RGB")

        destination.parent.mkdir(parents=True, exist_ok=True)

        save_options = {
            "format": "WEBP",
            "quality": quality,
            "method": 6,
            "optimize": True,
        }

        # Preserve transparent RGB values more accurately when alpha exists.
        if has_alpha:
            save_options["exact"] = True

        image.save(destination, **save_options)

    return source_size, destination.stat().st_size


def update_meta(
    meta_path: Path,
    image_web_path: str,
    *,
    dry_run: bool,
) -> bool:
    if not meta_path.exists():
        print(f"  WARN meta not found: {meta_path}")
        return False

    try:
        data = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"  WARN cannot read meta: {meta_path}: {exc}")
        return False

    old_value = data.get("image")
    if old_value == image_web_path:
        return False

    data["image"] = image_web_path

    if not dry_run:
        meta_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    print(f"  META image: {old_value!r} -> {image_web_path!r}")
    return True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Convert PNG/JPEG massage guide images to WebP, distribute them "
            "into assets/images, and update technique meta.json files."
        )
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=None,
        help=(
            "Repository root. By default it is auto-detected from the script "
            "location: scripts/.."
        ),
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=None,
        help="Source directory. Default: <repo-root>/convert",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=88,
        help="WebP lossy quality, 1..100. Default: 88",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned work without writing files.",
    )
    parser.add_argument(
        "--no-update-meta",
        action="store_true",
        help="Do not update image fields in matching meta.json files.",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()

    if not 1 <= args.quality <= 100:
        print("--quality must be between 1 and 100", file=sys.stderr)
        return 2

    script_path = Path(__file__).resolve()
    default_root = script_path.parent.parent
    repo_root = (args.repo_root or default_root).resolve()
    source_dir = (args.source or (repo_root / "convert")).resolve()

    if not source_dir.exists() or not source_dir.is_dir():
        print(f"Source directory does not exist: {source_dir}", file=sys.stderr)
        return 2

    sources = sorted(
        p
        for p in source_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not sources:
        print(f"No PNG/JPEG files found in: {source_dir}")
        return 0

    print(f"Repository : {repo_root}")
    print(f"Source     : {source_dir}")
    print(f"Images     : {len(sources)}")
    print(f"WebP quality: {args.quality}")
    print(f"Dry run    : {args.dry_run}")
    print()

    converted = 0
    failed = 0
    skipped = 0
    meta_changed = 0
    total_before = 0
    total_after = 0

    for source in sources:
        stem = source.stem
        prefix = detect_prefix(stem)
        route = ROUTES.get(prefix or "")

        if route is None:
            print(f"SKIP {source.name}: unknown filename prefix")
            skipped += 1
            continue

        destination = repo_root / route.asset_dir / f"{stem}.webp"

        print(f"{source.name}")
        print(f"  -> {destination.relative_to(repo_root)}")

        if args.dry_run:
            total_before += source.stat().st_size
            converted += 1
        else:
            try:
                before, after = convert_image(source, destination, args.quality)
            except (OSError, UnidentifiedImageError) as exc:
                print(f"  ERROR: {exc}")
                failed += 1
                continue

            converted += 1
            total_before += before
            total_after += after

            ratio = (1 - after / before) * 100 if before else 0
            print(
                f"  {human_size(before)} -> {human_size(after)} "
                f"({ratio:+.1f}% smaller)"
            )

        if route.data_dir and not args.no_update_meta:
            meta_path = repo_root / route.data_dir / stem / "meta.json"
            web_path = repo_relative_web_path(destination, repo_root)
            if update_meta(meta_path, web_path, dry_run=args.dry_run):
                meta_changed += 1

    print()
    print("=== Summary ===")
    print(f"Converted/planned : {converted}")
    print(f"Skipped           : {skipped}")
    print(f"Failed            : {failed}")
    print(f"Meta updated      : {meta_changed}")

    if not args.dry_run and total_before:
        saved = total_before - total_after
        percent = (saved / total_before) * 100
        print(f"Original total    : {human_size(total_before)}")
        print(f"WebP total        : {human_size(total_after)}")
        print(f"Saved             : {human_size(saved)} ({percent:.1f}%)")

    if failed:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
