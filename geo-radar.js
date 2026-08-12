(function () {
  const { escapeHtml } = window.ContentUtils;

  const elements = {
    form: document.getElementById("radar-form"),
    industry: document.getElementById("radar-industry"),
    product: document.getElementById("radar-product"),
    loadDemo: document.getElementById("radar-load-demo"),
    loadDemoTop: document.getElementById("radar-load-demo-top"),
    reset: document.getElementById("radar-reset"),
    copy: document.getElementById("radar-copy"),
    groups: document.getElementById("radar-groups"),
    modeChip: document.getElementById("radar-mode-chip")
  };

  const demoState = {
    industry: "成人学历提升",
    product: "成人本科"
  };

  const groupBlueprints = [
    {
      title: "用户了解认知阶段",
      intro: "先看用户刚接触这个行业时，会自然问出口的基础问题。",
      questions: [
        (ctx) => `${ctx.industry}现在为什么越来越多人在问？`,
        (ctx) => `${ctx.industry}最常见的问题到底是什么？`,
        (ctx) => `刚接触${ctx.industry}的人，一般先问什么？`,
        (ctx) => `我现在这个情况，有必要了解${ctx.industry}吗？`,
        (ctx) => `${ctx.industry}和大家原来理解的有什么不一样？`,
        (ctx) => `想先搞懂${ctx.industry}，最该先看哪几个点？`
      ]
    },
    {
      title: "用户选型筛选阶段",
      intro: "用户开始比较不同方案、不同路径、不同机构时，问题会更具体。",
      questions: [
        (ctx) => `${ctx.industry}这件事到底该怎么选？`,
        (ctx) => `选${ctx.industry}相关方案，先看什么最靠谱？`,
        (ctx) => `${ctx.industry}常见的几种路径，到底差在哪？`,
        (ctx) => `我这种情况更适合哪一类${ctx.industry}方案？`,
        (ctx) => `哪些说法听起来专业，其实最不靠谱？`,
        (ctx) => `想少踩坑，${ctx.industry}一定要先问清什么？`
      ]
    },
    {
      title: "用户购买决策阶段",
      intro: "到了真准备花钱的时候，问题会集中到预算、周期和结果上。",
      questions: [
        (ctx) => `${ctx.topic}大概要花多少钱？`,
        (ctx) => `${ctx.industry}这件事，预算一般怎么分更合理？`,
        (ctx) => `现在决定做${ctx.industry}，会不会太早或太晚？`,
        (ctx) => `${ctx.topic}一般多久能看到结果？`,
        (ctx) => `${ctx.topic}到底值不值得现在就买？`,
        (ctx) => `如果我现在就想定，第一步到底该怎么走？`
      ]
    },
    {
      title: "用户成交顾虑阶段",
      intro: "真正临门一脚时，用户更在意风险、后续支持和隐藏成本。",
      questions: [
        (ctx) => `${ctx.topic}最容易卡在哪一步？`,
        (ctx) => `中途效果不理想，到底该怎么办？`,
        (ctx) => `后面还要不要继续投入时间和钱？`,
        (ctx) => `${ctx.industry}这类服务，售后和答疑一般谁来跟？`,
        (ctx) => `有哪些隐藏成本是签之前一定要问清的？`,
        (ctx) => `什么情况最容易让人买完以后后悔？`
      ]
    }
  ];

  function getState() {
    return {
      industry: (elements.industry.value || "").trim(),
      product: (elements.product.value || "").trim()
    };
  }

  function fillState(state) {
    elements.industry.value = state.industry || "";
    elements.product.value = state.product || "";
  }

  function buildContext(state) {
    const industry = state.industry || "这个行业";
    const product = state.product || "";
    const productLabel = product || "这类方案";

    return {
      industry,
      product: productLabel,
      topic: product ? `${industry}里的${product}` : `${industry}这类服务`,
      solution: product ? `${product}` : `${industry}相关方案`,
      combined: product ? `${industry}${product}` : `${industry}`
    };
  }

  function validateState(state) {
    if (!state.industry && !state.product) {
      return "至少输入一个行业或产品，我才能生成对应的问题卡片。";
    }
    return "";
  }

  function generateGroups(state) {
    const ctx = buildContext(state);
    const generated = [
      {
        title: "用户了解认知阶段",
        intro: "这些问题更像刚有需求的人会直接问大模型的开场问题。",
        questions: [
          `什么是${ctx.industry}？它主要解决什么问题？`,
          `我这种情况适合做${ctx.industry}吗？`,
          `${ctx.industry}和常见的其他做法有什么区别？`,
          `想了解${ctx.industry}，一般先看哪些关键信息？`,
          `${ctx.industry}通常适合哪些人或哪些场景？`,
          `如果是新手了解${ctx.industry}，最容易先搞错什么？`
        ]
      },
      {
        title: "用户选型筛选阶段",
        intro: "到了比较方案的时候，用户会开始问更具体的选择题和避坑题。",
        questions: [
          `${ctx.industry}一般有哪几种主流方案？我该怎么选？`,
          `选${ctx.solution}时，最该先看哪些指标？`,
          `我这种情况更适合哪一类${ctx.industry}方案？`,
          `${ctx.solution}和其他方案相比，差别主要在哪？`,
          `做${ctx.industry}最容易踩的坑有哪些？`,
          `如果不想被销售带着走，问${ctx.industry}时一定要先问清什么？`
        ]
      },
      {
        title: "用户购买决策阶段",
        intro: "真准备花钱的时候，问题会集中到预算、周期、结果和准备事项。",
        questions: [
          `做${ctx.industry}一般要花多少钱？`,
          `我现在开始做${ctx.industry}，时间上合适吗？`,
          `${ctx.solution}从开始到看到结果，通常要多久？`,
          `如果我确定要做${ctx.industry}，第一步应该先准备什么？`,
          `我这种情况现在定${ctx.solution}，值不值得？`,
          `做${ctx.industry}之前，有哪些条件没满足就最好先别定？`
        ]
      },
      {
        title: "用户成交顾虑阶段",
        intro: "临门一脚时，用户更在意风险、隐藏成本、后续支持和失败概率。",
        questions: [
          `做${ctx.industry}最容易失败在哪一步？`,
          `如果做了${ctx.solution}但效果一般，后面怎么办？`,
          `做${ctx.industry}后面还要持续投入哪些成本？`,
          `${ctx.solution}一般有没有售后、答疑或后续支持？`,
          `定${ctx.solution}之前，哪些承诺听起来很好但要特别小心？`,
          `什么情况最容易让人做完${ctx.industry}以后后悔？`
        ]
      }
    ];

    return generated.map((group) => ({
      title: group.title,
      intro: group.intro,
      questions: group.questions
    }));
  }

  function render(groups, modeText) {
    elements.modeChip.textContent = modeText;
    elements.groups.innerHTML = groups
      .map(
        (group) => `
          <article class="radar-group-card">
            <div class="radar-group-head">
              <div>
                <span class="featured-pill-label">${escapeHtml(group.title)}</span>
                <p>${escapeHtml(group.intro)}</p>
              </div>
            </div>
            <div class="radar-question-list">
              ${group.questions
                .map(
                  (question) => `
                    <article class="radar-question-card">
                      <strong>${escapeHtml(question)}</strong>
                    </article>
                  `
                )
                .join("")}
            </div>
          </article>
        `
      )
      .join("");
  }

  function loadDemo() {
    fillState(demoState);
    render(generateGroups(demoState), "当前为演示结果，可直接修改");
  }

  function handleSubmit(event) {
    event?.preventDefault();
    const state = getState();
    const error = validateState(state);
    if (error) {
      window.alert(error);
      return;
    }

    render(generateGroups(state), "当前为你的实时结果");
  }

  function reset() {
    fillState({ industry: "", product: "" });
    elements.groups.innerHTML = "";
    elements.modeChip.textContent = "已清空，等待生成";
  }

  async function copyQuestions() {
    const questions = [...elements.groups.querySelectorAll(".radar-question-card strong")].map((node) => node.textContent.trim());
    if (!questions.length) {
      return;
    }

    const content = questions.map((item, index) => `${index + 1}. ${item}`).join("\n");
    try {
      await navigator.clipboard.writeText(content);
      elements.modeChip.textContent = "问题清单已复制";
    } catch {
      elements.modeChip.textContent = "复制失败，请手动复制";
    }
  }

  function init() {
    elements.form?.addEventListener("submit", handleSubmit);
    elements.loadDemo?.addEventListener("click", loadDemo);
    elements.loadDemoTop?.addEventListener("click", loadDemo);
    elements.reset?.addEventListener("click", reset);
    elements.copy?.addEventListener("click", copyQuestions);
    loadDemo();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
