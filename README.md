# Interstellar Simulation

> A cinematic, real-time, browser-based 3D simulation inspired by the universe and visual language of *Interstellar*.
>
> Fan-made and educational. Not affiliated with the film. No copyrighted assets are used; all geometry, shaders and effects are original and procedural.

Pilot a Ranger-inspired spacecraft out of a deep-space hub, dock with an orbital station, fall toward a Gargantua-inspired black hole, traverse a spherical wormhole, arrive in the Milky Way, then explore our Solar System — Sun, eight planets, Saturn's rings — all from a single browser tab.

---

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

For a production build:

```bash
npm run build
npm run preview
```

Optional:

```bash
npm run typecheck
```

---

## The experience loop

The simulation is organised as a coherent space-travel arc:

1. **Deep Space Hub** — your spawn. The Endurance + a docking station hang in front of you. Climb into your Ranger-inspired ship, learn the controls, attempt a dock.
2. **Black Hole (Gargantua)** — a layered shader-based black hole with accretion disk, photon ring and lensed background.
3. **Wormhole** — a spherical lensing wormhole. Fly into the throat to trigger a cinematic transit sequence that emerges in...
4. **Milky Way** — our galaxy in two complementary modes:
   - **Inside** (default arrival from the wormhole): a fully view-locked, sky-dome experience where you stand at the solar neighborhood and look out at the galactic plane band, dust lanes (the Great Rift), distant nebulae, and a brightness gradient toward Sagittarius A\*.
   - **Overview**: an external, slightly elevated chart of the galaxy — bulge, bar, four-arm logarithmic spiral, dust lanes, halo, and a clickable "Sol" beacon in the Orion Spur that drops you into the Solar System.
5. **Solar System** — the Sun and all eight major planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn with rings, Uranus, Neptune) on cinematically-compressed orbits, with an asteroid belt between Mars and Jupiter and a navigation panel for travel-to-target.

Two earlier scenes — Miller's water world and Mann's ice world — remain in the codebase as experimental scenes accessible via the Debug toggle.

---

## Controls

### Scene navigation

| Action | Key |
| --- | --- |
| Switch scene | `1` Hub · `2` Black Hole · `3` Wormhole · `4` Milky Way · `5` Solar |
| Help overlay | `H` |

### Camera modes

| Mode | Key | Notes |
| --- | --- | --- |
| Cinematic preset | `V` | Hand-tuned scripted camera per scene |
| Free-Fly | `F` | `WASD`, `Space`/`Ctrl`, `Shift` boost, drag mouse to look |
| Orbit-inspect | `O` | drag to rotate, scroll to zoom |
| Pilot (chase) | `J` | Third-person camera behind your ship — Hub & Wormhole |
| Cockpit | `K` | First-person view from inside the ship |
| Third-person Explorer | `T` | Walk an astronaut on planet surfaces / EVA |

### Spacecraft piloting (Pilot or Cockpit mode)

| Action | Key |
| --- | --- |
| Forward thrust | `W` |
| Reverse thrust | `S` |
| Strafe left / right | `A` / `D` |
| Lift / descend | `Space` / `Ctrl` |
| Pitch up / down | `↑` / `↓` |
| Yaw left / right | `←` / `→` |
| Roll left / right | `Q` / `E` |
| Boost | `Shift` |
| Stabilise (cancel rotation) | `X` |

A live HUD shows speed, throttle, and chase / cockpit toggle. Docking status appears automatically when you approach the orbital station in the Hub.

### Wormhole traversal

In the Wormhole scene, fly your ship into the throat. A cinematic transit sequence triggers automatically and arrives at the Milky Way scene.

### HUD toggles

| Toggle | Key |
| --- | --- |
| Cinematic letterbox bars | `B` |
| Scene labels & quotes | `L` |
| Orbit guide rings | `G` |
| Post-processing on/off | `P` |
| Quality preset | `[` / `]` |
| Show experimental scenes | `~` (Debug button) |

The HUD also exposes every option as a clickable button.

---

## Architecture summary

