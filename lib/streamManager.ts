import { ChildProcess, spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface Stream {
  id: string;
  name: string;
  inputUrl: string;
  outputUrl: string;
  status: 'streaming' | 'stopped' | 'error';
  pid?: number;
  startTime?: number;
  logs: string[];
}

const globalWithStreams = global as typeof globalThis & {
  activeStreams: Map<string, Stream>;
  processes: Map<string, ChildProcess>;
  ffmpegPath: string | null;
  logDir: string | null;
};

if (!globalWithStreams.activeStreams) {
  globalWithStreams.activeStreams = new Map();
}
if (!globalWithStreams.processes) {
  globalWithStreams.processes = new Map();
}

const activeStreams = globalWithStreams.activeStreams;
const processes = globalWithStreams.processes;

/** Lazily resolve log directory */
function getLogFilePath(): string {
  if (!globalWithStreams.logDir) {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    globalWithStreams.logDir = logDir;
  }
  return path.join(globalWithStreams.logDir, 'ffmpeg-stream.log');
}

/** ✅ FIXED: Reliable FFmpeg path for VPS */
function getFfmpegPath(): string {
  if (globalWithStreams.ffmpegPath) return globalWithStreams.ffmpegPath;

  // 1. Environment variable (best practice)
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    globalWithStreams.ffmpegPath = process.env.FFMPEG_PATH;
    console.log(`[StreamManager] Using FFmpeg from ENV: ${process.env.FFMPEG_PATH}`);
    return globalWithStreams.ffmpegPath;
  }

  // 2. Default Linux path
  const defaultPath = '/usr/bin/ffmpeg';
  if (fs.existsSync(defaultPath)) {
    globalWithStreams.ffmpegPath = defaultPath;
    console.log(`[StreamManager] Using FFmpeg at: ${defaultPath}`);
    return defaultPath;
  }

  // 3. Fallback to PATH
  try {
    const result = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
    if (result) {
      globalWithStreams.ffmpegPath = result;
      console.log(`[StreamManager] Found FFmpeg via PATH: ${result}`);
      return result;
    }
  } catch {
    // ignore
  }

  // 4. Final fallback (will likely fail if not installed)
  console.warn('[StreamManager] WARNING: FFmpeg not found!');
  return 'ffmpeg';
}

/** Kill a process */
function killProcess(proc: ChildProcess) {
  if (!proc.pid) return;
  try {
    proc.kill('SIGINT');
  } catch {
    try { proc.kill(); } catch {}
  }
}

/** Safe log writer */
function createSafeLogWriter(filePath: string) {
  const stream = fs.createWriteStream(filePath, { flags: 'a' });
  let ended = false;
  return {
    write(msg: string) {
      if (!ended) {
        try { stream.write(msg); } catch {}
      }
    },
    end() {
      if (!ended) {
        ended = true;
        try { stream.end(); } catch {}
      }
    },
  };
}

export const streamManager = {
  getStreams: () => Array.from(activeStreams.values()),

  startStream: (name: string, inputUrl: string) => {
    const id = Math.random().toString(36).substring(7);
    const ffmpeg = getFfmpegPath();
    const logFilePath = getLogFilePath();

    const destinationUrl = `rtmp://74.208.198.159/live/${name.replace(/\s+/g, '_')}`;

    const args = [
      '-re',
      '-i', inputUrl,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-f', 'flv',
      destinationUrl
    ];

    console.log(`Starting ffmpeg for [${name}] → ${destinationUrl}`);

    const log = createSafeLogWriter(logFilePath);
    log.write(`\n--- Starting Stream: ${name} [${new Date().toISOString()}] ---\n`);
    log.write(`Command: ${ffmpeg} ${args.join(' ')}\n`);

    let ffmpegProcess: ChildProcess;

    try {
      ffmpegProcess = spawn(ffmpeg, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.write(`\n--- Spawn Error: ${errMsg} ---\n`);
      log.end();

      return {
        id,
        name,
        inputUrl,
        outputUrl: destinationUrl,function getFfmpegPath(): string {
  if (globalWithStreams.ffmpegPath) return globalWithStreams.ffmpegPath;

  // Allow explicit override via env var (recommended for production)
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    globalWithStreams.ffmpegPath = process.env.FFMPEG_PATH;
    console.log(`[StreamManager] Using FFMPEG_PATH env: ${process.env.FFMPEG_PATH}`);
    return process.env.FFMPEG_PATH;
  }

  const isWin = process.platform === 'win32';

  const commonPaths = isWin
    ? [
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.1-full_build', 'bin', 'ffmpeg.exe'),
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
        path.join(process.env.USERPROFILE || '', 'scoop', 'shims', 'ffmpeg.exe'),
      ]
    : [
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
        '/opt/homebrew/bin/ffmpeg',
        '/snap/bin/ffmpeg',
      ];

  for (const p of commonPaths) {
    if (p && fs.existsSync(p)) {
      globalWithStreams.ffmpegPath = p;
      console.log(`[StreamManager] Found ffmpeg at: ${p}`);
      return p;
    }
  }

  // Windows-only: scan WinGet packages directory
  if (isWin) {
    try {
      const wingetPkgs = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetPkgs)) {
        const entries = fs.readdirSync(wingetPkgs);
        for (const entry of entries) {
          if (entry.toLowerCase().includes('ffmpeg')) {
            const pkgDir = path.join(wingetPkgs, entry);
            const bins = findFileRecursive(pkgDir, 'ffmpeg.exe', 3);
            if (bins) {
              globalWithStreams.ffmpegPath = bins;
              console.log(`[StreamManager] Found ffmpeg at: ${bins}`);
              return bins;
            }
          }
        }
      }
    } catch {
      // ignore scan errors
    }
  }

  // Try PATH lookup
  try {
    const cmd = isWin ? 'where ffmpeg' : 'which ffmpeg';
    const result = execSync(cmd, { encoding: 'utf-8' }).trim();
    if (result) {
      globalWithStreams.ffmpegPath = result.split(/\r?\n/)[0].trim();
      console.log(`[StreamManager] Found ffmpeg on PATH: ${globalWithStreams.ffmpegPath}`);
      return globalWithStreams.ffmpegPath;
    }
  } catch {
    // not on PATH
  }

  globalWithStreams.ffmpegPath = 'ffmpeg';
  console.warn('[StreamManager] WARNING: Could not locate ffmpeg binary!');
  return 'ffmpeg';
}