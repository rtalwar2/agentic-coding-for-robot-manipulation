# Safety envelope of the cell (values only)

All limits live in the platform service and are applied at the single HTTP choke point (:8720) to every commanded pose, speed and gripper command — whether it comes from a registered tool or from a script the agent wrote. Sources: platform config defaults (documented in `platform/src/airo_platform/config.py`), the operator runbook, and the platform manual. Values are the defaults in force for the September 2026 experiment grid; each is overridable per deployment via an `AIRO_*` environment variable, and the runbook requires that none is overridden.

## Workspace box (UR base frame, metres; every TCP target is clamped into it)

| axis | min | max |
|---|---|---|
| x | −0.37 | 0.37 |
| y | −0.56 | −0.10 |
| z | −0.039 (hard floor for the nominal TCP) | 0.45 |

- Table surface: table_z = −0.026 (closed-jaw touch, 8 spots × 3 probes, median −0.0258, range 2 mm, plane-fit residual 0.27 mm; tilts ~11 mm/m in y). The table sits below the UR base plane.
- The z floor is 2 mm above the highest measured fully-open fingertip contact (open fingertips ride ~13 mm below the nominal TCP). Closed-jaw descents are asked to pass z_min ≥ −0.023 in the request, because at the floor closed jaws can press the table.
- The clamp protects the table, not objects on it, and not the robot's own body (a self-collision zone exists at y > ~−0.25 with TCP below ~0.10).
- Scene rule: objects placed ≥ 50 mm from box edges and ≥ 50 mm apart.
- Note: the runbook (an older document) quotes the floor as −0.043; the current config and the architecture explainer give −0.039 (the +4 mm 2026-09-04 tabletop shift).

## Speed caps

| quantity | default | max |
|---|---|---|
| linear TCP speed | 0.10 m/s | 0.25 m/s |
| joint speed | 0.50 rad/s | 1.00 rad/s |

## Gripper (Robotiq 2F-85, stroke 0–0.085 m)

| quantity | default | max |
|---|---|---|
| force | 25 N | 50 N |
| speed | 0.05 m/s | 0.15 m/s |

- 25 N is the driver's spec floor (the hardware range is 25–220 N); the cap can only limit the top end. Crushable objects are protected by a commanded-width floor, not by lower force.
- The service always sends an explicit, clamped force/speed pair on every gripper command; nothing is inherited from a previous command (the gripper's registers persist otherwise).

## Other guards

- Motion lock: motion must be explicitly enabled per session; it is reset on service restart.
- IK feasibility is checked before joint moves; `reachable()` reports IK feasibility only.
- Every move is blocking and reports commanded-vs-achieved `position_error_m` (healthy < 0.001; observed 0.0–0.0005).
- Dead-RTDE detection; tool offset must read 0 0 205 mm on the pendant.
- Per-trial wall-clock cap enforced by `timeout` (exit 124 = TIMEOUT, scored separately from operator intervention); the in-flight move finishes because there is no software cancel — physical e-stop only.
- Wrist limit |j6| < 360°.
