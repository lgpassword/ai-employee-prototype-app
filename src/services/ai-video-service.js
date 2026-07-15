import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const defaultOpenaiBaseUrl = "https://api.openai.com/v1";
const defaultAliyunBaseUrl = "https://dashscope.aliyuncs.com/api/v1";
const pollMs = Number(process.env.AI_VIDEO_POLL_MS || process.env.OPENAI_VIDEO_POLL_MS || process.env.ALIYUN_VIDEO_POLL_MS || 5000);
const maxWaitMs = Number(process.env.AI_VIDEO_MAX_WAIT_MS || process.env.OPENAI_VIDEO_MAX_WAIT_MS || process.env.ALIYUN_VIDEO_MAX_WAIT_MS || 600000);

function apiKey(providerConfig = {}) {
  return providerConfig.apiKey || process.env.OPENAI_API_KEY || "";
}

function apiBaseUrl(providerConfig = {}) {
  return String(providerConfig.endpoint || process.env.OPENAI_BASE_URL || defaultOpenaiBaseUrl).replace(/\/$/, "");
}

function modelName(providerConfig = {}) {
  return providerConfig.model || process.env.OPENAI_VIDEO_MODEL || "sora-2";
}

function aliyunApiKey(providerConfig = {}) {
  return providerConfig.apiKey || process.env.ALIYUN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
}

function aliyunBaseUrl(providerConfig = {}) {
  const configuredEndpoint = providerConfig.endpoint || process.env.ALIYUN_VIDEO_ENDPOINT || process.env.DASHSCOPE_BASE_URL || defaultAliyunBaseUrl;
  let baseUrl = String(configuredEndpoint).trim().replace(/\/$/, "");
  baseUrl = baseUrl.replace(/\/services\/aigc\/video-generation\/video-synthesis$/i, "");
  baseUrl = baseUrl.replace(/\/tasks$/i, "");
  return /\/api\/v1$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api/v1`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function allowedSeconds(value) {
  const duration = Number(value || 4);
  if (duration <= 4) return "4";
  if (duration <= 8) return "8";
  return "12";
}

function shotPrompt({ topic, script, shot }) {
  return [
    "Create a realistic product commercial video shot. Do not add subtitles, captions, text overlays, logos, or watermarks.",
    `Product or campaign: ${topic}`,
    `Shot scene: ${shot.scene}`,
    `Visual action: ${shot.visual}`,
    `Narration meaning: ${shot.subtitle}`,
    `Overall script style: ${script.style || "professional commercial"}`,
    "Use clean commercial lighting, natural camera movement, realistic hands and product use, and a short-video advertising style."
  ].filter(Boolean).join("\n");
}

function aliyunShotPrompt({ topic, script, shot }) {
  return [
    "生成一个真实产品短视频镜头。不要添加字幕、文字贴片、品牌 Logo 或水印。",
    `产品或主题：${topic}`,
    `镜头场景：${shot.scene}`,
    `画面动作：${shot.visual}`,
    `旁白含义：${shot.subtitle}`,
    `整体风格：${script.style || "专业商业短视频"}`,
    "画面需要真实、清晰、商业广告质感，使用自然运镜和干净光线。"
  ].filter(Boolean).join("\n");
}

async function openaiFetch(path, options = {}, providerConfig = {}) {
  const response = await fetch(`${apiBaseUrl(providerConfig)}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${apiKey(providerConfig)}`,
      ...(options.headers || {})
    }
  });
  if (response.ok) return response;
  const body = await response.text().catch(() => "");
  throw new Error(body || `OpenAI 视频接口请求失败: ${response.status}`);
}

function parseJsonText(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function payloadMessage(payload, fallback) {
  return payload?.message
    || payload?.error?.message
    || payload?.output?.message
    || payload?.raw
    || fallback;
}

async function aliyunFetch(path, options = {}, providerConfig = {}) {
  const response = await fetch(`${aliyunBaseUrl(providerConfig)}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${aliyunApiKey(providerConfig)}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text().catch(() => "");
  const payload = parseJsonText(text);
  if (response.ok) return payload;
  throw new Error(payloadMessage(payload, `通义万相接口请求失败: ${response.status}`));
}

