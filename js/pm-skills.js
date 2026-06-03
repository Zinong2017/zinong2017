/**
 * Zinong2017 PM Skills — 50+ 产品经理技能知识库
 * 参照 phuryn/pm-skills + deanpeters/Product-Manager-Skills
 */

var PM_SKILLS = {

  /* ================================================================
     1. 产品发现 discovery
     ================================================================ */
  discovery: {
    name: '产品发现',
    icon: '🔍',
    skills: {
      'brainstorm-ideas': {
        name: '创意脑暴', icon: '💡',
        prompt: '请帮我针对[产品/领域]进行多视角创意脑暴。分别从 PM、设计师、工程师三个角度提出 5 个创新想法，每个想法包含：一句话描述、目标用户、核心价值。'
      },
      'identify-assumptions': {
        name: '假设识别', icon: '🎯',
        prompt: '请帮我识别[产品/功能]中的关键假设。按以下四类分析：价值假设（用户真的需要吗）、可用性假设（用户能理解吗）、可行性假设（技术上可实现吗）、商业假设（可持续盈利吗）。每类列出 Top 3 最高风险假设。'
      },
      'prioritize-assumptions': {
        name: '假设优先级', icon: '📊',
        prompt: '请帮我用「影响 × 不确定性」矩阵对以下假设进行优先级排序。高影响 + 高不确定性的优先验证。为每个假设推荐合适的验证实验类型。\n\n假设列表：[粘贴假设列表]'
      },
      'design-experiments': {
        name: '实验设计', icon: '🧪',
        prompt: '请帮我为[假设]设计 3 个低成本验证实验。每个实验包括：实验名称、方法（A/B测试/用户访谈/原型测试/数据埋点等）、最少样本量、成功标准、预估耗时。参考 Alberto Savoia 的假设验证方法论。'
      },
      'opportunity-solution-tree': {
        name: '机会方案树', icon: '🌳',
        prompt: '请帮我针对[产品目标/产出]构建一棵机会方案树（Teresa Torres 框架）。结构：产出目标 → 3-5 个机会 → 每个机会下 3-5 个解决方案 → 为 Top 3 方案设计验证实验。'
      },
      'interview-script': {
        name: '访谈脚本', icon: '🎤',
        prompt: '请帮我设计一份结构化的用户访谈脚本。包含：开场白、热身问题、5-8 个核心问题（Jobs-to-be-Done 风格）、追问策略、结束语。每个问题标注探询目标。参考 The Mom Test 方法论。'
      },
      'summarize-interview': {
        name: '访谈总结', icon: '📝',
        prompt: '请帮我把以下用户访谈记录总结为结构化笔记：关键 Jobs-to-be-Done、当前解决方案与痛点、满意度信号、引用的原话、需要进一步验证的假设。\n\n访谈记录：[粘贴]'
      }
    },
    commands: {
      '/discover': {
        name: '完整发现流程', desc: '创意 → 假设 → 优先级 → 实验',
        flow: ['brainstorm-ideas', 'identify-assumptions', 'prioritize-assumptions', 'design-experiments']
      },
      '/brainstorm': { name: '创意脑暴', desc: '多视角创意生成', skill: 'brainstorm-ideas' },
      '/interview': { name: '用户访谈', desc: '访谈脚本或总结', skill: 'interview-script' }
    }
  },

  /* ================================================================
     2. 产品策略 strategy
     ================================================================ */
  strategy: {
    name: '产品策略',
    icon: '🎯',
    skills: {
      'product-strategy': {
        name: '产品策略画布', icon: '📋',
        prompt: '请帮我为[产品名称]制定一份完整的 9 模块产品策略画布：1) 愿景 2) 目标市场 3) 用户画像 4) 价值主张 5) 核心能力 6) 商业模式 7) 竞争定位 8) 增长策略 9) 护城河。每个模块 3-5 个要点。'
      },
      'product-vision': {
        name: '产品愿景', icon: '🔭',
        prompt: '请帮我为[产品]撰写一则激励人心的产品愿景。包含：我们为什么存在、我们要改变什么、3 年后的世界是什么样、用户会怎么描述我们。'
      },
      'value-proposition': {
        name: '价值主张', icon: '💎',
        prompt: '请帮我设计价值主张。用 6 部分结构：1) 目标用户是谁 2) 他们的核心 JTBD 是什么 3) 他们现在的解决方案 4) 使用我们后他们能做什么 5) 我们比替代方案好在哪里 6) 用一句话总结价值主张。'
      },
      'business-model': {
        name: '商业模式画布', icon: '🏗️',
        prompt: '请帮我为[产品]填写完整的商业模式画布（9 模块）：客户细分、价值主张、渠道、客户关系、收入来源、核心资源、关键活动、关键伙伴、成本结构。'
      },
      'swot-analysis': {
        name: 'SWOT 分析', icon: '⚡',
        prompt: '请帮我做一份 SWOT 分析：优势(Strengths)、劣势(Weaknesses)、机会(Opportunities)、威胁(Threats)。每类 5 项以上，并基于 SWOT 交叉矩阵给出可执行的战略建议。'
      },
      'pestle-analysis': {
        name: 'PESTLE 分析', icon: '🌍',
        prompt: '请帮我做一份 PESTLE 宏观环境分析：政治(P)、经济(E)、社会(S)、技术(T)、法律(L)、环境(E)。每项列出 3-5 个趋势或变化，并说明对[产品/行业]的影响。'
      },
      'porters-five-forces': {
        name: '五力分析', icon: '💪',
        prompt: '请帮我用波特五力模型分析[行业/市场]的竞争态势：现有竞争者竞争强度、供应商议价能力、买家议价能力、新进入者威胁、替代品威胁。每项给出评级和理由。'
      },
      'pricing-strategy': {
        name: '定价策略', icon: '💰',
        prompt: '请帮我设计定价策略。分析：竞品定价对比、用户支付意愿评估、成本结构、可选定价模型（订阅制/按量/免费增值/企业版等）、价格锚点设计、定价验证实验建议。'
      }
    },
    commands: {
      '/strategy': { name: '完整策略', desc: '产品策略画布', skill: 'product-strategy' },
      '/business-model': { name: '商业模式', desc: '商业模式画布', skill: 'business-model' },
      '/market-scan': { name: '市场扫描', desc: 'SWOT+PESTLE+五力', flow: ['swot-analysis', 'pestle-analysis', 'porters-five-forces'] },
      '/pricing': { name: '定价策略', desc: '定价模型与验证', skill: 'pricing-strategy' }
    }
  },

  /* ================================================================
     3. 产品执行 execution
     ================================================================ */
  execution: {
    name: '产品执行',
    icon: '⚡',
    skills: {
      'create-prd': {
        name: 'PRD 撰写', icon: '📄',
        prompt: '请帮我撰写一份完整的 PRD。结构：1) 背景与问题 2) 产品目标 3) 用户故事（含场景） 4) 功能需求（P0/P1/P2 优先级） 5) 非功能需求（性能/安全/兼容性） 6) 核心指标体系 7) 排期建议 8) 风险与应对。'
      },
      'brainstorm-okrs': {
        name: 'OKR 设计', icon: '🎯',
        prompt: '请帮我为[团队/产品线]制定季度 OKR。包含：2-3 个 Objective（有挑战性但可达成的目标）、每个 O 下 3-5 个 Key Result（可量化的关键结果）。确保上下对齐，横纵协同。'
      },
      'outcome-roadmap': {
        name: '成果路线图', icon: '🗺️',
        prompt: '请帮我把以下功能列表转换为以成果为导向的路线图。每个里程碑包含：目标成果（不是功能名）、衡量标准、预计时间范围、依赖项。按 Now/Next/Later 结构组织。\n\n功能列表：[粘贴]'
      },
      'user-stories': {
        name: '用户故事', icon: '👤',
        prompt: '请帮我将以下需求编写为标准的用户故事。格式：「作为[角色]，我想要[功能]，以便[收益]」。每个故事附验收条件（Gherkin 格式：Given/When/Then）。遵循 INVEST 原则（独立/可协商/有价值/可估算/小规模/可测试）。\n\n需求：[描述]'
      },
      'job-stories': {
        name: 'Job Stories', icon: '🏗️',
        prompt: '请帮我将以下场景编写为 Job Stories。格式：「当[情境]时，我想要[动机/期望]，以便[预期结果]」。适用于情境驱动的功能需求。\n\n场景：[描述]'
      },
      'test-scenarios': {
        name: '测试场景', icon: '✅',
        prompt: '请帮我为以下用户故事生成测试场景。覆盖：正常流程（Happy Path）、边界条件、异常处理、权限场景。每类至少 3 条。\n\n用户故事：[粘贴]'
      },
      'pre-mortem': {
        name: '事前验尸', icon: '🔮',
        prompt: '请帮我为[产品/功能上线计划]做一次事前验尸（Pre-mortem）。假设上线 6 个月后彻底失败了，分析：最可能的失败原因 Top 10、哪些早期信号被忽视了、现在应该做什么来预防。'
      },
      'stakeholder-map': {
        name: '干系人地图', icon: '🗺️',
        prompt: '请帮我绘制[项目]的干系人地图。按「权力 × 兴趣」矩阵分类：高权力高兴趣（紧密管理）、高权力低兴趣（保持满意）、低权力高兴趣（保持知会）、低权力低兴趣（监控）。每类给出沟通策略。'
      },
      'retro': {
        name: 'Sprint 回顾', icon: '🔄',
        prompt: '请帮我主持一次 Sprint 回顾。引导我回答：什么做得好（继续保持）、什么可以改进、学到了什么、下个 Sprint 要尝试什么。用数据和具体事例支撑。'
      }
    },
    commands: {
      '/write-prd': { name: '撰写 PRD', desc: '完整产品需求文档', skill: 'create-prd' },
      '/plan-okrs': { name: 'OKR 规划', desc: '目标与关键结果', skill: 'brainstorm-okrs' },
      '/write-stories': { name: '写用户故事', desc: '用户故事+验收条件', skill: 'user-stories' },
      '/pre-mortem': { name: '事前验尸', desc: '风险预判', skill: 'pre-mortem' },
      '/stakeholder-map': { name: '干系人分析', desc: '权力兴趣矩阵', skill: 'stakeholder-map' }
    }
  },

  /* ================================================================
     4. 市场研究 research
     ================================================================ */
  research: {
    name: '市场研究',
    icon: '📊',
    skills: {
      'competitor-analysis': {
        name: '竞品分析', icon: '🔎',
        prompt: '请帮我做一份竞品分析。选取 3-5 个主要竞品（直接+间接），从以下维度对比：功能矩阵、用户体验、定价模型、目标用户、市场份额、技术架构、差异化优势。最后给出我们的定位建议和行动项。'
      },
      'user-personas': {
        name: '用户画像', icon: '👥',
        prompt: '请帮我创建 3-5 个用户画像（Persona）。每个包含：姓名/角色、人口统计、目标与动机、痛点与挫败感、技术能力、使用场景、引用的用户原话。基于真实数据或合理推断。'
      },
      'market-segments': {
        name: '市场细分', icon: '📐',
        prompt: '请帮我识别[市场]中的 3-5 个客户细分。每段包含：细分名称、人口/行为特征、JTBD、当前解决方案、支付意愿、市场规模估算。给出推荐优先级的理由。'
      },
      'customer-journey-map': {
        name: '客户旅程地图', icon: '🗺️',
        prompt: '请帮我绘制[用户角色]在[场景]中的客户旅程地图。包含 5-7 个阶段，每阶段列出：用户行为、触点、情绪曲线（-2到+2）、痛点、机会点。最后给出 3 个改善建议。'
      },
      'market-sizing': {
        name: '市场规模', icon: '📈',
        prompt: '请帮我估算[产品]的市场规模：TAM（总可寻址市场）、SAM（可服务市场）、SOM（可获得市场）。用自上而下和自下而上两种方法交叉验证。附数据来源和假设。'
      },
      'sentiment-analysis': {
        name: '情感分析', icon: '💬',
        prompt: '请帮我分析以下用户反馈的情感倾向和主题。按正面/中性/负面分类，提取 5-8 个主题（如：性能、价格、体验、客服），给出每个主题的情感得分和代表性引语。\n\n反馈数据：[粘贴]'
      }
    },
    commands: {
      '/competitive-analysis': { name: '竞品分析', desc: '多维对比分析', skill: 'competitor-analysis' },
      '/research-users': { name: '用户研究', desc: '画像+细分+旅程', flow: ['user-personas', 'market-segments', 'customer-journey-map'] },
      '/market-sizing': { name: '市场规模', desc: 'TAM/SAM/SOM', skill: 'market-sizing' }
    }
  },

  /* ================================================================
     5. 数据分析 analytics
     ================================================================ */
  analytics: {
    name: '数据分析',
    icon: '📈',
    skills: {
      'sql-queries': {
        name: 'SQL 生成', icon: '💾',
        prompt: '请帮我把以下数据分析需求转换为 SQL 查询。说明使用的数据库类型（MySQL/PostgreSQL/BigQuery）、表结构假设、查询逻辑。需求：[描述数据分析需求]'
      },
      'cohort-analysis': {
        name: '队列分析', icon: '📊',
        prompt: '请帮我设计一份队列分析方案。包含：队列定义维度（时间/行为/来源）、保留曲线预期、关键指标（Day1/Day7/Day30 保留率）、分群对比建议。基于以下产品数据：[描述数据情况]'
      },
      'ab-test-analysis': {
        name: 'A/B 测试分析', icon: '🧪',
        prompt: '请帮我分析 A/B 测试结果。计算：样本量是否充足、统计显著性（p-value）、置信区间、效应量。给出建议：发布/扩展/停止，并说明理由。测试数据：[描述实验设计+数据]'
      },
      'metrics-dashboard': {
        name: '指标仪表盘', icon: '📋',
        prompt: '请帮我设计[产品]的核心指标仪表盘。包含：北极星指标、3-5 个输入指标、2-3 个反向指标。每个指标注明定义、计算公式、数据来源、目标值、告警阈值。'
      },
      'saas-metrics': {
        name: 'SaaS 指标速查', icon: '💰',
        prompt: '请帮我分析[产品]的 SaaS 核心指标。包含：MRR/ARR、NRR、CAC、LTV、回收期、流失率、速动比率。给出当前值、基准值、改善建议。'
      }
    },
    commands: {
      '/write-query': { name: '生成 SQL', desc: '自然语言转 SQL', skill: 'sql-queries' },
      '/analyze-test': { name: 'A/B 分析', desc: '实验数据分析', skill: 'ab-test-analysis' },
      '/setup-metrics': { name: '指标设计', desc: '核心指标体系', skill: 'metrics-dashboard' }
    }
  },

  /* ================================================================
     6. 市场进入 gtm
     ================================================================ */
  gtm: {
    name: '市场进入',
    icon: '🚀',
    skills: {
      'gtm-strategy': {
        name: 'GTM 策略', icon: '🚀',
        prompt: '请帮我制定[产品]的市场进入（GTM）策略。包含：目标细分选择、渠道策略、定价与促销、关键信息传递、成功指标、90 天启动计划。'
      },
      'ideal-customer-profile': {
        name: '理想客户画像', icon: '🎯',
        prompt: '请帮我定义[产品]的理想客户画像（ICP）。包含：公司规模/行业/地区、关键决策者角色、触发事件、预算范围、购买流程特征。区分"最佳客户"和"非目标客户"。'
      },
      'beachhead-segment': {
        name: '滩头细分', icon: '🏖️',
        prompt: '请帮我从以下候选细分中选出最佳滩头市场。用 5 个维度评分（市场规模、竞争强度、进入难度、差异化空间、扩展潜力），给出推荐理由和进入策略。候选细分：[列出]'
      },
      'growth-loops': {
        name: '增长循环', icon: '🔄',
        prompt: '请帮我为[产品]设计 3 个可持续增长循环（Growth Loops/Flywheels）。每个循环说明：触发动作、增长引擎类型（病毒/内容/付费/销售）、关键转化节点、飞轮加速策略。'
      },
      'competitive-battlecard': {
        name: '竞争对战卡', icon: '⚔️',
        prompt: '请帮我制作一份针对[竞品名称]的销售对战卡。包含：竞品弱点与我们的优势对比、常见客户异议与回应话术、3 个必胜场景、红旗信号（什么时候不应该硬拼）。'
      }
    },
    commands: {
      '/plan-launch': { name: '上市计划', desc: 'GTM 策略+滩头+ICP', flow: ['beachhead-segment', 'ideal-customer-profile', 'gtm-strategy'] },
      '/growth-strategy': { name: '增长策略', desc: '增长循环设计', skill: 'growth-loops' },
      '/battlecard': { name: '对战卡', desc: '竞品销售对战', skill: 'competitive-battlecard' }
    }
  },

  /* ================================================================
     7. 营销增长 marketing
     ================================================================ */
  marketing: {
    name: '营销增长',
    icon: '📣',
    skills: {
      'positioning-statement': {
        name: '定位陈述', icon: '📍',
        prompt: '请帮我撰写产品定位陈述（Geoffrey Moore 框架）。格式：「为[目标客户]，我们的[产品名]是一个[产品类别]，它能[核心价值]。不像[主要竞品]，我们的产品[关键差异]。」请给出 3 个不同角度的版本。'
      },
      'north-star-metric': {
        name: '北极星指标', icon: '⭐',
        prompt: '请帮我为[产品]定义北极星指标（North Star Metric）。包含：北极星指标的定义和计算公式、3-5 个输入指标（驱动北极星的因子）、商业游戏分类（注意力/交易/生产力）。给出为什么这个指标能代表用户真正价值的理由。'
      },
      'marketing-ideas': {
        name: '营销创意', icon: '🎨',
        prompt: '请帮我想 10 个高性价比的营销创意。每个创意包含：渠道/方式、目标用户、核心信息、预期效果、预估预算。优先考虑零预算或低成本方案。'
      },
      'value-prop-statements': {
        name: '价值主张文案', icon: '✍️',
        prompt: '请帮我撰写 5 个版本的价值主张文案，适用于不同场景：官网首页标题、应用商店描述、广告语、电梯演讲（30秒）、销售邮件标题。'
      },
      'product-name': {
        name: '产品命名', icon: '🏷️',
        prompt: '请帮我想 15 个产品/功能名称候选。需要：易记、好发音、与品牌调性一致、域名可用性参考。按风格分类（描述型/抽象型/造词型/隐喻型），标注推荐度。'
      }
    },
    commands: {
      '/market-product': { name: '产品营销', desc: '定位+文案+创意', flow: ['positioning-statement', 'value-prop-statements', 'marketing-ideas'] },
      '/north-star': { name: '北极星指标', desc: 'NSM+输入指标', skill: 'north-star-metric' }
    }
  },

  /* ================================================================
     8. PM 工具箱 toolkit
     ================================================================ */
  toolkit: {
    name: 'PM 工具箱',
    icon: '🧰',
    skills: {
      'prioritization-frameworks': {
        name: '优先级框架', icon: '📊',
        prompt: '请帮我用合适的优先级框架对以下需求排序。可选框架：RICE（覆盖范围/影响力/信心/工作量）、ICE（影响力/信心/易实施性）、MoSCoW（必须有/应该有/可以有/不会有）、Kano 模型、机会评分。请先根据我的场景推荐最合适的框架，然后执行排序。功能列表：[粘贴]'
      },
      'review-resume': {
        name: '简历优化', icon: '📋',
        prompt: '请帮我审查和优化这份 PM 简历。用 10 条最佳实践评估：XYZ+S 公式（完成 X 通过做 Y 以达成 Z）、关键词优化、结构清晰度、量化成果、故事线。给出逐条修改建议。\n\n简历内容：[粘贴]'
      },
      'dummy-dataset': {
        name: '假数据生成', icon: '🗃️',
        prompt: '请帮我生成[业务场景]的逼真假数据集。包含：字段说明、50-100 行数据（CSV 格式）、数据分布逻辑。确保数据合理、可用于原型测试。'
      },
      'grammar-check': {
        name: '文档校对', icon: '✅',
        prompt: '请帮我校对以下文档。检查：语法错误、逻辑漏洞、不一致表述、冗余内容、专业性。逐条标注问题和修改建议。\n\n文档内容：[粘贴]'
      }
    },
    commands: {
      '/review-resume': { name: '简历优化', desc: 'PM 简历审查', skill: 'review-resume' },
      '/proofread': { name: '文档校对', desc: '语法逻辑检查', skill: 'grammar-check' },
      '/generate-data': { name: '生成数据', desc: '真实假数据集', skill: 'dummy-dataset' }
    }
  }
};

