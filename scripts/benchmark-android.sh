#!/usr/bin/env bash
set -euo pipefail

package=com.muneebanjum.hisabkitab
activity="$package/.MainActivity"
samples="${1:-10}"

if ! [[ "$samples" =~ ^[1-9][0-9]*$ ]]; then
  echo 'Usage: scripts/benchmark-android.sh [positive sample count]' >&2
  exit 2
fi
command -v adb >/dev/null || { echo 'adb is required.' >&2; exit 2; }
adb get-state >/dev/null

times=()
for ((run = 1; run <= samples; run++)); do
  adb shell am force-stop "$package"
  output="$(adb shell am start -W -n "$activity")"
  value="$(awk -F ': ' '/^TotalTime:/ {gsub(/\r/, "", $2); print $2}' <<< "$output")"
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "Could not read Android launch time for run $run: $output" >&2
    exit 1
  fi
  times+=("$value")
  printf 'Run %02d: %s ms\n' "$run" "$value"
done

printf '%s\n' "${times[@]}" | sort -n | awk '
  { samples[NR] = $1; sum += $1 }
  END {
    middle = int((NR + 1) / 2)
    median = NR % 2 ? samples[middle] : (samples[middle] + samples[middle + 1]) / 2
    printf "Median Android activity launch: %.1f ms (%d runs)\n", median, NR
    printf "Mean Android activity launch: %.1f ms\n", sum / NR
  }'

echo 'For the WebView-to-ledger interval, inspect performance.getEntriesByName("hk-ledger-startup") in Chrome remote debugging.'
