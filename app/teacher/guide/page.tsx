import { PageHead } from "@/components/bits";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";

export const metadata = { title: "开课导引" };

const steps = [
  { title: "这门课不按步骤点击", body: "学生可以查资料、问人或用 AI。你要看的是最终证据和答辩，不是他有没有按手册点过每一个按钮。" },
  { title: "你不必先成为设备专家", body: "每门案卷都有专家范本、误区和答辩问题。范本用来帮你判断边界，不是用来当标准答案宣读。" },
  { title: "必选和选配", body: "故障定位、汇报结论是学校必选。装机、听懂问题、链路和告警由学院选配，你可以按班级再增减选配案卷。" },
  { title: "什么时候退回", body: "结论跳过证据、把问题归咎到带宽或数据库、没写清看不见的边界，就退回。退回要写改什么。" },
  { title: "怎么打分", body: "按案卷覆盖的能力块打 1 到 5。标签用来点出证据、边界或跳跃。答辩注记留给「他为什么这样判断」。" },
];

export default async function GuidePage() {
  await requireRole("teacher");
  const challenges = readDb().challenges;
  return (
    <>
      <PageHead kicker="教师开课" title="半天能掌握的验收方式" lede="科来维护标准和偶尔到校交流，日常课堂由你带。" />
      <div className="stack">
        {steps.map((step, index) => (
          <section key={step.title} className="card">
            <h2>{index + 1}. {step.title}</h2>
            <p>{step.body}</p>
          </section>
        ))}
      </div>
      <div className="stack" style={{ marginTop: 14 }}>
        {challenges.map((challenge) => (
          <section key={challenge.id} className="card">
            <h2>{challenge.code} {challenge.title}</h2>
            <p>{challenge.teacher.goal}</p>
            <p>通过时看：{challenge.teacher.lookFor.join("；")}</p>
            <p>退回当：{challenge.teacher.returnWhen.join("；")}</p>
            <p>答辩：{challenge.teacher.defenseQuestions.join("；")}</p>
          </section>
        ))}
      </div>
    </>
  );
}
