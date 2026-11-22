// Draws the field, circles, ball and HUD onto a canvas.
FB.Renderer = class {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.dpr = dpr;
  }

  // Fits the field plus its margin into the window, centred.
  view(field) {
    const totalW = field.width + field.margin * 2;
    const totalH = field.height + field.margin * 2;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = Math.min(cw / totalW, ch / totalH);
    return {
      scale,
      ox: (cw - field.width * scale) / 2,
      oy: (ch - field.height * scale) / 2,
    };
  }

  draw(game) {
    const ctx = this.ctx;
    const field = game.field;
    const v = this.view(field);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d1b12';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(v.scale, 0, 0, v.scale, v.ox, v.oy);
    this.drawField(field);
    for (const p of game.players) this.drawPulse(p);
    this.drawBall(game.ball);
    for (const p of game.players) this.drawPlayer(p);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawHud(game, v);
  }

  drawField(f) {
    const ctx = this.ctx;
    const W = f.width;
    const H = f.height;
    const wall = 14;

    // Walls around the pitch.
    ctx.fillStyle = '#2b3a33';
    ctx.fillRect(-wall, -wall, W + wall * 2, H + wall * 2);

    // Goal boxes behind each goal line.
    ctx.fillStyle = '#1c2621';
    ctx.fillRect(-f.goalDepth - wall, f.goalTop - wall, f.goalDepth + wall, f.goalWidth + wall * 2);
    ctx.fillRect(W, f.goalTop - wall, f.goalDepth + wall, f.goalWidth + wall * 2);

    // Grass with mowing stripes.
    const stripes = 12;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 ? '#2f8f4e' : '#349a55';
      ctx.fillRect((W / stripes) * i, 0, W / stripes + 1, H);
    }

    // Goal nets.
    ctx.fillStyle = '#e8efe9';
    ctx.globalAlpha = 0.18;
    ctx.fillRect(-f.goalDepth, f.goalTop, f.goalDepth, f.goalWidth);
    ctx.fillRect(W, f.goalTop, f.goalDepth, f.goalWidth);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let y = f.goalTop; y <= f.goalBottom; y += 12) {
      ctx.beginPath();
      ctx.moveTo(-f.goalDepth, y); ctx.lineTo(0, y);
      ctx.moveTo(W, y); ctx.lineTo(W + f.goalDepth, y);
      ctx.stroke();
    }

    // Lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Goalie semicircles, tinted in each team's colour.
    FB.CONFIG.teams.forEach((t, team) => {
      const c = f.goalCenter(team);
      const start = team === 0 ? -Math.PI / 2 : Math.PI / 2;
      ctx.fillStyle = t.primary;
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.arc(c.x, c.y, f.goalieAreaRadius, start, start + Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, f.goalieAreaRadius, start, start + Math.PI);
      ctx.stroke();
    });

    // Posts.
    ctx.fillStyle = '#ffffff';
    for (const p of f.posts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, FB.CONFIG.physics.postRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPulse(p) {
    if (p.pulseTimer <= 0) return;
    const ctx = this.ctx;
    const pc = FB.CONFIG.player;
    const t = 1 - p.pulseTimer / pc.pulseVisualTime; // 0 to 1
    const team = FB.CONFIG.teams[p.team];
    ctx.strokeStyle = team.secondary;
    ctx.globalAlpha = 1 - t;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + pc.pulseReach * (0.3 + 0.7 * t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawPlayer(p) {
    const ctx = this.ctx;
    const team = FB.CONFIG.teams[p.team];

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(p.x + 3, p.y + 4, p.r, 0, Math.PI * 2);
    ctx.fill();

    // Body. Stunned circles flash lighter.
    ctx.fillStyle = p.stun > 0 ? team.secondary : team.primary;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = team.dark;
    ctx.stroke();

    // Goalies wear a band so they are easy to spot.
    if (p.role === 'goalie') {
      ctx.strokeStyle = team.secondary;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r - 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.index + 1), p.x, p.y + 1);

    if (p.controlled) {
      // White ring plus a recharge arc that fills as the pulse readies.
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = p.pulseReady >= 1 ? '#ffffff' : '#ffe27a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.pulseReady);
      ctx.stroke();

      // Marker above the circle.
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.r - 12);
      ctx.lineTo(p.x - 7, p.y - p.r - 22);
      ctx.lineTo(p.x + 7, p.y - p.r - 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawBall(b) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(b.x + 2, b.y + 3, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawHud(game, v) {
    const ctx = this.ctx;
    const s = this.dpr;
    const cx = this.canvas.width / 2;
    const [t0, t1] = FB.CONFIG.teams;

    // Scoreboard.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${22 * s}px system-ui, sans-serif`;
    const y = Math.max(24 * s, v.oy - 45 * v.scale);
    const left = `${t0.name} ${game.score[0]}`;
    const right = `${game.score[1]} ${t1.name}`;
    const gap = 18 * s;
    const half = Math.max(ctx.measureText(left).width, ctx.measureText(right).width) + gap + 16 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(cx - half, y - 20 * s, half * 2, 40 * s);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('–', cx, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = t0.primary;
    ctx.fillText(left, cx - gap, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = t1.primary;
    ctx.fillText(right, cx + gap, y);
    ctx.textAlign = 'center';

    // The user's stats.
    const u = game.user;
    ctx.font = `${14 * s}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const by = this.canvas.height - Math.max(18 * s, (v.oy - 40 * v.scale));
    const help = u.controlled
      ? `You: #${u.index + 1}  ·  Speed ${u.speed}  ·  Power ${u.power}  ·  Hit Reset ${u.hitReset.toFixed(1)}s  ·  WASD move, Space pulse, B watch bots`
      : 'Watching bots  ·  Press B to take control of Blue #5';
    ctx.fillText(help, cx, by);

    if (game.state === 'goal') {
      const team = FB.CONFIG.teams[game.lastScorer];
      ctx.font = `bold ${64 * s}px system-ui, sans-serif`;
      ctx.lineWidth = 8 * s;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(`${team.name} scores!`, cx, this.canvas.height / 2);
      ctx.fillStyle = team.secondary;
      ctx.fillText(`${team.name} scores!`, cx, this.canvas.height / 2);
    }
  }
};
