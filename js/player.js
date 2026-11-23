// A circle on the field. Its velocity has two parts: the movement it
// chooses (mv) and knockback it receives from pulses and collisions (kv).
FB.Player = class {
  constructor({ team, index, role, speed, power, hitReset, pattern, home }) {
    const pc = FB.CONFIG.player;
    const st = FB.CONFIG.stats;
    this.team = team;
    this.index = index;
    this.role = role;
    this.speed = speed;       // stat, 1 to 10
    this.power = power;       // stat, 1 to 10
    this.hitReset = hitReset; // stat, seconds between pulses
    this.pattern = pattern;   // look of the circle, see Renderer.drawPattern
    this.home = home;         // kickoff position
    this.r = pc.radius;
    this.maxSpeed = st.speedBase + st.speedPerPoint * speed;
    this.controlled = false;
    this.resetToHome();
  }

  resetToHome() {
    this.x = this.home.x;
    this.y = this.home.y;
    this.mvx = 0;
    this.mvy = 0;
    this.kvx = 0;
    this.kvy = 0;
    this.cooldown = 0;
    this.stun = 0;
    this.pulseTimer = 0;
  }

  get vx() { return this.mvx + this.kvx; }
  get vy() { return this.mvy + this.kvy; }

  // 0 while recharging, 1 when the pulse is ready.
  get pulseReady() {
    return this.hitReset > 0 ? 1 - this.cooldown / this.hitReset : 1;
  }

  // dirX/dirY: wanted movement direction (unit vector or zero).
  update(dt, dirX, dirY) {
    const pc = FB.CONFIG.player;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.pulseTimer = Math.max(0, this.pulseTimer - dt);
    this.stun = Math.max(0, this.stun - dt);

    // While stunned the circle drifts and can't steer.
    const tx = this.stun > 0 ? 0 : dirX * this.maxSpeed;
    const ty = this.stun > 0 ? 0 : dirY * this.maxSpeed;
    const dx = tx - this.mvx;
    const dy = ty - this.mvy;
    const [sx, sy] = FB.vec.clampLen(dx, dy, pc.accel * dt);
    this.mvx += sx;
    this.mvy += sy;

    const kdamp = Math.exp(-pc.knockbackDecay * dt);
    this.kvx *= kdamp;
    this.kvy *= kdamp;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  // Sends out a pulse if it has recharged. Pushes the ball away from this
  // circle and knocks back nearby circles on the other team.
  pulse(ball, players) {
    if (this.cooldown > 0) return false;
    const pc = FB.CONFIG.player;
    const st = FB.CONFIG.stats;
    this.cooldown = this.hitReset;
    this.pulseTimer = pc.pulseVisualTime;
    const reach = this.r + pc.pulseReach;

    const bdx = ball.x - this.x;
    const bdy = ball.y - this.y;
    if (Math.hypot(bdx, bdy) - ball.r <= reach) {
      const [nx, ny] = FB.vec.norm(bdx, bdy);
      const impulse = st.ballImpulseBase + st.ballImpulsePerPoint * this.power;
      // Mostly replace the ball's motion so pulses feel crisp and aimable,
      // and carry a little of the circle's own momentum.
      ball.vx = ball.vx * 0.2 + nx * impulse + this.vx * 0.3;
      ball.vy = ball.vy * 0.2 + ny * impulse + this.vy * 0.3;
    }

    for (const other of players) {
      if (other.team === this.team) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      if (Math.hypot(dx, dy) - other.r <= reach) {
        const [nx, ny] = FB.vec.norm(dx, dy);
        const knock = st.playerKnockBase + st.playerKnockPerPoint * this.power;
        other.kvx += nx * knock;
        other.kvy += ny * knock;
        other.stun = Math.max(other.stun, pc.stunTime);
      }
    }
    return true;
  }
};
