---
name: grasp-a-cup
description: Procedure for picking up one object standing on the table - measure the colour window on the live frame, locate it with depth evidence, touch its top face, grasp at the pad band with two closes 90 deg apart, and prove the lift with the width checks.
---

# Picking up a cup from the table

The numbers below were measured on one instance of this task (this object,
this lighting). They are wrong for any other instance - re-measure them; the
procedure is what transfers.

Manual: picking.md (gripper geometry, closing, verification), seeing.md
(camera, rays). This page adds only what this task needs.

The instance: a blue plastic cup standing upside down - wide rim on the
table, tapering upward.

| | measured |
|---|---|
| silhouette diameter, on axis | 0.0445 m |
| height | 40 mm (top face z = 0.014 BY TOUCH, table z = -0.026) |
| grasp TCP z | -0.016 (pad-band formula) |
| hang below TCP | 10.0 mm (grasp_tcp_z - table_z) |
| stall width | 0.0373, equal at two wrist angles 90 deg apart, unchanged after the lift |
| HSV, cup body | H 104-107, S 222-255, V 130-204 |
| HSV, bare table | S 0-45, V 95-133; H unusable (near-neutral surface, no stable hue) |
| mask | `inRange((95,180,80),(115,255,255))`, close 7x7 then open 5x5 |

Run steps 4-6 as ONE guarded script: every check an assert that fails with
its numbers (sdk.md). Reason only when an assert fires. Issuing the same
sequence one command at a time is how the thread of it gets lost - the open,
the roll and the climb are ordering constraints, not independent steps.

## Procedure

### 1. Correct the off-axis parallax; do not fly the camera over the cup

One `locate_objects` from the start pose is the only detection this task
needs. Its `centre_base` is biased toward the camera because the cup's
near-side wall joins the silhouette - 4-5 mm at 180 px off axis, 5-9 mm at
270 px, 14-15 mm at 330 px. Correct it with the height you touch anyway
(seeing.md):

    D  = cam_z - top_z
    xy = measured_xy - (h/(2*D)) * (cam_xy - measured_xy)

Measured: 10.0 mm mean error raw, 2.4 mm corrected, over 12 fixes out to
639 px off axis.

There is no ordering problem in needing `h` here: the correction is
first-order in `h`, so `h = top_z - table_z` straight out of the same locate
serves, even though vision reads the top a few mm high (a 5 mm error in `h`
moves an 8 mm correction by under 1 mm). The touch in step 4 refines it, and
the probe itself can be aimed with the raw fix.

For a GRASP even the raw fix works: the jaws span 0.0839 around a 0.0445 cup
(19.7 mm per side) and step 5's two closes take out the rest. Measured,
aiming 4.5 mm off: stall 0.0373 / 0.0373, held - identical to a centred aim.

Centre the cup only to measure its DIAMETER (`off_axis_px` under ~25; the
correction above does not fix a size). To centre, put `camera_pose_base`'s xy
on the cup and re-locate.

- The camera-to-TCP offset ROTATES with the wrist: measured (-0.0329,
  +0.0631) at top_down_deg 0 and the exact negation at 180, so
  `offset(theta) = Rz(theta) @ offset(0)`. An offset read at one theta and
  used at another lands 126 mm out.
- Theta is also a REACH choice: over a cup at (0.116,-0.367) theta=180 puts
  the TCP at radius 0.314 and theta=0 at 0.454, which has no top-down IK
  solution at z=0.21.
- **This cell's start pose is theta=180**, not 0. Read the wrist from
  `state()` and keep it (picking.md: a round object does not care). Asking for
  `top_down_deg=0` out of habit is a 180 deg flip: the reply says
  `reorient_deg 179.99`, and a run that kept doing it wound j6 to 148 deg,
  lost every top-down IK solution over the table and ended in HTTP 500s.

### 2. Measure the colour window on the live frame, then check COVERAGE

Which channel separates is a property of the instance. Here it is saturation:
cup S 222-255, bare table S under 45. Under harder light glare collapsed S on
a glossier cup and V+H carried the separation instead. Measure all three.

A hue that sits near H 0 or H 180 WRAPS, and no single `inRange` holds it.
When the measured hue wraps, or drifts between frames, drop hue and threshold
a channel DIFFERENCE built from the object's own dominant primary - the
object's channel minus the larger of the other two:

    b = cv2.cvtColor(r.ndarray(), cv2.COLOR_RGB2BGR).astype(np.int16)
    d = b[:,:,i] - np.maximum(b[:,:,j], b[:,:,k])    # i = the object's primary
    m = ((d > 40) * 255).astype(np.uint8)

A near-neutral background cannot pass such a threshold: this table runs S
under 45 at V ~120, so its channel spread is under ~17 against a floor of 40.
Re-check it anyway against whatever difference you build.

Check coverage, not blob count: `4*area_px/pi` against the known diameter in
pixels (`depth/915` m per full-res px). Measured on this mask: 105% of the
big cup, 94% of the small one.

- A floor too LOW fails plausibly: at S>=70, V>=140 this scene returned four
  blobs and 13.7k mask pixels that were not cup.
- A floor too HIGH fails more quietly: it returns the right NUMBER of blobs,
  just smaller. A V floor of 150 carried over from a brighter instance kept
  both cups at 84% coverage, biasing every centroid and diameter.
