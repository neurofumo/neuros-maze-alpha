// pages/api/[moves].webp.tsx
import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

const MAZE_TOP_LEFT = { x: 13, y: 118 };
const MAZE_BOTTOM_RIGHT = { x: 1271, y: 708 };
const CELL_WIDTH = 32;
const CELL_HEIGHT = 32;
const MAZE_WIDTH = Math.floor((MAZE_BOTTOM_RIGHT.x - MAZE_TOP_LEFT.x) / CELL_WIDTH);
const MAZE_HEIGHT = Math.floor((MAZE_BOTTOM_RIGHT.y - MAZE_TOP_LEFT.y) / CELL_HEIGHT);
const TEXT_BOX = { x1: 426, y1: 61, x2: 624, y2: 91 };

const todaySeed = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};

const parseMoves = (path: string): string[] => {
  const match = path.match(/\/([a-z]*)i\.webp/);
  if (!match || !match[1]) return [];
  return match[1].split('').reverse();
};

const generateMaze = (seed: string): number[][] => {
  const rand = mulberry32(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const maze = Array.from({ length: MAZE_HEIGHT }, () =>
    Array(MAZE_WIDTH).fill(0)
  );

  for (let y = 1; y < MAZE_HEIGHT; y += 2) {
    for (let x = 1; x < MAZE_WIDTH; x += 2) {
      maze[y][x] = 1;
      const dirs = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ].sort(() => rand() - 0.5);
      for (const [dx, dy] of dirs) {
        const nx = x + dx * 2;
        const ny = y + dy * 2;
        if (nx >= 1 && ny >= 1 && nx < MAZE_WIDTH - 1 && ny < MAZE_HEIGHT - 1 && maze[ny][nx] === 0) {
          maze[y + dy][x + dx] = 1;
          break;
        }
      }
    }
  }
  return maze;
};

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getPlayerPosition(moves: string[], maze: number[][]): { x: number, y: number, reachedGoal: boolean } {
  let x = Math.floor(MAZE_WIDTH / 2);
  let y = MAZE_HEIGHT - 2;

  for (const move of moves) {
    const [dx, dy] =
      move === 'w' ? [0, -1] :
      move === 'a' ? [-1, 0] :
      move === 's' ? [0, 1] :
      move === 'd' ? [1, 0] : [0, 0];

    const nx = x + dx;
    const ny = y + dy;

    if (maze[ny] && maze[ny][nx] === 1) {
      x = nx;
      y = ny;
    }
  }

  const reachedGoal = y === 1 && x === Math.floor(MAZE_WIDTH / 2);
  return { x, y, reachedGoal };
}

