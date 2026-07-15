import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function escapePowerShellString(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function escapeHereString(value) {
  return String(value ?? "").replace(/'@/g, "' @");
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function voiceProfile(voiceName) {
  const name = String(voiceName || "");
  if (name.includes("活泼")) {
    return { rate: 2, volume: 100, gender: "Female", ssmlRate: "fast", pitch: "high", commaBreak: 120, sentenceBreak: 260 };
  }
  if (name.includes("商务")) {
    return { rate: -1, volume: 96, gender: name.includes("女") ? "Female" : "Male", ssmlRate: "medium", pitch: "low", commaBreak: 170, sentenceBreak: 360 };
  }
  if (name.includes("男")) {
    return { rate: 0, volume: 98, gender: "Male", ssmlRate: "medium", pitch: "low", commaBreak: 150, sentenceBreak: 320 };
  }
  return { rate: 0, volume: 100, gender: "Female", ssmlRate: "medium", pitch: "high", commaBreak: 140, sentenceBreak: 300 };
}

function splitVoiceLines(text) {
  return String(text || "")
    .replace(/[。！？!?]/g, "$&\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ssmlLine(line, index, total, profile) {
  const text = escapeXml(line)
    .replace(/([，、；;])/g, `$1<break time="${profile.commaBreak}ms"/>`)
    .replace(/([。！？!?])/g, `$1<break time="${profile.sentenceBreak}ms"/>`);
  const emphasized = index === 0 || index === total - 1
    ? `<emphasis level="moderate">${text}</emphasis>`
    : text;
  return `<s><prosody rate="${profile.ssmlRate}" pitch="${profile.pitch}">${emphasized}</prosody></s><break time="180ms"/>`;
}

function buildSsml(lines, profile) {
  return [
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">',
    ...lines.map((line, index) => ssmlLine(line, index, lines.length, profile)),
    "</speak>"
  ].join("\n");
}

function endpointBase(config = {}) {
  return String(config.endpoint || "https://api.openai.com/v1").replace(/\/$/, "");
}

function doubaoEndpoint(config = {}) {
  return String(config.endpoint || "https://openspeech.bytedance.com/api/v1/tts").replace(/\/$/, "");
}

function parseProviderError(text) {
  const raw = String(text || "").trim();
  try {
    const payload = JSON.parse(raw);
    return payload.error?.message || payload.message || raw;
  } catch {
    return raw;
  }
}

function voiceInstructions(voiceName) {
  const name = String(voiceName || "");
  if (name.includes("活泼")) {
    return "用亲切、轻快、有感染力的中文短视频口播语气朗读，重点词稍微强调，保持自然停顿。";
  }
  if (name.includes("商务")) {
    return "用沉稳、可信、专业的中文商务口播语气朗读，语速适中，结尾引导清晰有力。";
  }
  if (name.includes("男")) {
    return "用自然、沉稳、像真人讲解产品的中文语气朗读，避免机械感。";
  }
  return "用自然、亲和、像真人介绍产品的中文口播语气朗读，停顿自然，语气有轻微起伏。";
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(command, "utf16le").toString("base64");
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], {
      windowsHide: true
    });
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
      reject(new Error(stderr.trim() || `声音生成失败，退出码 ${code}`));
    });
  });
}

// 使用 Windows 本机语音合成先跑通真实 WAV 文件，后续可替换为云端 TTS。
async function generateLocalSpeechFile({ text, outputPath, voiceName }) {
  const voiceLines = splitVoiceLines(text);
  if (!voiceLines.length) {
    throw new Error("配音文案不能为空");
  }

  const profile = voiceProfile(voiceName);
  const ssml = buildSsml(voiceLines, profile);
  const plainText = voiceLines.join("\n");
  await mkdir(dirname(outputPath), { recursive: true });
  const command = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender.ToString() -eq '${profile.gender}' } | Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$synth.Volume = ${profile.volume}
