# Mech roster — visual roles and abilities

Player suits keep their ids, unlock costs, weapons, vault ownership, and save slots.
This pass redraws each frame and gives it one active and one passive that do not
overlap. Numbers below are the combat contract in `src/game/abilities.ts` and
`src/game/data.ts`.

Top-down art is drawn in `src/game/lineup-art.ts` (hangar portraits use the same
draw). Each suit has a different body plan, weapon mount, and palette. Nose is +x.

| Id | Suit | Role | Silhouette | Passive | Active | CD | Tradeoff |
|---|---|---|---|---|---|---|---|
| aether | Aether Wing | Interceptor | Needle fuselage, swept wings, twin spinal lances | Glass Optics: weapon yield +12%, hull damage taken +8% | Needle Lance: one thin piercing beam down the aim line | 8.5s | No area damage |
| forge | Heavy Forge | Artillery | Wide slab, shoulder racks, rotary snout | Plated Cab: incoming damage −12% | Anchor Barrage: root, brace, six heavy shells in a forward fan | 12s | Almost stationary while it fires |
| scythe | Night Scythe | Reaper | Asymmetric crescent and one glaive | Blood Tempo: a kill grants 0.55s of +28% speed | Phase Step: short aim-dash, brief invulnerability, thin trail | 6.5s | Fragile; the cut is narrow |
| dune | Dune Shield | Vanguard | Forward disc shield, gun through the boss | Bulwark: the first hit each 7s is halved | Aegis Arc: 3s front arc deletes incoming shots and shoves nearby hulls | 13s | Back and contact damage still land |
| serpent | Jade Serpent | Striker | Five-segment S-body, twin fangs | Venom: hits leave a short damage-over-time | Fang Orbit: three blades circle for 4.2s | 10s | Poison is slow, not a burst |
| storm | Storm Warden | Control | Core pod and three coil masts | Capacitor: every 5th hit jumps to a nearby hull | Static Net: a slowing field ahead, light ticks | 11s | Control, not a damage spike |
| vulture | Iron Vulture | Bomber | Single flying wing, open bay | Crater: large blasts leave a short scorch | Mine Fan: three mines along the aim line | 12s | Mines need a moment to arm |
| cross | Solar Cross | Paladin | Cruciform hull, halo, long lance | Field Mend: slow repair below half hull if you have not been hit for 2s | Sanctum: 3.2s ward (−28% damage) and a 12% heal over that time | 14s | Almost no offensive skill |
| moth | Lantern Moth | Controller | Four separate wing panels, lantern abdomen | Dust Wake: hulls in the wake behind you move slower | Lure Lamp: a local lamp pulls non-bosses, then a small burst | 11s | Bosses ignore the pull |
| kiln | Kiln Tortoise | Juggernaut | Low dome, four stub legs, grate snout | Thorns: a slice of damage taken splashes nearby | Kiln Seal: 2.1s invulnerable, slowed, close scorch | 13s | You become a slow turret |
| kite | Tether Kite | Skirmisher | Diamond sail, cross spars, long ribbon | Slipstream: near top speed, fire interval −14% | Ribbon Line: a short dash that leaves a damaging line | 8s | The line is thin |

VFX stay on the mech or the aim line. Skills do not fill the screen. Enemy plates
carry a light rim so they read on the dark floor tiles.

Movement, exact aim, dual-thumb sticks, and every game mode stay as they are.
Saves are unchanged: still `wing-protocol-save-v1`, same mech ids.
