import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ffmpeg = require("@ffmpeg-installer/ffmpeg");

const videoWidth = 1280;
const videoHeight = 720;
const fps = 30;
const fontCandidates = [
  "C:/Windows/Fonts/msyh.ttc",
  "C:/Windows/Fonts/simhei.ttf",
  "C:/Windows/Fonts/simsun.ttc"
];

function runFfmpeg(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg.path, args, { cwd, windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `视频生成失败，退出码 ${code}`));
    });
  });
}

function inspectWithFfmpeg(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg.path, args, { cwd, windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", () => {
      resolve(`${stdout}\n${stderr}`);
    });
  });
}

export async function probeMediaDurationSeconds(filePath) {
  const output = await inspectWithFfmpeg(["-hide_banner", "-i", filePath], dirname(filePath));
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error("无法读取音频时长");
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export async function extractAudioFromVideoFile({ videoPath, outputPath }) {
  await runFfmpeg([
    "-y",
    "-i", videoPath,
    "-vn",
    "-acodec", "pcm_s16le",
    outputPath
  ], dirname(outputPath));
}

function ffmpegPathValue(value) {
  return String(value).replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
}

function selectedFontOption() {
  const fontPath = fontCandidates.find((item) => existsSync(item));
  return fontPath ? `:fontfile='${ffmpegPathValue(fontPath)}'` : "";
}

function safeDuration(value) {
  const number = Number(value || 3);
  return Number.isFinite(number) ? Math.max(1, number) : 3;
}

function shotColor(index) {
  return ["0x1f2937", "0x0f766e", "0x7c2d12", "0x1d4ed8", "0x6d28d9"][index % 5];
}

function textFileName(shotNo, field) {
  return `shot-${shotNo}-${field}.txt`;
}

function drawText({ fileName, y, size, color = "white", enable }) {
  const parts = [
    `drawtext=textfile='${fileName}'`,
    selectedFontOption(),
    `:fontcolor=${color}`,
    `:fontsize=${size}`,
    ":line_spacing=12",
    ":x=(w-text_w)/2",
    `:y=${y}`
  ];
  if (enable) {
    parts.push(`:enable='${enable}'`);
  }
  return parts.join("");
}

async function writeShotTextFiles(taskDir, storyboard) {
  await Promise.all(storyboard.flatMap((shot) => [
    writeFile(join(taskDir, textFileName(shot.shotNo, "scene")), `镜头 ${shot.shotNo}：${shot.scene || "未命名镜头"}`, "utf8"),
    writeFile(join(taskDir, textFileName(shot.shotNo, "visual")), shot.visual || "产品画面生成中", "utf8"),
    writeFile(join(taskDir, textFileName(shot.shotNo, "subtitle")), shot.subtitle || " ", "utf8")
  ]));
}

function buildVideoFilter(storyboard) {
  const fontOption = selectedFontOption();
  let current = "base";
  const filters = [
    `[0:v]drawbox=x=0:y=0:w=${videoWidth}:h=${videoHeight}:color=black@0.08:t=fill[base]`
  ];
  let start = 0;

  storyboard.forEach((shot, index) => {
    const end = start + safeDuration(shot.duration);
    const next = `shot${index}`;
    const enable = `between(t,${start.toFixed(2)},${end.toFixed(2)})`;
    const color = shotColor(index);
    const chain = [
      `drawbox=x=0:y=0:w=${videoWidth}:h=${videoHeight}:color=${color}@0.48:t=fill:enable='${enable}'`,
      `drawbox=x=96:y=92:w=1088:h=536:color=black@0.28:t=fill:enable='${enable}'`,
      drawText({ fileName: textFileName(shot.shotNo, "scene"), y: 138, size: 54, enable }),
      drawText({ fileName: textFileName(shot.shotNo, "visual"), y: 292, size: 36, color: "0xf8fafc", enable }),
      drawText({ fileName: textFileName(shot.shotNo, "subtitle"), y: 536, size: 30, color: "0xfef3c7", enable })
    ].join(",");
    filters.push(`[${current}]${chain}[${next}]`);
    current = next;
    start = end;
  });

  filters.push(`[${current}]copy[v]`);
  return filters.join(";");
}

function segmentFilter(shot) {
  return [
    `scale=${videoWidth}:${videoHeight}:force_original_aspect_ratio=decrease`,
    `pad=${videoWidth}:${videoHeight}:(ow-iw)/2:(oh-ih)/2`,
    `trim=duration=${safeDuration(shot.duration)}`,
    "setpts=PTS-STARTPTS",
    "setsar=1",
    "drawbox=x=0:y=500:w=1280:h=120:color=black@0.28:t=fill",
    drawText({ fileName: textFileName(shot.shotNo, "scene"), y: 64, size: 42 }),
    drawText({ fileName: textFileName(shot.shotNo, "subtitle"), y: 536, size: 30, color: "0xfef3c7" })
  ].join(",");
}

function concatFileText(fileNames) {
  return fileNames.map((fileName) => `file '${fileName.replace(/'/g, "'\\''")}'`).join("\n");
}

async function renderSegment({ outputDir, shot, clipPath, audioPath, segmentPath, index }) {
  const duration = safeDuration(shot.duration);
  const inputArgs = clipPath
    ? ["-stream_loop", "-1", "-i", clipPath]
    : ["-f", "lavfi", "-i", `color=c=${shotColor(index)}:s=${videoWidth}x${videoHeight}:d=${duration}:r=${fps}`];
  const audioInputArgs = audioPath ? ["-i", audioPath] : [];
  const filterComplex = audioPath
    ? `[0:v]${segmentFilter(shot)}[v];[1:a]apad,atrim=duration=${duration},asetpts=PTS-STARTPTS[a]`
    : `[0:v]${segmentFilter(shot)}[v]`;
  const audioOutputArgs = audioPath
    ? ["-map", "[a]", "-c:a", "aac"]
    : ["-an"];
  const args = [
    "-y",
    ...inputArgs,
    ...audioInputArgs,
    "-filter_complex", filterComplex,
    "-map", "[v]",
    ...audioOutputArgs,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    segmentPath
  ];
  await runFfmpeg(args, outputDir);
}

async function renderVideoFromSegments({ storyboard, audioPath, outputPath, shotClips, audioTracks = [] }) {
  const outputDir = dirname(outputPath);
  const clipByShot = new Map(shotClips.filter((clip) => clip.status === "completed").map((clip) => [Number(clip.shotNo), clip.clipPath]));
  const audioByShot = new Map(audioTracks.filter((track) => track.audioPath).map((track) => [Number(track.shotNo), track.audioPath]));
  const segmentNames = [];

  await writeShotTextFiles(outputDir, storyboard);
  for (const [index, shot] of storyboard.entries()) {
    const segmentName = `segment-${shot.shotNo}.mp4`;
    const segmentPath = join(outputDir, segmentName);
    await renderSegment({
      outputDir,
      shot,
      clipPath: clipByShot.get(Number(shot.shotNo)),
      audioPath: audioByShot.get(Number(shot.shotNo)),
      segmentPath,
      index
    });
    segmentNames.push(segmentName);
  }

  await writeFile(join(outputDir, "segments.txt"), concatFileText(segmentNames), "utf8");
  const allSegmentsHaveAudio = storyboard.every((shot) => audioByShot.has(Number(shot.shotNo)));
  if (allSegmentsHaveAudio) {
    await runFfmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", "segments.txt",
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath
    ], outputDir);
    return;
  }

  await runFfmpeg([
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", "segments.txt",
    "-i", audioPath,
    "-map", "0:v",
    "-map", "1:a",
    "-c:v", "copy",
    "-c:a", "aac",
    "-shortest",
    "-movflags", "+faststart",
    outputPath
  ], outputDir);
}

export async function renderVideoFile({ storyboard, audioPath, outputPath, shotClips = [], audioTracks = [] }) {
  const normalizedStoryboard = storyboard.map((shot, index) => ({
    ...shot,
    shotNo: Number(shot.shotNo || index + 1),
    duration: safeDuration(shot.duration)
  }));
  const totalDuration = normalizedStoryboard.reduce((sum, shot) => sum + safeDuration(shot.duration), 0);
  const outputDir = dirname(outputPath);

  await mkdir(outputDir, { recursive: true });
  if (shotClips.some((clip) => clip.status === "completed") || audioTracks.length) {
    await renderVideoFromSegments({ storyboard: normalizedStoryboard, audioPath, outputPath, shotClips, audioTracks });
    return;
  }

  await writeShotTextFiles(outputDir, normalizedStoryboard);

  const args = [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=0x111827:s=${videoWidth}x${videoHeight}:d=${totalDuration}:r=${fps}`,
    "-i", audioPath,
    "-filter_complex", buildVideoFilter(normalizedStoryboard),
    "-map", "[v]",
    "-map", "1:a",
    "-c:v", "libx264",
    "-c:a", "aac",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath
  ];

  await runFfmpeg(args, outputDir);
}
