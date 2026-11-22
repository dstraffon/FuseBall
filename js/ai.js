// Bot brains. Each step the AI decides, for every circle not controlled by
// the user, which way to move and whether to pulse.
//
// Per team, the circle that can reach the ball soonest becomes the "chaser".
// It gets behind the ball relative to where it wants the ball to go (a shot,
// a pass to an open teammate, or upfield) and pulses when lined up.
// Everyone else holds a formation spot that slides with the ball.
// Goalies shadow the ball from inside their semicircle and clear it.
FB.AI = class {
  constructor(game) {
    this.game = game;
    this.stuckTime = 0; // how long the ball has been sitting still
  }

  // Returns a Map from player to { dx, dy, pulse }.
  update(dt) {
    const g = this.game;
    const ball = g.ball;
    const cmds = new Map();

    const slow = Math.hypot(ball.vx, ball.vy) < 30;
    this.stuckTime = slow ? this.stuckTime + dt : 0;

    // Every so often each bot picks a slightly different spot and aim, so
    // matches don't play out the same way twice.
    for (const p of g.players) {
      p.aiTimer = (p.aiTimer || 0) - dt;
      if (p.aiTimer <= 0) {
        p.aiTimer = 0.8 + Math.random() * 1.2;
        p.aiJitterX = (Math.random() - 0.5) * 60;
        p.aiJitterY = (Math.random() - 0.5) * 60;
        p.aiAim = (Math.random() - 0.5) * 0.5; // fraction of the goal width
      }
    }

    for (let team = 0; team < 2; team++) {
      const mates = g.players.filter((p) => p.team === team);
      const chaser = this.pickChaser(mates);
      for (const p of mates) {
        if (p.controlled) continue;
        let cmd;
        if (p.role === 'goalie') cmd = this.goalie(p);
        else if (p === chaser) cmd = this.chase(p);
        else cmd = this.support(p);
        cmds.set(p, cmd);
      }
    }
    return cmds;
  }

  // Closest outfield circle by time-to-ball. If the user's circle is the
  // closest on its team, no bot chases so they don't crowd the user.
  pickChaser(mates) {
    const ball = this.game.ball;
    let best = null;
    let bestT = Infinity;
    for (const p of mates) {
      if (p.role === 'goalie') continue;
      const t = Math.hypot(ball.x - p.x, ball.y - p.y) / p.maxSpeed;
      if (t < bestT) {
        bestT = t;
        best = p;
      }
    }
    return best && best.controlled ? null : best;
  }

  attackSign(team) {
    return team === 0 ? 1 : -1;
  }

  // Centre-to-centre distance at which a pulse reaches the ball.
  reach(p) {
    return p.r + FB.CONFIG.player.pulseReach + this.game.ball.r;
  }

  // --- Chaser -------------------------------------------------------------

  chase(p) {
    const ball = this.game.ball;
    const { point, kind } = this.chooseTarget(p);
    const [ax, ay] = FB.vec.norm(point.x - ball.x, point.y - ball.y);
    const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
    const [bx, by] = FB.vec.norm(ball.x - p.x, ball.y - p.y);
    const alignment = bx * ax + by * ay; // 1 when the ball is dead ahead of the aim
    const inReach = dist <= this.reach(p);

    let pulse = false;
    if (inReach) {
      const lined = kind === 'shot' ? 0.85 : 0.8;
      if (alignment > lined) {
        // Far from goal with nobody to pass to: keep dribbling unless pressed.
        pulse = kind !== 'dribble' || this.underPressure(p);
      } else if (this.stuckTime > 1.2 && bx * this.attackSign(p.team) > -0.3) {
        // Ball pinned against a wall or in a scrum: hit it anywhere not
        // towards our own goal.
        pulse = true;
      }
    }
    if (pulse && !this.safeHit(p)) pulse = false;
    if (!pulse) pulse = this.tackle(p);

    const [dx, dy] = this.approach(p, ax, ay, alignment);
    return { dx, dy, pulse: pulse && this.react() };
  }

  // Moves to the spot behind the ball, walking round it if on the wrong side.
  approach(p, ax, ay, alignment) {
    const ball = this.game.ball;
    const gap = p.r + ball.r;
    if (alignment > 0.6) {
      // Lined up: run through the ball so it dribbles towards the aim.
      return FB.vec.norm(ball.x + ax * 12 - p.x, ball.y + ay * 12 - p.y);
    }
    // Wrong side: circle round, keeping to whichever side we're already on.
    const px = -ay;
    const py = ax;
    const side = (p.x - ball.x) * px + (p.y - ball.y) * py >= 0 ? 1 : -1;
    const wx = ball.x - ax * (gap + 10) + px * side * (gap + 14);
    const wy = ball.y - ay * (gap + 10) + py * side * (gap + 14);
    return FB.vec.norm(wx - p.x, wy - p.y);
  }

  // Where the chaser wants the ball to go.
  chooseTarget(p) {
    const g = this.game;
    const f = g.field;
    const ball = g.ball;
    const goal = f.goalCenter(1 - p.team);
    const toGoal = Math.hypot(goal.x - ball.x, goal.y - ball.y);

    if (toGoal < 430) {
      // Aim for the half of the goal the keeper isn't covering.
      const keeper = g.players.find((q) => q.team !== p.team && q.role === 'goalie');
      const offset = f.goalWidth * (0.3 + p.aiAim * 0.3);
      const y = keeper && keeper.y < goal.y ? goal.y + offset : goal.y - offset;
      return { point: { x: goal.x, y }, kind: 'shot' };
    }

    const pass = this.findPass(p);
    if (pass) return { point: pass, kind: 'pass' };
    return { point: goal, kind: 'dribble' };
  }

  // Best open teammate further up the field, or null.
  findPass(p) {
    const g = this.game;
    const ball = g.ball;
    const sign = this.attackSign(p.team);
    let best = null;
    let bestScore = -Infinity;
    for (const m of g.players) {
      if (m === p || m.team !== p.team || m.role === 'goalie') continue;
      const progress = (m.x - ball.x) * sign;
      const d = Math.hypot(m.x - ball.x, m.y - ball.y);
      if (progress < 60 || d < 120 || d > 480) continue;
      const lane = this.laneClearance(ball, m, p.team);
      if (lane < 45) continue;
      const space = this.nearestOpponent(m, p.team);
      if (space < 70) continue;
      const score = progress + Math.min(space, 200) * 0.8 + Math.min(lane, 120) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        // Lead the receiver a little towards goal.
        best = { x: m.x + sign * 30, y: m.y };
      }
    }
    return best;
  }

  // Smallest distance from any opponent to the line from a to b.
  laneClearance(a, b, team) {
    let min = Infinity;
    const lx = b.x - a.x;
    const ly = b.y - a.y;
    const len2 = lx * lx + ly * ly || 1;
    for (const q of this.game.players) {
      if (q.team === team) continue;
      const t = Math.max(0, Math.min(1, ((q.x - a.x) * lx + (q.y - a.y) * ly) / len2));
      const d = Math.hypot(a.x + lx * t - q.x, a.y + ly * t - q.y);
      min = Math.min(min, d);
    }
    return min;
  }

  nearestOpponent(pt, team) {
    let min = Infinity;
    for (const q of this.game.players) {
      if (q.team === team) continue;
      min = Math.min(min, Math.hypot(q.x - pt.x, q.y - pt.y));
    }
    return min;
  }

  // Near our own goal, never hit the ball back towards it.
  safeHit(p) {
    const ball = this.game.ball;
    const c = this.game.field.goalCenter(p.team);
    const fromGoal = Math.hypot(ball.x - c.x, ball.y - c.y);
    if (fromGoal > 380) return true;
    const [hx, hy] = FB.vec.norm(ball.x - p.x, ball.y - p.y); // hit direction
    const [ox, oy] = FB.vec.norm(ball.x - c.x, ball.y - c.y); // away from goal
    return hx * ox + hy * oy > 0.2;
  }

  // Bots don't fire the instant a chance appears: a short random delay
  // (about 60 ms on average) makes them beatable.
  react() {
    return Math.random() < 0.14;
  }

  underPressure(p) {
    return this.nearestOpponent(this.game.ball, p.team) < 90;
  }

  // Knock back an opponent who is right next to the ball and within reach.
  tackle(p) {
    const ball = this.game.ball;
    const reach = p.r + FB.CONFIG.player.pulseReach;
    // The pulse would also hit the ball, so check that's safe too.
    if (Math.hypot(ball.x - p.x, ball.y - p.y) <= this.reach(p) && !this.safeHit(p)) return false;
    for (const q of this.game.players) {
      if (q.team === p.team) continue;
      const near = Math.hypot(q.x - p.x, q.y - p.y) - q.r <= reach;
      const onBall = Math.hypot(q.x - ball.x, q.y - ball.y) < q.r + ball.r + 25;
      if (near && onBall) return true;
    }
    return false;
  }

  // --- Support ------------------------------------------------------------

  support(p) {
    const g = this.game;
    const f = g.field;
    const ball = g.ball;
    const sign = this.attackSign(p.team);

    // Formation spot that slides with the ball.
    let x = p.home.x + (ball.x - f.width / 2) * 0.55 + p.aiJitterX;
    let y = p.home.y + (ball.y - f.height / 2) * 0.3 + p.aiJitterY;
    const half = f.width / 2;
    if (p.role === 'defender') {
      // Defenders don't wander far past halfway.
      const limit = half + sign * 120;
      x = sign > 0 ? Math.min(x, limit) : Math.max(x, limit);
    } else if (p.role === 'forward') {
      // Forwards don't drop deep into their own half.
      const limit = half - sign * 150;
      x = sign > 0 ? Math.max(x, limit) : Math.min(x, limit);
    }
    x = Math.max(p.r, Math.min(f.width - p.r, x));
    y = Math.max(p.r, Math.min(f.height - p.r, y));

    const [dx, dy] = this.arrive(p, x, y);

    // Hit the ball first time if it comes within reach heading the right way.
    let pulse = false;
    const bd = Math.hypot(ball.x - p.x, ball.y - p.y);
    if (bd <= this.reach(p)) {
      const [bx] = FB.vec.norm(ball.x - p.x, ball.y - p.y);
      pulse = bx * sign > 0.3 && this.safeHit(p);
    }
    if (!pulse) pulse = this.tackle(p);
    return { dx, dy, pulse: pulse && this.react() };
  }

  // Direction to a point, easing off as it gets close so circles settle.
  arrive(p, x, y) {
    const ddx = x - p.x;
    const ddy = y - p.y;
    const d = Math.hypot(ddx, ddy);
    if (d < 6) return [0, 0];
    const s = Math.min(1, d / 50);
    return [(ddx / d) * s, (ddy / d) * s];
  }

  // --- Goalie -------------------------------------------------------------

  goalie(p) {
    const g = this.game;
    const f = g.field;
    const ball = g.ball;
    const c = f.goalCenter(p.team);
    const sign = this.attackSign(p.team);
    const R = f.goalieAreaRadius;
    const ballToGoal = Math.hypot(ball.x - c.x, ball.y - c.y);
    const bd = Math.hypot(ball.x - p.x, ball.y - p.y);

    let pulse = false;
    if (bd <= this.reach(p)) {
      const [bx] = FB.vec.norm(ball.x - p.x, ball.y - p.y);
      pulse = bx * sign > 0.1 && this.safeHit(p); // anything away from goal
    }
    if (!pulse) pulse = this.tackle(p);
    pulse = pulse && this.react();

    if (ballToGoal < R + 30) {
      // Ball in or at the edge of the area: go and clear it to the wing.
      const wingY = ball.y < c.y ? f.height * 0.15 : f.height * 0.85;
      const tx = c.x + sign * 400;
      const [ax, ay] = FB.vec.norm(tx - ball.x, wingY - ball.y);
      const [bx, by] = FB.vec.norm(ball.x - p.x, ball.y - p.y);
      const [dx, dy] = this.approach(p, ax, ay, bx * ax + by * ay);
      return { dx, dy, pulse };
    }

    // Otherwise stand between the ball and the middle of the goal.
    const [nx, ny] = FB.vec.norm(ball.x - c.x, ball.y - c.y);
    const depth = R * 0.4;
    const [dx, dy] = this.arrive(p, c.x + nx * depth, c.y + ny * depth);
    return { dx, dy, pulse };
  }
};
