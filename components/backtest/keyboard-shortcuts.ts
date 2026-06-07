// Shared helpers for the backtest workspace keyboard shortcuts.
//
// The workspace registers global `keydown` listeners (play/pause, skip, order
// ticket). Those must not fire while the user is typing in a field or operating
// another control — otherwise pressing Space on a focused button both activates
// the button and toggles playback. `isInteractiveEventTarget` is the single
// guard both listeners share.

const INTERACTIVE_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "OPTION"]);

// ARIA roles for widgets that consume their own keystrokes (Radix selects,
// menus, sliders, switches, etc.).
const INTERACTIVE_ROLES = new Set([
  "textbox",
  "combobox",
  "listbox",
  "option",
  "menu",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "slider",
  "spinbutton",
  "switch",
  "tab",
]);

// Containers whose descendants should also be treated as interactive even when
// the focused node itself isn't (e.g. a div inside an open dialog/menu).
const INTERACTIVE_CONTAINER_SELECTOR =
  '[role="dialog"],[role="menu"],[role="listbox"],[contenteditable="true"]';

/**
 * Returns true when a keyboard event originated from an editable field or any
 * interactive control, so workspace-level shortcuts should be ignored.
 */
export function isInteractiveEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (INTERACTIVE_TAG_NAMES.has(target.tagName)) {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  const role = target.getAttribute("role");
  if (role && INTERACTIVE_ROLES.has(role)) {
    return true;
  }

  if (target.closest(INTERACTIVE_CONTAINER_SELECTOR)) {
    return true;
  }

  return false;
}

export interface KeyboardShortcut {
  /** Human-readable key combination, e.g. "Space" or "Alt + B". */
  keys: string;
  description: string;
}

/** Workspace shortcuts surfaced in the discoverability popover. */
export const BACKTEST_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: "Space", description: "Play / pause replay" },
  { keys: "→", description: "Step forward one candle" },
  { keys: "Alt + B", description: "Open order ticket" },
  { keys: "Ctrl + Z", description: "Undo last drawing" },
  { keys: "Del", description: "Delete selected drawing" },
  { keys: "Esc", description: "Cancel drawing / deselect tool" },
];