- A PALE or low-saturation object can blow out under the wrist LED - measured
  on such an object: S median 10, V median 255 - and then no single window
  holds it. OR two branches:

      sat   = cv2.inRange(hsv, (h0,120, 60), (h1,255,255))   # saturated body
      blown = cv2.inRange(hsv, (  0,  0,244), (180, 60,255))  # blown highlight
      m     = cv2.bitwise_or(sat, blown)

  Sample the object's OWN pixels first (a hand-picked ROI on the live frame),
  never a guessed window: a guessed one missed the object outright, and the
  run then mislocated it by 32 mm and closed on air.

### 3. Select blobs by DEPTH EVIDENCE, not by size

`depth_samples.on_object` separates cups from everything else in this mask.
Measured: cup 114-152/160 near axis, 26-79/160 beyond 420 px off axis;
every non-cup blob 0/160, `plane: reference-fallback`, with a warning.

Non-cup blobs this mask returns, both bigger than nothing and one bigger than
either cup:

| blob | area | depth | tell |
|---|---|---|---|
| the closed jaws | 4.2k px at look (425,347) | 0/160 | fixed in the IMAGE across TCP moves |
| equipment past the table edge (theta=90) | 8.4k and 28.8k px | 0/160 | outside the table, near frame edge |

Take `centre_base` and `top_z` only from a blob whose plane is `object`.

### 4. Touch the top face, CLOSED jaws, then climb

    bot.gripper(width=0, force=25, speed=0.05)          # empty close reads 0.0018
    r = bot.descend_to_contact(x, y, z_start=0.06, z_min=0.000,
                               top_down_deg=th, step=0.002, fz_threshold_n=2.5)
    top = r["contact_z"]                                 # 0.014 here
    bot.move_tcp(x, y, 0.12, top_down_deg=th)            # CLIMB before reopening

Vision reads the top face HIGH and the error grows with range: measured
+4.3-5.0 mm on this cup, +6.8-7.4 mm on a taller one. Touch is the reference
for any absolute z.

Judge the SIGNATURE, not the boolean: step-to-step noise ran +-0.3 N and
contact showed as a jump of +5.1 to +13.1 N in one 2 mm step (`trace_last`
carries the last rows). **Do not lower `fz_threshold_n` below 2.5** - at 1.0 N
a descent false-triggered 2 mm in and had to be repeated. The absolute
baseline is a payload and pose bias, not a signal (8.6 N here, 38 N under
another payload); only the change means anything.

- OPEN jaws return `contact: false` on a cup: the 0.0839 span straddles it.
- Reopening at contact height shoves the cup: the pads sweep outward and the
  fingertips ride up their arc. Climb first.

### 5. Grasp at the pad band, full close, twice 90 deg apart

    TCP_z = (surface_z + top_face_z)/2 - 0.010 = (-0.026 + 0.014)/2 - 0.010
          = -0.016

    bot.gripper(width=0.085, force=25, speed=0.05)     # full open
    bot.move_tcp(x, y, 0.12, top_down_deg=th)          # above, clear
    bot.move_tcp(x, y, -0.016, top_down_deg=th)        # straight down
    g1 = bot.gripper(width=0, force=25, speed=0.02)    # the cup stops the jaws
    bot.gripper(width=0.085, force=25, speed=0.05)
    bot.move_tcp(x, y, 0.12, top_down_deg=th)          # climb, roll in CLEAR AIR
    bot.move_tcp(x, y, 0.12, top_down_deg=th - 90)
    bot.move_tcp(x, y, -0.016, top_down_deg=th - 90)
    g2 = bot.gripper(width=0, force=25, speed=0.02)    # this close IS the grasp
    bot.move_tcp(x, y, 0.14, top_down_deg=th - 90)      # lift

A parallel gripper centres the cup along the CLOSING axis only; the
perpendicular offset survives and no width reading sees it. The second close a
quarter turn round covers the other axis. Equal stalls mean centred: 0.0373 /
0.0373. Roll ABOVE the cup, never at grasp depth.

The stall width says where you are on the taper. Measured on a tapered cup,
same object: TCP +0.019 stalled 0.046 and slipped out on the lift; TCP +0.004
stalled 0.051 and held.

The silhouette is not the width the jaws must clear. An upside-down cup's
silhouette is its RIM - the widest band, on the table - while the pads grip
the middle. Measured here: silhouette 0.0445, stall 0.0373, so the band ran
~15% narrower than the rim. Compare the EXPECTED STALL against the 0.0839
span, not the silhouette; near that span picking.md's jaw-limit behaviour
applies (the width register understates a wide grip).

## Verification

Stall width plausible for the object AND width unchanged after the lift
(0.0373 -> 0.0373). A slip reads exactly the commanded width - the motors
close the rest of the way. `object_grasped` was TRUE on a grasp that slipped
and is a false positive below ~5 mm; never decide on it alone. No confirming
look for a routine pick (picking.md).

## Pitfalls

- Gripping the topmost band of a tapered object: narrowest band, slips out.
- Carrying "N mm below the top face" between objects: on a shorter cup it
  asks for a TCP under the table. Use the pad-band formula.
- Believing a raw off-axis centre, or a diameter measured off axis at all.
- Taking a blob with `plane: reference-fallback` for an object.
- Trusting S in the mask when the surface is glossy: glare kills S.
- Probing a cup with open jaws, or reopening the jaws at contact height.
- Using a camera offset measured at a different top_down_deg, or typing
  `top_down_deg=0` when the wrist is at 180.
- Lowering `fz_threshold_n` to be careful: it false-triggers.
- Putting the settle sleep in a tool call instead of inside the script.
