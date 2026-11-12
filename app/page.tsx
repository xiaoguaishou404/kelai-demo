import { login } from "@/lib/actions";
import { ROLE_LABEL, homeFor } from "@/lib/labels";
import { getSessionUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { DEMO_PASSWORD, type Role } from "@/lib/types";
import { redirect } from "next/navigation";

const order: Role[] = ["student", "teacher", "leader", "ops"];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));
  const { e } = await searchParams;
  const users = readDb().users.slice().sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.name.localeCompare(b.name, "zh-CN"));
  return (
    <div className="login">
      <section className="login-copy">
        <p className="kicker">合作院校租户</p>
        <h1>用真实问题练岗位，用成果和答辩做验收。</h1>
        <p>平台由科来提供岗位风向、目标挑战、专家范本和云端分析环境。学校负责开班、评分和答辩。不对社会公众开放，也不接受学生个人注册。</p>
        <p>本地镜像不能下载。云桌面里的软件和脱敏样本只在会话中使用。</p>
      </section>
      <section className="login-panel">
        <h2>进入学校租户</h2>
        <p className="muted">演示口令统一为 {DEMO_PASSWORD}。正式环境对接院校身份，不在这里注册。</p>
        {e ? <p className="error">账号或口令不对。</p> : null}
        <form action={login} className="stack">
          <div className="accounts">
            {users.map((item) => (
              <label key={item.id} className="account">
                <input type="radio" name="userId" value={item.id} required />
                <span>
                  <b>{item.name}</b>
                  <small className="muted"> {item.title}</small>
                </span>
                <span className="pill">{ROLE_LABEL[item.role]}</span>
              </label>
            ))}
          </div>
          <label className="field">
            口令
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="btn" type="submit">进入</button>
        </form>
      </section>
    </div>
  );
}
