# Fuseball

A top-down 2D web game a bit like soccer. Two teams of six circles pass a ball around and try to pulse it into the other team's goal.

## Play

Open `index.html` in any modern browser. There is nothing to install or build.

| Key | Action |
| --- | --- |
| W A S D | Move your circle |
| Space | Send out a pulse |
| B | Hand your circle to a bot and watch (press again to take it back) |

The pulse pushes the ball away from your circle, so line up behind the ball in the direction you want it to go. It also knocks back and briefly stuns nearby circles on the other team.

## Circles

Every circle has three stats:

- **Speed** (1 to 10): how fast it moves.
- **Power** (1 to 10): how hard its pulse hits the ball and other circles.
- **Hit Reset Time** (seconds): how long the pulse takes to recharge. The ring around your circle fills up as it recharges.

Each team has one goalie, which can't leave its semicircle.

## Code layout

| File | What it does |
| --- | --- |
| `js/config.js` | All tuning numbers: field size, physics, stats, team colours and line-ups |
| `js/field.js` | Walls, goals, posts and the goalie area |
| `js/player.js` | A circle: movement, knockback and the pulse |
| `js/ball.js` | The ball |
| `js/ai.js` | Bot brains: chasing, passing, shooting, formation and goalkeeping |
| `js/game.js` | Game state, collisions, goals and kickoff |
| `js/render.js` | Drawing the field, circles and scoreboard |
| `js/input.js` | Keyboard input |
| `js/main.js` | Starts the game and runs the loop |

## Status

Done so far: the field, physics, one circle you control, and bots for every other circle. The match clock with halves and the menus are coming next.
