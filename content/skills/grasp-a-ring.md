---
name: grasp-a-ring
description: Procedure for picking up a flat ring lying on the table - locate it by measured colour, take its xy parallax-free by casting the pixel ray onto its known top plane, straddle it with a force-watched open-jaw descent when the capture clearance is small, close fully, and read the repeated stall width as the centring check without expecting it to match the outer diameter.
---

# Picking up a ring from the table

The numbers below were measured on one instance of this task (this object,
this lighting). They are wrong for any other instance - re-measure them; the
procedure is what transfers.

This page assumes the platform manual (picking.md for the gripper geometry,
closing and verification; seeing.md for the camera) and adds only what this
task requires.

The instance: a green 3D-printed ring lying flat on the table -
straight vertical walls, a plain annulus.

| | measured |
|---|---|
| outer diameter | 80 mm; silhouette 80.3 on axis, 85.4 from 291 px off axis |
| bore | 21 mm |
| height | 24 mm (top z = -0.002 by touch on the WALL, table -0.026) |
| grasp TCP z | -0.024 (pad-band formula); hang 2.0 mm |
| capture clearance at full open (0.0839) | 1.78 mm per side |
| stall width | 0.0721, full close, repeated to 0.0721 on a reopen-reclose |
| width after lift | 0.0717 |
| HSV, ring | H 90-92, S 255, **V 80-127 with p50 97** - the V FLOOR is the trap (step 1); mask (80,150,60)-(93,255,255). The hue sits close to the blue base, which leaks phantom "rings" into any green mask at ANY ceiling - disambiguate by depth: a phantom blob has ~zero depth samples, the real ring 100+ |
| difference channel | `min(B,G) - R`, object p10 106 against a background p99.9 of 12 - no floor to get wrong (seeing.md). `G - max(R,B)` reads -5 on this ring: it is teal, not green |
| HSV, table | H 17-120, S 2-26, V 115-134 |

## Procedure

The procedure composes into ONE guarded script: encode each step's
check as an assert that fails loudly with its numbers, run the nominal
path in a single turn, and escalate to reasoning only when a check
fails or a look needs interpreting (sdk.md).

### 1. Locate by measured colour - matte prints give real depth

Measure the window on the live frame (seeing.md). The matte print returns
depth generously (160 of 160 samples, plane residual 0.2 mm), so the plane
fit and top_z are usable evidence here - though absolute z still reads a few
mm high (vision +0.0068 against -0.002 by touch; touch is the reference).

