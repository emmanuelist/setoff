#!/usr/bin/env bash
# Upload master.
#
# The mix output is ~1.1 Mbps in yuv444p. Both are wrong for a platform:
# YouTube re-encodes whatever it is given, so a thin source compounds into a
# smeared one — and this film is dark with 1px rules and small tabular figures,
# which is the worst case for a low-bitrate encode. yuv444p is also outside what
# some players and platforms handle cleanly; 420 is the safe, expected chroma.
#
#   npm run film:master
set -euo pipefail
cd "$(dirname "$0")/.."

IN=film/setoff-demo.mp4
OUT=film/setoff-master.mp4

# Remotion renders full-range (yuvj420p). -pix_fmt alone does not convert the
# RANGE, only the layout, so the file stays flagged full and players that honour
# the flag crush blacks or wash out the light plates. Convert explicitly to
# limited/TV range, which is what every platform expects.
ffmpeg -y -loglevel error -i "$IN" \
  -vf "scale=in_range=full:out_range=limited,format=yuv420p" \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:v libx264 -preset slow -crf 16 -maxrate 16M -bufsize 32M \
  -pix_fmt yuv420p -profile:v high -level 4.2 \
  -x264-params "keyint=60:min-keyint=30:scenecut=40" \
  -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 \
  "$OUT"

s=$(du -m "$OUT" | cut -f1)
br=$(ffprobe -v error -select_streams v -show_entries stream=bit_rate -of csv=p=0 "$OUT")
pf=$(ffprobe -v error -select_streams v -show_entries stream=pix_fmt -of csv=p=0 "$OUT")
printf "\n  %s  %sMB  %.1f Mbps  %s\n" "$OUT" "$s" "$(echo "$br/1000000" | bc -l)" "$pf"
