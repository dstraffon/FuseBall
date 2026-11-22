// Tiny 2D vector helpers working on plain numbers.
FB.vec = {
  len(x, y) {
    return Math.hypot(x, y);
  },

  // Returns [nx, ny], or [0, 0] for a zero vector.
  norm(x, y) {
    const l = Math.hypot(x, y);
    return l > 1e-9 ? [x / l, y / l] : [0, 0];
  },

  clampLen(x, y, max) {
    const l = Math.hypot(x, y);
    if (l <= max || l < 1e-9) return [x, y];
    const s = max / l;
    return [x * s, y * s];
  },
};
