export type Actions = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  skill: boolean;
  pause: boolean;
  hasAim: boolean;
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyP",
  "Escape",
]);

function radial(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class GameInput {
  private keys = new Set<string>();
  private injected: Set<string> | null = null;
  pointer = { x: 0, y: 0, down: false, over: false };
  leftStick = { x: 0, y: 0 };
  rightStick = { x: 0, y: 0 };
  skillTap = false;
  pauseTap = false;
  private prevSkill = false;
  private prevPause = false;
  private attached: HTMLElement | null = null;
  private unbind: (() => void) | null = null;

  attach(el: HTMLElement) {
    this.detach();
    this.attached = el;
    const onDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => this.keys.clear();
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left;
      this.pointer.y = e.clientY - r.top;
      this.pointer.over = true;
      if (e.type === "pointerdown" && e.button === 0) this.pointer.down = true;
      if (e.type === "pointerup" || e.type === "pointercancel") this.pointer.down = false;
    };
    const onLeave = () => {
      this.pointer.over = false;
      this.pointer.down = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    el.addEventListener("pointerdown", onPointer);
    el.addEventListener("pointermove", onPointer);
    el.addEventListener("pointerup", onPointer);
    el.addEventListener("pointercancel", onPointer);
    el.addEventListener("pointerleave", onLeave);
    this.unbind = () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      el.removeEventListener("pointerdown", onPointer);
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerup", onPointer);
      el.removeEventListener("pointercancel", onPointer);
      el.removeEventListener("pointerleave", onLeave);
    };
  }

  detach() {
    this.unbind?.();
    this.unbind = null;
    this.attached = null;
    this.keys.clear();
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }

  setLeftStick(x: number, y: number) {
    this.leftStick = radial(x, y);
  }

  setRightStick(x: number, y: number) {
    this.rightStick = radial(x, y, 0.22);
  }

  sample(): Actions {
    const k = this.injected ?? this.keys;
    let mx = 0;
    let my = 0;
    if (k.has("KeyA") || k.has("ArrowLeft")) mx -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) mx += 1;
    if (k.has("KeyW") || k.has("ArrowUp")) my -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) my += 1;
    mx += this.leftStick.x;
    my += this.leftStick.y;

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : [];
    if (pads) {
      for (const p of pads) {
        if (!p || p.mapping !== "standard") continue;
        const ls = radial(p.axes[0] ?? 0, p.axes[1] ?? 0);
        const rs = radial(p.axes[2] ?? 0, p.axes[3] ?? 0, 0.22);
        mx += ls.x;
        my += ls.y;
        this.rightStick.x += rs.x;
        this.rightStick.y += rs.y;
        if (p.buttons[0]?.pressed || p.buttons[7]?.pressed) this.skillTap = true;
        if (p.buttons[9]?.pressed) this.pauseTap = true;
      }
    }

    const m = Math.hypot(mx, my);
    if (m > 1) {
      mx /= m;
      my /= m;
    }

    const skillHeld = k.has("Space") || k.has("ShiftLeft") || k.has("ShiftRight");
    const pauseHeld = k.has("Escape") || k.has("KeyP");
    const skill = (!this.prevSkill && (skillHeld || this.skillTap)) || false;
    const pause = (!this.prevPause && (pauseHeld || this.pauseTap)) || false;
    this.prevSkill = skillHeld || this.skillTap;
    this.prevPause = pauseHeld || this.pauseTap;
    this.skillTap = false;
    this.pauseTap = false;

    const rs = this.rightStick;
    const hasStickAim = Math.hypot(rs.x, rs.y) > 0.05;
    return {
      moveX: mx,
      moveY: my,
      aimX: hasStickAim ? rs.x : this.pointer.x,
      aimY: hasStickAim ? rs.y : this.pointer.y,
      hasAim: hasStickAim || this.pointer.over,
      skill,
      pause,
    };
  }
}
