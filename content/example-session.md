# Inside one session: run-20260905T120810-1d-t2 (Cups, cell 1d, trial 2 — success)

Source: `airo-archive/_decrypted/run-20260905T120810-1d-t2/` (manifest.json, agent session JSONL, two descend traces, service.log).

**Task prompt (verbatim):** `Stack the yellow cup on top of the green cup.`

**Run facts (from manifest.json):** model qwen3.8-27b, thinking level low, max_tokens 32768, git SHA 41cc8d2 (clean), skills present grasp-a-cup + stack-two-cups, all tools enabled, prune_thinking false. Elapsed 3.77 min (10:03:49 → 10:07:35 UTC). 13 assistant turns, **16 tool calls** (read 5, bash 6, look 3, locate_objects 2); 27.5k thinking chars, 50.8k text chars (thinking share 35%). Skills read once each; manual pages read: seeing.md, sdk.md. Signals: 10 `descend_to_contact` mentions, 1 `clamped:true`, 0 interventions. Zero registered `move_tcp`/`gripper` tool calls — all motion went through agent-written scripts via the SDK.

## Timeline (abridged; `g` = model generation time for that turn, from the narrative)

| t (mm:ss) | turn | tool | what it did |
|---|---|---|---|
| 00:00 | — | user | prompt arrives |
| 00:02 | 1 | read, look | reads `stack-two-cups/SKILL.md`; takes a frame from the start pose (TCP 0.02, −0.28, 0.21) |
| 00:10 | 2 | read ×3 | reads `grasp-a-cup/SKILL.md`, `seeing.md`, `sdk.md` |
| 00:26 (g16s) | 3 | bash | "I can see both cups." Writes a short OpenCV script: grabs the live frame, prints median HSV of the green and yellow cups |
| 00:35 (g7s) | 4 | locate_objects ×2 | green (H 60–100) and yellow (H 15–40) detections; each returns centre in base frame, top_z, depth-sample counts |
| 01:53 (g78s) | 5 | bash | "Both cups located with good depth evidence." Writes and runs the 111-line pick-and-place script (below): parallax-corrects the target, checks reachability, touches the cargo's top, grasps with the pad-band formula at two wrist angles, lifts and checks for slip, transits, descends to contact on the green cup, seats 2 mm, releases. Robot executes for ~85 s |
| 03:19 (g32s) | 6 | bash | "The script completed. Let me verify." Saves a frame, prints TCP |
| 03:22 | 7 | look | top-down frame: yellow cup sitting on green |
| 03:25 (g3s) | 8 | bash | moves to the taught side-view ("profile") joint pose, saves a frame |
| 03:32 | 9 | look | side view of the stack |
| 03:36 | 10 | bash | PIL crop + upscale around the stack |
| 03:38 | 11 | read | views the cropped image |
| 03:41 (g4s) | 12 | bash | "The stack is verified… two concentric tiers." Returns arm to the start pose |
| 03:46 (g2s) | 13 | — | final report: "Done. The yellow cup is stacked on top of the green cup — verified concentric from the profile view… The arm is back at the start pose." |

Pattern worth showing: 2 turns of reading, 2 of perception, **one** long script for the whole manipulation, then 7 short verification turns. This is the manual's rule 3 ("Batch. One script, not ten tool calls") in action.

## Agent-written script excerpt (grasp step of turn 5; 22 of 111 lines, verbatim)

```python
# === STEP 2: GRASP YELLOW CUP (pad-band formula) ===
surface_z = table_z
grasp_z = (surface_z + yellow_top) / 2 - 0.010
hang = grasp_z - table_z
print(f"surface_z={surface_z:.4f}, top={yellow_top:.4f}, grasp_z={grasp_z:.4f}, hang={hang*1000:.1f}mm")

bot.gripper(width=0.085, force=25, speed=0.05)
bot.move_tcp(yx, yy, 0.12, top_down_deg=theta)
bot.move_tcp(yx, yy, grasp_z, top_down_deg=theta)
g1 = bot.gripper(width=0, force=25, speed=0.02)
stall1 = g1["width_m"]
print(f"Close 1 stall: {stall1:.4f}")
assert stall1 < 0.080, f"Close 1 didn't stall (no cup?): {stall1}"

# ... re-open, rotate the wrist 90 deg, close again (stall2) ...

# Lift and verify
bot.move_tcp(yx, yy, 0.14, top_down_deg=theta - 90)
w_after = bot.state()["gripper_width_m"]
print(f"Width after lift: {w_after:.4f}")
assert abs(w_after - stall2) < 0.005, f"Slip! {stall2} -> {w_after}"
print("Grasp verified - held.")
```

Note how every ingredient of the architecture explainer's "where does a number live" table appears: the manual's formula `(surface_z + top)/2 − 0.010`, the touched `yellow_top` from this run, the SDK's `gripper()`/`state()` calls, and the skill's verification discipline (stall width, then width after lift). One wrinkle: the script set `table_z = -0.0198` "from reference plane" (the `locate_objects` plane fit) rather than the manual's declared constant −0.026 — a 6 mm disagreement the run got away with.
