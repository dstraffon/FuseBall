// Keyboard input: WASD to move, Space to pulse.
FB.Input = class {
  constructor(target = window) {
    this.keys = new Set();
    target.addEventListener('keydown', (e) => {
      if (e.code === 'Space') e.preventDefault(); // stop page scrolling
      this.keys.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // Drop held keys when the window loses focus so circles don't run away.
    window.addEventListener('blur', () => this.keys.clear());
  }

  // Movement direction, normalised so diagonals aren't faster.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('KeyS')) y += 1;
    if (this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('KeyD')) x += 1;
    return FB.vec.norm(x, y);
  }

  pulseHeld() {
    return this.keys.has('Space');
  }
};
