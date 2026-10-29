import "./index.css";

import { expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { dismissContextMenu, showContextMenuFallback } from "./contextMenuFallback";

const items = [
  { id: "rename", label: "Rename", icon: "pencil", shortcut: "F2" },
  { id: "new", label: "New thread", icon: "plus", shortcut: "Ctrl+Shift+N" },
  {
    id: "copy",
    label: "Copy",
    icon: "copy",
    children: [
      { id: "path", label: "Path" },
      { id: "branch", label: "Branch" },
    ],
  },
  { id: "delete", label: "Delete", icon: "trash", destructive: true, separatorBefore: true },
];

function openMenu(position: { x: number; y: number }) {
  void showContextMenuFallback(items, position);
  return { [Symbol.dispose]: () => dismissContextMenu() };
}

// Layout boxes, not getBoundingClientRect: the pop-in scale would skew a mid-transition read.
const box = (element: HTMLElement) => {
  const left = Number.parseFloat(element.style.left);
  const top = Number.parseFloat(element.style.top);
  return { left, top, right: left + element.offsetWidth, bottom: top + element.offsetHeight };
};

const menus = () => [...document.querySelectorAll<HTMLElement>("[data-context-menu]")];
const button = (label: string) =>
  [...menus()[0]!.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.startsWith(label),
  )!;

it("draws one chip per shortcut key, kept out of the item's label", () => {
  using _menu = openMenu({ x: 20, y: 20 });
  const chips = (label: string) =>
    [...button(label).querySelectorAll("kbd")].map((chip) => chip.textContent);
  expect(chips("Rename")).toEqual(["F2"]);
  expect(chips("New thread")).toEqual(["Ctrl", "Shift", "N"]);
  expect(button("Rename").querySelector("kbd")!.closest("[aria-hidden='true']")).not.toBeNull();
});

it("flips a menu opened at the bottom-right corner back inside the window", async () => {
  await page.viewport(1000, 700);
  const x = window.innerWidth - 10;
  const y = window.innerHeight - 10;
  using _menu = openMenu({ x, y });
  const rect = box(menus()[0]!);
  expect(rect.right).toBeLessThanOrEqual(x);
  expect(rect.bottom).toBeLessThanOrEqual(y);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.top).toBeGreaterThanOrEqual(0);
});

it("opens a submenu toward the side that has room", async () => {
  await page.viewport(1000, 700);
  using _menu = openMenu({ x: window.innerWidth - 10, y: 20 });
  const trigger = button("Copy");
  trigger.click();
  const parentRect = box(menus()[0]!);
  const childRect = box(menus()[1]!);
  expect(childRect.right).toBeLessThanOrEqual(parentRect.left);
  expect(childRect.top).toBe(parentRect.top + trigger.offsetTop - 4);
});
