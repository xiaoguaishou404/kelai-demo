import {
  SCHEMA_VERSION,
  emptyWork,
  type Challenge,
  type Database,
  type Submission,
  type WorkDraft,
} from "./types";

const tradeListen =
  "客户说的是下午两点收银台偶发转圈，不是整网中断。带宽没用满，数据库也没报警，所以不能先收成「网络坏了」或「库慢」。要确认的是这笔收银业务从哪一跳开始等。";

const tradeReport = {
  need: "收银台下午两点开始偶发转圈，店员无法判断是网络、数据库还是支付渠道。",
  path: "收银终端 → 接入交换机 → 负载均衡 → 订单服务 → 支付网关（第三方，无镜像）→ 回到订单服务。订单库在旁路。",
  conclusion: "慢在订单服务等待支付渠道回包，不是带宽打满，也不是数据库。",
  evidence: "等待支付回包约 1800ms，订单服务自身约 40ms，订单库约 22ms，前面几跳都在几十毫秒内。支付网关当前不可见。",
  next: "在支付调用处保留时延，向渠道要同一时段日志。先不要扩带宽。",
};

function work(patch: Partial<WorkDraft> & { report?: Partial<WorkDraft["report"]> }): WorkDraft {
  const base = emptyWork();
  return {
    ...base,
    ...patch,
    hopMarks: patch.hopMarks ?? {},
    alertDecisions: patch.alertDecisions ?? {},
    alertReasons: patch.alertReasons ?? {},
    installDone: patch.installDone ?? [],
    report: { ...base.report, ...patch.report },
  };
}

function submission(input: Omit<Submission, "classId" | "work"> & { work: WorkDraft }): Submission {
  return { ...input, classId: "class-01" };
}

const correctMarks = {
  pos: "capture",
  sw: "capture",
  lb: "capture",
  app: "capture",
  wait: "capture",
  pay: "blind",
  db: "capture",
} as const;

const correctAlerts = {
  a1: "investigate",
  a2: "noise",
  a3: "investigate",
  a4: "noise",
  a5: "investigate",
  a6: "noise",
  a7: "correlate",
  a8: "noise",
} as const;

const alertReasons = {
  a1: "一分钟内同一主机大量扫端口，先收成一条事件。",
  a2: "和上一条是同一轮扫描的重复计数。",
  a3: "核心交换机 CPU 连续六分钟超过九成，不是闪断。",
  a4: "CPU 恢复后的抖动重复，不另开案。",
  a5: "支付成功率从 99.2 掉到 96.1，这是业务黄金指标。",
  a6: "办公网打印机离线，和收银无关。",
  a7: "DNS 超时和支付成功率下降在同一分钟，要放在一起看。",
  a8: "防火墙策略命中是日常波动。",
};