$synth.Rate = ${profile.rate}
$synth.SetOutputToWaveFile('${escapePowerShellString(outputPath)}')
$ssml = @'
${escapeHereString(ssml)}
'@
$plainText = @'
${escapeHereString(plainText)}
'@
try {
  $synth.SpeakSsml($ssml)
} catch {
  $synth.Speak($plainText)
}
$synth.Dispose()
`;
  await runPowerShell(command);
}

async function generateOpenaiSpeechFile({ text, outputPath, voiceName, providerConfig }) {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("配音文案不能为空");
  }
  if (!providerConfig?.apiKey) {
    throw new Error("AI 配音未配置 API Key");
  }
  await mkdir(dirname(outputPath), { recursive: true });
  const response = await fetch(`${endpointBase(providerConfig)}/audio/speech`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${providerConfig.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: providerConfig.model || "gpt-4o-mini-tts",
      voice: providerConfig.voice || "alloy",
      input,
      instructions: voiceInstructions(voiceName),
      response_format: "wav"
    })
  });
  if (!response.ok) {
    throw new Error(`AI 配音生成失败：${parseProviderError(await response.text()).slice(0, 140)}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

function qwenSpeechPayload({ text, voiceName, providerConfig }) {
  const model = providerConfig.model || "qwen3-tts-flash";
  const payload = {
    model,
    input: {
      text,
      voice: providerConfig.voice || "Cherry",
      language_type: "Chinese"
    }
  };
  if (/instruct/i.test(model)) {
    payload.input.instructions = voiceInstructions(voiceName);
    payload.input.optimize_instructions = true;
  }
  return payload;
}

function qwenAudioUrl(payload) {
  return payload?.output?.audio?.url || payload?.output?.audio_url || "";
}

async function generateQwenSpeechFile({ text, outputPath, voiceName, providerConfig }) {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("配音文案不能为空");
  }
  if (!providerConfig?.apiKey) {
    throw new Error("千问 TTS 未配置 API Key");
  }
  const response = await fetch(`${endpointBase(providerConfig)}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${providerConfig.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(qwenSpeechPayload({ text: input, voiceName, providerConfig }))
  });
  const payload = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
  if (!response.ok || payload.status_code >= 400 || payload.code) {
    throw new Error(`千问 TTS 生成失败：${(payload.message || payload.code || "请求失败").slice(0, 140)}`);
  }
  const url = qwenAudioUrl(payload);
  if (!url) {
    throw new Error("千问 TTS 未返回音频 URL");
  }
  const audioResponse = await fetch(url);
  if (!audioResponse.ok) {
    throw new Error(`千问 TTS 音频下载失败：${audioResponse.status}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  const arrayBuffer = await audioResponse.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

function doubaoVoicePayload({ text, voiceName, providerConfig }) {
  const lively = String(voiceName || "").includes("活泼");
  const business = String(voiceName || "").includes("商务");
  return {
    app: {
      appid: providerConfig.appId,
      token: providerConfig.apiKey,
      cluster: providerConfig.cluster || "volcano_mega"
    },
    user: {
      uid: "ai-employee-local"
    },
    audio: {
      voice_type: providerConfig.voice,
      encoding: "wav",
      rate: 24000,
      speed_ratio: lively ? 1.08 : business ? 0.94 : 1,
      volume_ratio: 1,
      pitch_ratio: lively ? 1.04 : business ? 0.96 : 1
    },
    request: {
      reqid: randomUUID(),
      text,
      text_type: "plain",
      operation: "query",
      with_frontend: 1,
      frontend_type: "unitTson"
    }
  };
}

async function generateDoubaoSpeechFile({ text, outputPath, voiceName, providerConfig }) {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("配音文案不能为空");
  }
  if (!providerConfig?.apiKey || !providerConfig?.appId || !providerConfig?.voice) {
    throw new Error("豆包语音需要配置 Token、App ID 和 voice_type");
  }
  const response = await fetch(doubaoEndpoint(providerConfig), {
    method: "POST",
    headers: {
      authorization: `Bearer;${providerConfig.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(doubaoVoicePayload({ text: input, voiceName, providerConfig }))
  });
  const payload = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
  if (!response.ok || Number(payload.code) !== 3000 || !payload.data) {
    throw new Error(`豆包语音生成失败：${(payload.message || payload.code || "请求失败").toString().slice(0, 140)}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(payload.data, "base64"));
}

export async function generateSpeechFile({ text, outputPath, voiceName, providerConfig = {} }) {
  if ((providerConfig.provider || "local") === "openai") {
    return generateOpenaiSpeechFile({ text, outputPath, voiceName, providerConfig });
  }
  if (providerConfig.provider === "qwen-tts") {
    return generateQwenSpeechFile({ text, outputPath, voiceName, providerConfig });
  }
  if (providerConfig.provider === "doubao-tts") {
    return generateDoubaoSpeechFile({ text, outputPath, voiceName, providerConfig });
  }
  return generateLocalSpeechFile({ text, outputPath, voiceName });
}