export default async function handler(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const raw = pathname.split('/').pop() || '';
  const moves = parseMoves('/' + raw);
  const seed = todaySeed();

  if (raw === 'i.webp') {
    return imageWithBackground('/bg-menu.png');
  } else if (!raw.endsWith('i.webp') || raw.length < 5) {
    return imageWithBackground('/bg-404.png');
  }

  const maze = generateMaze(seed);
  const { x, y, reachedGoal } = getPlayerPosition(moves, maze);

  if (reachedGoal) {
  return imageWithWinText(formatMazeNumber(todaySeed()), moves.length.toString());
}


  return new ImageResponse(
    (
      <div
        style={{
          width: '1280px',
          height: '720px',
          display: 'flex',
          position: 'relative',
          backgroundImage: `url(https://nur-amber.vercel.app/bg-game.png)`,
          backgroundSize: 'cover',
        }}
      >
        {/* Draw Maze */}
        <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', }}>
          {maze.map((row, j) =>
            row.map((cell, i) =>
              cell === 1 ? (
                <div
                  key={`${i}-${j}`}
                  style={{
                    position: 'absolute',
                    width: CELL_WIDTH,
                    display: 'flex',
                    height: CELL_HEIGHT,
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                    left: MAZE_TOP_LEFT.x + i * CELL_WIDTH,
                    top: MAZE_TOP_LEFT.y + j * CELL_HEIGHT,
                  }}
                />
              ) : null
            )
          )}
        </div>

        {/* Player */}
        <div
          style={{
            position: 'absolute',
            width: CELL_WIDTH,
            height: CELL_HEIGHT,
            backgroundColor: 'red',
            display: 'flex',
            left: MAZE_TOP_LEFT.x + x * CELL_WIDTH,
            top: MAZE_TOP_LEFT.y + y * CELL_HEIGHT,
          }}
        />

        {/* Goal */}
        <div
          style={{
            position: 'absolute',
            width: CELL_WIDTH,
            height: CELL_HEIGHT,
            backgroundColor: 'green',
            display: 'flex',
            left: MAZE_TOP_LEFT.x + Math.floor(MAZE_WIDTH / 2) * CELL_WIDTH,
            top: MAZE_TOP_LEFT.y + CELL_HEIGHT,
          }}
        />

        {/* Move Counter */}
        <div
          style={{
            position: 'absolute',
            left: TEXT_BOX.x1,
            top: TEXT_BOX.y1,
            width: TEXT_BOX.x2 - TEXT_BOX.x1,
            height: TEXT_BOX.y2 - TEXT_BOX.y1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 28,
            fontFamily: 'monospace',
          }}
        >
          {moves.length}
        </div>
        {/* Maze Number (Days since 04-08-2025) */}
      <div
        style={{
          position: 'absolute',
          left: 165,
          top: 7,
          color: 'black',
          fontSize: 24,
          fontFamily: 'monospace',
        }}
      >
        {formatMazeNumber(todaySeed())}
      </div>

      {/* GMT+8 Time Display */}
      <div
        style={{
          position: 'absolute',
          left: 963,
          top: 54,
          color: 'black',
          fontSize: 20,
          fontFamily: 'monospace',
        }}
      >
        {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Manila', hour12: false })}
      </div>
      </div>
    ),
    {
      width: 1280,
      height: 720,
    }
  );
}
function imageWithWinText(mazeText: string, inputText: string) {
  const maze = autoSizedText(mazeText, 659 - 560, 32);
  const input = autoSizedText(inputText, 866 - 743, 32);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1280px',
          height: '720px',
          backgroundImage: `url(https://nur-amber.vercel.app/bg-win.png)`,
          backgroundSize: 'cover',
          position: 'relative',
          display: 'flex',
        }}
      >
        {/* Maze Number */}
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 565,
            fontSize: maze.fontSize,
            fontFamily: 'monospace',
            color: 'white',
            textShadow: `
              -1px -1px 0 black,
              1px -1px 0 black,
              -1px 1px 0 black,
              1px 1px 0 black
            `,
          }}
        >
          {mazeText}
        </div>

        {/* Input Text */}
        <div
          style={{
            position: 'absolute',
            left: 743,
            top: 565,
            fontSize: input.fontSize,
            fontFamily: 'monospace',
            color: 'white',
            textShadow: `
              -1px -1px 0 black,
              1px -1px 0 black,
              -1px 1px 0 black,
              1px 1px 0 black
            `,
          }}
        >
          {inputText}
        </div>
      </div>
    ),
    {
      width: 1280,
      height: 720,
    }
  );
}

function imageWithBackground(image: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1280px',
          height: '720px',
          backgroundImage: `url(https://nur-amber.vercel.app/${image})`,
          backgroundSize: 'cover',
          display: 'flex',
        }}
      />
    ),
    {
      width: 1280,
      height: 720,
    }
  );
}
function formatMazeNumber(currentSeed: string): string {
  const start = new Date('2025-08-04T00:00:00+08:00');
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return String(diff + 1).padStart(3, '0');
}

function autoSizedText(text: string, maxWidth: number, fontSize: number, fontFamily = 'monospace') {
  const avgCharWidth = fontSize * 0.6; // approx for monospace
  const estimatedWidth = text.length * avgCharWidth;

  if (estimatedWidth <= maxWidth) {
    return { fontSize, width: estimatedWidth };
  }

  const scale = maxWidth / estimatedWidth;
  const newFontSize = Math.floor(fontSize * scale);
  return { fontSize: newFontSize, width: maxWidth };
}


function getBaseUrl(req?: NextRequest) {
  if (typeof window !== 'undefined') return '.';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (req) {
    const host = req.headers.get('host');
    return `http://${host}`;
  }
  return '';
}
