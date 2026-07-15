// 数据库运行时状态：当前程序先保证原型链路闭环，后续由 repository/database adapter 替换。
// Open-source note: this file contains demo accounts and mock business data only.
// 开源说明：该文件只包含演示账号和模拟业务数据，不包含真实平台密钥。

/** Global in-memory store used by all backend modules. / 后端所有模块共享的内存数据源。 */
export const store = {
  session: {
    userId: null,
    username: "",
    userType: null,
    role: "",
    displayName: "",
    expiresAt: "",
    quota: {},
    loggedInAt: null
  },
  users: [
    {
      id: "usr_admin",
      username: "admin",
      // 本地原型账号使用明文密码；正式系统需要替换为数据库用户和哈希密码。
      password: "admin123",
      displayName: "系统管理员",
      userType: "merchant",
      role: "admin",
      expiresAt: "2027-12-31",
      enabled: true,
      quotas: {
        contentSearches: { limit: 300, used: 0 },
        videoDrafts: { limit: 120, used: 0 },
        videoRenders: { limit: 60, used: 0 }
      }
    },
    {
      id: "usr_personal",
      username: "user",
      password: "user123",
      displayName: "个人体验用户",
      userType: "personal",
      role: "user",
      expiresAt: "2026-12-31",
      enabled: true,
      quotas: {
        contentSearches: { limit: 50, used: 0 },
        videoDrafts: { limit: 20, used: 0 },
        videoRenders: { limit: 8, used: 0 }
      }
    },
    {
      id: "usr_merchant",
      username: "merchant",
      password: "merchant123",
      displayName: "商户体验账号",
      userType: "merchant",
      role: "merchant",
      expiresAt: "2026-12-31",
      enabled: true,
      quotas: {
        contentSearches: { limit: 120, used: 0 },
        videoDrafts: { limit: 50, used: 0 },
        videoRenders: { limit: 20, used: 0 }
      }
    }
  ],
  accounts: [
    { id: "acc_douyin", platform: "douyin", platformName: "抖音", accountName: "未授权", status: "disconnected", fans: 0, videos: 0 },
    { id: "acc_kuaishou", platform: "kuaishou", platformName: "快手", accountName: "kuaishou_67890", status: "connected", fans: 32600, videos: 86 },
    { id: "acc_wechat", platform: "wechat_channel", platformName: "视频号", accountName: "未绑定", status: "disconnected", fans: 21000, videos: 41 },
    { id: "acc_xiaohongshu", platform: "xiaohongshu", platformName: "小红书", accountName: "未绑定", status: "disconnected", fans: 0, videos: 0 }
  ],
  douyinOAuth: {
    clientKey: "",
    clientSecret: "",
    redirectUri: "",
    scope: "user_info",
    optionalScope: "",
    pendingState: "",
    pendingStateExpiresAt: "",
    accessToken: "",
    refreshToken: "",
    openId: "",
    scopeGranted: "",
    expiresAt: "",
    refreshExpiresAt: "",
    authorizedAt: "",
    updatedAt: "",
    lastError: "",
    account: {
      nickname: "",
      avatar: "",
      unionId: ""
    }
  },
  contents: [
    { id: "vid_1", platform: "douyin", title: "手套产品展示 - 专业防护手套", author: "抖音账号", views: 125000, likes: 23000, duration: "02:35", tags: ["手套", "防护"], status: "ready", copy: "专业防护手套，防滑耐磨，适合工厂、骑行和户外作业。" },
    { id: "vid_2", platform: "kuaishou", title: "冬季保暖手套推荐 - 防寒必备", author: "快手账号", views: 89000, likes: 15000, duration: "01:48", tags: ["手套", "保暖"], status: "ready", copy: "冬季保暖手套，内里加绒，日常通勤和户外工作都能用。" },
    { id: "vid_3", platform: "wechat_channel", title: "专业运动手套测评 - 健身必备", author: "视频号账号", views: 152000, likes: 31000, duration: "03:12", tags: ["手套", "运动"], status: "ready", copy: "运动健身手套，防滑掌垫，减少器械训练时的手掌磨损。" },
    { id: "vid_4", platform: "douyin", title: "手套清洁保养技巧分享", author: "抖音账号", views: 68000, likes: 12000, duration: "02:05", tags: ["手套", "保养"], status: "ready", copy: "手套清洁保养技巧：温水清洗、阴凉晾干，避免暴晒变硬。" },
    { id: "vid_5", platform: "xiaohongshu", title: "防护手套真实使用笔记", author: "小红书账号", views: 76000, likes: 16800, duration: "01:36", tags: ["手套", "种草"], status: "ready", copy: "防护手套真实使用笔记：做家务、骑车、搬运都能用，重点看防滑和贴合度。" }
  ],
  generatedVideos: [],
  videoRenderJobs: [],
  conversations: [
    {
      id: "conv_1",
      customerName: "用户张三",
      platform: "douyin",
      status: "waiting",
      lastMessage: "这个手套质量怎么样？",
      messages: [
        { role: "customer", text: "这个手套质量怎么样？", time: "14:32" },
        { role: "assistant", text: "您好！我们的手套采用优质材料制作，具有防滑、耐磨、透气等特点，质量有保证。已经有超过10000+用户好评！", time: "14:32 · AI回复" },
        { role: "customer", text: "价格是多少？", time: "14:35" }
      ],
      aiSuggestion: "这款专业防护手套当前活动价 59 元起，具体价格按尺码和数量确认。您需要日常防护款还是加厚耐磨款？",
      tags: ["高意向", "询价"],
      group: "待转化客户",
      lifecycle: "咨询中",
      autoReply: true
    },
    {
      id: "conv_2",
      customerName: "用户李四",
      platform: "kuaishou",
      status: "ai_drafting",
      lastMessage: "有货吗？多少钱？",
      messages: [
        { role: "customer", text: "有货吗？多少钱？", time: "15:08" }
      ],
      aiSuggestion: "有货的，常用尺码现货充足。单件 59 元起，批量采购可以给您阶梯报价。",
      tags: ["库存咨询"],
      group: "新客户",
      lifecycle: "新线索",
      autoReply: true
    },
    {
      id: "conv_3",
      customerName: "用户王五",
      platform: "wechat_channel",
      status: "waiting",
      lastMessage: "可以包邮吗？",
      messages: [
        { role: "customer", text: "可以包邮吗？", time: "15:20" }
      ],
      aiSuggestion: "满 2 件默认包邮，偏远地区会单独确认运费。您准备购买几件？",
      tags: ["价格敏感"],
      group: "待转化客户",
      lifecycle: "咨询中",
      autoReply: false
    },
    {
      id: "conv_4",
      customerName: "用户赵六",
      platform: "douyin",
      status: "waiting",
      lastMessage: "有优惠活动吗？",
      messages: [
        { role: "customer", text: "有优惠活动吗？", time: "15:41" }
      ],
      aiSuggestion: "当前有第二件半价活动，也支持企业团购报价。您是个人购买还是批量采购？",
      tags: ["活动咨询", "可唤醒"],
      group: "活动客户",
      lifecycle: "复访",
      autoReply: true
    }
  ],
  live: {
    online: 2458,
    interactions: 356,
    salesAmount: 12580,
    orders: 45,
    trend: [
      { label: "10分钟前", online: 2100 },
      { label: "8分钟前", online: 2200 },
      { label: "6分钟前", online: 2350 },
      { label: "4分钟前", online: 2280 },
      { label: "2分钟前", online: 2400 },
      { label: "现在", online: 2458 }
    ]
  },
  sales: {
    monthAmount: 458920,
    orderCount: 1245,
    fanGrowth: 25680,
    conversionRate: 68,
    trend: [
      { label: "第1周", amount: 95000 },
      { label: "第2周", amount: 112000 },
      { label: "第3周", amount: 128000 },
      { label: "第4周", amount: 123920 }
    ],
    products: [
      { name: "专业防护手套", salesCount: 356, amount: 28450, rank: "🏆" },
      { name: "冬季保暖手套", salesCount: 289, amount: 23120, rank: "🥈" },
      { name: "运动健身手套", salesCount: 215, amount: 17200, rank: "🥉" }
    ]
  },
  settings: {
    knowledgeBase: "",
    videoProvider: {
      provider: "openai",
      model: "sora-2",
      size: "1280x720",
      endpoint: "",
      apiKey: "",
      accessKey: "",
      secretKey: "",
      region: ""
    },
    textProvider: {
      provider: "local",
      model: "local-rules",
      endpoint: "",
      apiKey: "",
      temperature: 0.7
    },
    voiceProvider: {
      provider: "local",
      model: "windows-ssml",
      endpoint: "",
      apiKey: "",
      voice: "alloy",
      appId: "",
      cluster: ""
    },
    customerAi: {
      enabled: true,
      provider: "textProvider",
      tone: "专业、亲和、成交导向",
      replyDelaySeconds: 8,
      escalationKeywords: "投诉,退款,差评,质量问题",
      platformSync: true,
      fallbackReply: "您好，我已收到您的问题，会结合订单和商品信息尽快回复。"
    }
  },
  merchantOnboarding: {
    merchantCode: "",
    businessName: "",
    unifiedSocialCreditCode: "",
    contactName: "",
    contactPhone: "",
    platforms: [
      {
        platform: "douyin",
        platformName: "抖音",
        status: "pending",
        applicationNo: "",
        reviewDate: "",
        canAuthorize: false,
        authorizationCode: "",
        materials: [
          { key: "businessLicense", label: "营业执照", required: true, uploaded: false, fileName: "" },
          { key: "legalPersonId", label: "法人身份证明", required: true, uploaded: false, fileName: "" },
          { key: "brandAuthorization", label: "品牌/商标授权", required: false, uploaded: false, fileName: "" }
        ],
        tips: [
          "个人身份不能创建网站应用，商户需准备企业主体资质。",
          "真实提交到抖音开放平台前，需要完成企业认证和应用审核。"
        ]
      },
      {
        platform: "kuaishou",
        platformName: "快手",
        status: "pending",
        applicationNo: "",
        reviewDate: "",
        canAuthorize: false,
        authorizationCode: "",
        materials: [
          { key: "businessLicense", label: "营业执照", required: true, uploaded: false, fileName: "" },
          { key: "operatorId", label: "管理员身份证明", required: true, uploaded: false, fileName: "" },
          { key: "shopCategoryProof", label: "经营类目资质", required: false, uploaded: false, fileName: "" }
        ],
        tips: [
          "快手开放能力通常需要开发者资质认证后再创建应用。",
          "不同经营类目可能需要补充行业许可证。"
        ]
      },
      {
        platform: "wechat_channel",
        platformName: "视频号",
        status: "pending",
        applicationNo: "",
        reviewDate: "",
        canAuthorize: false,
        authorizationCode: "",
        materials: [
          { key: "businessLicense", label: "营业执照", required: true, uploaded: false, fileName: "" },
          { key: "wechatSubjectProof", label: "微信主体认证材料", required: true, uploaded: false, fileName: "" },
          { key: "merchantContact", label: "商户联系人信息", required: true, uploaded: false, fileName: "" }
        ],
        tips: [
          "视频号相关能力依赖微信生态主体认证和接口权限。",
          "建议保持微信开放平台、公众号/视频号主体一致。"
        ]
      },
      {
        platform: "xiaohongshu",
        platformName: "小红书",
        status: "pending",
        applicationNo: "",
        reviewDate: "",
        canAuthorize: false,
        authorizationCode: "",
        materials: [
          { key: "businessLicense", label: "营业执照", required: true, uploaded: false, fileName: "" },
          { key: "brandAuthorization", label: "品牌/商标授权", required: true, uploaded: false, fileName: "" },
          { key: "operatorContact", label: "运营联系人信息", required: false, uploaded: false, fileName: "" }
        ],
        tips: [
          "小红书商业能力通常需要企业主体和品牌资质。",
          "内容发布和互动回复需要对应账号授权后才能自动同步。"
        ]
      }
    ]
  }
};

/** Convert platform code to display name. / 将平台编码转换为展示名称。 */
export function platformName(code) {
  return {
    douyin: "抖音",
    kuaishou: "快手",
    xiaohongshu: "小红书",
    wechat_channel: "视频号"
  }[code] || code;
}

/** Generate a simple local id for in-memory collections. / 为内存集合生成本地 ID。 */
export function nextId(prefix, collection) {
  return `${prefix}_${collection.length + 1}_${Date.now()}`;
}
