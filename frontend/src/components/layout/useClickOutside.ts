import { useEffect, type RefObject } from "react";

// Calls `onOutside` when the user clicks outside `ref` (and `alsoInside`, e.g. a
// portalled panel) or presses Escape.
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
  alsoInside?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!active) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !alsoInside?.current?.contains(t)) onOutside();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, active, onOutside, alsoInside]);
}
