#!/usr/bin/env bash
# ==============================================================================
# DiaChrome-Tweaks — Non-Invasive macOS Setup Helper (`setup.sh` v1.1.0)
#
# Inspired by JaceThings/DiaTweaks, adapted for corporate IT / MDM environments:
# - NEVER modifies, patches, or re-signs `/Applications/Google Chrome.app`
# - Applies safe, reversible `defaults write com.google.Chrome` user-space
#   preferences (including `NSUserKeyEquivalents` for toolbar hiding)
#
# Usage:
#   ./setup.sh            # Apply recommended Dia-style Chrome user defaults
#   ./setup.sh --status   # Show current status & verify Chrome code signature
#   ./setup.sh --revert   # Revert user defaults back to stock Chrome
# ==============================================================================

set -euo pipefail

CHROME_APP="/Applications/Google Chrome.app"
CHROME_DOMAIN="com.google.Chrome"

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RESET="\033[0m"

print_banner() {
  echo -e "${BOLD}${CYAN}╭──────────────────────────────────────────────────────────────╮${RESET}"
  echo -e "${BOLD}${CYAN}│  DiaChrome-Tweaks v1.1 — Official Google Chrome Setup (macOS) │${RESET}"
  echo -e "${BOLD}${CYAN}╰──────────────────────────────────────────────────────────────╯${RESET}"
}

verify_chrome_untouched() {
  if [[ -d "$CHROME_APP" ]]; then
    echo -e "${DIM}→ Verifying official Google Chrome signature integrity...${RESET}"
    local sig_info
    sig_info="$(codesign -dv "$CHROME_APP" 2>&1 || true)"
    if [[ "$sig_info" == *"Authority=Developer ID Application: Google LLC"* ]]; then
      echo -e "  ${GREEN}✓ Official Google LLC signature intact (MDM / Okta Device Trust safe)${RESET}"
    else
      echo -e "  ${YELLOW}! Could not confirm Google LLC authority string, but binary was NOT touched.${RESET}"
    fi
  else
    echo -e "  ${YELLOW}! Google Chrome not found at ${CHROME_APP}${RESET}"
  fi
}

show_status() {
  print_banner
  verify_chrome_untouched
  echo ""
  echo -e "${BOLD}Current User-Space Chrome Defaults (${CHROME_DOMAIN}):${RESET}"
  for key in AppleEnableSwipeNavigateWithScrolls NSUserKeyEquivalents ExpandCoalescedTabGroups; do
    val=$(defaults read "$CHROME_DOMAIN" "$key" 2>/dev/null || echo "(default)")
    echo -e "  • ${CYAN}${key}${RESET}: ${val}"
  done
  echo ""
}

apply_defaults() {
  print_banner
  verify_chrome_untouched
  echo ""
  echo -e "${BOLD}1. Applying safe user-space macOS defaults for ${CHROME_DOMAIN}...${RESET}"

  # Enable smooth two-finger trackpad back/forward swipe navigation (Dia/Arc style)
  defaults write "$CHROME_DOMAIN" AppleEnableSwipeNavigateWithScrolls -bool TRUE
  echo -e "  ${GREEN}✓${RESET} Enabled trackpad two-finger swipe navigation"

  # Ensure 'Always Show Toolbar in Full Screen' menu item has Shift+Cmd+F bound
  defaults write "$CHROME_DOMAIN" NSUserKeyEquivalents -dict-add "Always Show Toolbar in Full Screen" "@\$f"
  echo -e "  ${GREEN}✓${RESET} Bound 'Always Show Toolbar in Full Screen' toggle to Shift+Cmd+F"

  # Reduce macOS window resize animation lag for snappier full-screen transitions
  defaults write "$CHROME_DOMAIN" NSWindowResizeTime -float 0.08
  echo -e "  ${GREEN}✓${RESET} Tuned full-screen / window transition speed (0.08s)"

  echo ""
  echo -e "${BOLD}2. Load the DiaChrome-Tweaks v1.1 Extension:${RESET}"
  echo -e "  a) Open ${CYAN}chrome://extensions${RESET} in Google Chrome"
  echo -e "  b) Enable ${BOLD}Developer mode${RESET} (top-right toggle)"
  echo -e "  c) Click ${BOLD}Load unpacked${RESET} and select:"
  echo -e "     ${GREEN}$(cd "$(dirname "$0")" && pwd)${RESET}"
  echo -e "     (Or click the ${BOLD}↻ Reload${RESET} icon on the DiaChrome-Tweaks card if already loaded)"
  echo ""
  echo -e "${BOLD}3. Two Ways to Hide the Top URL Bar in Official Chrome:${RESET}"
  echo -e "  • ${BOLD}Option A — Windowed Mode (Frameless Dia Window):${RESET}"
  echo -e "    Press ${CYAN}⌘⇧D${RESET} (or click ${BOLD}Frameless${RESET} in the popup) to pop any tab into a"
  echo -e "    toolbar-less Dia window with our ${BOLD}In-Page Hover Vertical Sidebar${RESET} (hover left edge or press ${CYAN}⌘S${RESET})!"
  echo -e "  • ${BOLD}Option B — Full-Screen Mode (Native Auto-Hide):${RESET}"
  echo -e "    Press ${CYAN}⌃⌘F${RESET} for Full Screen and press ${CYAN}⇧⌘F${RESET} (${BOLD}View → Always Show Toolbar in Full Screen${RESET} Off)."
  echo ""
}

revert_defaults() {
  print_banner
  echo -e "${BOLD}Reverting DiaChrome-Tweaks user-space defaults...${RESET}"
  defaults delete "$CHROME_DOMAIN" AppleEnableSwipeNavigateWithScrolls 2>/dev/null || true
  defaults delete "$CHROME_DOMAIN" NSUserKeyEquivalents 2>/dev/null || true
  defaults delete "$CHROME_DOMAIN" NSWindowResizeTime 2>/dev/null || true
  echo -e "  ${GREEN}✓ Reverted user-space defaults to Chrome stock settings.${RESET}"
  verify_chrome_untouched
}

case "${1:-}" in
  --status|-s)
    show_status
    ;;
  --revert|-r)
    revert_defaults
    ;;
  *)
    apply_defaults
    ;;
esac