```
src/
  app/                    React entry, top-level Canvas + HUD wiring
  scenes/
    SceneRoot.tsx         Picks the active scene + post chain
    DeepSpace/            Hub: Endurance, docking station, your ship
    BlackHole/            Gargantua-style black hole
    Wormhole/             Spherical wormhole + traversal driver
    MilkyWay/             Tilted spiral galaxy + Sol beacon
    SolarSystem/          Sun + 8 planets + asteroid belt
    WaterWorld/           (experimental) Miller's-planet ocean
    IceWorld/             (experimental) Mann's-planet terrain
  entities/
    Endurance/            Procedural Endurance-inspired spacecraft
    PlayerShip/           Ranger-inspired pilotable ship + ShipContext
    DockingStation/       Procedural orbital station / dock target
    CelestialBody/        Shader-driven planet / star (rocky / gas / ice / star)
    Astronaut/            Procedural astronaut for surface & EVA
    BlackHole/            Layered black-hole entity + GLSL shaders
    Wormhole/             Spherical lensing wormhole + halo
  systems/
    camera/               CameraRig (cinematic / free-fly / orbit / chase / cockpit / 3rd-person)
    flight/               useShipController — 6-DOF, momentum, autostabilize
    docking/              useDocking — distance, alignment, state machine
    environment/          Reusable starfield / nebula / planet / orbit guides
    state/                Zustand store, quality presets, telemetry feed
  ui/                     HUD pieces (title, switcher, telemetry,
                          ship telemetry, docking, navigation, transit overlay, help)
  hooks/useHotkeys.ts     Global keyboard bindings
  styles/global.css       Visual identity for the HUD overlay
```

Design conventions:

- **Scene composition is declarative.** Each scene is a small JSX module that composes reusable entities (`<PlayerShip>`, `<DockingStation>`, `<CelestialBody>`, `<BlackHole>` etc.). Adding a new scene is a one-file change plus a row in `systems/state/store.ts`.
- **State lives in Zustand**, away from the render tree, so HUD changes never re-render the Canvas. Ship transform is mirrored into a per-frame `ShipContext` so the camera, docking system, and HUD can all read it without prop drilling.
- **All hero visuals are shader-driven** (`THREE.ShaderMaterial`). Each shader lives next to its entity, with parameters exposed as uniforms so they can be tuned at runtime or per-quality.
- **Quality is centralised** in `systems/state/quality.ts`. Star count, lensing samples, terrain segments, post-processing toggles and DPR are all derived from a single `Quality` enum.
- **Flight is inertia-aware but forgiving.** `useShipController` integrates linear and angular velocity with light damping; `X` snaps angular velocity to zero. Boost multiplies thrust by `boostFactor` and raises the soft speed cap.
- **Docking is a state machine** (`outOfRange → approaching → aligning → dockable → docked`) driven from the live ship + station port positions.

---

## Quality presets

| Preset | Stars | Lens samples | Disk samples | Terrain segs | Post FX |
| --- | --- | --- | --- | --- | --- |
| Low    |  4 500 |  off | 96  | 96  | off |
| Medium |  8 000 | 18 | 160 | 144 | bloom |
| High   | 14 000 | 28 | 220 | 200 | bloom + chromatic aberration + vignette |
| Ultra  | 22 000 | 40 | 320 | 280 | full chain |

Post-processing can also be toggled with `P` regardless of preset.

> The post chain runs on a half-float framebuffer with `multisampling = 0` and built-in MSAA disabled on the canvas. Native MSAA was found to conflict with EffectComposer's depth-stencil blits on some GPUs (visible as `glBlitFramebuffer` errors and missing geometry); leaving AA to bloom + DPR removes that class of bug entirely.

---

## Solar System scaling

Distances and radii are deliberately **not** astronomically accurate — at true scale, only one body would ever be on screen at a time and the experience would be unwatchable in a browser. The system uses cinematic compression:

- Planet radii are exaggerated relative to the Sun for visibility.
- Orbital radii are spaced for clarity, with gas giants further out.
- Orbital periods are slowed but in correct **relative** order: Mercury fastest, Neptune slowest.
- Saturn's rings are real geometry with a Cassini-style gap shader.
- The asteroid belt sits between Mars and Jupiter as instanced rocks.

Body definitions live in `src/scenes/SolarSystem/bodies.ts` and are easy to retune.

---

## Swapping in real assets later

The procedural entities are deliberately drop-in replaceable. To use a real GLB instead of the procedural model:

```tsx
import { useGLTF } from "@react-three/drei";

export function PlayerShip(props) {
  const { scene } = useGLTF("/models/ranger.glb");
  return <primitive object={scene} {...props} />;
}
```

Place the file under `public/models/` and Vite will serve it. The same pattern works for the Endurance, the docking station, the astronaut, etc.

For environment textures (HDRI sky, planet diffuse / normal maps, water normals, terrain), drop them into `public/textures/` and load them with `useTexture` / `useEnvironment` from `@react-three/drei`. The shaders are written so a sampler can be wired in alongside the procedural fallback.

