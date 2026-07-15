import { db, nextId } from "../db/index.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSpeechFile } from "../services/tts-service.js";
import { extractAudioFromVideoFile, probeMediaDurationSeconds, renderVideoFile } from "../services/video-renderer.js";
import { generateAiShotClips } from "../services/ai-video-service.js";
import { generateVideoPlanWithTextModel } from "../services/text-generation-service.js";
import { savePersistentStore } from "../db/json-store.js";
import { getTextProviderConfig, getVideoProviderConfig, getVoiceProviderConfig } from "./settings.js";

const generatedDir = fileURLToPath(new URL("../../public/generated", import.meta.url));

// AI 视频模块：对应原型的 AI 视频生成页，生成的是可编辑任务草稿。
export function listGeneratedVideos() {
  return db.generatedVideos;
}

export function listVideoRenderJobs() {
  return db.videoRenderJobs || [];
}

export function findVideoRenderJob(id) {
  return listVideoRenderJobs().find((item) => item.id === id) || null;
}

function parseDurationSeconds(value) {
  const text = String(value || "");
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

function splitProductPoints(topic) {
  const text = String(topic || "").trim();
  const normalized = text || "专业防护手套采用优质材料制作，具有防滑、耐磨、透气等特点，适用于各种工作场景。";
  const points = normalized
    .split(/[，。,、；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return points.length ? points : [normalized];
}

function normalizeSelectedScenarios(input = []) {
  return input.map((scenario) => ({
    title: String(scenario.title || "").trim(),
    visualPrompt: String(scenario.visualPrompt || "").trim(),
    sellingAngle: String(scenario.sellingAngle || "").trim(),
    materialSuggestion: String(scenario.materialSuggestion || "").trim()
  })).filter((scenario) => scenario.title);
}

function scenarioTitleText(scenarios) {
  return scenarios.map((scenario) => scenario.title).slice(0, 3).join("、");
}

function buildScript(topic, style, duration, scenarios = []) {
  const points = splitProductPoints(topic);
  const mainPoint = points[0];
  const secondPoint = points[1] || "防滑、耐磨、透气";
  const scenePoint = scenarioTitleText(scenarios) || points[2] || "工厂、户外、骑行和日常防护";

  return {
    hook: `还在为${mainPoint}的选择和使用效果发愁吗？这款产品可以重点看看。`,
    sellingPoint: `它的核心优势是${secondPoint}，能覆盖高频使用场景。`,
    scene: `无论是${scenePoint}，都能让双手保持稳定保护。`,
    callToAction: "想了解尺码、价格和批量采购方案，直接私信领取推荐清单。",
    style,
    duration
  };
}

function buildStoryboard(script, durationSeconds, scenarios = []) {
  const segment = Math.max(3, Math.floor(durationSeconds / 4));
  const primaryScenario = scenarios[0];
  const secondaryScenario = scenarios[1] || scenarios[0];
  return [
    {
      shotNo: 1,
      duration: segment,
      scene: "开场痛点",
      visual: "近景展示普通手套磨损、打滑的对比画面",
      subtitle: script.hook,
      materialHint: "可使用产品细节图或旧手套对比图"
    },
    {
      shotNo: 2,
      duration: segment,
      scene: "核心卖点",
      visual: "手套掌面、防滑纹理、缝线和材质细节轮播",
      subtitle: script.sellingPoint,
      materialHint: "建议上传产品白底图、细节图"
    },
    {
      shotNo: 3,
      duration: segment,
      scene: primaryScenario?.title || "使用场景",
      visual: primaryScenario?.visualPrompt || "工厂作业、户外搬运、骑行或健身场景切换",
      subtitle: script.scene,
      materialHint: primaryScenario?.materialSuggestion || "可使用门店实拍、用户使用视频或场景图"
    },
    {
      shotNo: 4,
      duration: Math.max(3, durationSeconds - segment * 3),
      scene: secondaryScenario ? `${secondaryScenario.title}转化` : "行动引导",
      visual: secondaryScenario?.visualPrompt || "产品组合陈列，叠加价格、活动和私信提示",
      subtitle: script.callToAction,
      materialHint: secondaryScenario?.materialSuggestion || "建议准备产品合集图、促销图、二维码占位"
    }
  ];
}

export async function createVideoDraft(payload) {
  const topic = String(payload.topic || "").trim();
  const style = String(payload.style || "口播").trim();
  const durationText = String(payload.duration || "30秒").trim();
  if (!topic) {
    throw new Error("视频主题不能为空");
  }

  const durationSeconds = parseDurationSeconds(durationText);
  const selectedScenarios = normalizeSelectedScenarios(payload.scenarios || []);
  const fallbackScript = buildScript(topic, style, durationText, selectedScenarios);
  const fallbackStoryboard = buildStoryboard(fallbackScript, durationSeconds, selectedScenarios);
  const plan = await generateVideoPlanWithTextModel({
    providerConfig: getTextProviderConfig(),
    topic,
    style,
    duration: durationText,
    scenarios: selectedScenarios,
    fallback: { script: fallbackScript, storyboard: fallbackStoryboard }
  });
  const item = {
    id: nextId("gen", db.generatedVideos),
    topic,
    style,
    duration: durationText,
    status: "draft",
    script: plan.script,
    storyboard: plan.storyboard,
    scenarios: selectedScenarios,
    planSource: plan.source,
    nextSteps: ["补充产品图片/视频素材", "确认字幕和时长", "进入配音与视频合成"],
    renderTask: null,
    createdAt: new Date().toISOString()
  };
  db.generatedVideos.unshift(item);
  return item;
}

function normalizeScript(input = {}) {
  return {
    hook: String(input.hook || "").trim(),
    sellingPoint: String(input.sellingPoint || "").trim(),
    scene: String(input.scene || "").trim(),
    callToAction: String(input.callToAction || "").trim(),
    style: String(input.style || "").trim(),
    duration: String(input.duration || "").trim()
  };
}

function normalizeStoryboard(input = []) {
  return input.map((shot, index) => ({
    shotNo: Number(shot.shotNo || index + 1),
    duration: Math.max(1, Number(shot.duration || 3)),
    scene: String(shot.scene || "").trim(),
    visual: String(shot.visual || "").trim(),
    subtitle: String(shot.subtitle || "").trim(),
    materialHint: String(shot.materialHint || "").trim()
  }));
}

function buildVoiceText(script, storyboard) {
  const storyboardText = storyboard.map((shot) => shot.subtitle).filter(Boolean).join("\n");
  if (storyboardText) return storyboardText;
  return [script.hook, script.sellingPoint, script.scene, script.callToAction].filter(Boolean).join("\n");
}

function fallbackScriptLine(script, index) {
  return [script.hook, script.sellingPoint, script.scene, script.callToAction][index] || "";
}

function shotVoiceText(shot, script, index) {
  return String(shot.subtitle || fallbackScriptLine(script, index) || shot.scene || "").trim();
}

function estimateVoiceSeconds(text) {
  const value = String(text || "").trim();
  if (!value) return 2;
  const chineseCount = (value.match(/[\u4e00-\u9fff]/g) || []).length;
  const wordCount = value.replace(/[\u4e00-\u9fff]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(chineseCount / 4.5 + wordCount / 2.4 + 0.8));
}

function alignStoryboardWithVoice(script, storyboard) {
  return storyboard.map((shot, index) => {
    const voice = shotVoiceText(shot, script, index);
    return {
      ...shot,
      duration: Math.max(Number(shot.duration || 1), estimateVoiceSeconds(voice))
    };
  });
}

async function generateShotVoiceFiles({ script, storyboard, outputDir, outputName, voiceName, providerConfig }) {
  const tracks = [];
  for (const [index, shot] of storyboard.entries()) {
    const text = shotVoiceText(shot, script, index);
    if (!text) continue;
    const fileName = `voice-shot-${shot.shotNo}.wav`;
    const outputPath = join(outputDir, fileName);
    await generateSpeechFile({ text, outputPath, voiceName, providerConfig });
    const durationSeconds = await probeMediaDurationSeconds(outputPath);
    tracks.push({
      shotNo: shot.shotNo,
      text,
      audioPath: outputPath,
      audioUrl: `/generated/${outputName}/${fileName}`,
      durationSeconds
    });
  }
  return tracks;
}

function alignStoryboardWithAudioTracks(storyboard, audioTracks) {
  const audioByShot = new Map(audioTracks.map((track) => [Number(track.shotNo), track]));
  return storyboard.map((shot) => {
    const track = audioByShot.get(Number(shot.shotNo));
    if (!track?.durationSeconds) {
      return shot;
    }
    return {
      ...shot,
      duration: Math.max(1, Number((track.durationSeconds + 0.25).toFixed(2)))
    };
  });
}

function safeTaskDirectoryName(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function renderVideoWithVoice(payload) {
  const id = String(payload.id || "").trim();
  const draft = db.generatedVideos.find((item) => item.id === id);
  if (!draft) {
    throw new Error("视频草稿不存在");
  }

  const script = normalizeScript(payload.script || draft.script);
  const storyboardBase = alignStoryboardWithVoice(script, normalizeStoryboard(payload.storyboard || draft.storyboard));
  if (!storyboardBase.length) {
    throw new Error("分镜不能为空");
  }

  const voiceText = buildVoiceText(script, storyboardBase);
  if (!voiceText) {
    throw new Error("请至少保留一段字幕或脚本文案用于生成声音");
  }
  const taskId = nextId("render", db.generatedVideos);
  const outputName = safeTaskDirectoryName(`${id}_${taskId}`);
  const outputDir = join(generatedDir, outputName);
  const audioPath = join(outputDir, "voice.wav");
  const syncedAudioPath = join(outputDir, "voice-synced.wav");
  const videoPath = join(outputDir, "video.mp4");
  const audioUrl = `/generated/${outputName}/voice-synced.wav`;
  const videoUrl = `/generated/${outputName}/video.mp4`;
  const aiVideoEnabled = Boolean(payload.useAiVideoClips);
  const voiceProviderConfig = getVoiceProviderConfig();

  draft.script = script;
  draft.storyboard = storyboardBase;
  draft.status = "rendering";

  await generateSpeechFile({ text: voiceText, outputPath: audioPath, voiceName: payload.voiceName, providerConfig: voiceProviderConfig });
  const shotAudioTracks = await generateShotVoiceFiles({
    script,
    storyboard: storyboardBase,
    outputDir,
    outputName,
    voiceName: payload.voiceName,
    providerConfig: voiceProviderConfig
  });
  const storyboard = alignStoryboardWithAudioTracks(storyboardBase, shotAudioTracks);
  draft.storyboard = storyboard;
  const aiVideo = await generateAiShotClips({
    enabled: aiVideoEnabled,
    storyboard,
    script,
    topic: draft.topic,
    outputDir: join(outputDir, "ai-clips"),
    publicBaseUrl: `/generated/${outputName}/ai-clips`,
    providerConfig: getVideoProviderConfig()
  });
  await renderVideoFile({ storyboard, audioPath, outputPath: videoPath, shotClips: aiVideo.clips, audioTracks: shotAudioTracks });
  await extractAudioFromVideoFile({ videoPath, outputPath: syncedAudioPath });

  const task = {
    id: taskId,
    status: "completed",
    videoStatus: "mp4_ready",
    voiceStatus: "wav_ready",
    voiceName: String(payload.voiceName || "标准女声").trim(),
    voiceText,
    steps: [
      { name: "生成逐镜头 WAV 声音文件", status: "completed" },
      { name: "生成 AI 镜头视频", status: aiVideo.status },
      { name: "生成 MP4 视频文件", status: "completed" }
    ],
    aiVideo,
    voiceProvider: {
      provider: voiceProviderConfig.provider,
      providerName: voiceProviderConfig.providerName,
      model: voiceProviderConfig.model,
      voice: voiceProviderConfig.voice
    },
    audioTracks: shotAudioTracks.map((track) => ({
      shotNo: track.shotNo,
      audioUrl: track.audioUrl,
      text: track.text,
      durationSeconds: track.durationSeconds
    })),
    audioUrl,
    videoUrl,
    previewUrl: videoUrl,
    costText: aiVideo.requested && aiVideo.status === "completed" ? "本地合成 ¥0；AI 镜头按供应商账单统计" : "本地合成 ¥0",
    message: aiVideo.requested && aiVideo.status === "completed" ? "已按真实配音时长同步生成 AI 镜头片段、字幕、逐镜头配音和本地 MP4 视频。" : "已按真实配音时长同步生成字幕、逐镜头配音和本地 MP4 视频；AI 镜头视频未启用或未配置。",
    createdAt: new Date().toISOString()
  };

  draft.renderTask = task;
  draft.status = "rendered";
  return draft;
}

function publicRenderPayload(payload = {}) {
  return {
    id: String(payload.id || "").trim(),
    script: payload.script,
    storyboard: payload.storyboard,
    voiceName: payload.voiceName,
    useAiVideoClips: Boolean(payload.useAiVideoClips)
  };
}

async function runVideoRenderJob(job) {
  job.status = "running";
  job.startedAt = new Date().toISOString();
  job.steps.push({ name: "异步任务开始", status: "completed", at: job.startedAt });
  try {
    const draft = await renderVideoWithVoice(job.payload);
    job.status = "completed";
    job.finishedAt = new Date().toISOString();
    job.result = draft.renderTask;
    job.steps.push({ name: "视频生成完成", status: "completed", at: job.finishedAt });
  } catch (error) {
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.error = error instanceof Error ? error.message : "异步视频生成失败";
    job.steps.push({ name: "视频生成失败", status: "failed", message: job.error, at: job.finishedAt });
    const draft = db.generatedVideos.find((item) => item.id === job.payload.id);
    if (draft) {
      draft.status = "draft";
    }
  } finally {
    try {
      savePersistentStore();
    } catch {
      // 后台任务不能因为快照保存失败而中断进程。
    }
  }
}

export function createVideoRenderJob(payload) {
  const normalized = publicRenderPayload(payload);
  if (!normalized.id) {
    throw new Error("视频草稿 ID 不能为空");
  }
  const draft = db.generatedVideos.find((item) => item.id === normalized.id);
  if (!draft) {
    throw new Error("视频草稿不存在");
  }
  db.videoRenderJobs ||= [];
  const job = {
    id: nextId("video_job", db.videoRenderJobs),
    draftId: normalized.id,
    status: "queued",
    payload: normalized,
    result: null,
    error: "",
    steps: [{ name: "任务进入队列", status: "completed", at: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    startedAt: "",
    finishedAt: ""
  };
  db.videoRenderJobs.unshift(job);
  draft.status = "queued_render";
  setTimeout(() => {
    runVideoRenderJob(job);
  }, 0);
  return job;
}

