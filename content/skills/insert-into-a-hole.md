---
name: insert-into-a-hole
description: Procedure for inserting a held object into a matching hole in a raised face - identify the real hole among the toy's look-alikes, measure its xy parallax-free, get the face height by touch with the held object's own bottom, use the force-free descent through a predicted ground-out height as the alignment test, release inside the hole, and verify seating BY LOOK (fingers never enter a hole), pressing a proud top down only to face level if it wedged.
---

# Inserting a held object into its hole

The numbers below were measured on one instance of this task (this object,
this lighting). They are wrong for any other instance - re-measure them; the
procedure is what transfers.

This page assumes the platform manual (picking.md, seeing.md) and a
verified hold from grasp-a-cylinder. It starts with the object in the jaws.

The instance: the 41 mm red cylinder, held at TCP -0.017 (hang: the object's
bottom rides 9 mm below the TCP), into the round hole of a Fisher-Price shape
sorter standing on the table. The sorter's top face carries a row of four
cutouts of differing shapes, and above them a storage tray with shape-shaped
recesses and parked pieces.

| | measured | how |
|---|---|---|
| hole centre | (0.1399, -0.3814) | four near-nadir ray fixes agreeing to 0.6 mm - an ANCHOR, never an aim point: this toy has sat at x 0.1113, 0.1178, 0.1229, 0.1399, 0.1510 and 0.1640 on different days |
| hole diameter | 43 mm calipered | the tan blob reads 41.4 mm near-axial and has read 51.5 mm obliquely; never use blob size as clearance |
| clearance | ~0.5 mm per side on a 41.9 mm object | so the xy fix must be good to well under a millimetre |
| face height | **z = 0.045 - an APPARATUS CONSTANT** of this box, established by touch across sessions and re-confirmed at 0.044 | trust it; one touch with the held object's bottom re-verifies it if the box was replaced |
| hang below TCP | 9 mm | grasp_tcp_z - surface_z = -0.017 - (-0.026) |
| ground-out height | 0.054 = face_z + hang | predicted BEFORE the descent |
| alignment descent | force-free 0.083 -> 0.049, 18 steps, Fz within 1.1 N of baseline | through the predicted ground-out |
| release | width 0.055 at TCP 0.049 | object 5 mm engaged; the open REACHED its commanded width, so the object left the jaws |
| seated depth | object top ends ~3 mm below the face | a seated top is RECESSED, with a crescent of hole wall visible from an oblique view; a wedged one has stood 14 mm PROUD |
| HSV, tan hole interior | H 16-20, S 111-198, V 90-140 | the interiors are DARKER than the white face, not brighter; bare table S 8-69, so an S floor of 100 excludes it |
| mask | `hsv_lo (10,100,80), hsv_hi (28,220,170)` | re-measure it: a V floor carried from a brighter session dropped every opening (step 2) |

## Procedure

The procedure composes into ONE guarded script: encode each step's
check as an assert that fails loudly with its numbers, run the nominal
path in a single turn, and escalate to reasoning only when a check
fails or a look needs interpreting (sdk.md).

### 1. Identify WHICH opening is the hole - the toy carries rows of look-alikes

Seen from above the toy presents, far to near: a storage TRAY of embossed
shape-shaped recesses, usually with pieces parked in them (a parked tan ball
is round, masks as tan, and measures ~45 mm - it passes every geometric test
while being furniture); the REAL hole strip (the row of tan cutouts in the
top face); and printed outlines on the vertical front face - flat ink.

Identity comes from three things together, none alone:

- the **tan interior** (box interior seen through a real opening), darker
  than the white face - mask it, then judge SHAPE by RECTFILL, contour area
  over bounding-box area: a circle fills pi/4 = 0.785 of its box regardless
  of what the threshold does to its edge, and measured 0.76-0.78 here.
  Circularity is the weaker test and its margin collapsed with the lighting:
  the circle read 0.90 against 0.82 for another cutout, where a brighter
  session had 0.987 against 0.64. An oblique view has scored a true circle
  0.74. Rectfill held on every frame this session;
- the **row**: the real holes are collinear cutouts in one strip, nearer the
  arm than the tray. Never pick a "circle" that shares its row with parked
  pieces;
- ultimately: a real hole is a through-hole - the alignment descent (step 5)
  passes below the face. A recess grounds you at the face.

