const recipes = {
  chicken:{name:'慢煮鸡肉餐',protein:'鸡肉',image:'/assets/recipe-chicken-v2.webp',tag:'温和入门',ingredients:'鸡腿肉、鸡心、鸡肝、南瓜、蛋壳钙与营养预混料',kcal:'118 kcal / 100g',texture:'细切肉粒',color:'peach'},
  turkey:{name:'火鸡胡萝卜餐',protein:'火鸡',image:'/assets/recipe-turkey-v2.webp',tag:'轻盈口感',ingredients:'火鸡肉、火鸡心、鸡肝、胡萝卜、蛋壳钙与营养预混料',kcal:'112 kcal / 100g',texture:'松软肉碎',color:'green'},
  fish:{name:'深海鱼双拼',protein:'鱼肉',image:'/assets/recipe-fish-v2.webp',tag:'香气丰富',ingredients:'三文鱼、鳕鱼、鸡心、西兰花、蛋壳钙与营养预混料',kcal:'124 kcal / 100g',texture:'细腻鱼肉',color:'blue'},
  beef:{name:'牛肉蛋黄餐',protein:'牛肉',image:'/assets/recipe-beef-v2.webp',tag:'浓郁满足',ingredients:'牛肉、牛心、鸡肝、熟蛋黄、蛋壳钙与营养预混料',kcal:'132 kcal / 100g',texture:'丰富肉粒',color:'lilac'}
};

const recipeCard = ([id,r]) => `<article class="catalog-card" data-catalog-card data-protein="${id}" data-reveal><a href="/recipes/${id}" class="catalog-image"><img src="${r.image}" alt="${r.name}" loading="lazy" decoding="async"><span>${r.tag}</span></a><div><p>${r.protein} · ${r.texture}</p><h3>${r.name}</h3><small>${r.ingredients}</small><footer><strong>${r.kcal}</strong><button data-prefer="${id}">加入偏好 ＋</button></footer></div></article>`;

