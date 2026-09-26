#!/usr/bin/env bash
# Normalises each recorded chapter: trimmed to the moment its roll began, 30fps, at the size it
# was captured. Transitions, captions and sound are the render's job; this only prepares footage.
#
# The capture is 1600x900. An earlier version scaled it to 1440x900, which stretched every frame
# 11% tall and let the render's cover-fit crop 48px off the top and bottom of the page. Nothing
# here changes the picture's geometry now; the check at the end refuses a clip that is not 16:9.
#
#   npm run film:cut
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=film
[ -f "$OUT/setup.json" ] || { echo "No $OUT/setup.json - run: npm run film"; exit 1; }

rm -f "$OUT"/norm-*.mp4
python3 - "$OUT" <<'PYEOF'
import json, os, subprocess, sys
out = sys.argv[1]
setup = json.load(open(os.path.join(out, "setup.json")))
lengths = {}
for seg in sorted(setup):
    d = os.path.join(out, seg)
    src = next((os.path.join(d, f) for f in os.listdir(d) if f.endswith(".webm")), None)
    if not src:
        sys.exit(f"  ! no video in {d}")
    dst = os.path.join(out, f"norm-{seg[:2]}.mp4")
    # Playwright records from the context's creation, so each clip opens on setup: navigation,
    # painting, the first chain reads. The film recorded how long that took; cut exactly there.
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(setup[seg]), "-i", src,
                    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "10", "-an", dst], check=True)
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                            "stream=width,height:format=duration", "-of", "json", dst],
                           capture_output=True, text=True, check=True)
    info = json.loads(probe.stdout)
    w, h = info["streams"][0]["width"], info["streams"][0]["height"]
    if w * 9 != h * 16:
        sys.exit(f"  ! {seg} is {w}x{h}, not 16:9: the render would crop it")
    lengths[seg] = round(float(info["format"]["duration"]), 3)
    print(f"  {seg:<14} {w}x{h}  {lengths[seg]:6.2f}s")
json.dump(lengths, open(os.path.join(out, "segments.json"), "w"), indent=2)
PYEOF
echo "  Next: npm run film:measure"
