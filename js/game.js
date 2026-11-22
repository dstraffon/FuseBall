// Game state and the fixed-step simulation.
FB.Game = class {
  constructor(input) {
    const C = FB.CONFIG;
    this.input = input;
    this.field = new FB.Field(C.field);
    this.ball = new FB.Ball(C.physics.ballRadius);
    this.players = [];
    this.score = [0, 0];
    this.state = 'playing'; // 'playing' | 'goal'
    this.stateTimer = 0;
    this.lastScorer = -1;
    this.time = 0;

    for (let team = 0; team < 2; team++) {
      C.roster.forEach((slot, index) => {
        this.players.push(new FB.Player({
          team,
          index,
          role: slot.role,
          speed: slot.speed,
          power: slot.power,
          hitReset: slot.hitReset,
          home: this.homePosition(team, slot),
        }));
      });
    }

    this.user = this.players[C.userRosterIndex]; // a Blue circle
    this.user.controlled = true;
    this.kickoff();
  }

  // Converts a roster slot (fractions of the team's own half) into field
  // coordinates. Team 1's half is mirrored.
  homePosition(team, slot) {
    const half = this.field.width / 2;
    const x = slot.x * half;
    return {
      x: team === 0 ? x : this.field.width - x,
      y: slot.y * this.field.height,
    };
  }

  kickoff() {
    for (const p of this.players) p.resetToHome();
    this.ball.reset(this.field.width / 2, this.field.height / 2);
    this.state = 'playing';
  }

  step(dt) {
    const phys = FB.CONFIG.physics;
    this.time += dt;

    if (this.state === 'goal') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.kickoff();
      // The net holds the ball while the banner shows.
      const hold = Math.exp(-8 * dt);
      this.ball.vx *= hold;
      this.ball.vy *= hold;
    }

    // Movement. Only the user's circle moves for now; bots come next.
    for (const p of this.players) {
      let dx = 0;
      let dy = 0;
      if (p.controlled && this.state === 'playing') {
        [dx, dy] = this.input.moveVector();
      }
      p.update(dt, dx, dy);
    }

    if (this.state === 'playing' && this.input.pulseHeld()) {
      this.user.pulse(this.ball, this.players);
    }

    this.ball.update(dt, phys);
    this.resolvePlayerCollisions(phys);
    this.resolveBallCollisions(phys);

    for (const p of this.players) this.field.constrainPlayer(p);
    const conceded = this.field.constrainBall(this.ball, phys.wallBounce, phys.postRadius);
    if (conceded !== -1 && this.state === 'playing') this.goalScored(1 - conceded);
  }

  goalScored(team) {
    this.score[team] += 1;
    this.lastScorer = team;
    this.state = 'goal';
    this.stateTimer = FB.CONFIG.match.goalPause;
  }

  resolvePlayerCollisions(phys) {
    const ps = this.players;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const b = ps[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min || d < 1e-6) continue;
        const nx = dx / d;
        const ny = dy / d;
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        // Equal masses: swap the closing part of their velocity as knockback.
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const j2 = (-(1 + phys.playerPlayerBounce) * rel) / 2;
          a.kvx -= j2 * nx;
          a.kvy -= j2 * ny;
          b.kvx += j2 * nx;
          b.kvy += j2 * ny;
        }
      }
    }
  }

  // Circles are much heavier than the ball, so the ball takes the whole
  // correction. Walking into the ball dribbles it.
  resolveBallCollisions(phys) {
    const b = this.ball;
    for (const p of this.players) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const d = Math.hypot(dx, dy);
      const min = p.r + b.r;
      if (d >= min || d < 1e-6) continue;
      const nx = dx / d;
      const ny = dy / d;
      b.x = p.x + nx * min;
      b.y = p.y + ny * min;
      const rel = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
      if (rel < 0) {
        const j = -(1 + phys.playerBallBounce) * rel;
        b.vx += j * nx;
        b.vy += j * ny;
      }
    }
  }
};
