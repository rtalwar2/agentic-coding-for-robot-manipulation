# Architecture notes (from officedog-writing/architecture.html, 354 lines, dated 2026-08-29, worked example added 2026-09-05)

## Structure of the explainer

1. **Header + one-paragraph thesis**: a fixed tabletop cell (UR3e, Robotiq 2F-85, wrist RealSense D435) driven by a local VLM, built as three layers with one deliberate bottleneck — everything the model does to the physical world, via registered tool or self-written code, passes through a single HTTP service (:8720) that owns the hardware and enforces the safety limits.
2. **Figure 1 (inline SVG stack diagram)**, top to bottom: AGENT (pi harness, identity.md, tools.ts, provider.ts, service.ts; qwen3.8-27B on vLLM :8084, local) → SESSION WORKSPACE, frozen copy per run (SKILLS: 2 SKILL.md per game; MANUAL: picking/seeing/sdk; SCRIPTS: agent-written Python — "these DO run"; skills+manual "procedural documents the model READS — not code, never executed") → TOOLS (look, move_tcp, gripper, descend_to_contact, locate_objects, …) and SDK (RobotClient) → HTTP :8720 "THE SINGLE CHOKE POINT" → PLATFORM (server.py; config: workspace box, speed/force caps, motion lock, z-floor; guards: IK check, rotation_error, dead-RTDE detection; vision: locate_objects, hand-eye calibration; replies carry evidence) → AIRO-MONO submodule (URrtde, Robotiq2F85, Realsense) → hardware.
3. **"The layers, top to bottom"** — five prose blocks: Agent, Skills & manual, Tools & SDK, Platform, airo-mono.
4. **"Three properties the design turns on"**: (a) two paths, one law; (b) skills are procedural documents, not code; (c) capability migrates down, with provenance (every run stamps the platform SHA).
5. **"Worked example: where does a number live?"** — a six-layer table for one moment (jaws closing on a cup), then "Tracing one number" (the grasp height −0.016), then "What goes wrong when a fact is filed in the wrong layer" (three historical cases).
6. **Component reference table** (component / lives in / talks to / role).
7. Footer: architecture as of 2026-08-29 (post frame-migration), worked example quoting constants in force after the 2026-09-04 tabletop replacement.

## Layer descriptions (condensed)

- **Agent** (`agent/`): vendored pi coding-agent harness runs the loop; qwen3.8-27B on vLLM, no cloud. Harness contributes only plumbing: system prompt (identity.md), tool definitions, provenance stamping (git SHA, skill roster, hash of every readable document → run-meta.json). An env-gated "prune prior-turn hidden reasoning" transform exists but was disabled in every run.
- **Skills & manual** (`agent/setup/workspace/`): the paper's contribution. Six skills, two per game (a grasp and a placement), each describing one measured instance: steps, the value behind each step with the measurement that produced it, and the checks that failed. The manual carries cell-universal device knowledge (gripper geometry, camera calibration use, verification discipline).
- **Tools & SDK**: registered tools are thin bridges to the service; the RobotClient SDK gives agent-written Python the same calls so a whole pick can be one guarded script instead of many deliberated tool calls — "the difference is ergonomics, never capability or safety."
- **Platform** (`platform/`): the sole process touching hardware. Enforces workspace box, speed and force caps, z-floor, motion lock; guards moves (IK feasibility before joint moves, achieved-pose verification, dead-RTDE detection); hosts migrated perception (locate_objects). "Capability migrates down into this layer when the model has derived it repeatedly — each migration recorded, because it changes what later runs are evidence of."
- **airo-mono** (submodule): lab hardware library; only the platform imports it.

## Worked example: where does a number live? (the six-layer table)

