function endpointBase(config) {
  return String(config.endpoint || "").replace(/\/$/, "");
}

function extractJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  return JSON.parse(candidate);
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

function cleanProviderError(providerName, status, text) {
  const message = parseProviderError(text).replace(/api key:\s*\*+[A-Za-z0-9_-]+/gi, "API Key");
  if (/authentication|api key|invalid/i.test(message)) {
    return `${providerName || "文本模型"} API Key 认证失败，请重新复制并保存正确的 API Key。`;
  }
  return `${providerName || "文本模型"} 请求失败(${status})：${message.slice(0, 120)}`;
}

function systemPrompt() {
  return [
    "你是电商短视频编导。",
    "只返回 JSON，不要 Markdown。",
    "JSON 结构必须包含 script 和 storyboard。",
    "script 包含 hook、sellingPoint、scene、callToAction、style、duration。",
    "storyboard 是 4 个镜头，每个镜头包含 shotNo、duration、scene、visual、subtitle、materialHint。",
    "镜头画面要适合后续视频生成模型，不要写版权品牌、不要要求使用他人视频。"
  ].join("\n");
}

function userPrompt({ topic, style, duration, scenarios }) {
  return JSON.stringify({
    productText: topic,
    style,
    duration,
    selectedScenarios: scenarios,
    task: "根据产品文案和选中使用场景生成电商短视频脚本和 4 个分镜。"
  });
}

async function callChatCompletions(config, payload) {
  const response = await fetch(`${endpointBase(config)}/chat/completions`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${config.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: userPrompt(payload) }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(cleanProviderError(config.providerName, response.status, await response.text()));
  }
  const data = await response.json();
  return extractJson(data.choices?.[0]?.message?.content || "");
}

function normalizeGeneratedPlan(plan, fallback) {
  const script = {
    hook: String(plan.script?.hook || fallback.script.hook || "").trim(),
    sellingPoint: String(plan.script?.sellingPoint || fallback.script.sellingPoint || "").trim(),
    scene: String(plan.script?.scene || fallback.script.scene || "").trim(),
    callToAction: String(plan.script?.callToAction || fallback.script.callToAction || "").trim(),
    style: String(plan.script?.style || fallback.script.style || "").trim(),
    duration: String(plan.script?.duration || fallback.script.duration || "").trim()
  };
  const storyboard = Array.isArray(plan.storyboard) ? plan.storyboard.slice(0, 4).map((shot, index) => ({
    shotNo: Number(shot.shotNo || index + 1),
    duration: Number(shot.duration || fallback.storyboard[index]?.duration || 3),
    scene: String(shot.scene || fallback.storyboard[index]?.scene || "").trim(),
    visual: String(shot.visual || fallback.storyboard[index]?.visual || "").trim(),
    subtitle: String(shot.subtitle || fallback.storyboard[index]?.subtitle || "").trim(),
    materialHint: String(shot.materialHint || fallback.storyboard[index]?.materialHint || "").trim()
  })) : fallback.storyboard;
  return { script, storyboard };
}

export async function generateVideoPlanWithTextModel({ providerConfig, topic, style, duration, scenarios, fallback }) {
  if (!providerConfig || providerConfig.provider === "local") {
    return { ...fallback, source: { provider: "local", status: "skipped", message: "使用本地规则生成脚本和分镜" } };
  }
  if (!providerConfig.configured) {
    return { ...fallback, source: { provider: providerConfig.provider, status: "not_configured", message: "文本模型未配置密钥，已使用本地规则" } };
  }
  try {
    const plan = await callChatCompletions(providerConfig, { topic, style, duration, scenarios });
    return {
      ...normalizeGeneratedPlan(plan, fallback),
      source: {
        provider: providerConfig.provider,
        providerName: providerConfig.providerName,
        model: providerConfig.model,
        status: "completed",
        message: `${providerConfig.providerName} 已生成脚本和分镜`
      }
    };
  } catch (error) {
    return {
      ...fallback,
      source: {
        provider: providerConfig.provider,
        providerName: providerConfig.providerName,
        model: providerConfig.model,
        status: "failed",
        message: `文本模型调用失败，已使用本地规则：${error instanceof Error ? error.message.slice(0, 160) : "未知错误"}`
      }
    };
  }
}