Diameter agreement is NOT an identity test, and grayscale HoughCircles in a
guessed ROI finds embossed outlines, printed rings and parked balls with
equal enthusiasm - the tan-interior mask + rectfill IS the identity test.

### 2. Measure the tan mask on the live frame, with the held object in view

Measured here: hole interior H 16-20 / S 111-198 / V 90-140. Working mask:
`hsv_lo (10,100,80), hsv_hi (28,220,170)`. The held object rides fixed at the
bottom of frame (cargo - a blob fixed in the image across TCP moves is in
your hand), so separate it by position, not by hue alone.

BOTH floors bite, in opposite directions, and neither announces itself:

- the **V floor** is what carries between sessions and breaks. A floor of 140
  from a brighter session left ONE hole-shaped blob of 816 px on interiors
  that now read V 90-140: the mask looked like it was working and every other
  opening had vanished. Measure V on the interior, then floor it well below
  what you read.
- the **S floor** must stay near 100. Below it the bare table joins the mask -
  it is tan too (S 8-69) - and at a floor of 80 it came in as one blob of
  17-20k px, bigger than every opening together. Shape kills it (rectfill
  0.54, circularity 0.34), but only if you are checking shape and not area.
- the cutouts are not equally saturated, so a floor set from ONE of them can
  silently drop another and leave the mask returning confident round blobs
  that are all the wrong opening.

### 3. Measure the hole xy parallax-free - one ray onto the face plane

From any hover with the hole in view, cast the ray through the hole blob's
centre pixel (`camera_pose_base` + `intrinsics_fullres` from the look
reply, seeing.md) and intersect it with the face plane:

    ray_cam  = ((u - cx)/fx, (v - cy)/fy, 1)      # u,v FULL-RES (look px x2)
    ray_base = R(camera_rotvec) @ ray_cam
    s        = (face_z - cam_z) / ray_base[2]
    hole_xy  = cam_xy + s * ray_base[:2]

`face_z` = 0.045, the apparatus constant (step 4 - use it directly, no
per-run touch). One look, one solve - no per-theta camera offset. Take a
second frame from a different TCP position; the two fixes agreeing is the
staleness check (seeing.md).

**An OBLIQUE ray fix is not accurate enough for this clearance**: the tan blob
is the box INTERIOR seen through the opening, and from an angle that patch is
displaced from the hole's axis - measured 2.1 mm out, with two oblique views
agreeing to 2 mm because they SHARE the bias. So fly the camera over the hole
using the rays, and take the fix NEAR NADIR, where the displacement goes
away. Measured: four fixes from four near-nadir poses agreed to 0.6 mm, and
the insertion descent then passed force-free.

Take that fix from the RAY, not from `camera_pose_base`'s xy. The plane-free
shortcut - "with the blob on the optical axis its xy is the camera's xy" -
assumes the optical axis is vertical, and it is not: the hand-eye rotation
leaves ~1 deg of tilt, so aiming the camera at the hole leaves the blob 5-7
look px off the principal point and iterating does NOT drive it to zero.
Chasing that residual is chasing the tilt. The ray solve carries the tilt in
`camera_pose_base`'s rotation and landed within a millimetre; the camera-xy
rule was ~4 mm out at this hover height.

Wrist angle for the LOOK: at theta=0 the held object's blob merges with the
hole's on this cell; theta=180 keeps them separate.

Reach caps HEIGHT at radius: over this hole's approach, z = 0.25 had no IK
solution and z <= 0.20 did. Survey candidate poses with `bot.reachable()` -
check-only, it never moves (sdk.md); move_tcp is never a survey.

### 4. The face height is the apparatus constant - do not re-measure it

`face_z = 0.045`, re-confirmed by touch at 0.044 after the table surface
under it was changed. The toy slides in xy between sessions (re-measure the
HOLE every run, step 3) but its face HEIGHT never changes - like the rod
tip in game 3, the constant is used directly and no per-run touch is spent
on it. Its authority comes from how it was established: BY TOUCH, in
several sessions agreeing to ~1 mm. Optical face estimates on this toy
have missed by 8 and 20 mm; never re-derive it optically.

Re-derive by touch ONLY when the apparatus visibly changed or a descent
contradicts the prediction (contact far from the predicted ground-out).
The safe recipe, since the face is mostly holes and a bare closed-jaw
probe wedges INTO an opening (a hard, clean 9 N contact 22 mm below the
real face has been measured that way): descend with the HELD object's own
bottom aimed at the solid strip between two holes (here: the midpoint of
the target hole's centre and its neighbour's - measured 71.6 mm apart, so a
41 mm bottom bridges the ~30 mm strip harmlessly), then
`face_z = contact_z - hang`. Measured that way: contact 0.053, minus a 9 mm
hang, gives 0.044 against the constant's 0.045.