| Layer | Answers | Excerpt | Valid for |
|---|---|---|---|
| airo-mono | how a width command reaches the hardware | `Robotiq2F85` over the gripper's URCap | any 2F-85, any cell |
| platform `config.py` | what is permitted | `z_min = -0.039`, `gripper_force_max = 50.0`, and the clamp `cz = min(max(z, z_min), z_max)` | this cell, enforced; the model cannot exceed it by any path |
| `sdk.md` | what the call is | `bot.gripper(width=0.05, force=25, speed=0.05)` → `width_m, object_grasped, force_n` | any object; API surface, not policy |
| `picking.md` (manual) | how this device behaves | "The pads run roughly 20 mm UPWARD from [the TCP]… Aim the PADS at the object", giving `TCP_z = (surface_z + top_face_z)/2 - 0.010`; command a FULL close and let the object stop the jaws; verify by stall width plus the width after the lift | any object on this cell |
| `grasp-a-cup` (skill) | what the numbers were, on one measured instance | top face 0.014 by touch, grasp TCP −0.016, stall 0.0373 equal at two wrist angles 90° apart, under a header saying these are "wrong for any other instance — re-measure them; the procedure is what transfers" | that cup, that lighting, and nothing else |
| the run (agent script) | what the numbers are today | touch the top face, apply the formula, close, assert on the stall width and again after the lift | this trial only |

## Tracing one number: grasp height −0.016 m

> The grasp height in that trial was −0.016. It is worth asking where each of its ingredients came from, because no single layer owns it:
>
> - the **form of the arithmetic, and the −0.010 in it**, come from the **manual**: they encode where the rubber pads sit relative to the tool centre point, which is a property of the gripper and true for every object on this cell;
> - **surface_z = −0.026** comes from the manual too, as a declared **cell constant** — the table height, measured by touch at eight spots, which the manual then forbids re-probing;
> - **top_face_z = 0.014** comes from the **run**. The skill records 0.014 for its own instance and says in the same breath that the value will be wrong for any other cup, so the model touches the object in front of it and uses what it feels;
> - the **floor the result is checked against, −0.039**, comes from the **platform**, and would have been enforced whatever the arithmetic produced;
> - the **command that closes the jaws, and the stall width** that comes back as evidence, come from the **SDK**.
>
> What the skill supplies, then, is the shape of the recipe plus one instance's numbers as worked evidence. It supplies neither the device physics underneath nor today's measurements. That is the sense in which the generalisation claim is about the model carrying a written procedure.

(Arithmetic check: (−0.026 + 0.014)/2 − 0.010 = −0.016.)

## What goes wrong when a fact is filed in the wrong layer (three cases)

1. **An instance value written as though it were a rule.** A skill once said, in effect, "grasp a fixed distance below the top face." True for the cup it was measured on, false in general: on a 34 mm cup it asks for a TCP below the table, and a run duly computed one and talked itself out of the grasp. Repair: move the formula down into the manual (where pad geometry lives); leave only the instance value in the skill.
2. **A rule explained so well that it invited re-derivation.** A skill gave the mechanism behind the wrist angle for an insertion. A trial quoted the rule, re-derived the finger swing direction from first principles, got it backwards, and carried the insertion at the named strike angle; the run was stopped. Repair: state the device fact bluntly, as a fact, and require one look confirming it before the descent. "A mechanism offered to a model that can reason is a mechanism it may reason its way out of."
3. **Machinery re-derived every run belongs below.** Three runs each hand-wrote the same pipeline — colour mask, blobs, enclosing circle, depth filter, plane fit — at 4.8 kB in one run and 9.4 kB across four files in another; the errors came from the rewriting, not the task. It became the platform's `locate_objects`. Deliberately *not* migrated: `hsv_lo`/`hsv_hi` remain required arguments with no defaults, "because measuring the colour of the object in front of you is the model's job, and a default would have quietly done that measurement on its behalf."

The third case is why migrations are stamped: a capability that moves into the platform stops being evidence the model can derive it, so every run records the platform SHA it ran against.

## Component reference

| Component | Lives in | Talks to | Role |
|---|---|---|---|
| pi harness | agent/libs/pi | vLLM :8084; tools | runs the model's turn/tool loop |
| skills | workspace/.pi/skills | — (read as text) | per-game measured protocols |
| manual | workspace/platform-manual | — (read as text) | cell-universal device knowledge |
| tools | agent/setup/tools.ts | HTTP :8720 | registered actions for the model |
| SDK | airo_platform.sdk | HTTP :8720 | same actions from agent scripts |
| platform | platform/ (server.py) | airo-mono | hardware owner; all safety clamps |
| airo-mono | git submodule | robot, gripper, camera | lab hardware library |
