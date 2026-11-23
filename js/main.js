// Boots the game, runs the main loop with a fixed simulation step, and
// handles the main menu, pause menu and full-time screen.
(function () {
  const canvas = document.getElementById('game');
  const input = new FB.Input();
  const renderer = new FB.Renderer(canvas);
  const step = FB.CONFIG.physics.step;

  const menu = document.getElementById('menu');
  const pauseMenu = document.getElementById('pause');
  const fulltime = document.getElementById('fulltime');
  const finalScore = document.getElementById('final-score');

  // 'menu' while the main menu shows (bots play behind it), 'match' otherwise.
  let screen = 'menu';
  let game = null;

  function show(el, visible) {
    el.classList.toggle('hidden', !visible);
    if (visible) {
      const first = el.querySelector('button');
      if (first) first.focus();
    }
  }

  function newGame(mode) {
    game = new FB.Game(input, mode);
    FB.game = game; // handy for poking at state from the browser console
  }

  function openMenu() {
    screen = 'menu';
    newGame('watch'); // backdrop
    show(pauseMenu, false);
    show(fulltime, false);
    show(menu, true);
  }

  function startMatch(mode) {
    screen = 'match';
    newGame(mode);
    show(menu, false);
    show(pauseMenu, false);
    show(fulltime, false);
    canvas.focus();
  }

  function setPaused(paused) {
    if (screen !== 'match' || game.state === 'fulltime') return;
    game.paused = paused;
    show(pauseMenu, paused);
  }

  function showFulltime() {
    const [t0, t1] = FB.CONFIG.teams;
    const [a, b] = game.score;
    const result = a === b ? 'Draw' : `${a > b ? t0.name : t1.name} wins`;
    finalScore.textContent = `${t0.name} ${a} – ${b} ${t1.name} · ${result}`;
    show(fulltime, true);
  }

  document.addEventListener('click', (e) => {
    const action = e.target.closest('button')?.dataset.action;
    if (!action) return;
    if (action === 'play' || action === 'watch') startMatch(action);
    else if (action === 'resume') setPaused(false);
    else if (action === 'restart') startMatch(game.mode);
    else if (action === 'exit') openMenu();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' && e.code !== 'KeyP') return;
    if (screen === 'match') setPaused(!game.paused);
  });

  // Pause automatically if the window loses focus mid-match.
  window.addEventListener('blur', () => {
    if (screen === 'match' && game.mode === 'play') setPaused(true);
  });

  let last = performance.now();
  let acc = 0;
  let fulltimeShown = false;

  function frame(now) {
    // Cap long frames (tab switches, breakpoints) so physics doesn't explode.
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= step) {
      game.step(step);
      acc -= step;
    }

    if (game.state === 'fulltime') {
      if (screen === 'menu') {
        openMenu(); // keep the backdrop match going
      } else if (!fulltimeShown) {
        fulltimeShown = true;
        showFulltime();
      }
    } else {
      fulltimeShown = false;
    }

    renderer.draw(game, screen === 'menu');
    requestAnimationFrame(frame);
  }

  openMenu();
  requestAnimationFrame(frame);
})();
