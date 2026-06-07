import { describe, expect, it } from "vitest";

import {
  BACKTEST_KEYBOARD_SHORTCUTS,
  isInteractiveEventTarget,
} from "@/components/backtest/keyboard-shortcuts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("isInteractiveEventTarget", () => {
  it("treats form fields and native controls as interactive", () => {
    for (const tag of ["input", "textarea", "select", "button", "option"]) {
      const el = document.createElement(tag);
      expect(isInteractiveEventTarget(el)).toBe(true);
    }
  });

  it("treats contenteditable elements as interactive", () => {
    const el = document.createElement("div");
    el.setAttribute("contenteditable", "true");
    document.body.appendChild(el);
    expect(isInteractiveEventTarget(el)).toBe(true);
  });

  it("treats ARIA widget roles as interactive", () => {
    for (const role of ["combobox", "listbox", "menu", "slider", "switch", "spinbutton"]) {
      const el = document.createElement("div");
      el.setAttribute("role", role);
      expect(isInteractiveEventTarget(el)).toBe(true);
    }
  });

  it("treats elements inside an open dialog or menu as interactive", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const inner = document.createElement("span");
    dialog.appendChild(inner);
    document.body.appendChild(dialog);

    expect(isInteractiveEventTarget(inner)).toBe(true);
  });

  it("does not treat the chart surface or plain elements as interactive", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    expect(isInteractiveEventTarget(div)).toBe(false);
    expect(isInteractiveEventTarget(null)).toBe(false);
    expect(isInteractiveEventTarget(window)).toBe(false);
  });
});

describe("BACKTEST_KEYBOARD_SHORTCUTS", () => {
  it("documents the core replay shortcuts", () => {
    const keys = BACKTEST_KEYBOARD_SHORTCUTS.map((shortcut) => shortcut.keys);
    expect(keys).toContain("Space");
    expect(keys).toContain("→");
    expect(keys).toContain("Alt + B");
    for (const shortcut of BACKTEST_KEYBOARD_SHORTCUTS) {
      expect(shortcut.description.length).toBeGreaterThan(0);
    }
  });
});
