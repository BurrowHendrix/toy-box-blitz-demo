# Toy Box Blitz — Player Animation Spec

Studied: `/workspace/ref/blitz_reel.mp4`, `anim_E8Eh9RiPtfY.webm` (spin/tackle),
`anim_p2HyU4eHaLc.webm` (juke/read), `anim_3SA3MPRyozQ.mkv` (hurdle),
`anim_NUMfbJgOAWc.mkv` (stiff-arm/slam), plus `BREAKDOWN_NOTES.md`.
Camera: high-behind offense (~40–50° down), ball carrier ~1/7 screen height.
Style pillars: hulking lean, high knees, snappy plants, hang on peaks, arcade exaggeration.

Character lock: teal #8 jersey + teal helmet, white pants + teal stripe, white #8,
ball tucked under RIGHT arm (carrier convention), black cleats. Same silhouette every frame.
Approved style refs: store assets `6f3d6e19…jpg` (side 3/4) and `7d8b5fd4…jpg` (game cam).

Timing assumes ~12 fps presentation (arcade snap). Hold counts are display frames.

## 8-direction run cycle (loop)

Cadence scales with speed: walk ~8 fps, jog 10, sprint/turbo 14–16.
Each direction has **8 frames** (full cycle). Diagonals are unique art (not card mirrors),
except E↔W may use a true horizontal flip **only if** the ball arm is remapped so the
ball stays on the carrier’s right relative to body (we render both instead of flip).

| Frame | Pose (facing N / upfield, back to cam) | Hold @ sprint |
|------:|----------------------------------------|--------------:|
| 0 | Contact L — L foot plant, R knee driving up, torso lean ~20°, free arm forward pump, ball tucked | 1 |
| 1 | Pass L — L toes push, R thigh high, free arm crossing | 1 |
| 2 | Flight mid — both feet off / short float, opposite arm back | 1 |
| 3 | Contact R — R plant, L knee up, lean holds | 1 |
| 4 | Pass R — mirror of 1 | 1 |
| 5 | Flight mid 2 | 1 |
| 6 | Drive — exaggerated high knee (Blitz “power step”) | 1 |
| 7 | Recover into contact L | 1 |

Directions (world +Z = upfield / N):
`n, ne, e, se, s, sw, w, nw`. Facing rotates character yaw; camera stays game-cam.

Lean into facing: when turning, 2-frame turn blend (hold previous facing frame, then new).

## Idle (4 frames)

| Frame | Pose | Hold |
|------:|------|-----:|
| 0 | Athletic ready, slight bounce down | 3 |
| 1 | Weight shift L, ball secure | 3 |
| 2 | Bounce up / breath | 3 |
| 3 | Weight shift R | 3 |

## Juke (plant + cut) — 6 frames, ~0.40 s

Physics: lateral impulse ~±2.5 yd in cut direction (perp to facing); forward speed kept ~70%.

| Frame | Phase | Pose | Hold | World offset |
|------:|-------|------|-----:|--------------|
| 0 | Anticipation | Plant outside foot, hips load opposite cut | 1 | 0 |
| 1 | Plant | Deep knee bend, torso counter-lean | 1 | 0.3 yd into plant |
| 2 | Cut | Snap hips toward cut, free arm whip | 1 | 1.2 yd cut |
| 3 | Drive | First step into new line | 1 | 2.0 yd cut |
| 4 | Recover | Re-square shoulders, ball tuck check | 1 | 2.4 yd |
| 5 | Blend | Almost run contact pose | 1 | 2.5 yd |

## Spin (360) — 8 frames, ~0.50 s

Physics: keep forward momentum (×1.15); yaw rotates full 360 across frames; slight inward lean.

| Frame | Yaw° | Pose | Hold |
|------:|-----:|------|-----:|
| 0 | 0 | Dip / plant for spin | 1 |
| 1 | 45 | Shoulder drop, ball protect | 1 |
| 2 | 90 | Side profile mid-spin | 1 |
| 3 | 135 | Back 3/4 | 1 |
| 4 | 180 | Full back, free arm out for balance | 1 |
| 5 | 225 | | 1 |
| 6 | 270 | | 1 |
| 7 | 315→0 | Snap back to run lean | 1 |

## Stiff-arm — 6 frames, ~0.45 s

Physics: small forward surge; free (left) arm extends toward threat.

| Frame | Phase | Pose | Hold |
|------:|-------|------|-----:|
| 0 | Wind | Free arm coils, lean in | 1 |
| 1 | Strike | Arm fully extended, palm out, lock elbow | 2 |
| 2 | Hold peak | Same, slight bounce | 1 |
| 3 | Push through | Step past contact | 1 |
| 4 | Recover | Arm returns to pump | 1 |

## Hurdle — 8 frames, ~0.55 s

Physics: vertical hop; sprite elevates; **shadow stays on ground** and separates from feet at peak.

| Frame | Phase | Feet Y (yd) | Shadow | Hold |
|------:|-------|------------:|--------|-----:|
| 0 | Crouch | 0 | under feet | 1 |
| 1 | Launch | 0.4 | under | 1 |
| 2 | Rise | 1.0 | under (sep starts) | 1 |
| 3 | Peak tuck | 1.6 | ground, offset back | 2 |
| 4 | Hang | 1.5 | same | 1 |
| 5 | Descend | 0.8 | closing | 1 |
| 6 | Land absorb | 0.15 | under | 1 |
| 7 | Run blend | 0 | under | 1 |

Knees tucked at peak (Blitz hang). Ball stays tucked.

## Celebration (short) — 6 frames, ~0.7 s

Double-flex / point: arms up → hold → drop. Used on TD before reset.

## Blending rules (runtime)

1. Run frame rate = `baseCadence * (0.7 + 0.3*(spd/max) + 0.35*turbo)`.
2. Facing change: 2-frame crossfade (show old dir one tick, then new) — no instant snap.
3. Specials interrupt run; on end, resume run at closest contact frame (0 or 3).
4. Shadow mesh: follows XZ always; Y fixed on turf; during hurdle scale/opacity pulse.

## Pipeline

Quaternius **Universal Base Characters** Superhero Male (CC0) + **UAL1** Sprint/Jog/Jump/Roll/Punch/Idle/Dance (CC0),
recolored teal #8, helmet+ball props, Blender EEVEE headless renders from game camera,
8 dirs × moves → PNG frames → `frames.json`. Licenses recorded under `/workspace/demo/licenses/`.
