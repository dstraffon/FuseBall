# Fuseball

A top-down 2D web game a bit like soccer. Two teams of six circles pass a ball around and try to pulse it into the other team's goal.

## Play

Open `index.html` in any modern browser. There is nothing to install or build.

From the main menu, pick **Play with bots** to control Blue #5 with bots on both teams, or **Watch bots** to watch a bots-only match. A match is 6 minutes, made of two 3-minute halves. The clock stops while a goal is celebrated.

| Key | Action |
| --- | --- |
| W A S D | Move your circle |
| Space | Send out a pulse |
| Esc or P | Pause menu (Resume, Restart, Exit to main menu) |

The pulse pushes the ball away from your circle, so line up behind the ball in the direction you want it to go. It also knocks back and briefly stuns nearby circles on the other team.

## Circles

Every circle has three stats:

- **Speed** (1 to 10): how fast it moves.
- **Power** (1 to 10): how hard its pulse hits the ball and other circles.
- **Hit Reset Time** (seconds): how long the pulse takes to recharge. The ring around your circle fills up as it recharges.

Each team has one goalie, which can't leave its semicircle. Every circle on a team has its own pattern (rings, stripes, dots, halves, cross, diagonal), and the team keeps one colour scheme.

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
| `js/main.js` | Main loop, main menu, pause menu and full-time screen |

## Status

First version: a full 6-minute match with a main menu, pause menu, bots and one circle you can control. Next up is tuning the stats and bots.
