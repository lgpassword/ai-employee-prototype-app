import { store } from "../store.js";

// AI 设置模块：对应原型“AI设置”，当前闭环为保存企业知识库文本。
export const videoProviderOptions = [
  { value: "openai", label: "OpenAI Sora（2026-09-24 下线）", keyMode: "apiKey", defaultModel: "sora-2", models: ["sora-2", "sora-2-pro"], defaultSize: "1280x720" },
  { value: "aliyun-wanxiang", label: "阿里云百炼 / 通义万相", keyMode: "apiKey", defaultModel: "wan2.7-t2v-2026-06-12", models: ["wan2.7-t2v-2026-06-12", "wan2.7-t2v", "wan2.7-i2v-2026-04-25", "wan2.7-r2v-2026-06-12", "wan2.7-videoedit", "wan2.6-i2v", "wan2.6-i2v-flash", "wanx2.1-t2v-turbo", "wanx2.1-t2v-plus"], defaultSize: "1280x720" },
  { value: "aliyun-kling", label: "阿里云百炼 / 可灵 Kling", keyMode: "apiKey", defaultModel: "kling/kling-v3-video-generation", models: ["kling/kling-v3-video-generation", "kling/kling-v3-omni-video-generation"], defaultSize: "1280x720" },
  { value: "volcengine", label: "火山引擎 / 即梦 Seedance", keyMode: "aksk", defaultModel: "doubao-seedance-2-0-260128", models: ["doubao-seedance-2-0-260128", "doubao-seedance-2-0-fast-260128", "doubao-seedance-2-0-mini-260615", "doubao-seedance-1-0-pro-250528"], defaultSize: "1280x720" },
  { value: "tencent-hunyuan", label: "腾讯云 TokenHub / 视频生成", keyMode: "aksk", defaultModel: "hy-video-1.5", models: ["hy-video-1.5", "yt-video-2.0", "yt-video-humanactor", "yt-video-fx", "kl-video-v3", "kl-video-v2-6", "kl-video-v2-5-turbo", "kl-video-v2-1-master", "kl-video-v2-1", "kl-video-v2-master", "kl-video-v1-6", "kl-video-v1-5", "kl-video-v1", "vd-video-q3-pro", "vd-video-q3-turbo", "vd-video-q2-pro", "vd-video-q2-pro-fast", "vd-video-q2-turbo", "vd-video-q2"], defaultSize: "1280x720" },
  { value: "baidu-qianfan", label: "百度千帆 / AI 视频", keyMode: "aksk", defaultModel: "VQ3-Pro", models: ["VQ3-Pro", "VQ3-Turbo", "VQ2", "VQ2-Pro", "VQ2-Turbo"], defaultSize: "1280x720" }
];

