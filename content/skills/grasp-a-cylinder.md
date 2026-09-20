---
name: grasp-a-cylinder
description: Procedure for picking up a cylinder standing on the table - read its orientation from the silhouette before anything else, measure the colour window on the live frame because this object's hue moves, take its top-face centre from depth when there is any and from two pixel rays when there is none, grasp at the pad band with a full close, and read the stall width as the centring check.
---

# Picking up a cylinder from the table

The numbers below were measured on one instance of this task (this object,
this lighting). They are wrong for any other instance - re-measure them; the
procedure is what transfers.

This page assumes the platform manual (picking.md for the gripper geometry,
closing and verification; seeing.md for the camera) and adds only what this
task requires.

The instance: a red translucent cylinder - a squat puck - standing upright on
the table.

| | measured |
|---|---|
| diameter | 41.9 mm - from the STALL, not the silhouette (step 2) |
| height | 38 mm (top face z = 0.012 by touch, table -0.026) |
| grasp TCP z | -0.017 (pad-band formula); hang 9.0 mm |
| stall width | 0.0370 / 0.0373 at two wrist angles 90 deg apart |
| upright silhouette | rectfill 0.76 (a circle fills pi/4 = 0.785 of its box); circularity 0.886 |
| depth on the top face | 154/160 samples |
| detector | channel difference, threshold 40 (hue is not usable here - step 2) |
| difference margin | object p50 186, bare table max 18, the toy's tan openings max 33 |
| HSV, table | H 8-30, S 8-69, V 94-110 |

## Procedure

The procedure composes into ONE guarded script: encode each step's
check as an assert that fails loudly with its numbers, run the nominal
path in a single turn, and escalate to reasoning only when a check
fails or a look needs interpreting (sdk.md).

### 1. Read the orientation from the silhouette before anything else

Use RECTFILL - contour area over bounding-box area. A circle fills
pi/4 = 0.785 of its box whatever the mask does to its edges; measured here
0.76 on the upright object, against 0.92-0.96 for one lying down. Circularity
is the weaker test on the same frames: it read 0.886 on this plainly upright
object, under the > 0.9 band, because the threshold nibbles the edge. A lying
cylinder's stall width also depends on the wrist angle (0.0362 across the diameter vs 0.0377-0.0395 along the
length) - upright, the angle would not matter. Every downstream number on
this page assumes upright; if the silhouette disagrees, stop and deal with
the orientation first. If it is lying, grip the CURVED sides (jaws across
the axis), never the flat end faces - pitching a grip on the ends puts a
finger under the base.

### 2. Detect it by REDNESS, not by hue

Hue is unusable on this object: it has read H 0-1, H 2-16 and H 170-179, and
red wraps at 0/180. At the grasp pose the LED half-blows the top face - one
HSV window gave 925 px (circularity 0.58) then 1367 px (0.80) on CONSECUTIVE
frames with the arm stationary, and dropping the S floor to recover it admits
the sorter's tan holes.

Threshold a channel DIFFERENCE instead - the object's own dominant primary
minus the larger of the other two. It needs no hue, and a near-neutral
background cannot pass it:

    b = cv2.cvtColor(r.ndarray(), cv2.COLOR_RGB2BGR).astype(np.int16)
    d = b[:, :, i] - np.maximum(b[:, :, j], b[:, :, k])   # i = object's primary
    m = ((d > 40) * 255).astype(np.uint8)                 # close 7x7, open 5x5

Measured margins against a floor of 40: object p50 186, bare table max 18,
the toy's tan openings max 33. Re-check both against whatever difference you
build.

**The silhouette does not settle a SIZE on this object - the stall does.**
Tightening the threshold shrinks it monotonically with no plateau, so "tighten
until the number stops moving" has nothing to stop at: measured 53.7, 49.0,
47.7, 46.9, 46.3, 45.4, 44.9, 41.3, 38.4 mm, then the blob disappears. Every
usable threshold over-read the object by up to 5 mm. The stall width is the
physical diameter and step 6 measures it anyway (0.0370 / 0.0373 here, about
4 mm of squeeze on compliant plastic), so judge any clearance question on the
stall and treat the silhouette as an upper bound.

- A drifting mask moves the CIRCULARITY, and that swing straddles step 1's
  lying-down band: an upright cylinder can read as lying.
- The sorter's own red trim is a BIGGER blob than the object (circularity
  0.2-0.36). Select by roundness and plausible size, never by area.
- `n_objects: 0` on an object you can see is a threshold failure; so is
  n_objects > 0 on the wrong thing.

### 3. Read the depth yield, then pick the method

Yield is a property of the instance, not of "translucent plastic": this
object returned 154/160 samples, and a translucent one returned ZERO at
every pose and angle. Check `depth_samples.on_object` before choosing.