**The V floor is what breaks here, and it breaks silently.** The ring's own
pixels read V p2 80, p50 97, p90 101: a floor of 100 sits INSIDE that
distribution. It survived one frame and failed the next when the exposure
re-metered on the approach - 767 mask pixels left of 7900, in a confident
green blob whose centroid was 20-25 mm from the ring. At 1.8 mm of capture
clearance that is a guaranteed kiss. Floor V at 60 (7976 px, centre within
0.5 mm of a wide mask's), or use the difference channel, which has no floor
to carry between frames.

### 2. Take the xy in ONE shot - the pixel ray onto the ring's top plane

A 25 mm-tall object read off-axis carries parallax. For the XY, do not walk
the camera over the ring to cancel it - compute it away. Every look reply
carries
`camera_pose_base` and `intrinsics_fullres` (seeing.md): cast the ray
through the blob's centre pixel and intersect it with the ring's TOP plane,
whose height you know: `top_z = table_z + height`, where table_z = -0.026
is a CELL constant (picking.md - trust it, NEVER probe the bare table) and
the height is measured on the object (here 25 mm; this instance's own touch
read the top at -0.001):

    ray_cam  = ((u - cx)/fx, (v - cy)/fy, 1)      # u,v FULL-RES (look px x2)
    ray_base = R(camera_rotvec) @ ray_cam          # from camera_pose_base
    s        = (top_z - cam_z) / ray_base[2]
    ring_xy  = cam_xy + s * ray_base[:2]

One look, one solve - no centring iterations, no per-theta camera-offset
measuring, no assumed camera height. Take a second frame from a different
TCP position and require the two fixes to agree to a few mm (the staleness
check, seeing.md). On this matte, evenly-lit print the blob centroid is
trustworthy; cross-check with the stall repeat in step 4, not with more
vision.

### 2b. The DIAMETER is the one thing you cannot compute away - centre for it

The ray fix, corrected for parallax (seeing.md), recovers a CENTRE from an
oblique view; neither recovers a SIZE. Measured on this ring: 85.4 mm at
291 px off axis, 80.3 mm on axis (80.2 on a second centring).

Fly the camera over the ring and read the diameter with the blob near the
frame centre, or do not use the number for a clearance decision.

- The diameter decides feasibility: jaws span 0.0839, so an 80 mm ring
  leaves ~1.7 mm per side and an inflated 88 mm reads as "does not fit".
  One run measured 98 mm from a depth-point circle fit, computed a negative
  clearance, and never attempted the grasp.
- `locate_objects` reports `off_axis_px` and warns in `diameter_note`. The
  warning is not a correction - it still returns the inflated number.

### 3. Straddle with a force-watched descent - the capture clearance is 2 mm

At full open the jaws span 0.0839; around an 80 mm ring that leaves ~1.7 mm
per side, so a centring error larger than that drives a fingertip INTO the
ring's top face instead of around it. Descend with force sensing, not a
blind move, so that mistake reads as a contact instead of a plough:

    bot.gripper(width=0.085)                              # full open
    r = bot.descend_to_contact(x, y, z_start=0.014, z_min=-0.024,
                               top_down_deg=t)            # straddle
    # contact: false and final_z = -0.024 -> the jaws are around the ring

`contact: true` on the way down means the xy is off - lift, re-centre,
never push - and re-centre FROM SCRATCH: the kiss DISPLACES the ring
(measured: ~10 mm from one straddle contact), so the centre you aimed at no
longer exists. A ~2 mm vision residual is enough to kiss at this clearance.

Two things buy that margin back, and with both the straddle has passed
force-free first try: floor the colour window below the object's own
distribution (step 1), and correct the off-axis parallax before aiming
(seeing.md - the ring is 24 mm tall, so a fix 291 px off axis was 4.2 mm
biased toward the camera, more than the clearance).

Grasp height from the pad band (picking.md):
`TCP_z = (-0.026 + -0.002)/2 - 0.010 = -0.024`; closed fingertips end
2 mm above the table.

### 4. Close fully and read the stall TWICE - it will not match the outer diameter

Full close, force 25, speed 0.02. Measured stall: **0.0721 on an 80 mm
ring** - the register understates a wide grip by ~8 mm, because near the
end of the finger arc the pads' contact point sits off the pinch plane the
width calibration assumes. Do not reject a grasp because the stall reads
well under the object's known size at wide widths.

The check that works: open fully and close again. The stall repeated exactly
(0.0721 then 0.0721); an off-centre first grip drags the ring while
closing, so
the repeat lands wider than the first. Equal repeats = centred, and the
second close IS the grasp. Know what the check does NOT cover: it centres
and verifies along the CLOSING axis only - perpendicular to it (along the
pad faces) the ring keeps whatever offset vision left, unmeasured by any
width. Centre well before the straddle; that residual (~1-2 mm) is what
the threading skill's release-on-contact recovery absorbs.

### 5. Prove the lift

The width checks (picking.md) decide a routine pick: after the lift the
width must not settle to the commanded 0 - measured 0.0717 after the lift.
That is sufficient - no confirming look. Spend a look
only on a width you cannot explain, and judge it by number in a script
(sdk.md): the ring's table spot must read empty, and a held ring's blob is
fixed in the frame across TCP moves while a table blob shifts by the
predicted baseline.

Measure the hang at the grasp (picking.md): `hang = grasp_tcp_z -
surface_z` = 2.0 mm - the ring's bottom rides just below the TCP, which the
threading skill's ground-out prediction needs.

## Verification

`object_grasped` alone decides nothing. The decision is: straddle descent
force-free AND stall repeated equal AND width above ~0.005 after the lift.
Those three numbers settle a routine pick - no confirming look (picking.md).

## Pitfalls

- Setting a colour floor at what you measured instead of below it.
- Expecting the stall width to equal the outer diameter on a wide grip: the
  register understates it (~8 mm here). The repeat test is the centring
  check, not the absolute value.
- Descending blind at 2 mm capture clearance. Use the force-watched
  straddle so an xy error becomes a contact, not a plough into the ring.
- Grasping from a raw off-axis blob xy: 25 mm of height put 7 mm of
  parallax on this ring. Fix the xy through the ray-to-top-plane solve
  (step 2), never from the blob's projected centre alone.
- Re-measuring the camera offset per wrist angle - `camera_pose_base` in
  the look reply already carries the calibrated camera pose at that theta.
- Trusting vision for absolute z (a few mm high here). One closed-jaw touch on
  the annulus - aimed at the wall's midline, not the bore - is the
  reference. (Aim a top touch at the WALL: a touch over the bore is a touch
  of the table 25 mm down.)
- Reopening the jaws at ring height after the touch. Opening sweeps the
  pads outward through the space beside the object (and the tips ride up
  their arc), and an open at ring height DRAGS the ring - observed on
  consecutive runs, and it silently invalidates the xy you just measured.
  CLIMB a few cm above the ring's top first, then open; if you did open
  low, re-centre before the straddle.
