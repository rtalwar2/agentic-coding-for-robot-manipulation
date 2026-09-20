---
name: stack-two-cups
description: Procedure for stacking one cup on another - measure both cups in one locate, grasp with the pad-band formula (also off the top of a stack), feel for the release height with the force probe, verify from the taught profile view, and re-grasp rather than nudge a cup that landed wrong.
---

# Stacking a small cup on a big one

The numbers below were measured on one instance of this task (these cups,
this lighting). They are wrong for any other instance - re-measure them; the
procedure is what transfers.

Manual: picking.md, seeing.md. Detection, the pad-band grasp, the full close
and the width checks are in grasp-a-cup; this page adds the placement.

The instance: two cups standing upside down, 0.16 m apart.

| | big (target) | small (to move) |
|---|---|---|
| top face z, BY TOUCH | 0.024 | 0.014 |
| top face z, by vision | 0.031 (7 mm high) | 0.019 (5 mm high) |
| silhouette diameter, on axis | 0.0598 m | 0.0445 m |
| height | 50 mm | 40 mm |
| stall width | - | 0.0373 on the table AND off the stack |
| hang below TCP | - | 10.0 mm |
| release height | - | contact_z (0.034) then 2 mm of seating press |
| stacked top, BY TOUCH | - | 0.064 = flush, repeated over four placements |

Run the whole procedure as ONE guarded script (sdk.md).

## Procedure

### 1. ONE locate gives both cups; the TARGET's axis must pass the off-axis gate

`locate_objects` returns every blob in the range, so ONE call from the start
pose gives both cups, each with its own evidence fields. Measure the target
BEFORE picking anything up: a cup in the jaws hangs below the camera and
covers the middle of every frame, and over the target the two merge into one
blob, so there is no re-measuring it from the pose you place from. Sizes far
off axis are overstated but their ORDER is not (0.0732 vs 0.0480 at 271 /
169 px off axis), so that one call is enough to tell target from cargo and
enough to AIM THE PICK (grasp-a-cup step 1).

The placement is different: there is no closing the loop at the end, so it is
only as good as the TARGET's axis, and the raw off-axis centre is not good
enough for it:

| target axis known to | outcome |
|---|---|
| 1-3 mm (corrected, or centred) | contact at the predicted 0.034, concentric |
| 10.5 mm | contact 0.036, stacked, verified |
| 20 mm (raw fix, 459 px off axis) | cup landed BESIDE the target, and had to be re-picked and re-placed |

So apply grasp-a-cup step 1's parallax correction to the target too (it needs
the target's HEIGHT: `h = top_z_vision - table_z` is close enough, since the
correction is first-order in h). Corrected fixes ran 2.4 mm mean, which the
dome absorbs. Centre the camera on the target only if you also want its
diameter - and then do it BEFORE the pick, because once a cup is in the jaws
it hangs below the camera and merges with the target into one blob.

### 2. Touch the top face of the cup to MOVE; take the target's from vision

The grasp height needs a touched top face (grasp-a-cup step 4). The target
only needs a `z_min` for the force probe, so vision serves:

    ground_out = target_top_vision + hang           # 0.031 + 0.010 = 0.041
    z_min      = ground_out - 0.012                 # 0.029

The 12 mm allowance covers vision reading up to ~7 mm high plus the dome.
Measured: contact at 0.036 against that z_min - it never bottomed out.

### 3. Grasp with the pad-band formula - `surface_z` is what the cup STANDS on

    on the table:      TCP_z = (-0.026 + 0.014)/2 - 0.010 = -0.016
    off the big cup:   TCP_z = ( 0.024 + 0.064)/2 - 0.010 = +0.034

Both stalled 0.0373 and held: the formula puts the pads on the same band of
the cup either way. Off a stack the fingertips end 10 mm above the lower
cup's rim - clear of it.

### 4. FEEL for the release height - descend to contact, open THERE

    r = bot.descend_to_contact(target_x, target_y, z_start=0.09, z_min=z_min,
                               top_down_deg=th, step=0.002, fz_threshold_n=2.5)
    assert r["contact"], r
    for i in (1, 2):                                 # SEAT: 2 mm past the contact
        bot.move_tcp(target_x, target_y, r["contact_z"] - i*0.001,
                     top_down_deg=th, speed=0.01)
        if abs(bot.state()["tcp_force"][2] - r["baseline_fz_n"]) > 30:
            break                                    # ceiling: do not force it
    bot.gripper(width=0.060, force=25, speed=0.02)   # open ~11 mm/side, no sweep
    bot.move_tcp(target_x, target_y, 0.18, top_down_deg=th)
    bot.gripper(width=0.085, force=25, speed=0.05)   # full open only up clear

Measured: contact at 0.034 with the target's axis known to 1 mm (exactly the
predicted `touched_top + hang`), 0.036 with it known to 10.5 mm - the rim
lands slightly up the dome. Contact showed as baseline 8.8 N -> +12.4 N.

