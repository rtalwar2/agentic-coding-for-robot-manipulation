---
name: put-a-ring-on-a-rod
description: Procedure for threading a held ring onto a vertical rod - find the tip by its colour marker, predict the ground-out height from the tip and the hang, use the force-free descent through it as half the threading proof (the top-down look is the other half - a clean miss is also force-free), release, and verify without ever probing beside the rod.
---

# Putting a ring on a rod

The numbers below were measured on one instance of this task (this object,
this lighting). They are wrong for any other instance - re-measure them; the
procedure is what transfers.

This page assumes the platform manual (picking.md, seeing.md) and a verified
hold from grasp-a-ring.

**FIX THE TIP BEFORE YOU PICK THE RING UP.** A held ring sits in the bottom of
every frame: it occludes the marker from some poses and adds a same-family
colour to the search. Measured while holding: two fixes 87 mm apart, and one
frame with no marker in it at all. Nothing touches the base during the pick,
so the fix survives it.

The instance: the green 80 mm ring (21 mm bore, hang 2.5 mm below the TCP)
onto a rod standing in a rigid all-blue cylinder base. The rod's end cap
carries a RED CIRCLE MARKER - the tip's identity. The base is rigid, but it
is not bolted down: a collision SLIDES it silently, so a fix survives only
until something touches the assembly.

| | measured | how |
|---|---|---|
| base TOP height | **z = -0.016 - an APPARATUS CONSTANT** of this rig, like the tip: the floor a missed ring lands on, and the reference for the miss test | the base is 10 mm tall and the rod stands 145 mm free ABOVE IT, so the tip is 155 mm above the TABLE - two lengths, two datums, do not mix them |
| rod tip HEIGHT | **z = 0.129 - an APPARATUS CONSTANT**: the base is rigid and the rod vertical, so the tip height never changes | BY TOUCH on the cap - first force rise 0.128, hard contact 0.126 - and by three-ray sweep (0.1265); matches CAD (table -0.026 + 0.155 = 0.129) |
| rod tip xy | (0.0980, -0.3068) - an ANCHOR, never an aim point: the base slides between sessions | ray through the marker pixel onto the tip plane z = 0.129 - xy needs NO depth, and a flat marker carries no silhouette parallax either |
| rod diameter | 17 mm (CAD; the marker disc reads smaller from above) -> ~2 mm/side in the 21 mm bore | |
| base | blue cylinder ~90 mm across - WIDER than this 80 mm ring: the ring seats on the base's top, and the release fingers must stay above it | |
| hang below TCP | 2.0 mm (ring property, from the grasp) | grasp_tcp_z - table_z |
| ground-out prediction | 0.131 = tip_z + hang | predicted BEFORE the descent |
| threading descent | force-free 0.174 -> 0.118, straight through the prediction | half the proof - the look is the other half |
| confirming contact | 0.023, 106 mm below the tip: the rod meeting the gripper | released there, below tip height |
| release | full open at 0.128 (just below tip height - the bore is over the tip) | ring slid down onto the base top |
| verification | marker INSIDE the ring's bore: centroid separation 3.4 look-px (<~45 = threaded) | one top-down look |
| marker detector | warm difference `R - max(G,B) > 40`: marker p50 106-108, bare table max 3-5, ring max negative. No hue, no floor to carry between frames (seeing.md) | identity = warm blob ADJACENT to blue; red WASHES to H 14-25 under the LED, so an HSV window on it is the fragile way |
| HSV, base+rod | blue H 95-99, S ~255 - unique in the scene, the anchor for the marker search | leaks into a green mask above H 90 |

## Procedure

The procedure composes into ONE guarded script: encode each step's
check as an assert that fails loudly with its numbers, run the nominal
path in a single turn, and escalate to reasoning only when a check
fails or a look needs interpreting (sdk.md).

### 1. Find the rod TIP - it is the red marker

