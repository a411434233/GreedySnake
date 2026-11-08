class SnakeGame {
  constructor(size = 24, random = Math.random) {
    this.size = size;
    this.random = random;
    this.reset();
  }

  reset() {
    const middle = Math.floor(this.size / 2);
    this.snake = [0, 1, 2].map((offset) => ({ x: middle - offset, y: middle }));
    this.direction = { x: 1, y: 0 };
    this.queue = [];
    this.score = 0;
    this.state = 'ready';
    this.food = this.createFood();
  }

  get delay() {
    return Math.max(75, 170 - (this.score / 10) * 4);
  }

  createFood() {
    const occupied = new Set(this.snake.map((part) => part.y * this.size + part.x));
    const free = [];
    for (let cell = 0; cell < this.size * this.size; cell++) {
      if (!occupied.has(cell)) free.push(cell);
    }
    if (!free.length) return null;
    const cell = free[Math.floor(this.random() * free.length)];
    return { x: cell % this.size, y: Math.floor(cell / this.size) };
  }

  turn(direction) {
    if (!direction || this.queue.length >= 2 || this.state !== 'running') return;
    const previous = this.queue[this.queue.length - 1] || this.direction;
    if (direction.x === previous.x && direction.y === previous.y) return;
    if (direction.x === -previous.x && direction.y === -previous.y) return;
    this.queue.push(direction);
  }

  step() {
    if (this.state !== 'running') return;
    this.direction = this.queue.shift() || this.direction;
    const head = { x: this.snake[0].x + this.direction.x, y: this.snake[0].y + this.direction.y };
    const eating = this.food && head.x === this.food.x && head.y === this.food.y;
    // 不增长时尾巴会同时移走，允许蛇头进入原来的尾格。
    const body = eating ? this.snake : this.snake.slice(0, -1);
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= this.size ||
      head.y >= this.size ||
      body.some((part) => part.x === head.x && part.y === head.y)
    ) {
      this.state = 'over';
      return;
    }
    this.snake.unshift(head);
    if (eating) {
      this.score += 10;
      this.food = this.createFood();
      if (!this.food) this.state = 'won';
    } else {
      this.snake.pop();
    }
  }
}

// 让浏览器和 Node.js 测试复用同一份游戏逻辑。
if (typeof module !== 'undefined' && module.exports) module.exports = SnakeGame;