export const textProviderOptions = [
  { value: "local", label: "本地规则", defaultModel: "local-rules", defaultEndpoint: "" },
  { value: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat", defaultEndpoint: "https://api.deepseek.com" },
  { value: "doubao", label: "豆包 / 火山方舟", defaultModel: "doubao-seed-1-6", defaultEndpoint: "https://ark.cn-beijing.volces.com/api/v3" },
  { value: "openai", label: "OpenAI", defaultModel: "gpt-4.1-mini", defaultEndpoint: "https://api.openai.com/v1" }
];

export const voiceProviderOptions = [
  { value: "local", label: "本地 Windows 口播", defaultModel: "windows-ssml", defaultEndpoint: "", defaultVoice: "system" },
  { value: "openai", label: "OpenAI 兼容 TTS", defaultModel: "gpt-4o-mini-tts", defaultEndpoint: "https://api.openai.com/v1", defaultVoice: "alloy" },
  { value: "qwen-tts", label: "阿里云百炼 / 千问 TTS", defaultModel: "qwen3-tts-flash", defaultEndpoint: "https://dashscope.aliyuncs.com/api/v1", defaultVoice: "Cherry" },
  { value: "doubao-tts", label: "火山引擎 / 豆包语音", defaultModel: "doubao-tts-http-v1", defaultEndpoint: "https://openspeech.bytedance.com/api/v1/tts", defaultVoice: "", defaultCluster: "volcano_mega" }
];

function providerOption(value) {
  return videoProviderOptions.find((item) => item.value === value) || videoProviderOptions[0];
}

function textProviderOption(value) {
  return textProviderOptions.find((item) => item.value === value) || textProviderOptions[0];
}

function voiceProviderOption(value) {
  return voiceProviderOptions.find((item) => item.value === value) || voiceProviderOptions[0];
}

function maskedStatus(config) {
  const option = providerOption(config.provider);
  const hasApiKey = Boolean(config.apiKey);
  const hasAkSk = Boolean(config.accessKey && config.secretKey);
  return {
    provider: config.provider,
    providerName: option.label,
    keyMode: option.keyMode,
    model: config.model,
    models: option.models,
    defaultModel: option.defaultModel,
    size: config.size,
    endpoint: config.endpoint,
    region: config.region,
    configured: option.keyMode === "apiKey" ? hasApiKey : hasAkSk,
    apiKeySaved: hasApiKey,
    accessKeySaved: Boolean(config.accessKey),
    secretKeySaved: Boolean(config.secretKey)
  };
}

function maskedTextStatus(config) {
  const option = textProviderOption(config.provider);
  return {
    provider: option.value,
    providerName: option.label,
    model: config.model || option.defaultModel,
    endpoint: config.endpoint || option.defaultEndpoint,
    temperature: Number(config.temperature ?? 0.7),
    configured: option.value === "local" || Boolean(config.apiKey),
    apiKeySaved: Boolean(config.apiKey)
  };
}

function voiceConfigured(option, config) {
  if (option.value === "local") return true;
  if (option.value === "doubao-tts") {
    return Boolean(config.apiKey && config.appId && config.voice);
  }
  return Boolean(config.apiKey);
}

function maskedVoiceStatus(config) {
  const option = voiceProviderOption(config.provider);
  return {
    provider: option.value,
    providerName: option.label,
    model: config.model || option.defaultModel,
    endpoint: config.endpoint || option.defaultEndpoint,
    voice: config.voice || option.defaultVoice,
    appId: config.appId || "",
    cluster: config.cluster || option.defaultCluster || "",
    configured: voiceConfigured(option, config),
    apiKeySaved: Boolean(config.apiKey)
  };
}

export function getSettings() {
  return {
    knowledgeBase: store.settings.knowledgeBase,
    customerAi: {
      enabled: Boolean(store.settings.customerAi?.enabled),
      provider: store.settings.customerAi?.provider || "textProvider",
      tone: store.settings.customerAi?.tone || "专业、亲和、成交导向",
      replyDelaySeconds: Number(store.settings.customerAi?.replyDelaySeconds ?? 8),
      escalationKeywords: store.settings.customerAi?.escalationKeywords || "",
      platformSync: Boolean(store.settings.customerAi?.platformSync),
      fallbackReply: store.settings.customerAi?.fallbackReply || ""
    },
    videoProviderOptions,
    videoProvider: maskedStatus(store.settings.videoProvider),
    textProviderOptions,
    textProvider: maskedTextStatus(store.settings.textProvider),
    voiceProviderOptions,
    voiceProvider: maskedVoiceStatus(store.settings.voiceProvider)
  };
}

export function saveKnowledgeBase(payload) {
  store.settings.knowledgeBase = String(payload.knowledgeBase || "").trim();
  return getSettings();
}

export function saveCustomerAiSettings(payload) {
  store.settings.customerAi = {
    enabled: Boolean(payload.enabled),
    provider: String(payload.provider || "textProvider").trim(),
    tone: String(payload.tone || "专业、亲和、成交导向").trim(),
    replyDelaySeconds: Math.max(0, Number(payload.replyDelaySeconds ?? 8)),
    escalationKeywords: String(payload.escalationKeywords || "").trim(),
    platformSync: Boolean(payload.platformSync),
    fallbackReply: String(payload.fallbackReply || "").trim()
  };
  return getSettings().customerAi;
}

export function saveVideoProviderSettings(payload) {
  const provider = String(payload.provider || store.settings.videoProvider.provider || "openai");
  const option = providerOption(provider);
  const current = store.settings.videoProvider;
  const providerChanged = current.provider !== option.value;
  const nextModel = String(payload.model || "").trim();
  current.provider = option.value;
  current.model = nextModel || (providerChanged ? option.defaultModel : current.model || option.defaultModel);
  current.size = String(payload.size || current.size || option.defaultSize).trim();
  current.endpoint = String(payload.endpoint || "").trim();
  current.region = String(payload.region || "").trim();

  if (payload.clearSecrets) {
    current.apiKey = "";
    current.accessKey = "";
    current.secretKey = "";
  }
  if (String(payload.apiKey || "").trim()) {
    current.apiKey = String(payload.apiKey).trim();
  }
  if (String(payload.accessKey || "").trim()) {
    current.accessKey = String(payload.accessKey).trim();
  }
  if (String(payload.secretKey || "").trim()) {
    current.secretKey = String(payload.secretKey).trim();
  }
  return getSettings().videoProvider;
}

export function saveTextProviderSettings(payload) {
  const provider = String(payload.provider || store.settings.textProvider.provider || "local");
  const option = textProviderOption(provider);
  const current = store.settings.textProvider;
  const providerChanged = current.provider !== option.value;
  const payloadModel = String(payload.model || "").trim();
  const invalidCarriedLocalModel = option.value !== "local" && payloadModel === "local-rules";
  const hasModel = Object.prototype.hasOwnProperty.call(payload, "model") && payloadModel && !invalidCarriedLocalModel;
  const hasEndpoint = Object.prototype.hasOwnProperty.call(payload, "endpoint");
  current.provider = option.value;
  current.model = String(hasModel ? payloadModel : providerChanged || invalidCarriedLocalModel ? option.defaultModel : current.model || option.defaultModel).trim();
  current.endpoint = String(hasEndpoint ? payload.endpoint : providerChanged ? option.defaultEndpoint : current.endpoint || option.defaultEndpoint).trim();
  current.temperature = Number(payload.temperature ?? current.temperature ?? 0.7);

  if (payload.clearSecrets) {
    current.apiKey = "";
  }
  if (String(payload.apiKey || "").trim()) {
    current.apiKey = String(payload.apiKey).trim();
  }
  return getSettings().textProvider;
}

export function saveVoiceProviderSettings(payload) {
  const provider = String(payload.provider || store.settings.voiceProvider.provider || "local");
  const option = voiceProviderOption(provider);
  const current = store.settings.voiceProvider;
  const providerChanged = current.provider !== option.value;
  const payloadModel = String(payload.model || "").trim();
  const payloadEndpoint = String(payload.endpoint || "").trim();
  const payloadVoice = String(payload.voice || "").trim();
  const payloadAppId = String(payload.appId || "").trim();
  const payloadCluster = String(payload.cluster || "").trim();
  current.provider = option.value;
  current.model = payloadModel || (providerChanged ? option.defaultModel : current.model || option.defaultModel);
  current.endpoint = Object.prototype.hasOwnProperty.call(payload, "endpoint")
    ? payloadEndpoint
    : providerChanged ? option.defaultEndpoint : current.endpoint || option.defaultEndpoint;
  current.voice = payloadVoice || (providerChanged ? option.defaultVoice : current.voice || option.defaultVoice);
  current.appId = payloadAppId || (providerChanged ? "" : current.appId || "");
  current.cluster = payloadCluster || (providerChanged ? option.defaultCluster || "" : current.cluster || option.defaultCluster || "");

  if (payload.clearSecrets) {
    current.apiKey = "";
  }
  if (String(payload.apiKey || "").trim()) {
    current.apiKey = String(payload.apiKey).trim();
  }
  return getSettings().voiceProvider;
}

export function getVoiceProviderConfig() {
  const config = store.settings.voiceProvider;
  const option = voiceProviderOption(config.provider);
  const envConfig = {
    local: {},
    openai: {
      apiKey: process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY || "",
      endpoint: process.env.OPENAI_TTS_BASE_URL || process.env.OPENAI_BASE_URL || option.defaultEndpoint,
      model: process.env.OPENAI_TTS_MODEL || option.defaultModel,
      voice: process.env.OPENAI_TTS_VOICE || option.defaultVoice
    },
    "qwen-tts": {
      apiKey: process.env.QWEN_TTS_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.ALIYUN_API_KEY || "",
      endpoint: process.env.QWEN_TTS_BASE_URL || process.env.DASHSCOPE_BASE_URL || option.defaultEndpoint,
      model: process.env.QWEN_TTS_MODEL || option.defaultModel,
      voice: process.env.QWEN_TTS_VOICE || option.defaultVoice
    },
    "doubao-tts": {
      apiKey: process.env.DOUBAO_TTS_TOKEN || "",
      endpoint: process.env.DOUBAO_TTS_ENDPOINT || option.defaultEndpoint,
      model: process.env.DOUBAO_TTS_MODEL || option.defaultModel,
      voice: process.env.DOUBAO_TTS_VOICE_TYPE || option.defaultVoice,
      appId: process.env.DOUBAO_TTS_APP_ID || "",
      cluster: process.env.DOUBAO_TTS_CLUSTER || option.defaultCluster || ""
    }
  }[option.value] || {};
  const merged = {
    ...config,
    provider: option.value,
    providerName: option.label,
    model: config.model || envConfig.model || option.defaultModel,
    endpoint: config.endpoint || envConfig.endpoint || option.defaultEndpoint,
    apiKey: config.apiKey || envConfig.apiKey || "",
    voice: config.voice || envConfig.voice || option.defaultVoice,
    appId: config.appId || envConfig.appId || "",
    cluster: config.cluster || envConfig.cluster || option.defaultCluster || ""
  };
  merged.configured = voiceConfigured(option, merged);
  return merged;
}

export function getTextProviderConfig() {
  const config = store.settings.textProvider;
  const option = textProviderOption(config.provider);
  const envConfig = {
    local: {},
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      endpoint: process.env.DEEPSEEK_BASE_URL || option.defaultEndpoint,
      model: process.env.DEEPSEEK_MODEL || option.defaultModel
    },
    doubao: {
      apiKey: process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "",
      endpoint: process.env.DOUBAO_BASE_URL || process.env.ARK_BASE_URL || option.defaultEndpoint,
      model: process.env.DOUBAO_MODEL || process.env.ARK_MODEL || option.defaultModel
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      endpoint: process.env.OPENAI_BASE_URL || option.defaultEndpoint,
      model: process.env.OPENAI_TEXT_MODEL || option.defaultModel
    }
  }[option.value] || {};
  const merged = {
    ...config,
    provider: option.value,
    providerName: option.label,
    model: config.model || envConfig.model || option.defaultModel,
    endpoint: config.endpoint || envConfig.endpoint || option.defaultEndpoint,
    apiKey: config.apiKey || envConfig.apiKey || "",
    temperature: Number(config.temperature ?? 0.7)
  };
  merged.configured = option.value === "local" || Boolean(merged.apiKey);
  return merged;
}