The tip's HEIGHT is the apparatus constant above (z = 0.129): the rod is
rigid and vertical, so only its XY has to be measured - and xy needs NO
depth at all. The tip is the marker blob's centre. The LED washes the red
to orange-pink with S as low as ~50, so a textbook red mask misses it
(measured: S>90 returned zero marker pixels while the marker was plainly
visible). The identity that works: the WARM blob (H <= 30 or H >= 160,
S > 30, V > 120, area 80-5000 px) that lands NEAREST the BLUE structure
when both are projected onto the tip plane.

Compare them as points in the WORLD, not as pixels. Cast a ray through the
warm blob's centre and another through the blue blob's centroid, intersect
both with the tip plane, and take the distance between those two points.
Measured that way the marker lands 7-13 mm from the blue anchor - the rod
stands above the base centre - while distractors land 167-470 mm away.
Accept under ~30 mm.

A PIXEL threshold cannot do this job: the same offset is a different pixel
count at every camera height, and a 40 px rule rejected the real marker in
every frame of one run. Nor is the biggest warm blob the marker - the lamp's
gradient has measured 557-9613 px against the marker's 278-557.

This also reconciles the two numbers that look contradictory: the marker
APPEARS 40-90 mm outward in the image because that offset is the rod's
height seen off-axis, while its true distance from the base axis is ~10 mm.
The projection is what you see; the world distance is what you test.

The blue centroid is only an ANCHOR for this test, never the tip xy: it
shifts with how much rod body falls inside the blue blob (read
(-0.0594,-0.2907) and (-0.0527,-0.3042) on two frames of one run). Aim the camera at the
blue blob's centroid first so the whole rig is in frame, find the marker,
and take the tip in ONE shot: cast the ray through the marker's centre
pixel (`camera_pose_base` + `intrinsics_fullres` from the look reply,
seeing.md) and intersect it with the tip plane - the apparatus constant
IS the plane, so no depth and no centring iterations are needed:

    ray_cam  = ((u - cx)/fx, (v - cy)/fy, 1)      # u,v FULL-RES (look px x2)
    ray_base = R(camera_rotvec) @ ray_cam
    s        = (0.129 - cam_z) / ray_base[2]
    tip_xy   = cam_xy + s * ray_base[:2]

Take a second frame from a different TCP position; the two fixes agreeing
to a few mm is the staleness check (seeing.md) - and it is not optional
here, because a fix taken from a pose where the held ring OCCLUDES the
marker does not fail, it silently returns the nearest distractor. Measured:
two fixes 130.6 mm apart when one pose was occluded, 0.5 mm apart when both
saw the marker. Distrust a fix whose two frames disagree, and verify the
detection on a MARKED frame.

**THE ROD IS ALWAYS VERTICAL - an apparatus fact, never re-derived.** In
EVERY frame the marker projects 40-90 mm outward from the base centre:
that offset is the rod's HEIGHT seen off-axis, it appears from every
viewpoint, and it is never evidence of lean. Spend no turn on lean, take
no side view for it, and never judge it with depth (`camera_point`) - the
D435 returns the table behind the 17 mm rod and once painted a phantom
71 mm lean an agent chased for its whole budget. And a question settled by
a measurement STAYS settled: the next viewpoint will re-show the same
projection offset - do not re-open it per frame.
The marker-ray xy plus the constant z is the complete tip fix. Only if the APPARATUS visibly changed (new base,
new rod): re-derive tip_z BY TOUCH - fresh marker xy from the ray, then a
contact-watched closed-jaw descent straight down ON the cap from above
(`descend_to_contact` at the tip xy; a clean few-N step at the cap top IS
tip_z). Touch and rays agree to ~1.5 mm on this cell (verified after the
2026-08-29 frame correction); touch stays the reference because it has no
per-view residual. The forbidden probe is BESIDE the rod (finger body
sweep) - the on-axis cap touch is safe.

Take the FINAL tip fix from a pose where the marker is UNOCCLUDED - from
the descent hover itself the fix is impossible: the held ring hangs
directly between the camera and the tip and occludes it. So the sequence
is: fix from beside the rig (~the camera offset away, at safe height) ->
ONE short translate -> straight down. Nothing else between fix
and descent, and re-fix after ANY contact with the assembly - the base is
rigid but unbolted, and a collision slides it silently (measured on the
previous base: a transit collision moved the tip ~37 mm with a clean
move_tcp reply). Distrust a fix whose two frames disagree.