---

## Research and Technical Inspiration

This project draws on several public references for its aesthetic and physical credibility, while remaining an original implementation built from scratch in TypeScript and GLSL.

- **Cinematic visual reference.** Frame composition, scale cues, color grading and pacing are informed by the visual language of *Interstellar* and similar cinematic deep-space material — the tendency to let one element dominate the frame, the restrained palette, the use of slow camera motion to communicate mass and distance.
- **Black-hole rendering thinking** is informed by accounts of how Gargantua was visualised — particularly the ideas that a black hole should be rendered as a layered phenomenon (event horizon, accretion disk, lensed background, photon ring) and that the surrounding starfield should appear bent by the gravitational field rather than the singularity being treated as a cartoon vortex. Our `lensing.ts` shader is a real-time approximation: it bends the view direction by an analytic deflection angle proportional to the impact parameter, then samples a procedural starfield in the bent direction. This is *not* a true geodesic ray-tracer; it is a stylised, performance-friendly evocation of the same visual logic.
- **Wormhole visualisation.** Following the "spherical, not flat" principle, our wormhole is a `BackSide`-style sphere that warps a separate procedural sky on the inside, with a Fresnel-driven "throat" parameter exposed in the shader. This communicates a spacetime sphere rather than a portal sticker.
- **Galactic structure.** The Milky Way scene uses a 4-arm grand-design spiral shader with a bulge falloff, dust-lane noise and additive blending — chosen to read as a galactic disk in profile rather than a top-down chart.
- **Ship flight model.** Inertia-aware but lightly damped, with optional autostabilise. Pure Newtonian momentum on a 6-DOF body proved disorienting in playtest; the small angular damping keeps the experience cinematic without sacrificing the feeling of mass.
- **Astrophysical simulation realism.** We deliberately stop short of attempting a physically exact general-relativity simulation, because that would destroy interactivity in a browser. Instead, the simulation aims to be visually credible and serious in tone: scientifically inspired metaphors, coherent scale cues, no arcade colours, no UI clutter.
- **Browser shader / R3F architecture.** Patterns common in modern React-Three-Fiber + TypeScript projects — modular scene composition, Zustand state, per-quality presets, custom `ShaderMaterial` per hero entity — were adopted because they scale well to richer simulations later.

If you want to extend the simulation toward higher physical accuracy (relativistic ray-tracing of geodesics, true Doppler/relativistic-beaming on the disk, higher-fidelity Kerr-metric photon-sphere rendering, n-body orbital integration of the planets), the layered architecture leaves room: each black-hole layer (lensing shell, disk, horizon, halo) is independent, planet motion is a single hook, and replacing any one with a more accurate implementation is a self-contained change.

---

## Status of the project

- ✅ Five primary scenes (Hub, Black Hole, Wormhole, Milky Way, Solar System) all reachable from the HUD or with `1`–`5`.
- ✅ Two experimental scenes (water world, ice world) accessible via the Debug toggle.
- ✅ Six camera modes: cinematic, free-fly, orbit, ship chase, cockpit, third-person explorer.
- ✅ Pilotable Ranger-inspired ship with 6-DOF flight, momentum, boost, autostabilise.
- ✅ Procedural docking station with a state-machine docking system + HUD reticle.
- ✅ Wormhole traversal sequence that transitions to galactic context.
- ✅ Tilted Milky Way disk with arms, dust, bulge and clickable Sol beacon.
- ✅ Solar System with the Sun, 8 planets, Saturn's rings and an asteroid belt.
- ✅ Layered shader-based black hole with animated accretion disk, photon ring and lensed background.
- ✅ Quality presets and toggleable post-processing.
- ✅ Production build passes (`npm run build`).

---

## Notes / known scope choices

- All visuals are procedural. There are no external 3D models, HDR maps or audio files in the bundle. This is intentional, so the project always boots cleanly. See the "Swapping in real assets" section if you want to replace any of them.
- Audio is wired structurally only. There are no audio files included; ambient drone / wind / suit-breathing / engine-rumble layers can be plugged in by extending the `app/` module with a small `<AudioManager>` and a toggle in the HUD.
- The black-hole lensing is a single-step analytic approximation, not a multi-step ray integrator, for performance. The architecture supports raising the sample count via the `Quality` setting, but the shape of the shader is deliberately bounded for real-time use.
- Solar System orbital periods and body sizes are visually scaled, not astronomically accurate. See "Solar System scaling" above.