With depth, centre the object in the frame and take `locate_objects`'
answer. With none, `centre_base` is only a projection onto the reference
plane and carries parallax of `height * lateral / depth` (~7 mm for this
object when 224 px off-axis) - then triangulate instead.

Every look reply carries `camera_pose_base` and `intrinsics_fullres`
(seeing.md), so no depth is needed: take TWO looks with the TCP moved
~50 mm between them, cast the ray through the blob's centre pixel from
each,

    ray_cam  = ((u - cx)/fx, (v - cy)/fy, 1)      # u,v FULL-RES (look px x2)
    ray_base = R(camera_rotvec) @ ray_cam          # per look

and take the point where the two rays pass closest: that is the top-face
centre - xy AND z in one solve, no centring iterations, no empirical
pixel-scale calibration, no per-theta camera offset. The triangulated z is
a cross-check on the touch in step 4 (touch stays the reference for
absolute z). The two frames disagreeing is the staleness check (seeing.md).

### 4. Touch the top with closed jaws for absolute z

Vision reads a few mm high in absolute z at table range; touch is the reference.
Close fully (an empty full close reads ~0.0018 - that is also the register
sanity check) and `descend_to_contact` on the object's centre. Measured:
contact at z = 0.012, vision having read it 2.1 mm high. With the table at
-0.026, the height is 38 mm.

CLIMB a few cm before reopening the jaws. Opening sweeps the pads outward
through the space beside the object (and the fingertips ride up AND forward
on their arc), so an open at contact height shoves the object and silently
invalidates the xy you just measured. If you did open low: re-centre before
grasping - the two-kiss jig (step 6) recovers it.

### 5. Grasp at the pad band, full close

    TCP_z = (surface_z + top_face_z)/2 - 0.010 = (-0.026 + 0.012)/2 - 0.010
          = -0.017

    bot.gripper(width=0.085)                            # full open
    bot.move_tcp(x, y, 0.05, top_down_deg=t)            # above, clear
    bot.move_tcp(x, y, -0.017, top_down_deg=t)          # straight down
    g = bot.gripper(width=0, force=25, speed=0.02)      # full close - the peg stops the jaws

Full close, never a width ladder - a ladder defeats `object_grasped`
(picking.md).

### 6. Read the stall width twice, 90 deg apart - equal stalls mean centred

A parallel gripper closing off-centre on a cylinder catches a chord, not the
diameter, so it stalls NARROW: an off-axis aim has measured 0.8 mm under the centred
value. The check that needs no camera: close fully, read the stall,
open fully, roll the wrist 90 deg, close again. Two equal stalls
(0.0370 / 0.0373 here, 0.3 mm apart) mean the object is centred on both axes - and each
close also self-centres it, so the pair is a centring jig and its own
verification. The second close IS the grasp.

Rolling in place at grasp depth is safe only at FULL open: the pads sweep a
~42 mm-radius circle, clear of a centred 20.5 mm-radius peg. At any partial
opening, lift above the object before rolling.

### 7. Prove the lift

The width checks (picking.md): the stall width must be plausible for the
object (0.0373 on a 42 mm cylinder = ~4 mm of squeeze on compliant plastic)
and must NOT settle to the commanded value after the lift (held: still
0.0373). Then one look: the object's spot on the table is empty and the
object shows between the fingertips. A blob fixed in the image across
different TCP positions is in your hand, not on the table - track grasp
state explicitly.

## Verification

`object_grasped` alone is never enough (it false-positives below ~5 mm and
false-negatives on width ladders - picking.md). The decision is:
object_grasped AND stall width plausible AND width unchanged after the
lift, settled by a look.

## Pitfalls

- Assuming the cylinder stands upright. A lying one reads as a near-square
  silhouette and every downstream number quietly misreads. Rectfill decides.
- Detecting this object by hue at all: it has read H 0-1, H 2-16 and
  H 170-179, red wraps at 0/180, and glare at the grasp pose halves the blob
  between consecutive frames. Redness (step 2) is stable where hue is not.
- Picking the largest red blob: the sorter's trim is larger than the object.
- Taking a size off the silhouette: the glow inflates it and tightening the
  threshold never converges. Use the stall.
- Aiming a grasp from a raw off-axis blob when the object has no depth:
  parallax was 7 mm here. Triangulate two rays (step 3), never trust the
  blob's projected centre alone.
- Re-measuring the camera offset per wrist angle - `camera_pose_base` in
  the look reply already carries the calibrated camera pose at that theta.
- Rolling the wrist at grasp depth with the jaws partially open around the
  object - lift first unless the jaws are at full open.