### 2. Predict the ground-out, then descend force-watched - the pass-through is half the threading proof

    ground_out_z = tip_z + hang        # where the ring's bottom meets the tip
    require z_min < ground_out_z       # or the descent proves nothing

    r = bot.descend_to_contact(tip_x, tip_y, z_start=tip_z + 0.03,
                               z_min=tip_z - 0.012, top_down_deg=t)

Aligned, the bore swallows the tip and the descent is force-free straight
through the predicted ground-out.

**Force-free is ambiguous, and one more descent resolves it BEFORE you let
go.** Keep descending, force-watched, deep enough that a MISS lands too.
Then every outcome ends in a contact and only its HEIGHT matters.

    r = bot.descend_to_contact(tip_x, tip_y, z_start=tip_z - 0.012,
                               z_min=base_top_z + hang - 0.015,
                               top_down_deg=t)
    floor = base_top_z + hang          # -0.0135 here: resting ON the base

Compare the contact against BOTH heights explicitly - the rows below are
`contact_z` tests, and getting the inequality backwards is a real failure mode
(a run read a contact 37 mm ABOVE the floor as if it were at it):

    ground_out = tip_z + hang            # 0.131 here
    floor      = base_top_z + hang       # -0.014 here
    threaded   =  floor + 0.004 < contact_z < ground_out - 0.004

| stopped at | meaning | do |
|---|---|---|
| `ground_out_z` = tip_z + hang | the ring's bottom is ON the tip: misaligned | release there - the rounded tip funnels it on, then let the look adjudicate |
| below that, above `floor` | something on the rod is holding the ring up - measured at TCP 0.025 and 0.023, about 105 mm below the tip, where the rod meets the gripper | climb - but STAY BELOW TIP HEIGHT - then open |
| `floor` or lower | it came down beside everything | do NOT release: climb, re-fix the tip from TWO poses, re-centre, descend again |

Reading the middle row as a failure is how a completed thread gets
retracted. What the test reads is the HEIGHT ordering, and it does not need
to know what stopped the ring: anything holding it up stops it high, and the
floor never moves. Releasing on a miss
drops the ring where it just failed to thread - the documented "released the
ring onto nothing". Do not open while the rod is loaded against the gripper,
keep the open fingers above the base top, and never climb above tip height
before opening or the bore leaves the rod.

Release-on-contact at the ground-out is safe because the bore (21 mm) over
the rounded cap (17 mm) seats anything within ~2 mm, and the stall repeat
bounds the error to that. If the look then shows a miss, or the contact
height matches none of the three, do the full loop: lift, re-fix the tip,
re-centre. Never push either way.

A pinch damages more than the aim: **the contact cocks the RING in the
jaws**, and a re-descent then fails at a perfectly correct xy - a tilted
25 mm-deep bore loses its radial clearance (~5 mm goes at ~11 deg of
tilt). Measured: the held ring's frame position and ellipse drifted
through two pinches and sprang back after a lift - the lift unloads it and
the elastic squeeze re-seats it. The check costs two frames: a held
object's projection is INVARIANT under arm translation, so compare its
frame position/shape across two hovers - any change means it moved in the
jaws. If in doubt, set it down flat and regrasp.

TRANSIT RULE. Before any lateral move near the base, climb to a height
the rod cannot reach - above `tip_z + hang`, with margin (probe that height
for IK first) - and descend only when vertically above the final
fix. If that height has no IK solution at the tip's radius, the approach
is INFEASIBLE: abort; do not substitute a lower hover (measured: a
"highest reachable" hover put the ring's bottom below the tip and the
translate struck the rod). The margin is worst-case on purpose: tip_z
estimates have disagreed by 40 mm between careless triangulations,
move_tcp does not watch forces (a ring-through-rod transit is silent and
stales the fix you just took), and a shoved-aside rod still gives a
force-free descent - through empty air.

