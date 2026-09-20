/* Project page logic. Data comes from data/site-data.js (window.SITE); transcripts from data/narratives.js (lazy). */
(() => {
  const S = window.SITE;
  const $ = (q, el = document) => el.querySelector(q);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k !== null && k !== undefined) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  };
  const fmtK = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  const pct = x => Math.round(x * 100) + '%';
  const GAMES = ['Cups', 'Sorter', 'Rings'];
  const byId = {}; S.tasks.forEach(t => t.trials.forEach(tr => { byId[tr.id] = { task: t, trial: tr }; }));

  /* ---------- theme ---------- */
  const root = document.documentElement;
  try { const saved = new URLSearchParams(location.search).get('theme') || localStorage.getItem('theme'); if (saved === 'dark' || saved === 'light') root.dataset.theme = saved; } catch (e) {}
  $('#theme-toggle').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  /* ---------- nav highlight ---------- */
  const links = [...document.querySelectorAll('#nav-links a')];
  const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  secs.forEach(s => io.observe(s));

  /* ---------- video chapters (YouTube iframe API) ---------- */
  const chapters = S.video_chapters;
  const chEl = $('#chapters');
  let yt = null, ytReady = false;
  const seek = t => {
    if (ytReady && yt) { yt.seekTo(t, true); yt.playVideo(); }
    else { const f = $('#paper-video'); f.src = f.src.replace(/([&?])start=\d+/, '') + '&start=' + t + '&autoplay=1'; }
  };
  chapters.forEach(c => {
    const b = el('button', { type: 'button', onclick: () => seek(c.t) },
      el('span', { class: 't' }, `${Math.floor(c.t / 60)}:${String(c.t % 60).padStart(2, '0')}`), el('span', {}, c.label));
    chEl.append(el('li', {}, b));
  });
  const markChapter = t => { let idx = 0; chapters.forEach((c, i) => { if (t >= c.t) idx = i; }); [...chEl.querySelectorAll('button')].forEach((b, i) => b.classList.toggle('active', i === idx)); };
  window.onYouTubeIframeAPIReady = () => {
    yt = new YT.Player('paper-video', { events: { onReady: () => { ytReady = true; setInterval(() => { if (yt.getPlayerState && yt.getPlayerState() === 1) markChapter(yt.getCurrentTime()); }, 1000); } } });
  };
  (() => { const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; document.head.append(s); })();

  /* ---------- architecture ---------- */
  const ARCH = {
    model: { h: 'Model and harness', p: 'Qwen3.8-27B, a dense 27B vision-language model, served with vLLM (FP8 weights and KV cache, speculative decoding with three draft tokens) on the same workstation that hosts the platform: one NVIDIA RTX PRO 6000 with 96 GB. Context window 262,144 tokens; default sampling; reasoning at effort low. The harness is pi, a minimal open-source coding agent with file and shell tools. The model chooses between executing a tool call or chunking tool calls via a script that uses the SDK.', li: ['The only learned component in the system.', 'Sees the world through the frames it asks for; state reports describe only the robot.'], ex: '<b>turn 5</b>  "Both cups located with good depth evidence."\n<b>CALL</b> bash: python stack_run.py\n<b>78 s</b> generation → 111 lines → ~85 s of motion' },
    prompt: { h: 'System prompt, 68 lines', p: 'Tells the model it operates this robot, biases it towards measure-act-verify loops, and requires script files rather than one-liners. Its central rule separates two kinds of numbers.', li: ['Constants of the CELL (camera offsets, table height, pad geometry) are to be trusted; reasoning does not recover them.', 'Numbers measured on an OBJECT (colour thresholds, grasp heights, where something stood) were true once, for that object: re-measure them. The method is what transfers.', 'Look before you act, and look again after. Verify, never assume.'] },
    skills: { h: 'Skills, two per game', p: 'Hand-crafted procedural documents in natural language, 182 to 324 lines each. Each documents the task on one object instance: the procedure step by step, the measured values under each step with how they were obtained, the verification, and the pitfalls met while authoring, including checks that gave a false pass.', li: ['Only the name and one-line description sit in the prompt; the body is loaded when relevant.', 'Values are explicitly marked as valid only for the measured instance.'], ex: 'grasp TCP z      <b>-0.016</b>  (pad-band formula)\nstall width      0.0373, equal at two wrist\n                 angles, unchanged after lift\nHSV, cup body    H 104-107 S 222-255 V 130-204\n"wrong for any other instance - re-measure"' },
    manual: { h: 'Platform manual, 617 lines', p: 'Four pages copied into every workspace: README (index and the rules that outrank the rest), sdk.md (the RobotClient API and when to write code instead of calling a tool), seeing.md (camera, depth, detection, tying frames to poses) and picking.md (approach, close, verify, with the numbers measured on this cell and the failure each one prevents).', li: ['Holds the cell constants: table height −0.026 m, gripper stroke 0–0.085 m, home pose, camera offsets.', 'The pad-band grasp formula lives here, not in a skill: it is true for any object.'] },
    scripts: { h: 'Scripts written this run', p: 'Per-session Python the model writes in its fresh workspace: a perception script that measures HSV windows on the live frame, then a guarded pick-and-place script whose every check is an assert that fails with its numbers. The model returns to reasoning when an assert fires with its numbers.', li: ['Nothing crosses between sessions; the workspace is copied fresh from a template.', 'In the example session all 12 motion commands came from scripts, none from direct tool calls.'], ex: 'assert stall1 &lt; 0.080, f"no cup? {stall1}"\nassert abs(w_after - stall2) &lt; 0.005, "Slip!"' },
    tools: { h: 'Tool call path', p: 'The nine operations are registered as harness tools. One call, one action, and its JSON result goes straight into context. Used for the quick things: look, locate_objects, get_state.', li: ['2,043 tool calls over the grid, including file reads and shell.', 'Direct motion tool calls were rare: 73 of the 1,034 motion commands.'], ex: '<b>CALL</b> locate_objects: {"hsv_lo":[0,120,120],\n  "hsv_hi":[15,255,255],"min_area_px":2000}\n→ centre_base (0.0957,-0.2977) top_z 0.0317\n  136/160 depth samples' },
    sdk: { h: 'SDK path', p: 'The same nine operations as Python methods on a RobotClient. A script chains dozens of them with arithmetic on coordinates, asserts and loops, so time-sensitive sequences do not wait on a model turn between steps.', li: ['961 of the 1,034 motion commands went through scripts.', 'Reaches the same HTTP endpoints and the same clamps as the tools.'] },
    platform: { h: 'Platform service', p: 'One hardware-owning HTTP service wrapping airo-mono, the lab\'s Python robotics library. It holds everything whose correctness must not depend on the model: kinematics, the hand-eye geometry that turns a pixel into a coordinate, the workspace box, speed and force caps, and the motion lock. Time-sensitive loops such as stall detection and stepwise guarded descent run inside it as blocking operations.', li: ['No trained perception: one generic colour-blob detector whose HSV bounds the model must supply.', 'Every actuation request, from a tool or from agent code, passes the same limits.', 'Time-sensitive loops such as stall detection and guarded descent run inside it as blocking operations.'], ex: 'x ±0.37  y −0.56…−0.10  z −0.039…0.45 m\nTCP ≤ 0.25 m/s   gripper ≤ 50 N\nboots senses-only until POST /motion' },
    hw: { h: 'The robot', p: 'A UR3e on a fixed table with a Robotiq 2F-85 parallel gripper, the tool centre point at the fingertip pinch, and an Intel RealSense D435 colour-depth camera on the wrist, eye-in-hand calibrated.', li: ['Everything task-space is metres in the UR base frame.', 'Objects are placed at least 50 mm from the box edges and 50 mm apart.'] },
  };
  const archDetail = $('#arch-detail');
  const showArch = k => {
    const a = ARCH[k];
    archDetail.innerHTML = '';
    archDetail.append(el('h3', {}, a.h), el('p', {}, a.p), el('ul', {}, a.li.map(x => el('li', {}, x))));
    if (a.ex) archDetail.append(el('div', { class: 'ex', html: a.ex }));
    document.querySelectorAll('#stack .layer').forEach(b => b.classList.toggle('active', b.dataset.k === k));
  };
  document.querySelectorAll('#stack .layer').forEach(b => { b.addEventListener('click', () => showArch(b.dataset.k)); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showArch(b.dataset.k); } }); });
  showArch('skills');

  /* ---------- skills ---------- */
  const skillOrder = ['grasp-a-cup', 'stack-two-cups', 'grasp-a-cylinder', 'insert-into-a-hole', 'grasp-a-ring', 'put-a-ring-on-a-rod'];
  const skillGame = { 'grasp-a-cup': 'Cups', 'stack-two-cups': 'Cups', 'grasp-a-cylinder': 'Sorter', 'insert-into-a-hole': 'Sorter', 'grasp-a-ring': 'Rings', 'put-a-ring-on-a-rod': 'Rings' };
  const sg = $('#skill-grid');
  GAMES.forEach(g => {
    const c = el('div', { class: 'card' }, el('div', { class: 'g', style: `color:var(--${g.toLowerCase()})` }, g));
    skillOrder.filter(s => skillGame[s] === g).forEach(s => c.append(el('div', { class: 's' }, el('span', {}, s), el('span', {}, S.skills[s].lines + ' lines'))));
    sg.append(c);
  });
  const tabs = $('#skill-tabs'), doc = $('#skill-doc'), meta = $('#skill-meta');
  const renderMd = md => {
    doc.innerHTML = marked.parse(md.replace(/^---\n[\s\S]*?\n---\n/, m => '```yaml\n' + m.replace(/---\n?/g, '') + '```\n'));
    [['h3', 'h5'], ['h2', 'h4'], ['h1', 'h3']].forEach(([from, to]) => doc.querySelectorAll(from).forEach(h => { const n = document.createElement(to); n.innerHTML = h.innerHTML; n.className = 'md-' + from; h.replaceWith(n); }));
    doc.scrollTop = 0;
  };
  const showSkill = name => {
    [...tabs.children].forEach(b => { b.classList.toggle('active', b.dataset.s === name); b.setAttribute('aria-pressed', b.dataset.s === name); });
    renderMd(S.skills[name].text);
    meta.textContent = `${name}/SKILL.md · ${S.skills[name].lines} lines · ${skillGame[name]} game · verbatim as loaded by the agent`;
  };
  skillOrder.forEach(s => tabs.append(el('button', { class: 'tab', type: 'button', 'data-s': s, onclick: () => showSkill(s) }, s, el('span', { class: 'n' }, S.skills[s].lines))));
  $('#show-prompt').addEventListener('click', () => {
    [...tabs.children].forEach(b => b.classList.remove('active'));
    renderMd(S.system_prompt);
    meta.textContent = 'identity.md · 68 lines · the system prompt, verbatim';
  });
  showSkill('grasp-a-cup');

  /* ---------- objects figure (SVG) ---------- */
  (() => {
    const W = 1000, H = 530;
    const svg = [`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The objects of the three games">`];
    const col = { blue: '#3C78C8', green: '#3B8F4A', yellow: '#E5B92A', red: '#CF4B3F', teal: '#2F8F86', violet: '#8C50AA', white: '#DDDDDD', pink: '#E58AB4' };
    const stroke = 'var(--ink-2)';
    // Cups
    const cups = [[85, 'blue'], [81, 'green'], [75, 'yellow'], [71, 'red'], [66, 'blue'], [62, 'green'], [57, 'yellow'], [53, 'red'], [48, 'blue'], [44, 'green'], [40, 'yellow'], [36, 'red']];
    const heavy = new Set([66, 48]);
    svg.push(`<text class="lbl" x="0" y="22">Cups, rim 36–85 mm</text>`);
    let x = 8; const base = 105, k = 1.05;
    cups.forEach(([d, c]) => {
      const w = d * k, h = d * 0.78 * k, top = w * 0.86;
      const x0 = x, x1 = x + w, tx0 = x + (w - top) / 2, tx1 = tx0 + top;
      svg.push(`<path d="M${x0},${base} L${x1},${base} L${tx1},${base - h} L${tx0},${base - h} Z" fill="${col[c]}" stroke="${stroke}" stroke-width="${heavy.has(d) ? 3 : 1}"/>`);
      svg.push(`<text class="mm" x="${x + w / 2}" y="${base + 16}" text-anchor="middle">${d}</text>`);
      x += w + 14;
    });
    // Sorter
    const sy = 150;
    svg.push(`<text class="lbl" x="0" y="${sy + 18}">Sorter, pegs 28–45 mm, about 1 mm clearance per side</text>`);
    const bx = 8, by = sy + 34, bw = 290, bh = 130;
    svg.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="var(--bg-2)" stroke="${stroke}"/>`);
    svg.push(`<circle cx="${bx + 45}" cy="${by + 65}" r="22" fill="var(--surface)" stroke="${stroke}"/>`);
    svg.push(`<rect x="${bx + 92}" y="${by + 50}" width="48" height="30" fill="var(--surface)" stroke="${stroke}"/>`);
    svg.push(`<path d="M${bx + 160},${by + 85} L${bx + 206},${by + 85} L${bx + 183},${by + 45} Z" fill="var(--surface)" stroke="${stroke}"/>`);
    svg.push(`<rect x="${bx + 228}" y="${by + 47}" width="36" height="36" fill="var(--surface)" stroke="${stroke}"/>`);
    svg.push(`<text class="mm" x="${bx + bw / 2}" y="${by + bh + 16}" text-anchor="middle">base 290 × 140 mm</text>`);
    const px = 360, pyc = by + 62;
    const pegs = [['cylinder 41 mm', 'any yaw', 'red', () => `<circle cx="${px + 30}" cy="${pyc}" r="22" fill="${col.red}" stroke="${stroke}" stroke-width="3"/>`],
      ['cube 34 mm', 'every 90°', 'blue', () => `<rect x="${px + 150 - 18}" y="${pyc - 18}" width="36" height="36" fill="${col.blue}" stroke="${stroke}"/>`],
      ['triangle 41 mm', 'every 120°', 'green', () => `<path d="M${px + 270 - 23},${pyc + 18} L${px + 270 + 23},${pyc + 18} L${px + 270},${pyc - 22} Z" fill="${col.green}" stroke="${stroke}"/>`],
      ['beam 44.6 × 28.3 mm', 'every 180°', 'yellow', () => `<rect x="${px + 400 - 24}" y="${pyc - 15}" width="48" height="30" fill="${col.yellow}" stroke="${stroke}"/>`]];
    pegs.forEach(([n, s, c, draw], i) => {
      svg.push(draw());
      const cx = [px + 30, px + 150, px + 270, px + 400][i];
      svg.push(`<text class="mm" x="${cx}" y="${pyc + 44}" text-anchor="middle">${n}</text><text class="mm" x="${cx}" y="${pyc + 58}" text-anchor="middle">${s}</text>`);
    });
    // Rings
    const ry = 392;
    svg.push(`<text class="lbl" x="0" y="${ry - 6}">Rings, outer 40–80 mm, 2 mm clearance on the rod</text>`);
    const rings = [[80, 'teal', 3], [70, 'violet', 1], [60, 'yellow', 1], [50, 'white', 1], [40, 'pink', 1]];
    let rx = 8;
    rings.forEach(([d, c, sw]) => {
      const R = d * 0.55, cx = rx + R, cy = ry + 50;
      svg.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${col[c]}" stroke="${stroke}" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="12" fill="var(--surface)" stroke="${stroke}"/>`);
      svg.push(`<text class="mm" x="${cx}" y="${cy + R + 16}" text-anchor="middle">${d}</text>`);
      rx += 2 * R + 26;
    });
    svg.push(`<rect x="${rx + 30}" y="${ry - 2}" width="14" height="96" fill="${col.blue}" stroke="${stroke}"/><rect x="${rx + 6}" y="${ry + 90}" width="62" height="10" fill="#2A5A9A" stroke="${stroke}"/>`);
    svg.push(`<text class="mm" x="${rx + 37}" y="${ry + 116}" text-anchor="middle">rod 155 mm</text>`);
    svg.push(`<text class="mm" x="${W}" y="${H - 6}" text-anchor="end">heavy outline: the instance a skill documents</text>`);
    svg.push('</svg>');
    $('#objects').innerHTML = svg.join('');
  })();

  /* ---------- task cards ---------- */
  const cards = $('#task-cards');
  S.tasks.forEach(t => {
    const succ = t.trials.filter(x => x.success).length;
    const axes = Object.entries(t.axes).filter(([k, v]) => v).map(([k]) => el('span', { class: 'chip on' }, { color: 'Colour', size: 'Size', shape: 'Shape', task: 'Task' }[k]));
    cards.append(el('a', { class: 'task', href: '#trials', onclick: e => { e.preventDefault(); openTask(t.id); } },
      el('div', { class: 'ba', title: 'Hover or tap: scene before and after the trial' },
        el('img', { class: 'before', src: `assets/ba/${t.code}-before.webp`, alt: `Scene camera before a ${t.name} trial`, loading: 'lazy', width: 800, height: 450 }),
        el('img', { class: 'after', src: `assets/ba/${t.code}-after.webp`, alt: `Scene camera after the trial`, loading: 'lazy', width: 800, height: 450 }),
        el('span', { class: 'ba-tag' }, 'before'), el('span', { class: 'ba-tag after' }, 'after')),
      el('div', { class: 'b' },
        el('div', { class: 'row' }, el('span', { class: 'chip game-' + t.game }, t.game), el('span', { class: 'mono muted small' }, t.code)),
        el('h3', {}, t.name.replace(/^\w+: /, '')),
        el('div', { class: 'prompt' }, '“' + t.prompt + '”'),
        el('div', { class: 'axes' }, axes),
        el('div', { class: 'foot' }, el('span', {}, el('b', { class: 'num' }, `${succ}/5`), ' without intervention'), el('span', {}, `cap ${Math.round(t.time_cap_min)} min`)))));
  });

  document.addEventListener('click', e => { const b = e.target.closest('.ba'); if (b && matchMedia('(hover: none)').matches) { e.preventDefault(); e.stopPropagation(); b.classList.toggle('flip'); } }, true);

  /* ---------- tooltip ---------- */
  const tip = $('#tip');
  const showTip = (html, e) => { tip.innerHTML = html; tip.style.opacity = 1; moveTip(e); };
  const moveTip = e => { const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
  const hideTip = () => { tip.style.opacity = 0; };

  /* ---------- durations chart ---------- */
  (() => {
    const W = 1000, L = 210, R = 24, T = 34, rowH = 40, maxMin = 70;
    const H = T + S.tasks.length * rowH + 24;
    const sx = m => L + (Math.min(m, maxMin) / maxMin) * (W - L - R);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Per-task durations of all 45 first-pass trials and 17 second passes; the table below carries the same numbers');
    const mk = (tag, a, txt) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); if (txt !== undefined) n.textContent = txt; svg.append(n); return n; };
    for (let m = 0; m <= maxMin; m += 10) {
      mk('line', { class: 'grid', x1: sx(m), x2: sx(m), y1: T - 6, y2: H - 20 });
      mk('text', { class: 'tick', x: sx(m), y: T - 12, 'text-anchor': 'middle' }, m);
    }
    mk('text', { class: 'tick', x: (L + W - R) / 2, y: 10, 'text-anchor': 'middle' }, 'duration (min)');
    S.tasks.forEach((t, i) => {
      const y = T + i * rowH + rowH / 2;
      if (i > 0 && S.tasks[i - 1].game !== t.game) mk('line', { class: 'axis', x1: 0, x2: W, y1: y - rowH / 2, y2: y - rowH / 2 });
      mk('text', { class: 'rowlbl', x: L - 14, y: y + 4, 'text-anchor': 'end' }, t.name);
      const durs = t.trials.map(x => x.duration_min).filter(x => x != null).sort((a, b) => a - b);
      const med = durs[Math.floor(durs.length / 2)];
      mk('line', { class: 'range', x1: sx(durs[0]), x2: sx(durs[durs.length - 1]), y1: y, y2: y });
      if (t.time_cap_min <= maxMin) mk('line', { class: 'cap', x1: sx(t.time_cap_min), x2: sx(t.time_cap_min), y1: y - 11, y2: y + 11 });
      else mk('text', { class: 'tick', x: W - R, y: y - 12, 'text-anchor': 'end' }, `cap ${Math.round(t.time_cap_min)} →`);
      t.trials.forEach(tr => {
        const c = mk('circle', { class: 'trial' + (tr.timeout ? ' tmo' : (tr.success ? '' : ' fail')), cx: sx(tr.duration_min), cy: y, r: 5.5 });
        c.addEventListener('mousemove', e => showTip(`<b>${t.name} · t${tr.trial}</b><br>${tr.duration_min} min · ${fmtK(tr.output_tokens)} tok · ${tr.tool_calls} calls<br>${label(tr)}<br><span style="opacity:.7">${tr.note}</span>`, e));
        c.addEventListener('mouseleave', hideTip);
        c.addEventListener('click', () => openTask(t.id, tr.id));
      });
      mk('circle', { class: 'med', cx: sx(med), cy: y, r: 4 });
      t.trials.filter(tr => tr.second_pass).forEach(tr => {
        const p = tr.second_pass;
        const c = mk('circle', { class: p.first_pass_role === 'slowest' ? 'p2s' : 'p2f', cx: sx(p.duration_min), cy: y + 13, r: 5 });
        c.addEventListener('mousemove', e => showTip(`<b>${t.name} · t${tr.trial} second pass</b> (resume of ${p.first_pass_role})<br>${p.duration_min} min vs ${tr.duration_min} first pass<br>${p.tool_calls} vs ${tr.tool_calls} calls · ${fmtK(p.output_tokens)} vs ${fmtK(tr.output_tokens)} tok<br><span style="opacity:.7">${p.note}</span>`, e));
        c.addEventListener('mouseleave', hideTip);
        c.addEventListener('click', () => openTask(t.id, tr.id));
      });
    });
    $('#dur-chart').append(svg);
  })();

  const label = tr => ({ success: 'success, no intervention', success_with_small_intervention: 'completed after a small intervention', timeout: 'stopped at the time cap', protective_stop: 'protective stop (arm)', emergency_stop: 'emergency stop (operator)', failed: 'task not completed' })[tr.outcome] || tr.outcome;
  const badge = tr => el('span', { class: 'badge ' + (tr.success ? 'ok' : tr.task_completed || tr.timeout ? 'warn' : 'bad') },
    ({ success: 'success', success_with_small_intervention: 'small intervention', timeout: 'timeout', protective_stop: 'protective stop', emergency_stop: 'e-stop', failed: 'failed' })[tr.outcome]);

  /* ---------- grid table ---------- */
  (() => {
    const tb = $('#grid-table');
    tb.append(el('thead', {}, el('tr', {}, ['Task', 'Success (no interv.)', 'Min', 'Med', 'Max', 'Timeouts', 'Tokens (median)', 'Reas.', 'Small', 'E-stop', 'Prot. stop'].map((h, i) => el('th', { title: i === 2 ? 'duration, minutes' : null }, h)))));
    const body = el('tbody');
    S.tasks.forEach((t, i) => {
      const p = t.paper_table, d = p.duration_min_med_max, iv = p.interventions;
      const dash = v => v ? String(v) : el('span', { class: 'dash' }, '–');
      body.append(el('tr', { class: i > 0 && S.tasks[i - 1].game !== t.game ? 'game-sep' : '' },
        el('td', {}, el('button', { class: 'linkish', type: 'button', style: 'font-family:var(--body);font-weight:400;color:var(--ink)', onclick: () => openTask(t.id) }, t.name)),
        el('td', { class: 'succ' }, p.success), el('td', {}, d[0].toFixed(1)), el('td', {}, d[1].toFixed(1)), el('td', {}, d[2].toFixed(1)),
        el('td', {}, dash(p.timeouts)), el('td', {}, p.tokens_median_k.toFixed(1) + 'k'), el('td', {}, p.reasoning_pct + '%'),
        el('td', {}, dash(iv.small)), el('td', {}, dash(iv.estop)), el('td', {}, dash(iv.pstop))));
    });
    tb.append(body);
  })();

  /* ---------- explorer ---------- */
  const list = $('#task-list'), body = $('#explorer-body');
  GAMES.forEach(g => {
    list.append(el('div', { class: 'gl' }, g));
    S.tasks.filter(t => t.game === g).forEach(t => list.append(el('button', { type: 'button', 'data-t': t.id, onclick: () => openTask(t.id, null, false) }, el('span', {}, t.name.replace(/^\w+: /, '')), el('span', { class: 'sc num' }, `${t.trials.filter(x => x.success).length}/5`))));
  });
  const trialCard = (t, tr) => {
    const p = tr.second_pass;
    const m = (k, v) => el('span', {}, k + ' ', el('b', { class: 'num' }, v));
    const card = el('article', { class: 'trial-card', id: 'trial-' + tr.id },
      el('div', { class: 'top' },
        el('div', { class: 'tid' }, `t${tr.trial}`, el('span', { class: 'mono muted', style: 'font-size:.7rem;font-weight:400;margin-left:.6rem' }, tr.date)),
        el('div', { class: 'metrics' }, m('duration', tr.duration_min + ' min'), m('tokens', fmtK(tr.output_tokens)), m('reasoning', pct(tr.reasoning_share)), m('tool calls', tr.tool_calls), m('motions', tr.motion_commands ?? '–')),
        badge(tr)),
      tr.strip ? el('div', { class: 'strip' }, el('img', { src: tr.strip, alt: `Wrist-camera frames captured during ${t.name} trial ${tr.trial}`, loading: 'lazy' }), el('div', { class: 'cap' }, `${tr.strip_frames} frames captured by the agent (look and read), evenly sampled · ${tr.run_dir}`)) : null,
      el('div', { class: 'note' }, el('div', {}, tr.note), el('button', { class: 'linkish', type: 'button', onclick: () => openTranscript(t, tr) }, 'Read transcript →')));
    if (p) {
      card.append(el('div', { class: 'p2 ' + (p.first_pass_role || '') },
        el('div', { class: 'h' }, 'Second pass', el('span', { class: 'muted', style: 'text-transform:none;letter-spacing:0;font-weight:500' }, `resume of the ${p.first_pass_role} successful trial`), badge({ outcome: p.outcome, success: p.success, task_completed: p.success })),
        el('div', {}, p.note),
        el('div', { class: 'cmp' }, el('span', {}, 'time ', el('b', {}, p.duration_min + ' min'), ` vs ${tr.duration_min}`), el('span', {}, 'calls ', el('b', {}, p.tool_calls), ` vs ${tr.tool_calls}`), el('span', {}, 'tokens ', el('b', {}, fmtK(p.output_tokens)), ` vs ${fmtK(tr.output_tokens)}`), el('span', {}, 'reasoning ', el('b', {}, pct(p.reasoning_share)), ` vs ${pct(tr.reasoning_share)}`))));
    }
    return card;
  };
  function openTask(id, trialId, scroll = true) {
    const t = S.tasks.find(x => x.id === id);
    [...list.querySelectorAll('button')].forEach(b => { b.classList.toggle('active', b.dataset.t === id); if (b.dataset.t === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    body.innerHTML = '';
    const succ = t.trials.filter(x => x.success).length;
    body.append(el('div', { class: 'ex-head' },
      el('div', {}, el('div', {}, el('span', { class: 'chip game-' + t.game }, t.game), ' ', el('span', { class: 'mono muted small' }, t.code)), el('h3', { style: 'margin:.3rem 0' }, t.name), el('div', { class: 'prompt' }, '“' + t.prompt + '”'), el('div', { class: 'small muted', style: 'margin-top:.3rem' }, 'On the table: ' + t.objects_on_table.join(', ') + `. Skill instance: “${t.base_skill_task}”. Time cap ${Math.round(t.time_cap_min)} min.`)),
      el('div', { style: 'text-align:right' }, el('div', { style: 'font-family:var(--display);font-size:2rem;font-weight:800;line-height:1' }, `${succ}/5`), el('div', { class: 'small muted' }, 'without intervention'), el('a', { class: 'linkish', href: t.result_img, target: '_blank', rel: 'noopener', style: 'display:inline-block;margin-top:.4rem' }, 'Scene-camera start/end grid →'))));
    t.trials.forEach(tr => body.append(trialCard(t, tr)));
    if (scroll) { const target = trialId ? $('#trial-' + trialId) : $('#trials'); setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: trialId ? 'center' : 'start' }), 30); }
    if (trialId) { const c = $('#trial-' + trialId); c.style.outline = '2px solid var(--accent)'; setTimeout(() => c.style.outline = '', 2500); }
  }
  openTask('cups-yellow-green', null, false);

  /* ---------- transcript drawer ---------- */
  const drawer = $('#drawer'), dbody = $('#drawer-body'), dtitle = $('#drawer-title');
  let drawerOpener = null;
  const closeDrawer = () => { if (!drawer.classList.contains('open')) return; drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; document.querySelector('main').inert = false; document.querySelector('.nav').inert = false; if (drawerOpener) drawerOpener.focus(); };
  $('#drawer-close').addEventListener('click', closeDrawer); $('#drawer-bg').addEventListener('click', closeDrawer);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  let narrLoading;
  const loadNarr = () => narrLoading || (narrLoading = new Promise((res, rej) => { if (window.NARR) return res(); const s = document.createElement('script'); s.src = 'data/narratives.js'; s.onload = res; s.onerror = rej; document.head.append(s); }));
  async function openTranscript(t, tr) {
    dtitle.innerHTML = `<b>${t.name}</b> · trial ${tr.trial}<small>${tr.run_dir} · condensed transcript, one line per model turn · ${tr.turns} turns, ${tr.tool_calls} tool calls</small>`;
    dbody.innerHTML = '<div class="line" style="color:var(--term-dim)">loading…</div>';
    drawerOpener = document.activeElement;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    document.querySelector('main').inert = true; document.querySelector('.nav').inert = true;
    $('#drawer-close').focus();
    try { await loadNarr(); } catch (e) { dbody.textContent = 'Transcript could not be loaded.'; return; }
    const txt = window.NARR[tr.id];
    dbody.innerHTML = '';
    if (!txt) { dbody.textContent = 'No transcript archived for this trial.'; return; }
    txt.split('\n').forEach(raw => {
      const line = raw.replace(/ ⏎ /g, '\n').replace(/⏎/g, '\n').replace(/\n{2,}/g, '\n').trim();
      if (!line) return;
      let cls = '';
      if (/^=== \[.*USER:/.test(line)) cls = 'user'; else if (/^CALL /.test(line)) cls = 'call'; else if (/^!! RESULT/.test(line)) cls = 'res';
      const d = el('div', { class: 'line ' + cls });
      const m = line.match(/^(\[[^\]]+\])\s*([\s\S]*)$/);
      if (m && !cls) { d.append(el('span', { class: 'ts' }, m[1] + ' '), m[2]); } else d.textContent = line;
      dbody.append(d);
    });
    dbody.scrollTop = 0;
  }

  /* ---------- second-pass table ---------- */
  (() => {
    const tb = $('#p2-table');
    const rows = [];
    S.tasks.forEach(t => t.trials.forEach(tr => { if (tr.second_pass) rows.push({ t, tr, p: tr.second_pass }); }));
    const maxCalls = Math.max(...rows.map(r => Math.max(r.tr.tool_calls, r.p.tool_calls)));
    const maxTok = Math.max(...rows.map(r => Math.max(r.tr.output_tokens, r.p.output_tokens)));
    tb.append(el('thead', {}, el('tr', {}, ['Trial', 'Tool calls  1st → 2nd', '', 'Ratio', 'Output tokens  1st → 2nd', '', 'Ratio', 'Time'].map(h => el('th', {}, h)))));
    const body = el('tbody');
    const bar = (a, b, max) => el('div', { class: 'track' }, el('span', { class: 'a', style: `width:${a / max * 100}%` }), el('span', { class: 'b', style: `width:${b / max * 100}%` }));
    rows.forEach(({ t, tr, p }) => {
      const rc = p.tool_calls / tr.tool_calls, rt = p.output_tokens / tr.output_tokens;
      body.append(el('tr', { class: p.first_pass_role || '' },
        el('td', {}, el('button', { class: 'linkish', type: 'button', style: 'font-family:var(--body);font-weight:400;color:var(--ink)', onclick: () => openTask(t.id, tr.id) }, `${t.name} t${tr.trial}`), el('span', { class: 'muted small' }, ` · ${p.first_pass_role}`)),
        el('td', { class: 'r' }, `${tr.tool_calls} → ${p.tool_calls}`), el('td', { class: 'bar' }, bar(tr.tool_calls, p.tool_calls, maxCalls)), el('td', { class: 'r' + (rc > 1 ? ' up' : '') }, rc.toFixed(2)),
        el('td', { class: 'r' }, `${fmtK(tr.output_tokens)} → ${fmtK(p.output_tokens)}`), el('td', { class: 'bar' }, bar(tr.output_tokens, p.output_tokens, maxTok)), el('td', { class: 'r' + (rt > 1 ? ' up' : '') }, rt.toFixed(2)),
        el('td', { class: 'r' + (p.duration_min > tr.duration_min ? ' up' : '') }, `${tr.duration_min} → ${p.duration_min} min`)));
    });
    tb.append(body);
    const T = S.second_pass_totals;
    tb.append(el('tfoot', {}, el('tr', {}, el('td', {}, `All ${T.n}`), el('td', { class: 'r' }, `${T.tool_calls_first} → ${T.tool_calls_second}`), el('td'), el('td', { class: 'r' }, T.tool_calls_ratio.toFixed(2)), el('td', { class: 'r' }, `${fmtK(T.output_tokens_first)} → ${fmtK(T.output_tokens_second)}`), el('td'), el('td', { class: 'r' }, T.output_tokens_ratio.toFixed(2)), el('td', { class: 'r' }, `${Math.round(T.minutes_first)} → ${Math.round(T.minutes_second)} min · ${T.time_ratio.toFixed(2)}`))));
  })();

  /* ---------- failure-mode trial links ---------- */
  document.querySelectorAll('.mode .trials').forEach(box => {
    box.dataset.trials.split(',').forEach(id => {
      const { task, trial } = byId[id];
      const b = el('button', { type: 'button', title: `${task.name} t${trial.trial}: ${trial.note}`, onclick: () => openTask(task.id, id) }, `${task.name.replace(/^\w+: /, '')} t${trial.trial}`);
      box.append(b);
    });
  });

  /* ---------- refs ---------- */
  const refUrl = { saycan2022: 'https://say-can.github.io/', codeaspolicies2023: 'https://code-as-policies.github.io/', sweagent2024: 'https://swe-agent.com/', voyager2024: 'https://voyager.minedojo.org/', rekep2024: 'https://rekep-robot.github.io/', alrm2026: 'https://arxiv.org/abs/2601.19510', skillsbench2026: 'https://arxiv.org/abs/2602.12670', lips2026kil: 'https://arxiv.org/abs/2605.26649', aspire2026: 'https://arxiv.org/abs/2607.00272', capx2026: null };
  const order = ['capx2026', 'alrm2026', 'aspire2026', 'codeaspolicies2023', 'saycan2022', 'sweagent2024', 'skillsbench2026', 'rekep2024', 'voyager2024', 'lips2026kil'];
  const refs = $('#refs');
  order.forEach(k => {
    const r = S.refs.find(x => x.key === k); if (!r) return;
    const auth = r.authors.split(' and ').map(a => a.includes(',') ? a.split(',')[0].trim() : a.trim().split(' ').pop());
    const short = auth.length > 3 ? auth[0] + ' et al.' : auth.join(', ');
    refs.append(el('li', {}, refUrl[k] ? el('a', { href: refUrl[k], target: '_blank', rel: 'noopener' }, r.title) : r.title, ' ', el('span', { class: 'v' }, `${short} · ${r.venue} ${r.year}`)));
  });

  /* ---------- bibtex copy ---------- */
  $('#copy-bib').addEventListener('click', async e => {
    const txt = $('#bibtex').textContent.replace(/^Copy|^Copied/, '').trim();
    try { await navigator.clipboard.writeText(txt); e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy', 1500); } catch (err) { e.target.textContent = 'Select & copy'; }
  });

  /* ---------- logos ---------- */
  const logos = $('#logos');
  [['assets/logos/brand/airo-icon.svg', 'assets/logos/brand/airo-icon-white.png', 'AIRO', 'https://airo.ugent.be', 'airo'],
   ['assets/logos/brand/idlab.png', 'assets/logos/brand/idlab-white.png', 'IDLab', 'https://www.idlab.ugent.be', ''],
   ['assets/logos/brand/ugent-color.png', 'assets/logos/brand/ugent-white.png', 'Ghent University', 'https://www.ugent.be/en', 'ugent'],
   ['assets/logos/brand/imec.svg', 'assets/logos/brand/imec-white.svg', 'imec', 'https://www.imec-int.com', '']].forEach(([light, dark, alt, href, kind]) => {
    logos.append(el('a', { href, target: '_blank', rel: 'noopener', title: alt },
      el('img', { src: light, alt, class: 'logo light-only ' + kind }), el('img', { src: dark, alt: '', class: 'logo dark-only ' + kind })));
  });
})();
