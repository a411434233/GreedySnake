(() => {
  const game = new SnakeGame();
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const score = document.getElementById('score');
  const bestLabel = document.getElementById('best');
  const speed = document.getElementById('speed');
  const status = document.getElementById('status');
  const toggle = document.getElementById('toggle');
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('message-title');
  const message = document.getElementById('message-body');
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const keys = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyW: 'up',
    KeyS: 'down',
    KeyA: 'left',
    KeyD: 'right',
  };
  let timer;
  let best = 0;
  try {
    const saved = Number(localStorage.getItem('greedy-snake-best'));
    if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
  } catch {
    /* 隐私模式或本地文件限制存储时，仍可正常游戏。 */
  }

  function render() {
    const unit = canvas.width / game.size;
    ctx.fillStyle = '#e2ebd0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d5dfc4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < game.size; i++) {
      const position = Math.round(i * unit) + 0.5;
      ctx.moveTo(position, 0);
      ctx.lineTo(position, canvas.height);
      ctx.moveTo(0, position);
      ctx.lineTo(canvas.width, position);
    }
    ctx.stroke();
    game.snake.forEach((part, index) => {
      ctx.fillStyle = index === 0 ? '#203a30' : '#397354';
      ctx.beginPath();
      ctx.roundRect(part.x * unit + 1, part.y * unit + 1, unit - 2, unit - 2, unit * 0.22);
      ctx.fill();
    });
    const head = game.snake[0];
    const forward = game.direction;
    const side = { x: -forward.y, y: forward.x };
    ctx.fillStyle = '#edf3e2';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        (head.x + 0.5 + forward.x * 0.18 + side.x * sign * 0.19) * unit,
        (head.y + 0.5 + forward.y * 0.18 + side.y * sign * 0.19) * unit,
        unit * 0.075,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (game.food) {
      const x = (game.food.x + 0.5) * unit,
        y = (game.food.y + 0.55) * unit;
      ctx.fillStyle = '#d65e42';
      ctx.beginPath();
      ctx.arc(x, y, unit * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#527648';
      ctx.beginPath();
      ctx.ellipse(x + unit * 0.12, y - unit * 0.36, unit * 0.14, unit * 0.07, -0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateUI() {
    score.textContent = String(game.score).padStart(3, '0');
    if (game.score > best) {
      best = game.score;
      try {
        localStorage.setItem('greedy-snake-best', String(best));
      } catch {
        /* 存储不可用时保留本次页面纪录。 */
      }
    }
    bestLabel.textContent = String(best).padStart(3, '0');
    speed.textContent = game.score === 0 ? '轻松起步' : `${(1000 / game.delay).toFixed(1)} 格 / 秒`;
    overlay.hidden = game.state === 'running';
    const labels = {
      ready: '准备就绪',
      running: '正在游戏',
      paused: '已暂停',
      over: '本局结束',
      won: '棋盘已吃满',
    };
    const announcement = labels[game.state] + (game.score ? `，得分 ${game.score}` : '');
    if (status.textContent !== announcement) status.textContent = announcement;
    toggle.textContent =
      game.state === 'running'
        ? '暂停游戏'
        : game.state === 'paused'
          ? '继续游戏'
          : game.state === 'ready'
            ? '开始游戏'
            : '再来一局';
    if (game.state === 'paused') {
      title.textContent = '歇一小会儿';
      message.textContent = '点击「继续游戏」或按空格，接着吃。';
    } else if (game.state === 'over' || game.state === 'won') {
      title.textContent = game.state === 'won' ? '你把棋盘吃满了！' : '下次，再长一点。';
      message.textContent = `本局 ${game.score} 分。点击「再来一局」或按 Enter 重新挑战。`;
    }
    canvas.setAttribute('aria-label', `贪吃蛇棋盘，${announcement}`);
    render();
  }

  function schedule() {
    clearTimeout(timer);
    if (game.state !== 'running') return;
    timer = setTimeout(() => {
      game.step();
      updateUI();
      schedule();
    }, game.delay);
  }

  function pause() {
    if (game.state !== 'running') return;
    game.state = 'paused';
    clearTimeout(timer);
    updateUI();
  }

  function start(restart = false) {
    if (restart || game.state === 'over' || game.state === 'won') game.reset();
    game.state = 'running';
    updateUI();
    schedule();
  }

  function toggleGame() {
    if (game.state === 'running') pause();
    else start();
  }

  function steer(name) {
    if (game.state === 'ready') start();
    game.turn(directions[name]);
  }

  toggle.addEventListener('click', toggleGame);
  document.getElementById('restart').addEventListener('click', () => start(true));
  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => steer(button.dataset.direction));
  });
  window.addEventListener('keydown', (event) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.matches('input, textarea, select, [contenteditable]')
    )
      return;
    if (keys[event.code]) {
      event.preventDefault();
      if (!event.repeat) steer(keys[event.code]);
    } else if (event.code === 'Space' && !event.target.closest('button')) {
      event.preventDefault();
      if (!event.repeat) toggleGame();
    } else if (
      event.code === 'Enter' &&
      !event.target.closest('button') &&
      ['ready', 'over', 'won'].includes(game.state)
    ) {
      event.preventDefault();
      if (!event.repeat) start();
    }
  });
  let pointer = null;
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const x = event.clientX - pointer.x,
      y = event.clientY - pointer.y;
    pointer = null;
    if (Math.max(Math.abs(x), Math.abs(y)) < 16) return;
    steer(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up');
  });
  canvas.addEventListener('pointercancel', () => {
    pointer = null;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  window.addEventListener('blur', pause);
  function resize() {
    const pixels = Math.round(
      canvas.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2),
    );
    canvas.width = Math.max(1, pixels);
    canvas.height = canvas.width;
    render();
  }
  new ResizeObserver(resize).observe(canvas);
  updateUI();
})();
