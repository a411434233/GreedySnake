const { test } = require('node:test');
const assert = require('node:assert/strict');
const SnakeGame = require('../assets/game.js');
const right = { x: 1, y: 0 },
  left = { x: -1, y: 0 };
const up = { x: 0, y: -1 },
  down = { x: 0, y: 1 };

function running(size = 24, random = () => 0) {
  const game = new SnakeGame(size, random);
  game.state = 'running';
  return game;
}

test('food remains in bounds and outside the snake, including random extremes', () => {
  for (const random of [() => 0, () => 0.999999999, Math.random]) {
    const game = running(24, random);
    for (let i = 0; i < 100; i++) {
      const food = game.createFood();
      assert.ok(food.x >= 0 && food.x < 24 && food.y >= 0 && food.y < 24);
      assert.ok(!game.snake.some((part) => part.x === food.x && part.y === food.y));
    }
  }
});

test('ready and paused games do not move', () => {
  const game = new SnakeGame();
  const before = structuredClone(game.snake);
  game.step();
  assert.deepEqual(game.snake, before);
  game.state = 'paused';
  game.step();
  assert.deepEqual(game.snake, before);
});

test('a normal step preserves length and follows the previous head position', () => {
  const game = running();
  game.step();
  assert.equal(game.snake.length, 3);
  assert.deepEqual(game.snake[0], { x: 13, y: 12 });
  assert.deepEqual(game.snake[1], { x: 12, y: 12 });
  assert.equal(game.score, 0);
});

test('eating grows exactly one cell, updates score and accelerates', () => {
  const game = running();
  game.food = { x: 13, y: 12 };
  game.step();
  assert.equal(game.snake.length, 4);
  assert.equal(game.score, 10);
  assert.equal(game.delay, 166);
  assert.ok(!game.snake.some((part) => part.x === game.food.x && part.y === game.food.y));
});

test('all four walls stop the snake before it leaves the board', () => {
  for (const direction of [right, left, up, down]) {
    const game = running();
    const head = { x: direction.x < 0 ? 0 : 23, y: direction.y < 0 ? 0 : 23 };
    game.snake = [head];
    game.direction = direction;
    game.step();
    assert.equal(game.state, 'over');
    assert.deepEqual(game.snake[0], head);
  }
});

test('self collision ends the game', () => {
  const game = running();
  game.snake = [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
  ];
  game.step();
  assert.equal(game.state, 'over');
});

test('moving into the departing tail cell is allowed', () => {
  const game = running();
  game.snake = [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 3, y: 2 },
  ];
  game.step();
  assert.equal(game.state, 'running');
  assert.equal(game.snake.length, 4);
  assert.deepEqual(game.snake[0], { x: 3, y: 2 });
});

test('reverse and repeated directions are ignored; quick turns run on separate ticks', () => {
  const game = running();
  game.turn(undefined);
  game.turn(left);
  game.turn(right);
  assert.equal(game.queue.length, 0);
  game.turn(up);
  game.turn(left);
  game.turn(down);
  assert.equal(game.queue.length, 2);
  game.step();
  assert.deepEqual(game.snake[0], { x: 12, y: 11 });
  game.step();
  assert.deepEqual(game.snake[0], { x: 11, y: 11 });
  assert.equal(game.state, 'running');
});

test('filling the last cell wins without looping while generating food', () => {
  const game = running(4);
  game.snake = [
    { x: 2, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
  ];
  game.food = { x: 3, y: 0 };
  game.step();
  assert.equal(game.state, 'won');
  assert.equal(game.snake.length, 16);
  assert.equal(game.food, null);
});

test('reset clears score, buffered inputs and game-over state', () => {
  const game = running();
  game.score = 90;
  game.turn(up);
  game.state = 'over';
  game.reset();
  assert.equal(game.state, 'ready');
  assert.equal(game.score, 0);
  assert.equal(game.snake.length, 3);
  assert.equal(game.queue.length, 0);
  assert.equal(game.delay, 170);
  game.score = 9999;
  assert.equal(game.delay, 75);
});
