#!/usr/bin/env python3
import json
from pathlib import Path

from PIL import Image, UnidentifiedImageError


FULL_MAX_BYTES = 2 * 1024 * 1024
FULL_WARN_BYTES = 1 * 1024 * 1024
FULL_MAX_WIDTH = 6000
FULL_MAX_HEIGHT = 6000
FULL_MIN_SIDE = 320

THUMB_MAX_BYTES = 150 * 1024
THUMB_WARN_BYTES = 100 * 1024
THUMB_MAX_WIDTH = 640
THUMB_MAX_HEIGHT = 800

ASPECT_RATIO_TOLERANCE = 0.01


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
    return f"{size / 1024 / 1024:.2f} MB"


def read_image(path):
    with Image.open(path) as image:
        image.load()
        return {
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "bytes": path.stat().st_size,
        }


def main():
    repo = Path(__file__).resolve().parent.parent
    index = json.loads(
        (repo / "data/techniques/index.json").read_text(encoding="utf-8")
    )

    errors = []
    warnings = []

    full_count = 0
    gallery_count = 0
    thumb_count = 0
    full_bytes = 0
    thumb_bytes = 0

    def error(message):
        errors.append(message)

    def warning(message):
        warnings.append(message)

    def check_webp(technique_id, kind, image_ref, *, thumbnail=False):
        nonlocal full_count, gallery_count, thumb_count, full_bytes, thumb_bytes

        rel = norm(image_ref)
        path = repo / rel

        if path.suffix.lower() != ".webp":
            error(f"{technique_id} [{kind}]: extension must be .webp: {rel}")
            return None

        if not path.exists():
            error(f"{technique_id} [{kind}]: file missing: {rel}")
            return None

        try:
            info = read_image(path)
        except (OSError, UnidentifiedImageError) as exc:
            error(f"{technique_id} [{kind}]: invalid image: {rel}: {exc}")
            return None

        if info["format"] != "WEBP":
            error(
                f"{technique_id} [{kind}]: actual format must be WEBP, "
                f"got {info['format']}: {rel}"
            )

        if thumbnail:
            thumb_count += 1
            thumb_bytes += info["bytes"]

            if info["width"] > THUMB_MAX_WIDTH:
                error(
                    f"{technique_id} [thumbnail]: width {info['width']}px "
                    f"> {THUMB_MAX_WIDTH}px: {rel}"
                )
            if info["height"] > THUMB_MAX_HEIGHT:
                error(
                    f"{technique_id} [thumbnail]: height {info['height']}px "
                    f"> {THUMB_MAX_HEIGHT}px: {rel}"
                )
            if info["bytes"] > THUMB_MAX_BYTES:
                error(
                    f"{technique_id} [thumbnail]: {human_size(info['bytes'])} "
                    f"> {human_size(THUMB_MAX_BYTES)}: {rel}"
                )
            elif info["bytes"] > THUMB_WARN_BYTES:
                warning(
                    f"{technique_id} [thumbnail]: {human_size(info['bytes'])} "
                    f"> recommended {human_size(THUMB_WARN_BYTES)}: {rel}"
                )
        else:
            if kind == "gallery":
                gallery_count += 1
            else:
                full_count += 1
            full_bytes += info["bytes"]

            if info["width"] > FULL_MAX_WIDTH:
                error(
                    f"{technique_id} [{kind}]: width {info['width']}px "
                    f"> {FULL_MAX_WIDTH}px: {rel}"
                )
            if info["height"] > FULL_MAX_HEIGHT:
                error(
                    f"{technique_id} [{kind}]: height {info['height']}px "
                    f"> {FULL_MAX_HEIGHT}px: {rel}"
                )
            if min(info["width"], info["height"]) < FULL_MIN_SIDE:
                error(
                    f"{technique_id} [{kind}]: minimum side "
                    f"{min(info['width'], info['height'])}px < {FULL_MIN_SIDE}px: {rel}"
                )
            if info["bytes"] > FULL_MAX_BYTES:
                error(
                    f"{technique_id} [{kind}]: {human_size(info['bytes'])} "
                    f"> {human_size(FULL_MAX_BYTES)}: {rel}"
                )
            elif info["bytes"] > FULL_WARN_BYTES:
                warning(
                    f"{technique_id} [{kind}]: {human_size(info['bytes'])} "
                    f"> recommended {human_size(FULL_WARN_BYTES)}: {rel}"
                )

        return info

    for entry in index:
        technique_id = entry["id"]
        module = repo / norm(entry["path"])
        meta = json.loads((module / "meta.json").read_text(encoding="utf-8"))

        image_ref = meta.get("image")
        thumbnail_ref = meta.get("thumbnail")
        gallery_refs = meta.get("images") or []

        full_info = None
        thumb_info = None

        if image_ref:
            full_info = check_webp(technique_id, "image", image_ref)

        if meta.get("status") == "published" and not thumbnail_ref:
            error(f"{technique_id}: published technique has no thumbnail")
        elif thumbnail_ref:
            expected_name = (
                f"{Path(norm(image_ref)).stem}-thumb.webp"
                if image_ref
                else None
            )
            actual_name = Path(norm(thumbnail_ref)).name

            if expected_name and actual_name != expected_name:
                error(
                    f"{technique_id} [thumbnail]: expected filename "
                    f"{expected_name}, got {actual_name}"
                )

            if image_ref and norm(thumbnail_ref) == norm(image_ref):
                error(f"{technique_id}: thumbnail path equals full image path")

            thumb_info = check_webp(
                technique_id,
                "thumbnail",
                thumbnail_ref,
                thumbnail=True,
            )

        if full_info and thumb_info:
            full_ratio = full_info["width"] / full_info["height"]
            thumb_ratio = thumb_info["width"] / thumb_info["height"]
            relative_difference = abs(full_ratio - thumb_ratio) / full_ratio

            if relative_difference > ASPECT_RATIO_TOLERANCE:
                error(
                    f"{technique_id} [thumbnail]: aspect ratio differs from full image "
                    f"by {relative_difference * 100:.2f}%"
                )

        if not isinstance(gallery_refs, list):
            error(f"{technique_id}: images must be an array")
            continue

        for gallery_ref in gallery_refs:
            if gallery_ref and gallery_ref != image_ref:
                check_webp(technique_id, "gallery", gallery_ref)

    print("Image specification check")
    print("=========================")
    print(f"Techniques:       {len(index)}")
    print(f"Primary images:   {full_count}")
    print(f"Gallery images:   {gallery_count}")
    print(f"Thumbnails:       {thumb_count}")
    print(f"Primary/gallery:  {human_size(full_bytes)}")
    print(f"Thumbnails:       {human_size(thumb_bytes)}")
    print(f"Warnings:         {len(warnings)}")
    print(f"Errors:           {len(errors)}")

    if warnings:
        print("\nWARNINGS:")
        for item in warnings:
            print(f"  - {item}")

    if errors:
        print("\nERRORS:")
        for item in errors:
            print(f"  - {item}")
        print("\nRESULT: FAIL")
        return 1

    print("\nRESULT: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