### 3. Release and let the ring slide

Full open a few cm above the confirming contact of step 2 - not at the
ground-out, and not while the rod is pressing the gripper - then lift
straight up: the rod is between the open fingers until the TCP clears tip
height, so a sideways move before that strikes it. This base (~90 mm) is WIDER than the ring, so the
ring seats on the base's TOP, not the table - keep the release depth (and
the open fingers) above the base top; released at TCP 0.128 here, well
clear.

### 4. Verify from ONE top-down look - and do not probe beside the rod

Centre the camera over the base. The success signature is geometric and
cannot be faked:

    ring annulus around the rod, RED MARKER visible inside the bore

The marker visible INSIDE the ring's bore is impossible unless the ring is
on the rod; a miss shows the ring beside the base with an empty bore.

CENTRE THE CAMERA over the base before measuring that separation, or the
number lies: measured 45.7 look-px from 76 mm off-axis - a false near-miss
against a <45 px threshold - and 2.9 px from the same rig with the camera
centred (TCP = base_xy - camera_offset at your theta). This
is the whole verification - the force-free pass (step 2) plus this look.

Do NOT descend closed jaws next to the rod to probe the ring's height: the
fingertip is a 2 mm probe but the finger BODY above it is not, and a
vertical descent that ends below tip height sweeps that body through the
rod on the way down (measured: a ring-top probe 25 mm off-axis clipped the
rod). The probe's number - how far the ring slid - changes nothing about
success anyway: any position on the rod is threaded.

## Verification

The force-free pass through `ground_out_z` is NECESSARY, not sufficient: a
descent that misses the rod entirely is also force-free (measured - the
rod had been silently shoved aside, the descent sampled empty air through
the predicted ground-out, and the release dropped the ring onto nothing).
Force at the ground-out distinguishes "landed on the tip" from "touched
nothing" and nothing more. Two things then separate threaded from missed:
the DEEP DESCENT of step 2 (a contact ~104 mm below the tip, taken before
releasing) and the top-down marker-in-bore look (taken after). Use both -
the deep descent is what lets you commit to the release, the look is what
proves the outcome. A run that reaches the release with only the force-free
pass in hand has no way to tell the two apart, and backing out of a
successful thread is the failure that produces. The cheap
closing checks: the release reached its commanded open width, and the ring
is gone from its table spot - and if it is not on the rod either, look
WIDE: a dropped cylinder of this height ROLLS, metres if unlucky, so
search the whole reachable table before concluding it vanished.

## Pitfalls

- Inheriting the rod tip's position - from an earlier session, or from
  before any contact with the assembly. The base is rigid but unbolted;
  a collision slides it silently. Fix it from the camera-over-tip pose,
  descend immediately, re-fix after any touch.
- Re-descending after a pinch without checking the cargo: the pinch cocks
  the ring in the jaws, and a correct xy still fails through a tilted
  bore. Lift (it springs back), verify its projection is unchanged across
  two hovers, then descend.
- Reading a `contact: false` descent as the whole threading proof: a clean
  miss is also force-free (the look decides), and the test is vacuous
  anyway without checking `z_min < ground_out_z` first.
- Probing beside a protruding rod with closed jaws - the finger body passes
  through the rod's height before the fingertip reaches the target.
- Translating sideways at release height: the rod stands between the open
  fingers. Climb above tip height first.
- Translating anywhere near the base below worst-case tip height with the
  ring in hand - the collision is silent and it both moves the target and
  invalidates your fix. Climb first (see the transit rule).
- Expecting camera depth on the tip at working height - it sits near the
  D435's minimum range. The ray-to-tip-plane fix needs no depth.
- Auto-exposure adds a time axis to colour (seeing.md): re-measure the
  marker's HSV per scene, and verify any detection on a MARKED frame.
- Re-measuring the camera offset per wrist angle - `camera_pose_base` in
  the look reply already carries the calibrated camera pose at that theta
  (seeing.md).
