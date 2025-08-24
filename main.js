// 工具函数：格式化
const pad = (n) => String(n).padStart(2, "0");

const els = {
  tz: document.getElementById("timezone"),
  is24h: document.getElementById("is24h"),
  themeBtn: document.getElementById("themeBtn"),
  h: document.getElementById("handHour"),
  m: document.getElementById("handMinute"),
  s: document.getElementById("handSecond"),
  t: document.getElementById("digitalTime"),
  d: document.getElementById("digitalDate"),
  ticks: document.querySelector(".ticks")
};

// 1) 填充时区列表（使用 Intl 支持）
function populateTimezones() {
  // 常用优先 + 全量 fallback
  const common = [
    "Asia/Shanghai","Asia/Hong_Kong","Asia/Tokyo","Asia/Bangkok",
    "Europe/Moscow","Europe/London","Europe/Paris",
    "America/Los_Angeles","America/New_York","UTC"
  ];

  // 尝试获取全部时区（部分旧浏览器不支持）
  let zones = common;
  try {
    zones = Array.from(Intl.supportedValuesOf("timeZone"));
    // 把常用放前面去重
    const set = new Set([...common, ...zones]);
    zones = Array.from(set);
  } catch { /* 忽略，使用 common */ }

  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  zones.forEach(z => {
    const opt = document.createElement("option");
    opt.value = z;
    opt.textContent = z === local ? `${z}（本地）` : z;
    if (z === local) opt.selected = true;
    els.tz.appendChild(opt);
  });
}

// 2) 刻度阴影一次性生成（性能好）
function buildTicks() {
  const deg = (i) => `rotate(${i * 6}deg) translateY(-140px)`;
  // 细刻度
  const fine = [];
  for (let i = 0; i < 60; i++) {
    const y = Math.cos((Math.PI/180) * (i*6));
    const h = i % 5 === 0 ? 0 : 1; // 与粗刻度错开
    fine.push(`0 0 0 0 rgba(0,0,0,0)`);
  }
  // 粗刻度
  const bold = [];
  for (let i = 0; i < 60; i++) {
    bold.push(`0 0 0 0 rgba(0,0,0,0)`);
  }
  // 用 transform 不能直接应用到 box-shadow，改用旋转容器思路：生成 60 个子元素更直观
  // 但为零依赖与简洁，这里保持无额外 DOM，换成渐进式做法：不用 box-shadow 黑科技，直接插入刻度条。
  // —— 实际实现：插入 60 条刻度线
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 60; i++) {
    const tick = document.createElement("span");
    tick.style.position = "absolute";
    tick.style.left = "50%";
    tick.style.top = "6px";
    tick.style.transform = `translateX(-50%) rotate(${i*6}deg)`;
    tick.style.transformOrigin = "center 144px";
    const isBold = i % 5 === 0;
    tick.style.width = isBold ? "4px" : "2px";
    tick.style.height = isBold ? "18px" : "10px";
    tick.style.background = isBold ? "var(--muted)" : "var(--ring)";
    frag.appendChild(tick);
  }
  els.ticks.innerHTML = "";
  els.ticks.appendChild(frag);
}

// 3) 渲染时间
let rafId = 0;
function render() {
  const tz = els.tz.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  // 通过目标时区构造“那边的现在”
  // 利用 toLocaleString + 重新 new Date 规避时区偏移难点
  const fmtNow = new Date(now.toLocaleString("en-US", { timeZone: tz }));

  const h = fmtNow.getHours();
  const m = fmtNow.getMinutes();
  const s = fmtNow.getSeconds();
  const ms = fmtNow.getMilliseconds();

  // 模拟表指针角度（带平滑秒针）
  const secDeg = (s + ms/1000) * 6;            // 360/60
  const minDeg = (m + s/60) * 6;
  const hourDeg = ((h % 12) + m/60) * 30;      // 360/12

  els.s.style.transform = `translate(-50%, -100%) rotate(${secDeg}deg)`;
  els.m.style.transform = `translate(-50%, -100%) rotate(${minDeg}deg)`;
  els.h.style.transform = `translate(-50%, -100%) rotate(${hourDeg}deg)`;

  // 数字显示
  const is24 = els.is24h.checked;
  const hh = is24 ? pad(h) : pad(((h + 11) % 12) + 1);
  const suffix = is24 ? "" : (h >= 12 ? " PM" : " AM");
  els.t.textContent = `${hh}:${pad(m)}:${pad(s)}${suffix}`;

  // 日期本地化（中文-地区中性）
  const dateStr = fmtNow.toLocaleDateString("zh-CN", {
    year: "numeric", month: "long", day: "numeric", weekday: "long", timeZone: tz
  });
  els.d.textContent = dateStr;

  rafId = requestAnimationFrame(render);
}

// 4) 主题切换（覆盖系统偏好）
function setupThemeToggle(){
  let manual = null; // "dark" | "light" | null
  function apply(){
    document.documentElement.dataset.theme = manual || "";
    if (manual === "dark") {
      document.documentElement.style.colorScheme = "dark";
    } else if (manual === "light") {
      document.documentElement.style.colorScheme = "light";
    } else {
      document.documentElement.style.colorScheme = "normal";
    }
  }
  els.themeBtn.addEventListener("click", ()=>{
    if (manual === null) manual = "dark";
    else if (manual === "dark") manual = "light";
    else manual = null;
    els.themeBtn.setAttribute("aria-pressed", manual ? "true" : "false");
    els.themeBtn.textContent = manual === "dark" ? "切到浅色" : manual === "light" ? "跟随系统" : "切换主题";
    apply();
  });
  apply();
}

// 5) 初始化
populateTimezones();
buildTicks();
setupThemeToggle();
els.is24h.addEventListener("change", ()=>{}); // 触发无逻辑，仅为可追踪
els.tz.addEventListener("change", ()=>{});    // 同上
render();

// 清理（若未来嵌入单页应用）
window.addEventListener("beforeunload", ()=> cancelAnimationFrame(rafId));
