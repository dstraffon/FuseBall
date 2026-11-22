// Global namespace for the game. Plain scripts (no modules) so index.html
// can be opened straight from disk without a local server.
window.FB = window.FB || {};

FB.CONFIG = {
  field: {
    width: 1200,           // playing area, in world units (px at scale 1)
    height: 700,
    goalWidth: 180,        // height of the goal mouth
    goalDepth: 40,         // how far the net box extends behind the goal line
    goalieAreaRadius: 130, // radius of the goalie semicircle
    margin: 70,            // space drawn around the field for walls and goals
  },

  physics: {
    step: 1 / 120,         // fixed simulation step, seconds
    ballRadius: 10,
    ballFriction: 0.85,    // exponential velocity decay per second
    ballMaxSpeed: 1500,
    wallBounce: 0.8,
    postRadius: 6,
    playerBallBounce: 0.4,
    playerPlayerBounce: 0.2,
  },

  player: {
    radius: 18,
    accel: 1800,           // how fast a circle reaches its top speed
    knockbackDecay: 5,     // exponential decay of knockback velocity per second
    stunTime: 0.35,        // seconds an opponent loses control after a pulse
    pulseReach: 44,        // reach of the pulse beyond the circle's edge
    pulseVisualTime: 0.2,
  },

  // How the three stats turn into numbers. Speed and Power are 1 to 10,
  // Hit Reset Time is in seconds.
  stats: {
    speedBase: 120,
    speedPerPoint: 16,
    ballImpulseBase: 300,
    ballImpulsePerPoint: 60,
    playerKnockBase: 160,
    playerKnockPerPoint: 30,
  },

  match: {
    goalPause: 2.0,        // seconds the "Goal!" banner shows before kickoff
  },

  teams: [
    {
      name: 'Blue',
      primary: '#2f80ed',
      secondary: '#a8ccff',
      dark: '#123a73',
    },
    {
      name: 'Orange',
      primary: '#f2994a',
      secondary: '#ffd8b0',
      dark: '#7a3c0b',
    },
  ],

  // Six circles per team. Positions are fractions of the team's own half:
  // x = 0 is the team's goal line, x = 1 is the halfway line.
  roster: [
    { role: 'goalie',   x: 0.04, y: 0.50, speed: 5, power: 8, hitReset: 1.0 },
    { role: 'defender', x: 0.35, y: 0.28, speed: 6, power: 7, hitReset: 0.9 },
    { role: 'defender', x: 0.35, y: 0.72, speed: 6, power: 7, hitReset: 0.9 },
    { role: 'midfield', x: 0.62, y: 0.50, speed: 7, power: 5, hitReset: 0.6 },
    { role: 'forward',  x: 0.86, y: 0.30, speed: 9, power: 5, hitReset: 0.7 },
    { role: 'forward',  x: 0.86, y: 0.70, speed: 8, power: 6, hitReset: 0.8 },
  ],

  // Index in the roster of the circle the user controls.
  userRosterIndex: 4,
};