async function createVideoJob({ prompt, seconds, providerConfig }) {
  const form = new FormData();
  form.set("model", modelName(providerConfig));
  form.set("prompt", prompt);
  form.set("seconds", seconds);
  form.set("size", providerConfig.size || process.env.OPENAI_VIDEO_SIZE || "1280x720");

  const response = await openaiFetch("/videos", {
    method: "POST",
    body: form
  }, providerConfig);
  return response.json();
}

async function waitForVideo(videoId, providerConfig) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    const response = await openaiFetch(`/videos/${encodeURIComponent(videoId)}`, {}, providerConfig);
    const payload = await response.json();
    if (payload.status === "completed") return payload;
    if (payload.status === "failed") {
      throw new Error(payload.error?.message || "OpenAI 视频生成失败");
    }
    await sleep(pollMs);
  }
  throw new Error("OpenAI 视频生成等待超时");
}

async function downloadOpenaiVideo(videoId, outputPath, providerConfig) {
  const response = await openaiFetch(`/videos/${encodeURIComponent(videoId)}/content`, {}, providerConfig);
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

function extractAliyunTaskId(payload) {
  return payload?.output?.task_id || payload?.task_id || payload?.id || "";
}

function extractAliyunStatus(payload) {
  return String(payload?.output?.task_status || payload?.task_status || payload?.status || "").toUpperCase();
}

function extractAliyunVideoUrl(payload) {
  return payload?.output?.video_url
    || payload?.output?.video?.url
    || payload?.output?.results?.[0]?.video_url
    || payload?.output?.results?.[0]?.url
    || "";
}

function videoAspectRatio(size = "1280x720") {
  const normalized = String(size).toLowerCase().replace("*", "x");
  if (normalized === "720x1280") return "9:16";
  if (normalized === "1024x1024" || normalized === "960x960") return "1:1";
  return "16:9";
}

function videoResolution(size = "1280x720") {
  const [width, height] = String(size).toLowerCase().replace("*", "x").split("x").map(Number);
  return Math.max(width || 0, height || 0) >= 1080 ? "1080P" : "720P";
}

function aliyunDuration(seconds) {
  const value = Math.round(Number(seconds || 5));
  if (!Number.isFinite(value)) return 5;
  return Math.min(15, Math.max(2, value));
}

function legacyAliyunSize(size = "1280x720") {
  return String(size || "1280x720").toLowerCase().replace("x", "*");
}

function aliyunWanxiangParameters({ model, seconds, size }) {
  const duration = aliyunDuration(seconds);
  const common = {
    duration,
    prompt_extend: true,
    watermark: false
  };
  if (/^wan2\.7/i.test(model)) {
    return {
      ...common,
      ratio: videoAspectRatio(size),
      resolution: videoResolution(size)
    };
  }
  return {
    ...common,
    size: legacyAliyunSize(size)
  };
}

async function createAliyunWanxiangVideoJob({ prompt, seconds, providerConfig }) {
  const model = providerConfig.model || process.env.ALIYUN_VIDEO_MODEL || "wan2.7-t2v-2026-06-12";
  const payload = {
    model,
    input: { prompt },
    parameters: aliyunWanxiangParameters({
      model,
      seconds,
      size: providerConfig.size || process.env.ALIYUN_VIDEO_SIZE || "1280x720"
    })
  };
  const result = await aliyunFetch("/services/aigc/video-generation/video-synthesis", {
    method: "POST",
    headers: { "X-DashScope-Async": "enable" },
    body: JSON.stringify(payload)
  }, providerConfig);
  const taskId = extractAliyunTaskId(result);
  if (!taskId) {
    throw new Error(payloadMessage(result, "通义万相未返回 task_id"));
  }
  return { taskId, requestId: result.request_id || "" };
}

async function waitForAliyunWanxiangVideo(taskId, providerConfig) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    const payload = await aliyunFetch(`/tasks/${encodeURIComponent(taskId)}`, {}, providerConfig);
    const status = extractAliyunStatus(payload);
    if (["SUCCEEDED", "SUCCESS", "COMPLETED"].includes(status)) return payload;
    if (["FAILED", "CANCELED", "UNKNOWN"].includes(status)) {
      throw new Error(payloadMessage(payload, "通义万相视频生成失败"));
    }
    await sleep(pollMs);
  }
  throw new Error("通义万相视频生成等待超时");
}