export function getVideoProviderConfig() {
  const config = store.settings.videoProvider;
  const option = providerOption(config.provider);
  const envConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      endpoint: process.env.OPENAI_BASE_URL || "",
      model: process.env.OPENAI_VIDEO_MODEL || option.defaultModel,
      size: process.env.OPENAI_VIDEO_SIZE || option.defaultSize
    },
    "aliyun-wanxiang": {
      apiKey: process.env.ALIYUN_API_KEY || process.env.DASHSCOPE_API_KEY || "",
      endpoint: process.env.ALIYUN_VIDEO_ENDPOINT || "",
      model: process.env.ALIYUN_VIDEO_MODEL || option.defaultModel,
      size: process.env.ALIYUN_VIDEO_SIZE || option.defaultSize
    },
    "aliyun-kling": {
      apiKey: process.env.ALIYUN_API_KEY || process.env.DASHSCOPE_API_KEY || "",
      endpoint: process.env.ALIYUN_VIDEO_ENDPOINT || "",
      model: process.env.ALIYUN_KLING_MODEL || option.defaultModel,
      size: process.env.ALIYUN_VIDEO_SIZE || option.defaultSize
    },
    volcengine: {
      accessKey: process.env.VOLCENGINE_ACCESS_KEY || "",
      secretKey: process.env.VOLCENGINE_SECRET_KEY || "",
      endpoint: process.env.VOLCENGINE_VIDEO_ENDPOINT || "",
      model: process.env.VOLCENGINE_VIDEO_MODEL || option.defaultModel,
      size: process.env.VOLCENGINE_VIDEO_SIZE || option.defaultSize
    },
    "tencent-hunyuan": {
      accessKey: process.env.TENCENT_SECRET_ID || "",
      secretKey: process.env.TENCENT_SECRET_KEY || "",
      endpoint: process.env.TENCENT_VIDEO_ENDPOINT || "",
      model: process.env.TENCENT_VIDEO_MODEL || option.defaultModel,
      size: process.env.TENCENT_VIDEO_SIZE || option.defaultSize
    },
    "baidu-qianfan": {
      accessKey: process.env.BAIDU_API_KEY || "",
      secretKey: process.env.BAIDU_SECRET_KEY || "",
      endpoint: process.env.BAIDU_VIDEO_ENDPOINT || "",
      model: process.env.BAIDU_VIDEO_MODEL || option.defaultModel,
      size: process.env.BAIDU_VIDEO_SIZE || option.defaultSize
    }
  }[option.value] || {};

  const merged = {
    ...config,
    providerName: option.label,
    keyMode: option.keyMode,
    model: config.model || envConfig.model || option.defaultModel,
    size: config.size || envConfig.size || option.defaultSize,
    endpoint: config.endpoint || envConfig.endpoint || "",
    apiKey: config.apiKey || envConfig.apiKey || "",
    accessKey: config.accessKey || envConfig.accessKey || "",
    secretKey: config.secretKey || envConfig.secretKey || ""
  };
  merged.configured = option.keyMode === "apiKey" ? Boolean(merged.apiKey) : Boolean(merged.accessKey && merged.secretKey);
  return merged;
}
