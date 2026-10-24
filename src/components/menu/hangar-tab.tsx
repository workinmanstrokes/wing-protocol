import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MECH_MAP } from "@/game/data";
import { equipItem, unequipSlot, upgradeItem } from "@/game/save";
import { MAX_LEVEL, SLOTS, SLOT_LABEL, applyGear, gearPower, upgradeCost } from "@/game/meta/gear";
import type { GearItem, GearSlot } from "@/game/types";
import { Eyebrow, GearCard, GearMods, MechPortrait, rarityClass, useSave } from "./shared";

const RANK = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;

export function HangarTab() {
  const save = useSave();
  const [slot, setSlot] = useState<GearSlot>("weapon");
  const [sel, setSel] = useState<string | null>(null);
  const mech = MECH_MAP[save.selected];
  const equippedItems = SLOTS.map((s) => save.inventory.find((g) => g.id === save.equipped[s])).filter(
    (g): g is GearItem => !!g,
  );
  const base = {
    hp: mech.stats.hp,
    speed: mech.stats.speed,
    fire: mech.stats.fireRate,
    dmg: mech.stats.damage,
    range: mech.stats.range,
    magnet: 88,
    skillHaste: 1,
    crit: 0.06,
  };
  const geared = applyGear(base, equippedItems);
  const list = useMemo(
    () =>
      save.inventory
        .filter((g) => g.slot === slot)
        .sort((a, b) => RANK[a.rarity] - RANK[b.rarity] || gearPower(b) - gearPower(a)),
    [save.inventory, slot],
  );
  const item = save.inventory.find((g) => g.id === sel) ?? null;
  const cost = item ? upgradeCost(item) : null;
  const isOn = item ? save.equipped[item.slot] === item.id : false;

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-2">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="flex gap-3 rounded-xl border border-border bg-surface/90 p-3">
          <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-border">
            <MechPortrait id={mech.id} className="h-28" />
          </div>
          <div className="min-w-0 flex-1">
            <Eyebrow>{mech.role}</Eyebrow>
            <h2 className="font-display text-2xl font-semibold leading-tight">{mech.name}</h2>
            <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs" data-testid="mech-stats">
              <StatDelta label="Hull" a={base.hp} b={geared.hp} />
              <StatDelta label="Damage" a={base.dmg} b={geared.dmg} digits={1} />
              <StatDelta label="Rate" a={base.fire} b={geared.fire} digits={1} />
              <StatDelta label="Thrust" a={base.speed} b={geared.speed} />
              <StatDelta label="Reach" a={base.range} b={geared.range} />
              <StatDelta label="Crit" a={base.crit * 100} b={geared.crit * 100} suffix="%" />
            </dl>
          </div>
        </section>

        <section aria-label="Loadout">
          <Eyebrow className="mb-2">Loadout · tap a slot</Eyebrow>
          <div className="grid grid-cols-5 gap-1.5">
            {SLOTS.map((s) => {
              const it = save.inventory.find((g) => g.id === save.equipped[s]);
              return (
                <button
                  key={s}
                  type="button"
                  data-slot={s}
                  aria-pressed={slot === s}
                  onClick={() => {
                    setSlot(s);
                    setSel(it?.id ?? null);
                  }}
                  className={cn(
                    "min-h-16 rounded-lg border p-1.5 text-left",
                    slot === s ? "border-accent bg-elevated" : "border-border bg-surface/90",
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wider text-muted">{SLOT_LABEL[s]}</p>
                  {it ? (
                    <>
                      <p className="truncate font-display text-xs font-semibold leading-tight">{it.name}</p>
                      <p className={cn("text-[11px] capitalize", rarityClass(it.rarity))}>Lv {it.level}</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-subtle">Empty</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {item && (
          <section aria-label="Selected part" className="rounded-xl border border-border bg-surface/95 p-3" data-testid="gear-detail">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted">{SLOT_LABEL[item.slot]}</p>
                <h3 className="font-display text-xl font-semibold leading-tight">{item.name}</h3>
                <p className={cn("text-xs capitalize", rarityClass(item.rarity))}>
                  {item.rarity} · Lv {item.level}/{MAX_LEVEL[item.rarity]}
                </p>
              </div>
              <GearMods item={item} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="equip-toggle"
                onClick={() => (isOn ? unequipSlot(item.slot) : equipItem(item.id))}
                className={cn(
                  "min-h-12 rounded-lg font-display text-sm font-bold uppercase tracking-wider",
                  isOn ? "border border-border text-muted" : "bg-accent text-accent-fg",
                )}
              >
                {isOn ? "Unequip" : "Equip"}
              </button>
              <button
                type="button"
                data-testid="upgrade"
                disabled={!cost || save.credits < cost.credits || save.shards < cost.shards}
                onClick={() => upgradeItem(item.id)}
                className="min-h-12 rounded-lg border border-border bg-elevated text-sm font-semibold disabled:opacity-40"
              >
                {cost ? (
                  <>
                    Upgrade
                    <span className="block text-[11px] font-normal text-muted">
                      {cost.credits} cr · {cost.shards} shards
                    </span>
                  </>
                ) : (
                  "Max level"
                )}
              </button>
            </div>
          </section>
        )}

        <section aria-label="Parts">
          <Eyebrow className="mb-2">
            {SLOT_LABEL[slot]} parts · {list.length}
          </Eyebrow>
          {list.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface/90 p-4 text-sm text-muted">
              No {SLOT_LABEL[slot].toLowerCase()} parts yet. Open crates in the Store or extract from a sortie.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((g) => (
                <GearCard
                  key={g.id}
                  item={g}
                  testId="gear-card"
                  active={sel === g.id}
                  onClick={() => setSel(g.id)}
                  footer={
                    save.equipped[g.slot] === g.id ? (
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-accent">Equipped</p>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatDelta({ label, a, b, digits = 0, suffix = "" }: { label: string; a: number; b: number; digits?: number; suffix?: string }) {
  const up = b - a > 0.0001;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display text-sm font-semibold tabular-nums">
        {b.toFixed(digits)}
        {suffix}
        {up && <span className="ml-1 text-[11px] text-ok">+{(b - a).toFixed(digits)}</span>}
      </dd>
    </div>
  );
}