async function downloadRemoteFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `视频文件下载失败: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

function providerConfigured(providerConfig = {}) {
  return providerConfig.keyMode === "aksk"
    ? Boolean(providerConfig.accessKey && providerConfig.secretKey)
    : Boolean(providerConfig.apiKey);
}

function unsupportedProviderResult(providerConfig = {}) {
  return {
    requested: true,
    status: "provider_pending",
    provider: providerConfig.provider,
    providerName: providerConfig.providerName,
    message: `${providerConfig.providerName || providerConfig.provider} 已保存配置，当前页面选择已生效；该厂商的视频生成 API 适配器待接入，已使用本地分镜文字视频兜底。`,
    clips: []
  };
}

async function generateOpenaiShotClip({ shot, prompt, outputPath, clipUrl, providerConfig }) {
  const job = await createVideoJob({ prompt, seconds: allowedSeconds(shot.duration), providerConfig });
  const completed = await waitForVideo(job.id, providerConfig);
  await downloadOpenaiVideo(completed.id, outputPath, providerConfig);
  return {
    shotNo: shot.shotNo,
    status: "completed",
    videoId: completed.id,
    clipPath: outputPath,
    clipUrl,
    prompt
  };
}

async function generateAliyunWanxiangShotClip({ shot, prompt, outputPath, clipUrl, providerConfig }) {
  const job = await createAliyunWanxiangVideoJob({ prompt, seconds: shot.duration, providerConfig });
  const completed = await waitForAliyunWanxiangVideo(job.taskId, providerConfig);
  const videoUrl = extractAliyunVideoUrl(completed);
  if (!videoUrl) {
    throw new Error("通义万相任务成功但未返回 video_url");
  }
  await downloadRemoteFile(videoUrl, outputPath);
  return {
    shotNo: shot.shotNo,
    status: "completed",
    videoId: job.taskId,
    clipPath: outputPath,
    clipUrl,
    prompt
  };
}

export async function generateAiShotClips({ enabled, storyboard, script, topic, outputDir, publicBaseUrl, providerConfig = {} }) {
  if (!enabled) {
    return { requested: false, status: "skipped", message: "未启用 AI 镜头视频生成", clips: [] };
  }
  if (!providerConfigured(providerConfig)) {
    return {
      requested: true,
      status: "not_configured",
      provider: providerConfig.provider,
      providerName: providerConfig.providerName,
      message: `未配置 ${providerConfig.providerName || "视频生成供应商"} 的密钥，已使用本地分镜文字视频兜底。`,
      clips: []
    };
  }
  const provider = providerConfig.provider || "openai";
  if (!["openai", "aliyun-wanxiang"].includes(provider)) {
    return unsupportedProviderResult(providerConfig);
  }

  await mkdir(outputDir, { recursive: true });
  const clips = [];
  for (const shot of storyboard) {
    const outputFileName = `shot-${shot.shotNo}.mp4`;
    const outputPath = join(outputDir, outputFileName);
    const prompt = provider === "aliyun-wanxiang"
      ? aliyunShotPrompt({ topic, script, shot })
      : shotPrompt({ topic, script, shot });
    try {
      const clipArgs = { shot, prompt, outputPath, clipUrl: `${publicBaseUrl}/${outputFileName}`, providerConfig };
      clips.push(provider === "aliyun-wanxiang"
        ? await generateAliyunWanxiangShotClip(clipArgs)
        : await generateOpenaiShotClip(clipArgs));
    } catch (error) {
      clips.push({
        shotNo: shot.shotNo,
        status: "failed",
        message: error instanceof Error ? error.message : "AI 镜头视频生成失败",
        prompt
      });
    }
  }

  const completedCount = clips.filter((clip) => clip.status === "completed").length;
  return {
    requested: true,
    status: completedCount ? "completed" : "failed",
    provider: providerConfig.provider,
    providerName: providerConfig.providerName,
    message: completedCount ? `已生成 ${completedCount}/${storyboard.length} 个 AI 镜头片段。` : "AI 镜头片段未生成成功，已使用本地分镜文字视频兜底。",
    clips
  };
}
