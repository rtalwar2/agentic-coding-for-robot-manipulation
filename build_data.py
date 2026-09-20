#!/usr/bin/env python3
"""Bundle website/data + website/content into two JS files the static page loads.

  data/site-data.js   -> window.SITE  (tasks, trials, second passes, strips, skills, prompt, refs)
  data/narratives.js  -> window.NARR  (per-trial condensed transcripts, loaded lazily)
Run from the website/ directory after any change to data/ or content/.
"""
import json, re, os, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

trials = json.load(open('data/trials.json'))
manifest = json.load(open('assets/manifest.json'))
refs = json.load(open('content/key-refs.json'))

strips = {f['run_dir']: f for f in manifest['files'] if f['path'].startswith('strips/')}
# 1e-t5 lives on disk as ...-1e-t5 but the strip was named after the _map.json alias
strip_alias = {}
for run_dir, f in strips.items():
    strip_alias[run_dir] = f['path']
    strip_alias[re.sub(r'-protective-stop$', '', run_dir)] = f['path']

result_img = manifest['task_codes']

tasks = []
for t in trials['tasks']:
    tt = {k: t[k] for k in ('id', 'code', 'game', 'name', 'prompt', 'objects_on_table', 'axes',
                            'time_cap_min', 'base_skill_task', 'base_skills', 'paper_table')}
    tt['computed'] = t['computed']
    tt['hero'] = f"assets/tasks/{t['code']}-hero.webp"
    tt['result_img'] = f"assets/results/{result_img[t['code']]}.webp"
    tt['result_thumb'] = f"assets/results/thumbs/{result_img[t['code']]}.webp"
    tt['trials'] = []
    for tr in t['trials']:
        s = strip_alias.get(tr['run_dir'])
        sinfo = strips.get(tr['run_dir']) or strips.get(tr['run_dir'] + '-protective-stop')
        row = {k: tr.get(k) for k in ('trial', 'id', 'date', 'run_dir', 'success', 'task_completed', 'outcome',
                                       'intervention_grade', 'duration_min', 'output_tokens', 'reasoning_share',
                                       'tool_calls', 'turns', 'motion_commands', 'interventions', 'timeout', 'note')}
        row['strip'] = 'assets/' + s if s else None
        row['strip_frames'] = sinfo['frames_total'] if sinfo else None
        sp = tr.get('second_pass')
        row['second_pass'] = None
        if sp:
            row['second_pass'] = {k: sp.get(k) for k in ('run_dir', 'duration_min', 'output_tokens', 'tool_calls',
                                                         'reasoning_share', 'success', 'outcome', 'first_pass_role', 'note')}
        tt['trials'].append(row)
    tasks.append(tt)

skills = {}
for p in sorted(glob.glob('content/skills/*.md')):
    name = os.path.basename(p)[:-3]
    txt = open(p).read()
    skills[name] = {'text': txt, 'lines': txt.count('\n') + (0 if txt.endswith('\n') else 1)}

site = {
    'tasks': tasks,
    'totals': trials['totals'],
    'second_pass_totals': trials['second_pass_totals'],
    'skills': skills,
    'skill_lines': json.load(open('data/skill_lines.json')),
    'system_prompt': open('content/system-prompt.md').read(),
    'manual_toc': open('content/manual-toc.md').read(),
    'example_session': open('content/example-session.md').read(),
    'refs': refs,
    'video_chapters': manifest['video_chapters'],
}
open('data/site-data.js', 'w').write('window.SITE = ' + json.dumps(site, ensure_ascii=False) + ';\n')

# narratives: split on "## Trial <id>" and take the fenced block
narr_md = open('content/narratives.md').read()
narr = {}
for m in re.finditer(r'^## Trial (\S+)\s*\n```text\n(.*?)\n```', narr_md, re.S | re.M):
    narr[m.group(1)] = m.group(2)
open('data/narratives.js', 'w').write('window.NARR = ' + json.dumps(narr, ensure_ascii=False) + ';\n')

print(f"tasks={len(tasks)} trials={sum(len(t['trials']) for t in tasks)} "
      f"strips_missing={[tr['id'] for t in tasks for tr in t['trials'] if not tr['strip']]} "
      f"skills={list(skills)} narratives={len(narr)} "
      f"site-data.js={os.path.getsize('data/site-data.js')//1024}KB narratives.js={os.path.getsize('data/narratives.js')//1024}KB")
