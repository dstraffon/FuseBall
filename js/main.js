// Boots the game and runs the main loop with a fixed simulation step.
(function () {
  const canvas = document.getElementById('game');
  const input = new FB.Input();
  const game = new FB.Game(input);
  const renderer = new FB.Renderer(canvas);
  const step = FB.CONFIG.physics.step;

  FB.game = game; // handy for poking at state from the browser console

  let last = performance.now();
  let acc = 0;

  function frame(now) {
    // Cap long frames (tab switches, breakpoints) so physics doesn't explode.
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= step) {
      game.step(step);
      acc -= step;
    }
    renderer.draw(game);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