### 5. Predict ground_out_z, then use the descent as the alignment test

The wrist angle for the insertion comes from the OBSTACLES, not the object:
the hole strip has a raised rim on both long sides, and the RELEASE is what
hits it - opening the gripper swings the fingers out to a 60-85 mm span, so
at theta 90 (jaws across the strip) the opening fingers strike the rim, at
the exact moment every descent check has already passed. Jaws along the
strip (theta 0 or 180 - same jaw line) clear it.

Do NOT re-derive which theta puts the jaw line along the strip - the
theta-to-jaw-line mapping is a device fact that is easy to get backwards
(a run reasoned "fingers swing along the strip at 90", the exact angle
measured to strike the rim, and carried it to the hole). With the strip
along base x, MEASURED on this cell: theta 0/180 = jaw line along the
strip, theta 90 = across it. If the toy sits differently, VERIFY instead
of deriving: hover over the strip at the chosen theta and take one look -
the two fingertips and the strip must run the same way in the image before
anything descends. The look is unambiguous because the FINGERTIPS NEVER MOVE
IN THE IMAGE - they turn with the camera - so the only thing theta changes is
which way the strip runs. Measured: at theta 180 the strip lies across the
frame and the fingertips flank the held object along the same direction (jaws
along the strip); at theta 90 the strip stands up the frame while the
fingertips still flank sideways (across it). The release is the step that strikes, so the
check must happen while it can still change the plan.

Reorient in clear air, never next to the toy - and watch joint 6: rolls
wind it silently (measured ~170 deg per 180 roll, and a large unwinding
move_joints can hit the HTTP timeout). Unwind early, in steps <= 180 deg.

Predict before descending, and check the test is not vacuous:

    ground_out_z = face_z + hang            # a misaligned object grounds HERE
    require z_min < ground_out_z            # or the descent proves nothing

    r = bot.descend_to_contact(hx, hy, z_start=face_z + 0.04,
                               z_min=face_z + 0.004, top_down_deg=theta)

Measured, aligned: force-free from 0.083 to 0.049 in 18 steps, Fz never more
than 1.1 N off baseline, straight through the predicted 0.054. That pass-through is the alignment proof, and it is ONLY
the alignment proof. A misaligned descent stops dead AT the prediction -
measured 0.054 against a predicted 0.055, three times before the spiral
found the opening.

`contact: true` near ground_out_z means re-measure the hole xy, not push
harder. Search from the re-measured centre with a spiral SMALLER than the
clearance - 0.8 / 1.6 / 2.4 mm at eight angles, re-probing each; 0.8 mm at
the third angle is what found it here, and a 1.5 mm first ring would have
stepped over the opening. Probe from just above the ground-out (z_start
7 mm over it) so each probe is short; the held object clears the face by
that margin while you move laterally.

### 6. Release INSIDE the hole - and know the grip geometry cannot seat it

Two facts bound everything:

- **jaws around the object cannot enter the hole** (fingers on a 41 mm
  object span wider than the opening), so while holding, the TCP cannot go
  below face_z, and the maximum engagement is the hang (10 mm here, of a
  ~40 mm-deep hole);
- once aligned and released, the object falls the rest of the way itself.

So an insertion is *align, release, then verify by look*. The hang must
exceed the descent clearance or the object cannot enter at all before the
fingers foul.

    HARD RULE: fingers NEVER go below face_z and NEVER enter a hole,
    open or closed. Everything below the face belongs to the object and
    gravity; verification is the camera's job. (A probe inside the toy
    can snag it on the way out and throw it - and an empty opening
    wedges a closed-jaw probe ~22 mm deep, poisoning the measurement.)

Release at the descent's bottom (object engaged - here 6 mm in at TCP
0.049): open a few mm past the object (width 0.055 here), then retreat
STRAIGHT UP - no lateral or rotational motion until the fingertips are
well above the face.

### 7. Verify seating BY LOOK - judge geometry, not colour

Retreat, then look from above. The judgment is the object top's HEIGHT,
read from the image geometry:

