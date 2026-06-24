import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS = join(import.meta.dirname, '..', 'screenshots');
const TMP = join(SCREENSHOTS, '_gif_tmp');

// Portrait sequence: splash (2s), menu (2s), each game (1.2s)
const portrait = [
  { file: '01-splash.png', dur: 2 },
  { file: '02-menu.png', dur: 2 },
  ...['flashcard','quiz','sentences','blanks','listening',
     'match','memory','finder','constructor','writing',
     'truefalse','reverse','speech','decoder','gravity','chat'
  ].map(g => ({ file: `03-${g}.png`, dur: 1.2 }))
];

const landscape = portrait.map(p => ({
  file: p.file.replace('.png', '-landscape.png'),
  dur: p.dur
}));

function makeGif(frames, outName, vw) {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true });
  mkdirSync(TMP, { recursive: true });

  // Build concat file: each file appears N times (dur * 10 at 10fps)
  const fps = 10;
  const lines = [];
  frames.forEach((f, idx) => {
    const src = join(SCREENSHOTS, f.file);
    if (!existsSync(src)) {
      console.warn(`  WARN: missing ${f.file}, skipping`);
      return;
    }
    const numRepeats = Math.round(f.dur * fps);
    for (let r = 0; r < numRepeats; r++) {
      const outName = `f${String(idx).padStart(3, '0')}_${String(r).padStart(4, '0')}.png`;
      copyFileSync(src, join(TMP, outName));
      lines.push(`file '${outName}'`);
    }
  });

  // Write concat file
  const concatFile = join(TMP, 'list.txt');
  writeFileSync(concatFile, lines.join('\n'));

  const outPath = join(SCREENSHOTS, outName);

  // Use ffmpeg with concat demuxer
  const cmd = `ffmpeg -y -r ${fps} -f concat -safe 0 -i "${concatFile}" -vf "scale=${vw}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 "${outPath}"`;
  
  console.log(`Creating ${outName}...`);
  execSync(cmd, { stdio: 'pipe' });
  console.log(`  Done: ${outPath}`);

  rmSync(TMP, { recursive: true });
}

console.log('=== Portrait GIF ===');
makeGif(portrait, 'demo-portrait.gif', 375);

console.log('\n=== Landscape GIF ===');
makeGif(landscape, 'demo-landscape.gif', 667);
