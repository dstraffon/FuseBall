FB.Ball = class {
  constructor(r) {
    this.r = r;
    this.reset(0, 0);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt, phys) {
    const damp = Math.exp(-phys.ballFriction * dt);
    this.vx *= damp;
    this.vy *= damp;
    [this.vx, this.vy] = FB.vec.clampLen(this.vx, this.vy, phys.ballMaxSpeed);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
};
