#!/usr/bin/env bash
# The upload masters: the picture from the render with the mix from the score, mastered for a
# platform that will re-encode whatever it is given.
#
#   film/setoff-master.mp4       voice, score and effects
#   film/setoff-voice-only.mp4   the same film with the voice alone, for comparison
#
# Picture. Remotion renders full-range (yuvj420p); -pix_fmt alone changes the layout, not the
# range, so the file would stay flagged full and players that honour the flag crush the blacks
# or wash out the light plates. It is converted to limited range, BT.709, and encoded at a rate
# that survives YouTube's re-encode of a dark frame full of 1px rules and small figures.
#
# Sound. Two-pass loudnorm to -16 LUFS integrated with a -1.5 dBTP ceiling, linear: pass one
# measures, pass two applies one gain, so the voice keeps its dynamics instead of being
# compressed. If the ceiling would force loudnorm into its dynamic mode, this says so.
#
#   npm run film:master
set -euo pipefail
cd "$(dirname "$0")/.."

PIC=film/setoff-picture.mp4
[ -f "$PIC" ] || { echo "No $PIC - run: npm run film:render"; exit 1; }
[ -f film/audio/mix.wav ] || { echo "No film/audio/mix.wav - run: npm run film:score"; exit 1; }

I=-16; TP=-1.5; LRA=11
VID=film/_picture-tv.mp4

ffmpeg -y -loglevel error -i "$PIC" -an \
  -vf "scale=in_range=full:out_range=limited,format=yuv420p" \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:v libx264 -preset slow -crf 16 -maxrate 16M -bufsize 32M \
  -pix_fmt yuv420p -profile:v high -level 4.2 \
  -x264-params "keyint=60:min-keyint=30:scenecut=40" \
  "$VID"

master() {
  local audio="$1" out="$2"
  local m
  m=$(ffmpeg -hide_banner -nostats -i "$audio" -af "loudnorm=I=$I:TP=$TP:LRA=$LRA:print_format=json" -f null - 2>&1 | awk '/^\{/,/^\}/')
  get() { echo "$m" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
  local second
  second=$(ffmpeg -hide_banner -nostats -y -i "$VID" -i "$audio" -map 0:v -map 1:a -c:v copy \
    -af "loudnorm=I=$I:TP=$TP:LRA=$LRA:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true:print_format=json" \
    -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart "$out" 2>&1 | awk '/^\{/,/^\}/')
  local kind
  kind=$(echo "$second" | python3 -c "import json,sys; print(json.load(sys.stdin)['normalization_type'])")
  printf "  %-28s from %s LUFS / %s dBTP, %s\n" "$out" "$(get input_i)" "$(get input_tp)" "$kind"
  [ "$kind" = "linear" ] || echo "  ! loudnorm fell back to dynamic mode for $out: the voice will be compressed"
}

master film/audio/mix.wav film/setoff-master.mp4
master film/audio/voice.wav film/setoff-voice-only.mp4
rm -f "$VID"

for f in film/setoff-master.mp4 film/setoff-voice-only.mp4; do
  v=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt,color_range,bit_rate:format=duration -of json "$f" |
    python3 -c "import json,sys; j=json.load(sys.stdin); s=j['streams'][0]; print(f\"{float(j['format']['duration']):.1f}s  {s['width']}x{s['height']} {s['pix_fmt']} {s['color_range']}  {int(s['bit_rate'])/1e6:.1f} Mbps\")")
  lu=$(ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{i=$2} s&&/Peak:/{p=$2} END{print i" LUFS, true peak "p" dBFS"}')
  printf "  %-28s %s  %sMB  %s\n" "$f" "$v" "$(du -m "$f" | cut -f1)" "$lu"
done
