from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
OVERLAY = HERE / "overlay"

def main():
    if len(sys.argv) > 1:
        repo = Path(sys.argv[1]).resolve()
    else:
        repo = Path.cwd().resolve()

    required = [repo / "index.html", repo / "assets/js/app.js", repo / "data/categories.json"]
    missing = [str(p) for p in required if not p.exists()]
    if missing:
        print("ERROR: this does not look like the Open-Massage-Guide repository.")
        print("Missing:", *missing, sep="\n  ")
        print("\nUsage:")
        print(r'  python apply_modular_content_v1.py D:\Open-Massage-Guide')
        return 2

    # Copy the overlay.
    for source in OVERLAY.rglob("*"):
        if not source.is_file():
            continue
        rel = source.relative_to(OVERLAY)
        target = repo / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        print(f"WRITE  {rel}")

    # Remove legacy monolithic technique catalog.
    legacy = repo / "data/techniques.json"
    if legacy.exists():
        legacy.unlink()
        print("DELETE data/techniques.json")

    # Add modular card styles to index.html without touching the existing theme styles.
    index_path = repo / "index.html"
    html = index_path.read_text(encoding="utf-8")
    modular_link = '  <link rel="stylesheet" href="./assets/css/modular-extra.css" />'
    if modular_link not in html:
        anchor = '  <link rel="stylesheet" href="./assets/css/styles.css" />'
        if anchor not in html:
            print("ERROR: styles.css link not found in index.html")
            return 3
        html = html.replace(anchor, anchor + "\n" + modular_link, 1)
        index_path.write_text(html, encoding="utf-8")
        print("PATCH  index.html")

    # Validate when Node is available.
    try:
        result = subprocess.run(
            ["node", "scripts/validate-content.mjs"],
            cwd=repo,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.stdout:
            print(result.stdout.strip())
        if result.stderr:
            print(result.stderr.strip())
        if result.returncode != 0:
            print("ERROR: validation failed.")
            return result.returncode
    except FileNotFoundError:
        print("WARN: Node.js not found; skipped validation.")

    print("\nDone.")
    print("Review with:")
    print("  git status --short")
    print("  git diff --stat")
    print("Then run:")
    print("  python -m http.server 8080")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
