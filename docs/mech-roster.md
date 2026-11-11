# Mech roster — visual roles and abilities

Player suits keep their ids, unlock costs, weapons, vault ownership, and save slots.
This pass redraws each frame and gives it one active and one passive that do not
overlap. Numbers below are the combat contract in `src/game/abilities.ts` and
`src/game/data.ts`.

Top-down art is drawn in `src/game/lineup-art.ts` (hangar portraits use the same
draw). Each suit has a different body plan, weapon mount, and palette. Nose is +x.

| Id | Suit | Role | Silhouette | Passive | Active | CD | Tradeoff |
|---|---|---|---|---|---|---|---|
| aether | Aether Wing | Interceptor | Needle fuselage, swept wings, twin spinal lances | Glass Optics: weapon yield +12%. Hull 124. After 1.6s unhit, repair 2.8%/s. No longer takes extra damage | Needle Lance: one thin piercing beam down the aim line | 8.5s | No area damage. Still well under the vanguard's hull, and the repair only runs while you disengage |
| forge | Heavy Forge | Artillery | Wide slab, shoulder racks, rotary snout | Plated Cab: incoming damage −12% | Anchor Barrage: root, brace, six heavy shells in a forward fan | 12s | Almost stationary while it fires |
| scythe | Night Scythe | Reaper | Asymmetric crescent and one glaive | Blood Tempo: a kill grants 0.55s of +28% speed | Phase Step: short aim-dash, brief invulnerability, thin trail | 6.5s | Fragile; the cut is narrow |
| dune | Dune Shield | Vanguard | Forward disc shield, gun through the boss | Bulwark: the first hit each 7s is halved | Aegis Arc: 3s front arc deletes incoming shots and shoves nearby hulls | 13s | Back and contact damage still land |
| serpent | Jade Serpent | Striker | Five-segment S-body, twin fangs | Venom: hits leave a short damage-over-time | Fang Orbit: three blades circle for 4.2s | 10s | Poison is slow, not a burst |
| storm | Storm Warden | Control | Core pod and three coil masts | Capacitor: every 5th hit jumps and restores 4 hull. Hull 132. A 22-point coil absorbs chip and refills after 1.6s untouched. While Static Net is deployed, incoming damage −32% even if you have stepped out of the circle | Static Net: a wide field ahead. Hulls inside move at half speed for 4.4s | 8s | The coil is a buffer, not a plate. Dune Shield is still 168 hull with a front-arc delete. The reduction ends when the net does |
| vulture | Iron Vulture | Bomber | Single flying wing, open bay | Crater: large blasts leave a short scorch | Mine Fan: three mines along the aim line | 12s | Mines need a moment to arm |
| cross | Solar Cross | Paladin | Cruciform hull, halo, long lance | Field Mend: slow repair below half hull if you have not been hit for 2s | Sanctum: 3.2s ward (−28% damage) and a 12% heal over that time | 14s | Almost no offensive skill |
| moth | Lantern Moth | Controller | Four separate wing panels, lantern abdomen | Dust Wake: hulls in the wake behind you move slower | Lure Lamp: a local lamp pulls non-bosses, then a small burst | 11s | Bosses ignore the pull |
| kiln | Kiln Tortoise | Juggernaut | Low dome, four stub legs, grate snout | Thorns: a slice of damage taken splashes nearby | Kiln Seal: 2.1s invulnerable, slowed, close scorch | 13s | You become a slow turret |
| kite | Tether Kite | Skirmisher | Diamond sail, cross spars, long ribbon | Slipstream: while moving (about half speed), fire interval −14% and incoming damage −36%. Hull 136. The first hit in that state is cut by another 12, then the buffer recharges over 3.4s of movement. Dash i-frames 0.36s | Ribbon Line: a short dash that leaves a damaging line and refreshes the buffer | 8s | Stop and both the reduction and the buffer drop. The line is still thin |

VFX stay on the mech or the aim line. Skills do not fill the screen. Enemy plates
carry a cached light rim so they read on the dark floor tiles. Hulls clipped by
the view get an edge chevron; walkers and crawlers use a larger mark.

Sector 1 survival: Aether, Storm and Kite stay lighter than Dune Shield (168 hull,
front-arc delete, halved first hit). Kite's hull is 136 and its reduction only
exists while it is moving, so a parked kite is still paper. Aether only repairs
while untouched. Storm's hull is 132 plus a 22-point coil; the 32% reduction
lasts only while the net is deployed, because a two-thumb pilot drops that
field ahead and kites out of it.

Sector 1 never has more than 12 non-boss hulls. The ramp starts at 5 and
reaches 12 at the titan. A surge does not raise the cap. A scripted elite
promotes a hull already on the field when the cap is full.

Movement, exact aim, dual-thumb sticks, and every game mode stay as they are.
Saves are unchanged: still `wing-protocol-save-v1`, same mech ids.