**The descent already reports contact one full step PAST first touch** - first
touch appears as a sub-threshold +1 N at the step above - so the seating press
takes the rim 4 mm past first touch in total. What it is for is the case where
the rim came down on the dome's SLOPE: it pushes the cup off the slope into
the seat. Where the aim was already good it changes nothing, because contact
fires at the flush height and there is nowhere lower to go - the 2 mm is taken
up elastically and springs back on release.

Measured over four placements with the press, aim corrected each time:
contact_z 0.0340 every time, seating force +18.4 / +20.4 / +20.7 / +21.0 N,
and the stacked cup's top BY TOUCH 0.0640 every time - exactly
`target_top + cup_height`, i.e. flush, +-0.0 mm. Nothing was disturbed and the
tiers stayed concentric. The 30 N ceiling never fired.

A `contact: false` at z_min is not "nothing there" (picking.md). Do not
release on it.

**Keep `fz_threshold_n=2.5` and 2 mm steps.** The held cup adds a constant
offset to the baseline, not noise, so a lower threshold buys nothing: at
1.0 N a descent reported contact 2 mm below `z_start`, and at 1.0 then 2.0 N
another reported contact 15 mm above the cup and then twice `contact: false`.
Read `trace_last`: step-to-step noise +-0.3 N, real contact a +5 to +13 N
jump in one step.

### 5. Arithmetic alternative, from the hang

    release_tcp_z = target_top_touched + hang + 0.003 = 0.024 + 0.010 + 0.003

The stall width cross-checks the hang: on this taper 1.8 mm of extra stall
width means about 5 mm nearer the rim, so a shorter hang. A stall width that
differs from last time means the hang differs too.

### 6. Verify: top-down for the cheap facts, the taught profile pose for the verdict

Top-down, from the pose you already hold, proves two things cheaply:

- ONE blob at the target's pixel where there were two, and the source spot
  empty (measured: n_objects 2 -> 1, union diameter 0.0559 between the two
  cups' 0.0445 and 0.0598).
- The RISE, when depth holds on the top face: vision's `top_z` went 0.019 ->
  0.070-0.072, a 52 mm rise on a 40 mm cup. 99-117/160 samples, residual
  0.09-0.20 mm.

It cannot separate the tiers: from above the small cup's apparent radius is
nearly the big cup's rim radius, so the circles almost coincide, and the
bright off-centre disc inside the blob is a MOULDING MARK on the cup's base,
not the cup.

**The verdict is BY EYE from the TAUGHT PROFILE POSE** (seeing.md; `move_joints`
to it - it is NOT reachable from the top-down branch, and `move_joints` is not
gated by the workspace box, so its TCP y being outside the box is not a
problem). The two tiers and the step between them are directly visible from
the side: no mask, no circle fit. Only construct a pose yourself if the target
is not in that view, and then survey with `bot.reachable()` (free, never
moves) and check the executed move's `clamped` flag.

**Crop and upscale before judging.** The step between two tiers is a few dozen
pixels in a 640-wide frame, and that is where the verdict stalls. Crop around
the stack and upscale first:

    im.crop((cx-105, cy-105, cx+105, cy+105)).resize((420, 420)).save(p)

### 7. An off-axis stack is a STACK - do not try to square it up

Slightly off the dome's axis is a finished placement. Accept it.

Do NOT close the jaws on a cup that is already stacked. A close whose
commanded width lands at or under the cup's width at that band is a GRIP, not
a nudge, and the natural next move - lift, then open - carries the cup off the
stack and drops it from height. Measured: a close commanded at 0.040 stalled
at 0.0418 on a cup whose grasp stall was 0.0414-0.0418, reported
`object_grasped: false`, and the lift took the cup with it.

If the cup is genuinely wrong - beside the target, or perched on a lip rather
than nested - re-grasp it with step 3's pad-band formula (`surface_z` = the
lower cup's top face) and re-place it. That is the only recovery: both halves
are procedures this page already characterises.

## Verification

Top-down union + source spot empty + the rise in `top_z`, then the profile
look for the verdict. grasp-a-cup's lift checks cover the pick half.

## Pitfalls

- Centring both cups when only the target may need it (step 1's gate).
- Closing the jaws on a stacked cup to "nudge" it: at this clearance that
  is a grip, and the lift that follows drops it (step 7). Re-grasp instead.
- Reading the moulding-mark disc on a cup's base as if it were the cup.
- Believing a top-down view separates the tiers, or hunting a profile pose of
  your own when the taught one is reachable and verified.
- Full-opening the jaws at release height instead of 0.060 then climbing.
- Releasing on `contact: false`, or lowering `fz_threshold_n` below 2.5.
- Judging the stack off an un-cropped 640-wide frame.
- Aiming the placement from an UNCORRECTED off-axis target fix.
