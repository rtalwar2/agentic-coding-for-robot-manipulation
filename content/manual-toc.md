# Platform manual — table of contents

Four files, 617 lines total (README.md 31, picking.md 188, seeing.md 241, sdk.md 157). Read by the agent as text; never executed.

## README.md (31 lines)
- (title) platform manual
- the rules that outrank the rest

## picking.md (188 lines)
- (title) picking.md - grasping on this cell
- the geometry that decides everything: the pads are ABOVE the TCP
- closing: FULL close, and let the object stop the jaws
- verifying a grasp - two numbers, then a look if it matters
- placing: feel for the surface, do not compute it
- the hang distance - measure it at the grasp; predictions need it
- the table height is a CELL constant - never probe the bare table
- the approach

## seeing.md (241 lines)
- (title) seeing.md - camera, depth, detection
- locate_objects: the detection pipeline, done for you
- detection, when you do it yourself
- the taught profile pose - the side view, ready to use

## sdk.md (157 lines)
- (title) sdk.md - the platform API from Python

## Verbatim: README.md — "the rules that outrank the rest"

## the rules that outrank the rest

1. **Look to find things, and to explain a surprise.** A frame is the only
   ground truth about where an object IS, so detection needs images. Once you
   have measured a position you do not need to re-photograph it after every
   move: the arm reports `position_error_m` and it has been 0.0-0.0005 on this
   cell, so a move that says it arrived did arrive.
2. **Verify with the cheapest signal that can fail.** Numbers first, pictures
   only when no number can answer the question. A move is verified by
   `position_error_m` (healthy: < 0.001). A grasp is verified by the stall
   width, and by that width still being what it stalled at after the lift -
   see picking.md. One look at the END to confirm the result is right; a look
   after every step is not.
3. **Batch. One script, not ten tool calls.** Every tool call is another turn
   of the model, and a turn costs far more time than a robot command does.
   Approach, descend, full close, lift, re-read the width: that is ONE
   script that prints its numbers, not five calls. Write the script, run it,
   read the output. Loops, detectors and arithmetic belong there anyway.
4. **Route around objects.** move_tcp goes in a straight line; the workspace
   clamp protects the table, not the things standing on it. Approach from
   above: move XY at a safe height, then descend.
5. **Do not repeat a failed approach a third time.** Change something
   measured instead.

## Verbatim: picking.md — "the table height is a CELL constant" (the manual's declared cell constant)

## the table height is a CELL constant - never probe the bare table

**table_z = -0.026** (by touch, closed jaws, eight spots x three probes,
median per spot: range 2 mm, plane-fit residual 0.27 mm. The surface tilts
~11 mm/m in y, so the constant carries +-1 mm across the reachable table).
The table does not move on its own; trust the constant. It DID move once -
the surface was changed and every absolute z in the cell shifted +4 mm -
so a systematic disagreement between touched object heights and the
recorded ones is a reason to re-measure THIS number, once, and transfer
the offset everywhere rather than patching skills one at a time.

Object heights are instance numbers - measure them ON THE OBJECT (a closed-jaw touch on its top, like
the peg or the ring's wall), never by re-deriving the table underneath it.

A bare-table probe is also where the one self-collision on this cell
happened: **the robot stands at y ~ 0 and is NEVER in the camera frame**,
so "this spot looks empty" says nothing about the robot's own body. No low
pose or probe with y above ~-0.25 - LOW meaning a TCP below ~0.10, where the
gripper body can reach the robot's own column. The workspace box permits
poses there (it protects the table, not the robot), and `reachable()` checks
IK, not gripper-body-vs-robot clearance. A high pose looking down over that
y (the taught profile pose, seeing.md) is fine.