export function renderRoute(pathname) {
  const main = document.querySelector('#main');
  if (!main) return 'home';
  const path = pathname.replace(/\/$/,'') || '/';
  if (path === '/' || path === '/index.html') return 'home';
  if (['/quiz','/plan','/cart','/checkout'].includes(path)) return path.slice(1);
  document.body.classList.add('inner-page');

  if (path === '/why-us') {
    document.title = '为什么鲜食｜猫小灶';
    main.innerHTML = `<section class="page-hero why-hero"><div class="shell"><p class="eyebrow"><span></span> 为什么鲜食</p><h1>把每一餐，<br><em>讲得明明白白。</em></h1><p>猫咪需要优质动物蛋白、充足水分和完整均衡的营养。我们不把营销语言当作医学结论。</p></div></section>
      <section class="section shell fact-story"><div class="fact-nav" role="tablist"><button class="active" data-fact="protein">01 蛋白</button><button data-fact="water">02 水分</button><button data-fact="process">03 工艺</button><button data-fact="clear">04 透明</button></div><div class="fact-stage"><div class="fact-number" id="factNumber">01</div><div><p class="eyebrow">产品原则</p><h2 id="factTitle">肉是主角，<br>不是一句口号。</h2><p id="factCopy">配料顺序、蛋白来源、每包热量和主要营养信息都应该能被用户直接读懂。正式配方还需经过营养团队审核与检测。</p></div></div></section>
      <section class="section compare-section"><div class="shell"><div class="compare-head"><p class="eyebrow"><span></span> 事实对比</p><h2>选择之前，先把差异摊开。</h2></div><div class="compare-table"><div class="compare-row head"><span>观察维度</span><strong>猫小灶鲜食</strong><strong>常见干粮形态</strong></div><div class="compare-row"><span>水分来源</span><strong>天然存在于餐食中</strong><p>通常需要额外饮水补充</p></div><div class="compare-row"><span>蛋白来源</span><strong>明确标注具体肉类</strong><p>依产品配方与标签而异</p></div><div class="compare-row"><span>喂养体验</span><strong>冷藏解冻、按量喂食</strong><p>储存方便、开袋即食</p></div><div class="compare-row"><span>重要提醒</span><strong>需要持续冷冻保存</strong><p>仍需关注完整营养与饮水</p></div></div><p class="legal-note">以上为形态与使用方式比较，不表示任何产品必然带来健康改善。</p></div></section>
      <section class="section shell evidence-grid"><article><b>01</b><h3>完整配料表</h3><p>不使用模糊的“肉类”统称，主要动物原料逐项说明。</p></article><article><b>02</b><h3>规则可解释</h3><p>推荐告诉你用了哪些答案，也允许返回修改。</p></article><article><b>03</b><h3>批次可追踪</h3><p>正式系统应连接生产、检测、库存与配送记录。</p></article><article><b>04</b><h3>边界说清楚</h3><p>营养与健康表达需要专业审核，不替代兽医建议。</p></article></section>
      <section class="page-cta"><h2>更合适的一餐，<br>从认识它开始。</h2><button class="button button-yellow button-large" data-start-quiz>开始定制 →</button></section>`;
    return 'why';
  }

  if (path === '/recipes') {
    document.title = '全部配方｜猫小灶';
    main.innerHTML = `<section class="page-hero recipes-page-hero"><div class="shell"><p class="eyebrow"><span></span> 全部配方</p><h1>看得见食材，<br><em>也看得懂选择。</em></h1><p>四种蛋白、两种主要质地。配方数据均为演示，正式上线前需经过营养与标签审核。</p></div></section><section class="section shell catalog-section"><div class="catalog-toolbar"><div class="recipe-filters" role="group"><button class="active" data-catalog-filter="all">全部</button><button data-catalog-filter="chicken">鸡肉</button><button data-catalog-filter="turkey">火鸡</button><button data-catalog-filter="fish">鱼肉</button><button data-catalog-filter="beef">牛肉</button></div><span>共 4 款演示配方</span></div><div class="catalog-grid">${Object.entries(recipes).map(recipeCard).join('')}</div></section><section class="recipe-guide shell"><div><p class="eyebrow"><span></span> 不知道怎么选？</p><h2>先告诉我们，<br>它平时怎么吃。</h2></div><button class="button button-dark button-large" data-start-quiz>获取专属组合 →</button></section>`;
    return 'recipes';
  }

  if (path.startsWith('/recipes/')) {
    const id = path.split('/').pop(); const r = recipes[id] || recipes.chicken;
    document.title = `${r.name}｜猫小灶`;
    main.innerHTML = `<section class="recipe-page"><div class="recipe-page-image"><img src="${r.image}" alt="${r.name}" decoding="async"><a href="/recipes">← 返回全部配方</a></div><div class="recipe-page-copy"><p class="eyebrow"><span></span> ${r.tag}</p><h1>${r.name}</h1><p class="recipe-page-lead">${r.ingredients}</p><div class="nutrition-strip"><span><small>参考热量</small><strong>${r.kcal}</strong></span><span><small>主要质地</small><strong>${r.texture}</strong></span><span><small>储存</small><strong>冷冻保存</strong></span></div><div class="detail-accordions"><details open><summary>完整配料与营养说明 <span>＋</span></summary><p>${r.ingredients}。页面数据仅作产品原型展示，不可作为实际商品标签或喂养依据。</p></details><details><summary>如何解冻与喂食 <span>＋</span></summary><p>正式商品应标明冷藏解冻时间、开封后保存期限和适用喂养方式。</p></details><details><summary>换粮建议 <span>＋</span></summary><p>第一次尝试应从少量混合开始，并根据猫咪接受情况逐渐调整。特殊健康情况请咨询兽医。</p></details></div><button class="button button-dark button-large" data-prefer="${id}" data-start-quiz>用这款开始定制 →</button></div></section>`;
    return 'recipe';
  }

  if (path === '/account') {
    document.title = '我的订阅｜猫小灶';
    main.innerHTML = `<section class="account-shell shell"><aside class="account-sidebar"><a class="active" href="/account">下一箱</a><a href="#profile">猫咪档案</a><button type="button" data-account-placeholder="orders">订单历史</button><button type="button" data-account-placeholder="address">地址与支付</button><small>演示账户 · 布丁家长</small></aside><div class="account-main"><header><p class="eyebrow"><span></span> 下午好，布丁家长</p><h1>下一箱，正在等你确认。</h1></header><article class="next-box"><div class="box-visual"><img src="/assets/delivery-box-v2.webp" alt="猫小灶黄色试吃箱" decoding="async"></div><div><span class="status-pill">订阅进行中</span><h2>预计 9 月 10 日发货</h2><p>扣款日：9 月 8 日 · 每 14 天一箱</p><div class="next-actions"><button data-account-action="date">改日期</button><button data-account-action="skip">跳过一次</button><button data-account-action="pause">暂停订阅</button></div></div><strong>¥229</strong></article><section class="account-recipes"><div><h2>布丁的下一箱</h2><button data-account-action="recipes">调整配方 →</button></div><div class="mini-recipe-row">${Object.entries(recipes).map(([id,r],index)=>`<article><img src="${r.image}" alt="" loading="lazy" decoding="async"><span><b>${r.name}</b><small>${[4,2,2,2][index]} 包</small></span></article>`).join('')}</div></section><section class="account-grid"><article id="profile"><p class="eyebrow">猫咪档案</p><h3>布丁 · 4.5 kg</h3><p>适中体型 · 有一点挑食 · 关注日常补水</p><button data-account-action="profile">更新档案 →</button></article><article><p class="eyebrow">订阅自由</p><h3>你始终可以暂停或取消</h3><p>操作入口和订阅状态放在同一页面，不强制联系客服。</p><button class="danger-link" data-account-action="cancel">管理订阅 →</button></article></section></div></section><dialog class="account-dialog" id="accountDialog"><div><button class="dialog-close" data-account-close aria-label="关闭账户操作">×</button><div id="accountDialogContent"></div></div></dialog>`;
    return 'account';
  }

  if (path === '/faq') {
    document.title = '常见问题｜猫小灶';
    main.innerHTML = `<section class="page-hero compact"><div class="shell"><p class="eyebrow"><span></span> 帮助中心</p><h1>开饭前，<br><em>再问几句。</em></h1></div></section><section class="section shell faq-page"><nav><button class="active">鲜食与喂养</button><button>配送与储存</button><button>订阅与取消</button><button>订单与退款</button></nav><div class="faq-list"><details open><summary>鲜食需要怎么保存？<span>＋</span></summary><p>冷冻保存；喂食前按包装说明冷藏解冻。开封后尽快食用，不反复冷冻。</p></details><details><summary>如何从当前食物换成鲜食？<span>＋</span></summary><p>建议从少量混合开始，根据接受情况逐步增加。敏感猫咪可以放慢节奏。</p></details><details><summary>可以随时更换配方吗？<span>＋</span></summary><p>可以。每次订单锁定前都可调整，价格变化会立即显示。</p></details><details><summary>怎样暂停或取消订阅？<span>＋</span></summary><p>在账户页面直接操作，不强制联系客服。操作前会明确显示生效日期。</p></details><details><summary>问卷是医疗建议吗？<span>＋</span></summary><p>不是。问卷只用于餐食筛选与风险提示，有疾病或正在用药时请咨询兽医。</p></details></div></section>`;
    return 'faq';
  }

  if (path.startsWith('/policies/')) {
    const type = path.split('/').pop();
    const titles = {privacy:'隐私说明',subscription:'订阅与取消条款',health:'食品与健康声明'};
    document.title = `${titles[type] || '政策说明'}｜猫小灶`;
    main.innerHTML = `<section class="page-hero compact"><div class="shell"><p class="eyebrow"><span></span> 政策中心</p><h1>${titles[type] || '政策说明'}</h1><p>最后更新：2026 年 8 月 27 日 · 演示文本</p></div></section><article class="policy-copy shell"><p class="policy-alert">这是产品原型中的占位政策，不构成实际销售、退款、医疗或自动续订承诺。</p><h2>我们希望把重要规则放在购买前</h2><p>正式服务应根据目标销售地区、支付主体、配送范围和数据处理方式完成法律审核。用户不需要在结账后才发现续订价格、扣款日期或取消方式。</p><h2>清楚、必要、可撤回</h2><p>只收集完成推荐和履约所必需的信息。健康关注属于敏感信息，需要单独说明用途、严格限制访问，并提供删除方式。</p><h2>订阅不应该成为陷阱</h2><p>下一次扣款时间、配送周期和续订价格需要在购买前清楚展示。暂停和取消入口应与开通入口处于同一可见层级。</p><h2>健康内容的边界</h2><p>网站可以介绍产品事实与日常喂养知识，但不诊断疾病、不提供处方，也不保证健康改善。</p></article>`;
    return 'policy';
  }

  document.title = '这页跑去晒太阳了｜猫小灶';
  main.innerHTML = `<section class="not-found shell"><div><p class="eyebrow"><span></span> 404 · 没找到这一页</p><h1>这页可能，<br><em>跑去晒太阳了。</em></h1><p>布丁翻过猫碗也没有找到。你可以回到首页，或者重新开始一份猫咪餐食测评。</p><div class="not-found-actions"><a class="button button-dark button-large" href="/">返回首页</a><button class="button button-outline button-large" data-start-quiz>开始定制</button></div></div><img class="mascot-img mascot-empty" src="/assets/buding-empty-v2.webp" alt="布丁捧着空猫碗" decoding="async"></section>`;
  return 'not-found';
}

export { recipes };