export function createSeed(): Database {
  const challenges: Challenge[] = [
    {
      id: "trade-slow",
      code: "KL-2026-014",
      title: "收银台转圈：慢在哪一跳",
      scene: "临江商超下午高峰，收银偶发转圈。网管说带宽没用满，库也没有告警。",
      quote: "下午两点开始，收银台偶发转圈。带宽没用满，数据库也没报警，你们别一上来就让我加带宽。",
      summary: "用脱敏收银流量判断慢点，并讲清第三方支付哪里看不见。",
      dimensions: ["listen", "topology", "fault", "report"],
      core: true,
      published: true,
      minutes: 45,
      indicators: [
        "痛点写成业务现象，而不是「网络故障」四个字",
        "链路里标出采集点和至少一处第三方盲区",
        "慢点有时延数字，并写明哪一段没有镜像",
        "汇报包含需求、链路、结论、证据和下一步",
      ],
      stages: [
        {
          id: "listen",
          title: "听懂问题",
          kind: "listen",
          dimension: "listen",
          prompt: "把客户原话收成一句话：谁在什么时候遇到什么业务现象，目前排除了什么。",
        },
        {
          id: "topology",
          title: "画出链路",
          kind: "topology",
          dimension: "topology",
          prompt: "给每一跳标采集点或盲区。看不见的第三方不要画成已经采到。",
        },
        {
          id: "fault",
          title: "故障定位",
          kind: "fault",
          dimension: "fault",
          prompt: "在云桌面样本里指出慢的那一跳，写时延依据，并写清不可见边界。",
        },
        {
          id: "report",
          title: "汇报结论",
          kind: "report",
          dimension: "report",
          prompt: "按需求、链路、结论、证据、下一步写一份能当着客户念的复盘。",
        },
      ],
      hops: [
        { id: "pos", name: "收银终端", latencyMs: 12, visible: true, note: "终端到接入，时延稳定。" },
        { id: "sw", name: "接入交换机", latencyMs: 8, visible: true, note: "无丢包，缓冲没堆起来。" },
        { id: "lb", name: "负载均衡", latencyMs: 15, visible: true, note: "连接正常转发。" },
        { id: "app", name: "订单服务", latencyMs: 40, visible: true, note: "服务自身处理大约 40ms。" },
        { id: "wait", name: "订单服务等待支付回包", latencyMs: 1800, visible: true, note: "调用支付后停在等待，约 1.8 秒。" },
        { id: "pay", name: "支付网关", latencyMs: null, visible: false, note: "第三方，现场没有镜像。" },
        { id: "db", name: "订单库", latencyMs: 22, visible: true, note: "查询很快，不像瓶颈。" },
      ],
      alerts: [],
      installSteps: [],
      expectedSlowHopId: "wait",
      expectedBlindHopIds: ["pay"],
      expectedCaptureHopIds: ["pos", "sw", "lb", "app", "wait", "db"],
      sampleName: "PAY-20260318-脱敏",
      sampleNote: "14:02–14:20 收银旁路。TCP 重传不多，不像带宽打满。应用层能看到订单服务停在支付调用。",
      expert: {
        mindset: [
          "先复述业务现象：转圈发生在收银，不是全网中断。",
          "用每一跳的时延排除带宽和数据库。",
          "看不见的支付网关要说成边界，不能编造数字。",
        ],
        pitfalls: ["一听慢就扩带宽", "看到数据库就判库慢", "把没有镜像的第三方画成已采集"],
        answer: "慢点在订单服务等待支付渠道回包。订单库只有二十多毫秒，前面几跳也没有拥塞。支付网关在第三方，当前镜像采不到，所以结论必须写上这段不可见。下一步是支付调用打点和对渠道日志，而不是扩容。",
      },
      teacher: {
        goal: "学生能排除带宽和数据库，并把第三方支付说成采集边界。",
        lookFor: ["有具体毫秒数", "盲区标在支付网关", "下一步不是扩带宽"],
        returnWhen: ["结论直接跳到扩容或换库", "没有写不可见边界", "慢点选在时延很低的一跳"],
        defenseQuestions: ["为什么不是数据库？", "支付网关为什么不能写一个时延数字？", "如果只能做一个动作，你先做哪个？"],
      },
    },
    {
      id: "alert-flood",
      code: "KL-2026-021",
      title: "分支告警洪峰：哪些值得深查",
      scene: "同一分钟里冒出几十条安全与设备告警，值班同学不知道先看哪条。",
      quote: "告警刷屏了。扫描、CPU、打印机、支付成功率都在响，我总不能每条都开案。",
      summary: "在一批同时段告警里分出深查、噪音和该关联的事件。",
      dimensions: ["listen", "alert", "report"],
      core: false,
      published: true,
      minutes: 30,
      indicators: [
        "黄金指标和持续性异常被标成值得深查",
        "重复计数和无关办公告警被收成噪音",
        "同一分钟的关联现象没有拆成互相无关的案",
        "汇报说明为什么先看这些、不看那些",
      ],
      stages: [
        {
          id: "listen",
          title: "听懂问题",
          kind: "listen",
          dimension: "listen",
          prompt: "值班同学真正怕的是漏掉业务事故，不是把每条告警都点完。",
        },
        {
          id: "alert",
          title: "告警取舍",
          kind: "alert",
          dimension: "alert",
          prompt: "每条告警选值得深查、重复噪音或关联查看，并写一句理由。",
        },
        {
          id: "report",
          title: "汇报结论",
          kind: "report",
          dimension: "report",
          prompt: "告诉值班同学先处理哪一组，哪些可以合并，哪些先放下。",
        },
      ],
      hops: [],
      alerts: [
        { id: "a1", time: "14:06:02", source: "入侵检测", title: "同一主机一分钟内四十次端口扫描", detail: "源 10.4.8.21，目的是分支办公网段。", expected: "investigate", teacherNote: "合成一条扫描事件即可。" },
        { id: "a2", time: "14:06:11", source: "入侵检测", title: "端口扫描重复计数", detail: "与上一条同一源、同一分钟，只是规则又报了一次。", expected: "noise", teacherNote: "重复计数。" },
        { id: "a3", time: "14:06:20", source: "设备监控", title: "核心交换机 CPU 92% 持续六分钟", detail: "没有在一分钟内恢复。", expected: "investigate", teacherNote: "持续性才值得深查。" },
        { id: "a4", time: "14:12:40", source: "设备监控", title: "CPU 回落后的抖动重复", detail: "已恢复到 30% 附近，规则又抖了两次。", expected: "noise", teacherNote: "恢复后的重复。" },
        { id: "a5", time: "14:06:18", source: "业务指标", title: "支付成功率 99.2% 降到 96.1%", detail: "与收银转圈同一时段。", expected: "investigate", teacherNote: "这是黄金指标。" },
        { id: "a6", time: "14:07:02", source: "办公网", title: "二楼打印机离线", detail: "与收银链路无关。", expected: "noise", teacherNote: "无关噪音。" },
        { id: "a7", time: "14:06:19", source: "DNS", title: "支付域名解析超时增多", detail: "和成功率下降同一分钟。", expected: "correlate", teacherNote: "跟支付放一起看。" },
        { id: "a8", time: "14:06:30", source: "防火墙", title: "策略命中计数日常波动", detail: "幅度落在近七天基线里。", expected: "noise", teacherNote: "基线内波动。" },
      ],
      installSteps: [],
      expectedSlowHopId: "",
      expectedBlindHopIds: [],
      expectedCaptureHopIds: [],
      sampleName: "ALERT-20260318-脱敏",
      sampleNote: "14:06 前后的告警导出。支付成功率是业务侧指标，其余来自设备和安全规则。",
      expert: {
        mindset: ["先找会让业务失败的指标", "把同一件事的重复规则收成一条", "同一分钟的相关现象不要拆碎"],
        pitfalls: ["按告警条数从多到少处理", "把打印机和支付成功率放进同一个事故", "每个 DNS 超时都单独开案"],
        answer: "支付成功率才是这批告警里的黄金指标。它要和同一分钟的 DNS 超时放在一起看。端口扫描收成一条，重复计数丢掉。交换机 CPU 因为连续六分钟才值得看。打印机和策略命中先放下。",
      },
      teacher: {
        goal: "学生能把黄金指标、持续异常、重复噪音和关联事件分开。",
        lookFor: ["支付成功率被深查", "DNS 被关联而不是另起炉灶", "打印机被放下"],
        returnWhen: ["八条都选深查", "把支付成功率当成噪音", "没有任何合并"],
        defenseQuestions: ["如果只能先打一个电话，你打给谁？", "为什么 DNS 不单独开案？", "CPU 抖动为什么可以先放下？"],
      },
    },
    {
      id: "deploy-probe",
      code: "KL-2026-008",
      title: "新站点探针：先让样本看得见",
      scene: "新门店要接入旁路分析。镜像口、许可、样本和采集口还没核对。",
      quote: "软件装上了但看不到流量。我不确定是镜像没接、许可没导，还是样本导错了。",
      summary: "按顺序完成镜像确认、许可、样本导入和采集口检查。",
      dimensions: ["deploy", "report"],
      core: false,
      published: true,
      minutes: 25,
      indicators: [
        "先确认镜像口，再判断软件",
        "许可、样本、采集口按顺序完成",
        "结论写清现在看得见什么、还缺什么",
      ],
      stages: [
        {
          id: "install",
          title: "装机与环境部署",
          kind: "install",
          dimension: "deploy",
          prompt: "按顺序做完五步。跳步会把「没接镜像」误判成软件故障。",
        },
        {
          id: "report",
          title: "汇报结论",
          kind: "report",
          dimension: "report",
          prompt: "写清环境是否连通、样本是否可见，以及下一步该查镜像还是查软件。",
        },
      ],
      hops: [],
      alerts: [],
      installSteps: [
        { id: "mirror", title: "确认旁路镜像口", detail: "先看交换机镜像会话是否把收银 VLAN 送到探针口。" },
        { id: "license", title: "导入教学许可", detail: "没有许可时界面能开，但分析功能不会出数。" },
        { id: "sample", title: "导入脱敏流量样本", detail: "样本只在这台云桌面里使用，不能导出镜像。" },
        { id: "capture", title: "检查采集口有流量", detail: "确认包速率不为零，再谈规则和视图。" },
        { id: "baseline", title: "保存基线并记一笔机时", detail: "记下样本名和开始时间，方便以后对照。" },
      ],
      expectedSlowHopId: "",
      expectedBlindHopIds: [],
      expectedCaptureHopIds: [],
      sampleName: "SHOP-BASELINE-脱敏",
      sampleNote: "新门店基线样本。先有镜像口，导入后采集口应能看到收银 VLAN 的包。",
      expert: {
        mindset: ["先证明镜子里有光，再怀疑相机", "每一步都要有可见的结果", "样本和软件都不离开云桌面"],
        pitfalls: ["软件一开就导入样本", "采集口为零仍去调分析规则", "把镜像文件拷走"],
        answer: "先确认镜像口，再谈软件。顺序是镜像口、教学许可、脱敏样本、采集口有流量、保存基线。采集口仍然为零时，回去查镜像会话，不要先重装。",
      },
      teacher: {
        goal: "学生按顺序把环境准备到能取证，并且不要求下载镜像。",
        lookFor: ["五步按顺序", "知道采集口为零时先查镜像", "汇报里有样本名"],
        returnWhen: ["跳过镜像口", "结论是直接重装", "试图导出镜像"],
        defenseQuestions: ["为什么不能先导入样本？", "采集口为零你先查哪？", "样本为什么不能拷回自己电脑？"],
      },
    },
  ];

  const xuTrade = submission({
    id: "sub-xu-trade",
    challengeId: "trade-slow",
    studentId: "stu-xu",
    status: "accepted",
    updatedAt: "2026-11-08T03:20:00.000Z",
    stuckOpened: false,
    attempt: 1,
    history: [],
    work: work({
      listenNote: tradeListen,
      hopMarks: { ...correctMarks },
      slowHopId: "wait",
      faultEvidence: "样本 PAY-20260318 里，订单服务自身大约 40ms，等待支付回包约 1800ms。订单库 22ms，接入侧没有拥塞，TCP 重传也不多。",
      invisibleBoundary: "支付网关在第三方，当前镜像采不到回包离开订单服务之后的路径，不能给网关编一个时延。",
      report: tradeReport,
    }),
    review: {
      at: "2026-11-09T06:00:00.000Z",
      reviewerId: "teacher-chen",
      decision: "accept",
      scores: { listen: 5, topology: 5, fault: 5, report: 4 },
      tags: ["证据具体", "边界清楚", "链路完整"],
      comment: "排除了带宽和数据库，盲区写在支付网关上。汇报还可以再短一点，但已经能当着客户讲。",
      defenseNote: "能回答为什么不扩带宽，也能说明网关数字不能编。",
      reason: "",
    },
  });

  const xuAlert = submission({
    id: "sub-xu-alert",
    challengeId: "alert-flood",
    studentId: "stu-xu",
    status: "accepted",
    updatedAt: "2026-11-10T02:10:00.000Z",
    stuckOpened: false,
    attempt: 1,
    history: [],
    work: work({
      listenNote: "值班同学怕的是漏掉收银事故。告警多不是目标，先保住支付成功率，再处理会持续影响转发的设备。",
      alertDecisions: { ...correctAlerts },
      alertReasons,
      report: {
        need: "同一分钟告警刷屏，值班同学不知道先看哪条，怕漏掉真正影响收银的事件。",
        path: "业务指标（支付成功率、DNS）和设备/安全规则是两条线，只在同一分钟相交。",
        conclusion: "先看支付成功率，并把同一分钟的 DNS 超时跟它放一起。扫描收成一条，CPU 持续六分钟才看，打印机和策略波动放下。",
        evidence: "成功率从 99.2 降到 96.1，DNS 超时发生在 14:06:19。CPU 连续六分钟在 92%。扫描有一条重复计数。",
        next: "先给支付链路和 DNS 对一下 14:06 的日志，扫描合并成一条事件，打印机不进这个案。",
      },
    }),
    review: {
      at: "2026-11-10T08:30:00.000Z",
      reviewerId: "teacher-chen",
      decision: "accept",
      scores: { listen: 4, alert: 5, report: 5 },
      tags: ["告警取舍得当", "证据具体"],
      comment: "黄金指标和关联关系都对，噪音也收干净了。",
      defenseNote: "能说明为什么 DNS 不单独开案。",
      reason: "",
    },
  });

  const xuDeploy = submission({
    id: "sub-xu-deploy",
    challengeId: "deploy-probe",
    studentId: "stu-xu",
    status: "draft",
    updatedAt: "2026-11-11T09:00:00.000Z",
    stuckOpened: false,
    attempt: 1,
    history: [],
    work: work({ installDone: ["mirror", "license", "sample"] }),
    review: null,
  });

  const shen = submission({
    id: "sub-shen-trade",
    challengeId: "trade-slow",
    studentId: "stu-shen",
    status: "submitted",
    updatedAt: "2026-11-12T01:40:00.000Z",
    stuckOpened: false,
    attempt: 1,
    history: [],
    work: work({
      listenNote: "下午两点收银台偶发转圈。客户强调带宽没用满，也不希望我们直接加带宽。现象集中在收银，不是全网断。",
      hopMarks: { pos: "capture", sw: "blind", lb: "capture", app: "capture", wait: "pass", pay: "capture", db: "capture" },
      slowHopId: "db",
      faultEvidence: "我觉得慢通常是数据库。订单库在链路上，虽然数字只有 22ms，但我还是把它当成瓶颈。",
      invisibleBoundary: "支付那边我标成了采集点，暂时没写看不见的边界。",
      report: {
        need: "收银台转圈，客户不想先加带宽。",
        path: "终端到交换机到负载均衡，再到订单服务、支付网关和订单库。",
        conclusion: "建议扩容数据库，并适当增加带宽，避免高峰再转圈。",
        evidence: "业务变慢时数据库在链路上，支付网关我也标成了能看到。",
        next: "安排数据库扩容窗口，同时让网管看一下出口带宽。",
      },
    }),
    review: null,
  });

  const jiang = submission({
    id: "sub-jiang-trade",
    challengeId: "trade-slow",
    studentId: "stu-jiang",
    status: "returned",
    updatedAt: "2026-11-11T04:12:00.000Z",
    stuckOpened: false,
    attempt: 1,
    history: [],
    work: work({
      listenNote: "客户说收银台转圈，带宽看着没用满。我先把它理解成网络容量不够，所以后面的结论偏向扩容。",
      hopMarks: { pos: "capture", sw: "capture", lb: "capture", app: "capture", wait: "pass", pay: "capture", db: "capture" },
      slowHopId: "sw",
      faultEvidence: "接入交换机只有 8ms，但我怀疑高峰时交换机是瓶颈，所以建议先扩带宽。",
      invisibleBoundary: "还没写哪一段没有镜像。",
      report: {
        need: "收银台下午转圈，客户催我们给个说法。",
        path: "终端、交换机、负载均衡、订单服务、支付和数据库都在一条线上。",
        conclusion: "慢在接入侧，建议先扩带宽。",
        evidence: "客户说转圈，我就按网络拥塞来写了。",
        next: "提交带宽扩容申请。",
      },
    }),
    review: {
      at: "2026-11-11T07:30:00.000Z",
      reviewerId: "teacher-chen",
      decision: "return",
      scores: { listen: 3, topology: 2, fault: 2, report: 2 },
      tags: ["结论跳跃", "归咎带宽"],
      comment: "痛点还在，但结论跳过了样本里的时延。8ms 的交换机解释不了转圈。",
      defenseNote: "",
      reason: "用样本里的毫秒数重新选慢点，并补上哪一段其实没有镜像。先不要写扩容。",
    },
  });

  const gu = submission({
    id: "sub-gu-alert",
    challengeId: "alert-flood",
    studentId: "stu-gu",
    status: "draft",
    updatedAt: "2026-11-12T06:05:00.000Z",
    stuckOpened: true,
    attempt: 1,
    history: [],
    work: work({
      listenNote: "告警太多。我知道不能每条都开案，但还没分清哪些是同一件事。",
      alertDecisions: { a1: "investigate", a2: "noise", a5: "investigate" },
      alertReasons: {
        a1: "同一分钟扫了很多端口，先当一条事件看。",
        a2: "和上一条是重复计数。",
        a5: "支付成功率掉了，这是业务指标。",
      },
    }),
    review: null,
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    users: [
      { id: "ops-lin", name: "林知衡", role: "ops", tenantId: "kelai", title: "内容与租户运营" },
      { id: "leader-zhou", name: "周启明", role: "leader", tenantId: "tenant-linjiang", title: "网络空间安全学院" },
      { id: "teacher-chen", name: "陈疏影", role: "teacher", tenantId: "tenant-linjiang", title: "实训课教师" },
      { id: "stu-xu", name: "许知夏", role: "student", tenantId: "tenant-linjiang", title: "网络空间安全 · 2024 级" },
      { id: "stu-shen", name: "沈予安", role: "student", tenantId: "tenant-linjiang", title: "网络空间安全 · 2024 级" },
      { id: "stu-jiang", name: "江晚宁", role: "student", tenantId: "tenant-linjiang", title: "网络空间安全 · 2024 级" },
      { id: "stu-gu", name: "顾清和", role: "student", tenantId: "tenant-linjiang", title: "网络空间安全 · 2024 级" },
      { id: "stu-liang", name: "梁小满", role: "student", tenantId: "tenant-linjiang", title: "网络空间安全 · 2025 级" },
    ],
    tenants: [
      {
        id: "tenant-linjiang",
        name: "临江理工学院",
        college: "网络空间安全学院",
        plan: "2026 基础年费 · 1200 分钟云桌面",
        year: "2026",
        desktopQuotaMinutes: 1200,
        desktopUsedMinutes: 200,
        enabledDimensions: ["deploy", "listen", "topology", "fault", "alert", "report"],
      },
      {
        id: "tenant-jiangbei",
        name: "江北职业技术学院",
        college: "信息工程学院",
        plan: "2026 基础年费 · 800 分钟云桌面",
        year: "2026",
        desktopQuotaMinutes: 800,
        desktopUsedMinutes: 860,
        enabledDimensions: ["listen", "fault", "report"],
        aggregate: { classes: 3, students: 96, usedMinutes: 860 },
      },
    ],
    classes: [
      {
        id: "class-01",
        name: "流量分析实训 01",
        tenantId: "tenant-linjiang",
        teacherId: "teacher-chen",
        term: "2026 春",
        studentIds: ["stu-xu", "stu-shen", "stu-jiang", "stu-gu", "stu-liang"],
        requiredChallengeIds: ["trade-slow"],
        optionalChallengeIds: ["alert-flood", "deploy-probe"],
      },
    ],
    jobs: [
      {
        id: "job-svc",
        name: "技术服务工程师",
        summary: "到客户现场把采集环境装好，并凭流量证据把故障讲清楚。",
        duties: ["完成旁路接入和软件初始化", "根据样本定位慢点和断点", "写出客户能听懂的复盘"],
        companyTypes: ["科来及同业技术服务团队", "行业运维服务商", "集成商交付团队"],
        dimensions: ["deploy", "fault", "report"],
        skills: ["镜像与采集口排查", "时延证据", "复盘写作"],
      },
      {
        id: "job-analysis",
        name: "协议与安全分析",
        summary: "在大量告警和流量里判断什么值得深查，什么是重复噪音。",
        duties: ["还原业务链路和第三方边界", "合并重复告警", "给出可复核的证据"],
        companyTypes: ["网络安全分析团队", "可观测性产品团队", "金融与运营商 SOC"],
        dimensions: ["topology", "fault", "alert"],
        skills: ["链路边界", "告警降噪", "证据链"],
      },
      {
        id: "job-presales",
        name: "售前实施",
        summary: "把客户的一句抱怨翻译成场景，并用 PoC 讲清价值和边界。",
        duties: ["提炼业务痛点", "画出可采集与不可采集的范围", "组织 PoC 汇报"],
        companyTypes: ["科来及同业售前", "解决方案团队", "行业方案商"],
        dimensions: ["listen", "topology", "report"],
        skills: ["需求翻译", "范围边界", "PoC 叙事"],
      },
      {
        id: "job-ops",
        name: "可观测性运维",
        summary: "维持采集环境可用，并在告警洪峰里保住业务指标。",
        duties: ["保证探针和样本可重复", "盯住黄金指标", "把持续异常和抖动分开"],
        companyTypes: ["企业运维", "云网可观测团队", "分支机构网络运维"],
        dimensions: ["deploy", "fault", "alert"],
        skills: ["环境基线", "故障定位", "告警取舍"],
      },
    ],
    challenges,
    submissions: [xuTrade, xuAlert, xuDeploy, shen, jiang, gu],
    sessions: [
      closedSession("ses-xu-trade", "stu-xu", "trade-slow", "2026-11-08T01:00:00.000Z", 50),
      closedSession("ses-xu-deploy", "stu-xu", "deploy-probe", "2026-11-11T08:00:00.000Z", 36, 1),
      closedSession("ses-xu-alert", "stu-xu", "alert-flood", "2026-11-10T01:00:00.000Z", 24),
      closedSession("ses-shen", "stu-shen", "trade-slow", "2026-11-12T00:20:00.000Z", 40),
      closedSession("ses-jiang", "stu-jiang", "trade-slow", "2026-11-11T02:00:00.000Z", 28),
      closedSession("ses-gu", "stu-gu", "alert-flood", "2026-11-12T05:10:00.000Z", 22),
    ],
    trend: {
      season: "2026 春",
      headline: "现场要的是能拿流量证据讲清边界的人",
      notes: [
        "技术服务岗位仍把装机、取证和复盘写在同一条职责里。",
        "安全分析岗位把告警降噪放在协议熟悉度前面。",
        "售前实施看重能不能把客户原话收成一个可验收的问题。",
        "外部 CSNA 说明能力方向，本平台不组织考试、不发证。",
      ],
    },
    releases: [
      { id: "rel-1", at: "2026-03-01T02:00:00.000Z", title: "岗位风向 2026.1", body: "更新四类岗位的技能要求和六维对应关系。" },
      { id: "rel-2", at: "2026-03-12T02:00:00.000Z", title: "挑战包 2026.1", body: "发布收银台时延、告警洪峰、新站点探针三门案卷。" },
      { id: "rel-3", at: "2026-04-02T02:00:00.000Z", title: "云桌面 教学沙箱 2026.1", body: "RAS 回溯分析教学环境更新脱敏样本，仍禁止镜像下载。" },
    ],
    desktop: {
      product: "科来 RAS 回溯分析",
      version: "教学沙箱 2026.1",
      policy: "只在平台云端运行。不提供虚拟机镜像下载，样本不能拷出桌面。",
    },
  };
}

function closedSession(
  id: string,
  studentId: string,
  challengeId: string,
  startedAt: string,
  chargedMinutes: number,
  resetCount = 0,
) {
  return {
    id,
    studentId,
    challengeId,
    startedAt,
    reservedMinutes: chargedMinutes,
    chargedMinutes,
    extensions: 0,
    resetCount,
    status: "closed" as const,
  };
}