// ===== 命令检索 =====
var PM_COMMANDS = {};
(function buildCommands() {
  Object.keys(PM_SKILLS).forEach(function (domain) {
    var cmds = PM_SKILLS[domain].commands;
    if (!cmds) return;
    Object.keys(cmds).forEach(function (key) {
      PM_COMMANDS[key] = cmds[key];
      PM_COMMANDS[key].domain = domain;
    });
  });
})();

// ===== 工具函数 =====
function searchSkills(query) {
  if (!query) return [];
  var q = query.toLowerCase();
  var results = [];
  Object.keys(PM_SKILLS).forEach(function (domainKey) {
    var domain = PM_SKILLS[domainKey];
    Object.keys(domain.skills).forEach(function (skillKey) {
      var skill = domain.skills[skillKey];
      if (skillKey.indexOf(q) >= 0 ||
          skill.name.toLowerCase().indexOf(q) >= 0 ||
          (skill.prompt && skill.prompt.toLowerCase().indexOf(q) >= 0)) {
        results.push({
          key: skillKey,
          domain: domainKey,
          domainName: domain.name,
          icon: skill.icon,
          name: skill.name,
          prompt: skill.prompt
        });
      }
    });
  });
  return results.slice(0, 12);
}

function searchCommands(query) {
  if (!query) return Object.keys(PM_COMMANDS).map(function (k) { return { key: k, cmd: PM_COMMANDS[k] }; });
  var q = query.toLowerCase().replace('/', '');
  var results = [];
  Object.keys(PM_COMMANDS).forEach(function (key) {
    var cmd = PM_COMMANDS[key];
    if (key.indexOf(q) >= 0 || cmd.name.toLowerCase().indexOf(q) >= 0) {
      results.push({ key: key, cmd: cmd });
    }
  });
  return results.slice(0, 10);
}
