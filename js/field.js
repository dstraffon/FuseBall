// Field geometry: walls, goal mouths, goal boxes, posts and goalie areas.
// World coordinates: (0, 0) is the top-left corner of the playing area,
// (width, height) the bottom-right. Team 0 defends the left goal.
FB.Field = class {
  constructor(cfg) {
    this.width = cfg.width;
    this.height = cfg.height;
    this.goalWidth = cfg.goalWidth;
    this.goalDepth = cfg.goalDepth;
    this.goalieAreaRadius = cfg.goalieAreaRadius;
    this.margin = cfg.margin;
    this.goalTop = this.height / 2 - this.goalWidth / 2;
    this.goalBottom = this.height / 2 + this.goalWidth / 2;
    this.posts = [
      { x: 0, y: this.goalTop },
      { x: 0, y: this.goalBottom },
      { x: this.width, y: this.goalTop },
      { x: this.width, y: this.goalBottom },
    ];
  }

  // Centre of the goal a team defends.
  goalCenter(team) {
    return { x: team === 0 ? 0 : this.width, y: this.height / 2 };
  }

  // Keeps the ball inside the walls and goal boxes, bouncing off them.
  // Returns the team whose goal the ball fully crossed into, or -1.
  constrainBall(ball, bounce, postRadius) {
    const r = ball.r;
    const W = this.width;
    const H = this.height;
    const inMouth = ball.y > this.goalTop && ball.y < this.goalBottom;

    // Top and bottom walls.
    if (ball.y - r < 0) {
      ball.y = r;
      ball.vy = Math.abs(ball.vy) * bounce;
    } else if (ball.y + r > H) {
      ball.y = H - r;
      ball.vy = -Math.abs(ball.vy) * bounce;
    }

    if (ball.x < 0 || ball.x > W) {
      // Ball centre is inside a goal box: keep it between the side netting
      // and in front of the back netting.
      const minY = this.goalTop + r;
      const maxY = this.goalBottom - r;
      if (ball.y < minY) {
        ball.y = minY;
        ball.vy = Math.abs(ball.vy) * bounce;
      } else if (ball.y > maxY) {
        ball.y = maxY;
        ball.vy = -Math.abs(ball.vy) * bounce;
      }
      if (ball.x - r < -this.goalDepth) {
        ball.x = -this.goalDepth + r;
        ball.vx = Math.abs(ball.vx) * 0.3; // the net soaks up most of it
      } else if (ball.x + r > W + this.goalDepth) {
        ball.x = W + this.goalDepth - r;
        ball.vx = -Math.abs(ball.vx) * 0.3;
      }
    } else if (!inMouth) {
      // Side walls outside the goal mouth.
      if (ball.x - r < 0) {
        ball.x = r;
        ball.vx = Math.abs(ball.vx) * bounce;
      } else if (ball.x + r > W) {
        ball.x = W - r;
        ball.vx = -Math.abs(ball.vx) * bounce;
      }
    }

    // Goal posts.
    for (const p of this.posts) {
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const d = Math.hypot(dx, dy);
      const min = r + postRadius;
      if (d < min && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        ball.x = p.x + nx * min;
        ball.y = p.y + ny * min;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= (1 + bounce) * vn * nx;
          ball.vy -= (1 + bounce) * vn * ny;
        }
      }
    }

    // A goal counts once the whole ball is over the line.
    if (ball.x < -r) return 0;
    if (ball.x > W + r) return 1;
    return -1;
  }

  // Keeps a circle on the field; goalies also stay inside their semicircle.
  constrainPlayer(p) {
    const r = p.r;
    if (p.x < r) { p.x = r; p.kvx = Math.max(0, p.kvx); }
    if (p.x > this.width - r) { p.x = this.width - r; p.kvx = Math.min(0, p.kvx); }
    if (p.y < r) { p.y = r; p.kvy = Math.max(0, p.kvy); }
    if (p.y > this.height - r) { p.y = this.height - r; p.kvy = Math.min(0, p.kvy); }

    if (p.role === 'goalie') {
      const c = this.goalCenter(p.team);
      const max = this.goalieAreaRadius - r;
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d > max) {
        p.x = c.x + (dx / d) * max;
        p.y = c.y + (dy / d) * max;
      }
    }
  }
};