- **seated**: the top sits recessed below the face (here ~3 mm down) - a
  disc set INTO the opening, no side wall visible, and from an OBLIQUE view
  a crescent of the hole's inner wall shows between the rim and the object's
  far edge. That crescent is the clearest signal the top is below the face;
- **wedged / perched**: the top stands proud of the face (a wedged object
  has stood 14 mm proud here) - the cylindrical SIDE WALL is visible and
  the top rides above the rim.

If the from-above reading is ambiguous, the taught profile pose (seeing.md)
gives the side view - one look there, judged by eye.

If one view is ambiguous, take a second look from a lower or oblique pose -
never a finger. Do not use depth (dead at this range on this camera) or
blob size alone (the translucent object's glow moves the silhouette more
than the height difference does).

### 8. If it stands proud: press DOWN TO FACE LEVEL, never below

The object can bind: an equally clean release has ended with it wedged
14 mm proud. While the top is above the face it is touchable - press on it
with closed jaws, force-limited, and STOP with the fingertips at face_z
(z_to = face_z, never lower - the hard rule stands):

    def press_to_face(bot, x, y, z_from, theta, face_z, f_max=25.0, step=0.001):
        base = bot.state()["tcp_force"][2]
        z = z_from
        while z > face_z:                          # fingers stop AT the face
            z -= step
            if not bot.move_tcp(x, y, z, top_down_deg=theta, speed=0.01).get("ok"):
                return "refused", z
            fz = bot.state()["tcp_force"][2]      # read STATIONARY
            if abs(fz - base) > f_max:
                return "stalled", z
        return "at_face", z

Force back to baseline while z advances = it broke free and fell home;
force rising and staying up = jamming - stop, lift, re-check the hole xy,
do not raise f_max. Keep f_max modest: the table carries the load but the
box can slide. Then LOOK again (step 7): top no longer proud = gravity has
it or it is flush - accept. Still proud at the force limit = stop and
report; do not chase it into the hole.

## Verification

The look (step 7) is the seating test, and the height geometry is what it
judges. The colour check - the hole's interior flipping from tan to the
object's colour - only proves the opening is BLOCKED: it has read its
strongest possible value on an object wedged 14 mm proud, because blocked
looks identical from above either way. Blocked + top recessed is the
success reading.
Keep it as a cheap first filter; never close on it. Cheap closing checks:
the object is gone from its spot on the table, and the release reached its
commanded width instead of stalling on an object that never left the jaws.

## Pitfalls

- Inserting into the wrong opening entirely: the tray's recesses and parked
  pieces pass geometric tests. Identity = tan-interior mask + circularity +
  the row, and finally the through-hole descent. A size match proves nothing.
- Inheriting the hole's xy: this toy has moved 33 mm between sessions and
  6 mm between others. The recorded centre is for flying the camera over.
- Trusting an optical face height. Touch it with the held object's bottom.
- Carrying a V floor between sessions: it drops the openings silently, and
  the mask still returns something hole-shaped.
- Selecting a tan blob by AREA: the bare table is tan and can out-mass every
  opening together. Select by rectfill.
- Iterating a centring loop against the ~1 deg optical-axis tilt: it does not
  converge, and the ray solve does not need it to.
- Believing a clean hard contact without asking what it hit - bare closed
  jaws in a hole wedge on the rim well below the face.
- Reading a `contact: false` descent as alignment proof without checking
  `z_min < ground_out_z` - otherwise the descent never reached the height it
  claims to have tested.
- Ending at the release. The held object can never be more than its hang
  deep; the rest happens after you let go, and it can wedge on the way.
- Believing the colour check as a seating test.
- Carrying the grasp's wrist angle to the insertion. The object being round
  does not free the wrist once there are walls around the hole - and the
  collision comes when the fingers sweep OUT at the release, not on the way
  down, so no descent check catches it.
- Re-measuring the camera offset per wrist angle - `camera_pose_base` in
  the look reply already carries the calibrated camera pose at that theta
  (seeing.md).
- Expecting depth at insertion height: the camera sits at its ~0.28 m
  minimum range there and returns garbage (2.24 m, 65.535) rather than
  failing loudly. Work in pixels plus geometry; calibrate scale by moving
  the TCP a known distance and reading the pixel travel.
- Letting joint 6 wind up ~170 deg per roll with nothing watching it, then
  discovering the big unwinding move times out. Unwind early, in steps.
- A blob fixed in the image while the TCP moves is your own cargo, not a
  table object. Track grasp state explicitly.
