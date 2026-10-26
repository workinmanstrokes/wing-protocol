import { useEffect, useState } from "react";
import { Gem, Gift, KeyRound, PlayCircle, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { MECH_MAP } from "@/game/data";
import { canOpenCrate, openCrate, openPrismVault, type CratePay } from "@/game/save";
import {
  CORE_PACKS,
  purchaseCores,
  CORE_PURCHASES_ENABLED,
  CRATES,
  VAULT_ALL_OWNED_SHARDS,
  VAULT_COST,
  VAULT_MECHS,
  VAULT_ODDS,
  VAULT_PITY,
  adCratesLeft,
  oddsRows,
  type CrateDef,
  type GearDrop,
  type VaultResult,
} from "@/game/meta/crates";
import { dayKey } from "@/game/meta/missions";
import { showRewardedAd } from "@/game/meta/ads";
import { Eyebrow, GearCard, MechPortrait, Modal, rarityClass, useSave } from "./shared";

type Reveal = { kind: "gear"; drop: GearDrop; bonus?: number } | { kind: "mech"; mech: VaultResult & { kind: "mech" } };

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function fmtWait(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(ss).padStart(2, "0")}`;
}

export function StoreTab() {
  const save = useSave();
  const now = useNow();
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [adPlaying, setAdPlaying] = useState(false);

  const buy = (id: CrateDef["id"], pay: CratePay) => {
    const d = openCrate(id, pay);
    if (d) setReveal({ kind: "gear", drop: d });
  };
  const freeReady = canOpenCrate("free", "free", now);
  const adsLeft = adCratesLeft(dayKey(new Date(now)), save.adCrates);
  const toPity = VAULT_PITY - save.premiumPity;
  const ownedVault = VAULT_MECHS.filter((m) => save.unlocked.includes(m)).length;

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-2">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* free + ad */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface/90 p-3">
            <div className="flex items-center gap-2">
              <Gift className="size-4 text-muted" />
              <h3 className="font-display text-base font-semibold">{CRATES.free.name}</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{CRATES.free.blurb}</p>
            <OddsList odds={CRATES.free.odds} />
            <button
              type="button"
              data-testid="open-free"
              disabled={!freeReady}
              onClick={() => buy("free", "free")}
              className="mt-2 min-h-11 w-full rounded-lg bg-accent text-sm font-bold uppercase text-accent-fg disabled:bg-elevated disabled:text-muted"
            >
              {freeReady ? "Open free" : fmtWait(save.freeCrateAt - now)}
            </button>
          </div>
          <div className="rounded-xl border border-border bg-surface/90 p-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="size-4 text-muted" />
              <h3 className="font-display text-base font-semibold">{CRATES.ad.name}</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">Optional. {adsLeft}/3 left today.</p>
            <OddsList odds={CRATES.ad.odds} />
            <button
              type="button"
              data-testid="open-ad"
              disabled={adsLeft <= 0 || adPlaying}
              onClick={async () => {
                setAdPlaying(true);
                const ok = await showRewardedAd(3);
                setAdPlaying(false);
                if (ok) buy("ad", "ad");
              }}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-elevated text-sm font-semibold disabled:opacity-40"
            >
              {adsLeft > 0 ? "Watch ad" : "Back tomorrow"}
            </button>
          </div>
        </div>

        {/* soft-currency crates */}
        <section aria-label="Gear crates">
          <Eyebrow className="mb-2">Gear crates · credits or keys</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["supply", "command"] as const).map((id) => {
              const c = CRATES[id];
              return (
                <div key={id} className="rounded-xl border border-border bg-surface/90 p-3" data-crate={id}>
                  <h3 className="font-display text-lg font-semibold">{c.name}</h3>
                  <p className="text-[11px] text-muted">{c.blurb} Duplicates become upgrade shards.</p>
                  <OddsList odds={c.odds} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid={`buy-${id}-credits`}
                      disabled={!canOpenCrate(id, "credits")}
                      onClick={() => buy(id, "credits")}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-accent text-sm font-bold text-accent-fg disabled:bg-elevated disabled:text-muted"
                    >
                      <Wallet className="size-3.5" /> {c.credits}
                    </button>
                    <button
                      type="button"
                      data-testid={`buy-${id}-keys`}
                      disabled={!canOpenCrate(id, "keys")}
                      onClick={() => buy(id, "keys")}
                      className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-elevated text-sm font-semibold disabled:opacity-40"
                    >
                      <KeyRound className="size-3.5" /> {c.keys}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* premium vault */}
        <section aria-label="Prism Vault" className="rounded-xl border border-legend/50 bg-gradient-to-b from-elevated to-surface p-3" data-testid="vault">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-legend" />
              <h3 className="font-display text-lg font-semibold">Prism Vault</h3>
            </div>
            <span className="text-[11px] text-muted">{ownedVault}/3 vault mechs</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            The only way to get the three vault mechs. Cores come from missions, elite bosses and tower milestones.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {VAULT_MECHS.map((id) => (
              <div key={id} className={cn("overflow-hidden rounded-lg border", save.unlocked.includes(id) ? "border-legend/60" : "border-border")}>
                <MechPortrait id={id} className="h-16" />
                <p className="truncate px-1.5 py-1 text-[11px] font-semibold">{MECH_MAP[id].name}</p>
              </div>
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-3 gap-1 text-[11px]" aria-label="Prism Vault odds">
            <li className="rounded bg-bg/60 px-2 py-1">
              <span className="text-legend">New mech</span> {VAULT_ODDS.mech}%
            </li>
            <li className="rounded bg-bg/60 px-2 py-1">
              <span className="text-legend">Legendary</span> {VAULT_ODDS.legendary}%
            </li>
            <li className="rounded bg-bg/60 px-2 py-1">
              <span className="text-epic">Epic</span> {VAULT_ODDS.epic}%
            </li>
          </ul>
          <p className="mt-1.5 text-[11px] text-muted" data-testid="pity">
            {ownedVault < 3
              ? `Guaranteed new mech within ${toPity} vault${toPity === 1 ? "" : "s"} (every ${VAULT_PITY}th without one).`
              : `All vault mechs owned: a mech roll pays a legendary part + ${VAULT_ALL_OWNED_SHARDS} shards.`}
          </p>
          <button
            type="button"
            data-testid="open-vault"
            disabled={save.cores < VAULT_COST}
            onClick={() => {
              const r = openPrismVault();
              if (!r) return;
              if (r.kind === "mech") setReveal({ kind: "mech", mech: r });
              else setReveal({ kind: "gear", drop: r.drop, bonus: r.bonusShards });
            }}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-legend font-display text-base font-bold uppercase tracking-wider text-accent-fg disabled:bg-elevated disabled:text-muted"
          >
            <Gem className="size-4" /> Open · {VAULT_COST} cores
          </button>
        </section>

        {/* real-money packs: hidden entirely until CORE_PURCHASES_ENABLED (off for launch) */}
        {CORE_PURCHASES_ENABLED && (
          <section aria-label="Core packs" className="rounded-xl border border-border bg-surface/70 p-3">
            <h3 className="font-display text-base font-semibold">Core packs</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CORE_PACKS.map((p) => (
                <button key={p.id} type="button" onClick={() => purchaseCores(p.id)} className="min-h-11 rounded-lg border border-border bg-elevated text-xs font-semibold">
                  {p.label} · {p.cores}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {adPlaying && (
        <Modal label="Sponsor ad">
          <p className="text-center font-display text-lg font-semibold">Test ad</p>
          <p className="mt-1 text-center text-xs text-muted">Placeholder only. No real ads in this build.</p>
          <div className="mx-auto mt-4 size-10 animate-spin rounded-full border-2 border-border border-t-accent" />
        </Modal>
      )}
      {reveal && <RevealModal reveal={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

function OddsList({ odds }: { odds: CrateDef["odds"] }) {
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]" aria-label="Drop odds">
      {oddsRows(odds).map((r) => (
        <li key={r.rarity}>
          <span className={cn("capitalize", rarityClass(r.rarity))}>{r.rarity}</span> {r.pct}%
        </li>
      ))}
    </ul>
  );
}

function RevealModal({ reveal, onClose }: { reveal: Reveal; onClose: () => void }) {
  return (
    <Modal label="Crate reward" onClose={onClose}>
      <div data-testid="reveal">
        {reveal.kind === "mech" ? (
          <>
            <Eyebrow className="text-legend">New mech unlocked</Eyebrow>
            <div className="mt-2 overflow-hidden rounded-lg border border-legend/60">
              <MechPortrait id={reveal.mech.mech} className="h-40" />
            </div>
            <h3 className="mt-2 font-display text-2xl font-semibold">{MECH_MAP[reveal.mech.mech].name}</h3>
            <p className="text-xs text-muted">
              Pilot {MECH_MAP[reveal.mech.mech].pilot?.callsign} · {MECH_MAP[reveal.mech.mech].skill.name}
            </p>
          </>
        ) : (
          <>
            <Eyebrow>{reveal.drop.duplicate ? "Duplicate → shards" : "Part acquired"}</Eyebrow>
            <div className="mt-2">
              <GearCard item={reveal.drop.item} />
            </div>
            {reveal.drop.duplicate && <p className="mt-2 text-sm">+{reveal.drop.shards} upgrade shards</p>}
            {!!reveal.bonus && <p className="mt-1 text-sm">+{reveal.bonus} bonus shards</p>}
          </>
        )}
        <button type="button" data-testid="reveal-ok" onClick={onClose} className="mt-4 min-h-12 w-full rounded-lg bg-accent font-bold uppercase text-accent-fg">
          Nice
        </button>
      </div>
    </Modal>
  );
}
