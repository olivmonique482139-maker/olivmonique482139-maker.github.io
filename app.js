import { renderRoute, recipes as recipeLibrary } from '/pages.js?v=3';
document.documentElement.classList.add('js');

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const routeName = renderRoute(location.pathname);

const quizDialog = $('#quizDialog');
const quizContent = $('#quizContent');
const cartDialog = $('#cartDialog');
const cartContent = $('#cartContent');
const toast = $('#toast');
const recipeDialog = $('#recipeDialog');
const recipeContent = $('#recipeContent');
const galleryDialog = $('#galleryDialog');
const STORAGE_KEY = 'maoxiaozhao-quiz-v1';
const CART_KEY = 'maoxiaozhao-cart-v1';

const defaultState = {
  step: 0, name: '', diets: [], proteins: [], weight: '', body: '', picky: '', goal: '', health: [],
  activity: 'normal', deliveryDays: 14,
  plan: [
    { id:'chicken', name:'慢煮鸡肉餐', short:'鸡', qty:3, delta:0 },
    { id:'turkey', name:'火鸡胡萝卜餐', short:'火鸡', qty:3, delta:0 },
    { id:'fish', name:'深海鱼双拼', short:'鱼', qty:2, delta:2 },
    { id:'beef', name:'牛肉蛋黄餐', short:'牛', qty:2, delta:3 }
  ]
};

let state = load(STORAGE_KEY, defaultState);
let cart = load(CART_KEY, null);
let toastTimer;
let autoAdvanceTimer;
let selectedRecipe = 'chicken';

state.activity ||= 'normal';
state.deliveryDays = Number(state.deliveryDays) || 14;
if (cart) {
  cart.deliveryDays = Number(cart.deliveryDays) || 14;
  cart.daily = Number(cart.daily) || 1;
  cart.checkout ||= {};
  cart.discount = Number(cart.discount) || 0;
  if (cart.stage === 'checkout') cart.stage = 'contact';
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    const parsed = JSON.parse(raw);
    return fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? { ...structuredClone(fallback), ...parsed } : parsed;
  }
  catch { return structuredClone(fallback); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveCart() {
  if (cart) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  else localStorage.removeItem(CART_KEY);
  updateCartCount();
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function lockBody() {
  document.body.classList.add('no-scroll');
  const video = $('#heroVideo');
  if (video && !video.paused) {
    video.dataset.modalPaused = 'true';
    video.pause();
  }
}
function unlockBody() {
  if ($$('dialog').some(dialog => dialog.open)) return;
  document.body.classList.remove('no-scroll');
  const video = $('#heroVideo');
  if (video?.dataset.modalPaused === 'true' && video.dataset.userPaused !== 'true' && video.dataset.autoPaused !== 'true' && !document.hidden) {
    delete video.dataset.modalPaused;
    video.play().catch(() => {});
  }
}

function openQuiz() {
  if (state.step >= 9) state.step = 9;
  quizDialog.showModal();
  lockBody();
  renderQuiz();
}

function closeQuiz() {
  quizDialog.close();
  unlockBody();
}

function setProgress() {
  const progress = state.step === 0 ? 0 : Math.min(100, Math.round((state.step / 8) * 100));
  $('#progressText').textContent = state.step === 0 ? '准备开始' : state.step >= 9 ? '定制完成' : `第 ${state.step} / 8 步`;
  $('#progressBar').style.width = `${progress}%`;
  $('.progress').setAttribute('aria-valuenow', progress);
}

const stepTemplates = {
  0: () => `
    <section class="quiz-step" aria-labelledby="quizTitle">
      <div class="quiz-cat" aria-hidden="true">ฅ^•ﻌ•^ฅ</div>
      <p class="step-kicker">约 1 分钟 · 可随时返回</p>
      <h1 id="quizTitle">更合适的一餐，<br>从认识你的猫开始。</h1>
      <p class="step-desc">回答几个简单问题，我们会准备一箱可编辑的 10 包试吃。答案只保存在这台设备的演示站中。</p>
      <button class="button button-dark button-large" data-next>认识一下 <span aria-hidden="true">→</span></button>
    </section>`,
  1: () => `
    <section class="quiz-step" aria-labelledby="quizTitle">
      <p class="step-kicker">先打个招呼</p>
      <h1 id="quizTitle">它叫什么名字？</h1>
      <p class="step-desc">接下来，我们会用这个名字称呼它。</p>
      <label class="sr-only" for="catName">猫咪名字</label>
      <input class="name-input" id="catName" maxlength="20" autocomplete="off" placeholder="例如：布丁" value="${escapeHtml(state.name)}">
      <p class="form-error" id="nameError" role="alert"></p>
      ${navButtons()}
    </section>`,
  2: () => multiStep('它现在常吃什么？','可多选，帮助我们了解换餐跨度。','diets',[
    ['dry','干粮'],['can','主食罐'],['freeze','冻干'],['homemade','自制'],['fresh','鲜食']
  ]),
  3: () => multiStep(`${safeName()}偏爱哪些肉？`,'可多选。没有明确偏好时可以选“都可以”。','proteins',[
    ['chicken','鸡肉'],['turkey','火鸡'],['fish','鱼肉'],['beef','牛肉'],['all','都可以']
  ]),
  4: () => `
    <section class="quiz-step" aria-labelledby="quizTitle">
      <p class="step-kicker">大概就好</p>
      <h1 id="quizTitle">${safeName()}现在多重？</h1>
      <p class="step-desc">体重是估算每日份量的关键输入。演示推荐不替代专业营养建议。</p>
      <div class="number-row"><label class="sr-only" for="catWeight">体重（千克）</label><input class="number-input" id="catWeight" inputmode="decimal" type="number" min="0.5" max="20" step="0.1" placeholder="4.5" value="${escapeHtml(state.weight)}"><span class="unit">kg</span></div>
      <p class="form-error" id="weightError" role="alert"></p>
      ${navButtons()}
    </section>`,
  5: () => singleStep(`${safeName()}看起来更接近？`,'请按日常观察选择，不需要追求精确。','body',[
    ['slim','偏瘦','肋骨较容易摸到'],['fit','适中','腰线自然，活动轻松'],['round','偏圆','腰线不明显，腹部较圆']
  ]),
  6: () => singleStep(`${safeName()}挑食吗？`,'这会影响试吃箱里口味的丰富程度。','picky',[
    ['very','很挑','熟悉的味道更安心'],['some','有一点','新口味要慢慢来'],['easy','不挑','愿意探索新菜单']
  ]),
  7: () => singleStep('你最希望支持哪件事？','我们只用于排序餐食说明，不对效果作医疗保证。','goal',[
    ['water','日常补水','把水分自然放进餐里'],['weight','体重管理','从适量喂养开始'],['digest','消化状态','选择配料清晰的餐食'],['coat','毛发状态','关注均衡脂肪与蛋白'],['energy','日常活力','按生活状态估算份量']
  ]),
  8: () => multiStep(`${safeName()}有需要留意的情况吗？`,'可多选。此信息只作餐食风险提示，不构成诊断或治疗建议。','health',[
    ['allergy','已知食物过敏'],['urinary','泌尿系统关注'],['kidney','肾脏相关关注'],['digestive','肠胃较敏感'],['medicine','正在用药'],['none','以上都没有']
  ], true)
};

function safeName() { return escapeHtml(state.name.trim() || '它'); }

function navButtons() {
  return `<div class="quiz-actions"><button class="button button-outline" data-back>← 返回</button><button class="button button-dark" data-next>继续 <span aria-hidden="true">→</span></button></div>`;
}

function multiStep(title, desc, field, options, sensitive = false) {
  return `<section class="quiz-step" aria-labelledby="quizTitle">
    <p class="step-kicker">可多选</p><h1 id="quizTitle">${title}</h1><p class="step-desc">${desc}</p>
    <div class="choice-grid" role="group" aria-label="${title}">${options.map(([value,label]) => choice(field,value,label,'',state[field].includes(value),true)).join('')}</div>
    ${sensitive ? '<p class="privacy-note">健康相关答案属于敏感信息。此演示仅保存在当前浏览器，可随时清除；正式服务需单独同意并加密存储。</p>' : ''}
    <p class="form-error" id="choiceError" role="alert"></p>${navButtons()}</section>`;
}

function singleStep(title, desc, field, options) {
  return `<section class="quiz-step" aria-labelledby="quizTitle">
    <p class="step-kicker">请选择一项</p><h1 id="quizTitle">${title}</h1><p class="step-desc">${desc}</p>
    <div class="choice-grid" role="radiogroup" aria-label="${title}">${options.map(([value,label,sub]) => choice(field,value,label,sub,state[field] === value,false)).join('')}</div>
    <p class="form-error" id="choiceError" role="alert"></p>${navButtons()}</section>`;
}

function choice(field, value, label, sub, selected, multi) {
  return `<button type="button" class="choice ${selected ? 'selected' : ''}" data-choice data-field="${field}" data-value="${value}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${selected}">
    <span>${label}${sub ? `<small style="display:block;color:var(--muted);font-weight:500">${sub}</small>` : ''}</span><span class="choice-check" aria-hidden="true"></span>
  </button>`;
}

function renderQuiz() {
  setProgress();
  quizContent.innerHTML = state.step === 9 ? resultTemplate() : stepTemplates[state.step]();
  const input = $('input', quizContent);
  if (input) setTimeout(() => input.focus(), 60);
}

function validateAndCapture() {
  if (state.step === 1) {
    const value = $('#catName').value.trim();
    if (value.length < 2) { $('#nameError').textContent = '请填写 2–20 个字符的名字。'; return false; }
    state.name = value;
  }
  if (state.step === 4) {
    const value = Number($('#catWeight').value);
    if (!value || value < .5 || value > 20) { $('#weightError').textContent = '请输入 0.5–20 kg 之间的体重。'; return false; }
    state.weight = value;
  }
  const required = {2:'diets',3:'proteins',5:'body',6:'picky',7:'goal',8:'health'}[state.step];
  if (required && (!state[required] || state[required].length === 0)) {
    $('#choiceError').textContent = '请至少选择一项，再继续。'; return false;
  }
  return true;
}

function nextStep() {
  clearTimeout(autoAdvanceTimer);
  if (!validateAndCapture()) return;
  if (state.step === 8) {
    showGenerating();
    return;
  }
  state.step = Math.min(9, state.step + 1);
  saveState();
  renderQuiz();
}

function showGenerating() {
  $('#progressText').textContent = '正在生成计划';
  $('#progressBar').style.width = '96%';
  quizContent.innerHTML = `<section class="generating" aria-labelledby="quizTitle"><div class="generating-cat" aria-hidden="true">ฅ^•ﻌ•^ฅ</div><p class="step-kicker">规则版本 DEMO-2026.08</p><h1 id="quizTitle">正在为${safeName()}配餐…</h1><div class="generation-list"><span>估算每日份量</span><span>检查蛋白偏好与风险提示</span><span>平衡首次尝试的口味</span></div></section>`;
  const items = $$('.generation-list span', quizContent);
  items.forEach((item,index) => setTimeout(() => item.classList.add('done'), 350 + index * 450));
  setTimeout(() => { tunePlanFromAnswers(); state.step = 9; saveState(); renderQuiz(); }, 1850);
}

function backStep() {
  state.step = Math.max(0, state.step - 1);
  saveState(); renderQuiz();
}

function tunePlanFromAnswers() {
  const preferred = state.proteins.filter(id => id !== 'all');
  state.plan.forEach((item,index) => item.qty = [3,3,2,2][index]);
  if (preferred.length === 1) {
    const others = state.plan.filter(item => item.id !== preferred[0]);
    state.plan.forEach(item => item.qty = item.id === preferred[0] ? (state.picky === 'very' ? 7 : 5) : 0);
    const rest = state.picky === 'very' ? [1,1,1] : [2,2,1];
    others.forEach((item,index) => item.qty = rest[index]);
  } else if (preferred.length >= 2) {
    const selected = state.plan.filter(item => preferred.includes(item.id));
    state.plan.forEach(item => item.qty = 0);
    for (let index = 0; index < 10; index++) selected[index % selected.length].qty++;
  }
}

function planCount() { return state.plan.reduce((sum,item) => sum + item.qty,0); }
function planExtra() { return state.plan.reduce((sum,item) => sum + item.qty * item.delta,0); }
function feedingProfile() {
  const weight = Number(state.weight) || 4.5;
  const base = weight < 3 ? .7 : weight <= 6 ? 1 : 1.3;
  const multiplier = { calm:.85, normal:1, active:1.2 }[state.activity] || 1;
  const daily = Math.max(.5, Math.round(base * multiplier * 4) / 4);
  return { daily, days:Math.max(5,Math.round(10 / daily)) };
}
function expandedPlan() {
  return state.plan.flatMap(item => Array.from({length:item.qty}, () => item));
}

function resultTemplate() {
  const count = planCount();
  const extra = planExtra();
  const first = 119 + extra;
  const renewal = 219 + extra;
  const goalLabels = {water:'日常补水',weight:'体重管理',digest:'消化状态',coat:'毛发状态',energy:'日常活力'};
  const dietLabels = {dry:'当前以干粮为主',can:'常吃主食罐',freeze:'常吃冻干',homemade:'有自制餐经验',fresh:'已有鲜食经验'};
  const { daily, days } = feedingProfile();
  const monthly = Math.round(renewal * 30 / state.deliveryDays);
  const slots = expandedPlan();
  return `<section class="result-step" aria-labelledby="quizTitle">
    <div class="result-head"><p class="step-kicker">专属试吃组合 · 可继续调整</p><h1 id="quizTitle">${safeName()}的开饭计划</h1><p>根据 ${escapeHtml(state.weight)} kg 体重、口味偏好与“${goalLabels[state.goal] || '日常状态'}”目标生成的演示组合。</p><div class="plan-reason"><span>${dietLabels[state.diets[0]] || '已记录当前饮食'}</span><span>${state.picky === 'very' ? '熟悉口味优先' : '保留口味多样性'}</span><span>预计约吃 ${days} 天</span><span>非医疗建议</span></div></div>
    <div class="plan-config" aria-label="套餐参数">
      <div><span>日常活动量</span><div class="segmented">${[['calm','宅家'],['normal','适中'],['active','活跃']].map(([value,label])=>`<button class="${state.activity===value?'active':''}" data-plan-activity="${value}">${label}</button>`).join('')}</div><small>建议约 ${daily} 包 / 天</small></div>
      <div><span>配送节奏</span><div class="segmented">${[7,14,21].map(value=>`<button class="${state.deliveryDays===value?'active':''}" data-delivery-days="${value}">${value} 天</button>`).join('')}</div><small>续订月均约 ¥${monthly}</small></div>
    </div>
    <div class="result-layout">
      <div class="plan-recipes">
        <section class="box-editor" aria-labelledby="boxEditorTitle"><header><div><p class="step-kicker">点击或拖入餐格</p><h2 id="boxEditorTitle">亲手分配这 10 包</h2></div><strong>${count}/10</strong></header><div class="recipe-palette">${state.plan.map(item=>`<button draggable="true" class="palette-item ${selectedRecipe===item.id?'active':''}" data-palette="${item.id}" aria-pressed="${selectedRecipe===item.id}"><span class="palette-dot ${item.id}"></span>${item.short}<small>${item.qty} 包</small></button>`).join('')}</div><div class="box-slot-grid">${slots.map((item,index)=>`<button class="box-slot ${item.id}" data-plan-slot="${index}" data-slot-id="${item.id}" aria-label="第 ${index+1} 格，${item.name}，替换为当前所选配方"><small>${String(index+1).padStart(2,'0')}</small><b>${item.short}</b></button>`).join('')}${Array.from({length:Math.max(0,10-slots.length)},(_,index)=>`<button class="box-slot empty" data-plan-slot="${slots.length+index}" aria-label="空餐格"><small>${String(slots.length+index+1).padStart(2,'0')}</small><b>＋</b></button>`).join('')}</div><p class="box-editor-hint">先选上方口味，再点餐格替换；桌面端也可以直接拖拽。餐盒必须保持 10 包。</p></section>
        ${state.plan.map(item => `<article class="plan-item"><div class="plan-swatch">${item.short}</div><div class="plan-meta"><h3>${item.name}</h3><small>${item.delta ? `每包加 ¥${item.delta}` : '基础配方 · 不加价'}</small></div><div class="qty-control" aria-label="${item.name}数量"><button data-qty="-1" data-id="${item.id}" aria-label="减少一包">−</button><span aria-live="polite">${item.qty}</span><button data-qty="1" data-id="${item.id}" aria-label="增加一包">＋</button></div></article>`).join('')}
        <div class="result-back"><button class="text-button" data-back>← 返回修改答案</button><button class="restore-plan" data-restore-plan>恢复系统推荐</button></div>
      </div>
      <aside class="plan-summary"><img class="plan-box-photo" src="./assets/delivery-box-v2.png" alt="黄色猫咪鲜食试吃箱"><h3>试吃箱摘要</h3><p class="plan-count">已选 ${count} / 10 包</p><div class="price-line"><span>建议喂养</span><span>约 ${daily} 包 / 天</span></div><div class="price-line"><span>配送节奏</span><span>每 ${state.deliveryDays} 天</span></div><div class="price-line"><span>首箱原价</span><span>¥${169 + extra}</span></div><div class="price-line"><span>新客试吃优惠</span><span>− ¥50</span></div><div class="price-line"><span>冷链配送</span><span>免运费</span></div><div class="price-line total"><strong>首箱应付</strong><strong>¥${first}</strong></div><div class="price-line"><span>后续每箱</span><span>¥${renewal}</span></div><div class="price-line monthly"><span>预计月均</span><strong>¥${monthly}</strong></div><button class="button button-yellow" id="addPlan" ${count !== 10 ? 'disabled' : ''}>${count === 10 ? '加入购物袋 →' : `还需选择 ${Math.abs(10-count)} 包`}</button><p class="summary-note">演示价格，不产生真实交易。配送周期、日期、暂停与取消均可调整。</p></aside>
    </div>
  </section>`;
}

function replacePlanSlot(slotIndex, recipeId) {
  const slots = expandedPlan();
  const current = slots[slotIndex];
  const target = state.plan.find(item => item.id === recipeId);
  if (!target) return;
  if (!current) {
    if (planCount() >= 10) return;
    target.qty++;
  } else if (current.id !== target.id) {
    const source = state.plan.find(item => item.id === current.id);
    source.qty = Math.max(0, source.qty - 1);
    target.qty++;
  }
  selectedRecipe = recipeId;
  saveState(); renderQuiz(); showToast(`已换成${target.name}`);
}

function adjustQty(id, delta) {
  const item = state.plan.find(recipe => recipe.id === id);
  if (!item) return;
  const count = state.plan.reduce((sum,recipe) => sum + recipe.qty,0);
  if (delta > 0 && count >= 10) { showToast('试吃箱正好 10 包，先减少一种配方吧。'); return; }
  item.qty = Math.max(0, Math.min(10, item.qty + delta));
  saveState(); renderQuiz();
}

function addPlanToCart() {
  const count = planCount();
  if (count !== 10) return;
  const extra = planExtra();
  const { daily } = feedingProfile();
  cart = { name: `${state.name}的 10 包试吃箱`, first:119 + extra, renewal:219 + extra, items:state.plan.filter(item => item.qty > 0).map(item=>({...item})), activity:state.activity, daily, deliveryDays:state.deliveryDays, discount:0, checkout:{}, stage:'bag' };
  saveCart(); closeQuiz(); showToast('试吃箱已加入购物袋'); setTimeout(openCart, 250);
}

function updateCartCount() { $('#cartCount').textContent = cart ? '1' : '0'; }

function openCart() {
  renderCart(); cartDialog.showModal(); lockBody();
}

function closeCart() { cartDialog.close(); unlockBody(); }

function renderCart() {
  if (!cart) {
    cartContent.innerHTML = `<div class="cart-empty"><div class="empty-icon">ฅ</div><h3>购物袋还是空的</h3><p>先认识一下你的猫咪，我们会为它搭好第一箱。</p><button class="button button-dark" data-cart-quiz>开始定制 →</button></div>`;
    return;
  }
  cart.checkout ||= {};
  if (['contact','delivery','payment'].includes(cart.stage)) { renderCheckout(); return; }
  if (cart.stage === 'done') { renderConfirmation(); return; }
  cartContent.innerHTML = `<article class="cart-product"><div class="cart-thumb">10</div><div><h3>${escapeHtml(cart.name)}</h3><small>${cart.items.map(item => `${item.name}×${item.qty}`).join(' · ')}</small></div><strong>¥${cart.first}</strong></article>
    <div class="cart-composition" aria-label="餐盒组成">${cart.items.flatMap(item=>Array.from({length:item.qty},()=>`<span class="${item.id}" title="${item.name}">${item.short}</span>`)).join('')}</div>
    <button class="edit-box-link" data-edit-plan>重新编辑这 10 包 →</button>
    <div class="cart-lines"><div class="price-line"><span>建议喂养</span><span>约 ${cart.daily} 包 / 天</span></div><div class="price-line"><span>配送节奏</span><span>每 ${cart.deliveryDays} 天</span></div><div class="price-line"><span>冷链配送</span><span>免运费</span></div><div class="price-line"><span>后续每箱</span><span>¥${cart.renewal}</span></div><div class="price-line total"><strong>本次应付</strong><strong>¥${cart.first}</strong></div></div>
    <p class="checkout-disclaimer">正式服务会在续订扣款前提醒。你可以在账户中调整配方、改期、跳过、暂停或取消。</p>
    <button class="button button-dark checkout-button" id="checkoutButton">模拟结账 →</button>
    <button class="text-button" id="removeCart" style="margin-top:18px">移除试吃箱</button>`;
}

function renderCheckout() {
  const stages = ['contact','delivery','payment'];
  const active = stages.indexOf(cart.stage);
  const progress = `<div class="checkout-progress" aria-label="结算进度">${['联系信息','配送安排','确认支付'].map((label,index)=>`<span class="${index<active?'done':index===active?'active':''}"><b>${index<active?'✓':index+1}</b>${label}</span>`).join('')}</div>`;
  if (cart.stage === 'contact') {
    const info = cart.checkout;
    cartContent.innerHTML = `${progress}<form class="checkout-form" id="contactForm"><div class="checkout-title"><p class="step-kicker">第 1 步</p><h3>这箱送到哪里？</h3><small>信息只保存在当前浏览器的演示订单中。</small></div><label>邮箱<input name="email" type="email" required autocomplete="email" placeholder="cat@example.com" value="${escapeHtml(info.email)}"></label><div class="checkout-grid"><label>收货人<input name="recipient" required autocomplete="name" placeholder="你的名字" value="${escapeHtml(info.recipient)}"></label><label>手机号码<input name="phone" inputmode="tel" required autocomplete="tel" placeholder="138 0000 0000" value="${escapeHtml(info.phone)}"></label></div><label>详细地址<input name="address" required autocomplete="street-address" placeholder="街道、门牌号、小区与楼栋" value="${escapeHtml(info.address)}"></label><div class="checkout-grid"><label>城市<input name="city" required placeholder="上海" value="${escapeHtml(info.city)}"></label><label>邮编<input name="zip" inputmode="numeric" required placeholder="200000" value="${escapeHtml(info.zip)}"></label></div><button class="button button-dark checkout-button" type="submit">继续选择配送 →</button><button class="text-button" type="button" data-checkout-back="bag">← 返回购物袋</button></form>`;
    return;
  }
  if (cart.stage === 'delivery') {
    const dates = deliveryDateOptions();
    cart.checkout.date ||= dates[0].value;
    cart.checkout.slot ||= '18:00–21:00';
    cartContent.innerHTML = `${progress}<form class="checkout-form" id="deliveryForm"><div class="checkout-title"><p class="step-kicker">第 2 步</p><h3>选择首次送达时间</h3><small>冷链箱会送到 ${escapeHtml(cart.checkout.city)} · ${escapeHtml(cart.checkout.address)}</small></div><fieldset class="delivery-field"><legend>送达日期</legend><div class="delivery-options">${dates.map(item=>`<button type="button" class="${cart.checkout.date===item.value?'selected':''}" data-delivery-date="${item.value}"><b>${item.day}</b><span>${item.label}</span><small>${item.note}</small></button>`).join('')}</div></fieldset><fieldset class="delivery-field"><legend>时间段</legend><div class="slot-options">${['09:00–12:00','14:00–18:00','18:00–21:00'].map(value=>`<button type="button" class="${cart.checkout.slot===value?'selected':''}" data-delivery-slot="${value}">${value}</button>`).join('')}</div></fieldset><label class="leave-option"><input type="checkbox" name="leaveAtDoor" ${cart.checkout.leaveAtDoor?'checked':''}><span><b>允许放在门口</b><small>配送员无法联系时，可将保温箱放在门口并发送照片。</small></span></label><div class="delivery-note"><span>❄</span><p><b>全程冷链</b><br>收到后请尽快将餐包放入冷冻室。</p></div><button class="button button-dark checkout-button" type="submit">继续确认订单 →</button><button class="text-button" type="button" data-checkout-back="contact">← 修改联系信息</button></form>`;
    return;
  }
  const payable = Math.max(0,cart.first - (cart.discount || 0));
  cart.checkout.payment ||= 'wechat';
  cartContent.innerHTML = `${progress}<form class="checkout-form" id="paymentForm"><div class="checkout-title"><p class="step-kicker">第 3 步</p><h3>确认后就准备开饭</h3><small>这是原型演示，不会连接支付平台或产生扣款。</small></div><div class="order-review"><div><span>${escapeHtml(cart.name)}</span><b>¥${cart.first}</b></div><small>${cart.items.map(item=>`${item.short}×${item.qty}`).join(' · ')} · 每 ${cart.deliveryDays} 天</small><div><span>冷链配送</span><b>免费</b></div>${cart.discount?`<div class="discount-line"><span>演示优惠</span><b>−¥${cart.discount}</b></div>`:''}<div class="order-total"><span>本次合计</span><strong>¥${payable}</strong></div></div><div class="promo-entry"><label>优惠码<input id="promoCode" placeholder="试试 MIAO20" autocomplete="off"></label><button type="button" data-apply-promo>使用</button></div><fieldset class="delivery-field"><legend>模拟支付方式</legend><div class="payment-options">${[['wechat','微信支付'],['alipay','支付宝'],['card','银行卡']].map(([value,label])=>`<button type="button" class="${cart.checkout.payment===value?'selected':''}" data-payment="${value}"><span>${value==='wechat'?'微':value==='alipay'?'支':'卡'}</span>${label}<b>${cart.checkout.payment===value?'✓':''}</b></button>`).join('')}</div></fieldset><label class="consent-row"><input type="checkbox" required><span>我已看到首箱价格、后续每箱 ¥${cart.renewal}、每 ${cart.deliveryDays} 天续订，以及暂停和取消方式。</span></label><button class="button button-yellow checkout-button" type="submit">确认模拟支付 ¥${payable} →</button><button class="text-button" type="button" data-checkout-back="delivery">← 修改配送时间</button></form>`;
}

function renderConfirmation() {
  const payable = Math.max(0,cart.first - (cart.discount || 0));
  cartContent.innerHTML = `<div class="confirmation"><div class="success-badge">✓</div><p class="step-kicker">模拟下单成功</p><h2>${escapeHtml(state.name || '猫咪')}的开饭计划已排上日程</h2><p>订单号 <span class="confirmation-code">${cart.orderCode}</span></p><div class="confirmation-card"><div><small>首次送达</small><strong>${escapeHtml(cart.checkout.date)} · ${escapeHtml(cart.checkout.slot)}</strong></div><div><small>本次合计</small><strong>¥${payable}</strong></div><div><small>后续计划</small><strong>每 ${cart.deliveryDays} 天 · ¥${cart.renewal}</strong></div></div><div class="order-timeline"><span class="active"><b>1</b>订单确认</span><span><b>2</b>厨房准备</span><span><b>3</b>冷链送达</span></div><p class="checkout-disclaimer">演示订单不会扣款或配送。正式服务会向 ${escapeHtml(cart.checkout.email)} 发送确认邮件。</p><a class="button button-dark" href="/account">查看订阅管理</a><button class="text-button" id="finishOrder">返回首页</button></div>`;
}

function deliveryDateOptions() {
  return [2,3,4,5].map((offset,index) => {
    const date = new Date(); date.setDate(date.getDate()+offset);
    const value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return { value, day:`${date.getMonth()+1}/${date.getDate()}`, label:new Intl.DateTimeFormat('zh-CN',{weekday:'short'}).format(date), note:index===0?'最快送达':'可预约' };
  });
}

quizContent.addEventListener('click', event => {
  const choiceButton = event.target.closest('[data-choice]');
  if (choiceButton) {
    const { field, value } = choiceButton.dataset;
    const isMulti = Array.isArray(state[field]);
    if (isMulti) {
      if (field === 'proteins' && value === 'all') state[field] = ['all'];
      else if (field === 'health' && value === 'none') state[field] = ['none'];
      else {
        state[field] = state[field].filter(item => !['all','none'].includes(item));
        state[field] = state[field].includes(value) ? state[field].filter(item => item !== value) : [...state[field], value];
      }
    } else state[field] = value;
    saveState(); renderQuiz();
    if (!isMulti && [5,6,7].includes(state.step)) autoAdvanceTimer = setTimeout(nextStep, 380);
  }
  if (event.target.closest('[data-next]')) nextStep();
  if (event.target.closest('[data-back]')) backStep();
  const qty = event.target.closest('[data-qty]');
  if (qty) adjustQty(qty.dataset.id, Number(qty.dataset.qty));
  const palette = event.target.closest('[data-palette]');
  if (palette) { selectedRecipe = palette.dataset.palette; renderQuiz(); showToast(`已选择${state.plan.find(item=>item.id===selectedRecipe)?.name}`); }
  const slot = event.target.closest('[data-plan-slot]');
  if (slot) replacePlanSlot(Number(slot.dataset.planSlot), selectedRecipe);
  const activity = event.target.closest('[data-plan-activity]');
  if (activity) { state.activity = activity.dataset.planActivity; saveState(); renderQuiz(); }
  const deliveryDays = event.target.closest('[data-delivery-days]');
  if (deliveryDays) { state.deliveryDays = Number(deliveryDays.dataset.deliveryDays); saveState(); renderQuiz(); }
  if (event.target.closest('#addPlan')) addPlanToCart();
  if (event.target.closest('[data-restore-plan]')) { tunePlanFromAnswers(); saveState(); renderQuiz(); showToast('已恢复系统推荐'); }
});

quizContent.addEventListener('dragstart', event => {
  const palette = event.target.closest('[data-palette]');
  if (!palette) return;
  selectedRecipe = palette.dataset.palette;
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', selectedRecipe);
});
quizContent.addEventListener('dragover', event => {
  const slot = event.target.closest('[data-plan-slot]');
  if (!slot) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; slot.classList.add('drag-over');
});
quizContent.addEventListener('dragleave', event => event.target.closest('[data-plan-slot]')?.classList.remove('drag-over'));
quizContent.addEventListener('drop', event => {
  const slot = event.target.closest('[data-plan-slot]');
  if (!slot) return;
  event.preventDefault(); slot.classList.remove('drag-over');
  replacePlanSlot(Number(slot.dataset.planSlot), event.dataTransfer.getData('text/plain') || selectedRecipe);
});

quizContent.addEventListener('keydown', event => {
  if (event.key === 'Enter' && ['INPUT'].includes(event.target.tagName)) nextStep();
});

cartContent.addEventListener('click', event => {
  if (event.target.closest('[data-cart-quiz]')) { closeCart(); openQuiz(); }
  if (event.target.closest('#checkoutButton')) { cart.stage = 'contact'; saveCart(); renderCart(); }
  if (event.target.closest('[data-edit-plan]')) { closeCart(); state.step = 9; saveState(); openQuiz(); }
  const back = event.target.closest('[data-checkout-back]');
  if (back) { cart.stage = back.dataset.checkoutBack; saveCart(); renderCart(); }
  const deliveryDate = event.target.closest('[data-delivery-date]');
  if (deliveryDate) { cart.checkout.date = deliveryDate.dataset.deliveryDate; saveCart(); renderCart(); }
  const deliverySlot = event.target.closest('[data-delivery-slot]');
  if (deliverySlot) { cart.checkout.slot = deliverySlot.dataset.deliverySlot; saveCart(); renderCart(); }
  const payment = event.target.closest('[data-payment]');
  if (payment) { cart.checkout.payment = payment.dataset.payment; saveCart(); renderCart(); }
  if (event.target.closest('[data-apply-promo]')) {
    const code = $('#promoCode',cartContent).value.trim().toUpperCase();
    if (code === 'MIAO20') { cart.discount = 20; saveCart(); renderCart(); showToast('优惠码已使用：减 ¥20'); }
    else showToast('这个演示优惠码不可用');
  }
  if (event.target.closest('#removeCart')) { cart = null; saveCart(); renderCart(); showToast('已移除试吃箱'); }
  if (event.target.closest('#finishOrder')) { cart = null; saveCart(); closeCart(); location.href = '/'; }
});

cartContent.addEventListener('submit', event => {
  event.preventDefault();
  if (event.target.id === 'contactForm') {
    const form = new FormData(event.target);
    ['email','recipient','phone','address','city','zip'].forEach(key => cart.checkout[key] = form.get(key));
    cart.stage = 'delivery'; saveCart(); renderCart(); return;
  }
  if (event.target.id === 'deliveryForm') {
    cart.checkout.leaveAtDoor = new FormData(event.target).get('leaveAtDoor') === 'on';
    cart.stage = 'payment'; saveCart(); renderCart(); return;
  }
  if (event.target.id === 'paymentForm') {
    cart.orderCode ||= `MIAO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    cart.stage = 'done'; saveCart(); renderCart();
  }
});

$$('[data-start-quiz]').forEach(button => button.addEventListener('click', openQuiz));
$('#quizClose').addEventListener('click', closeQuiz);
$('#cartButton').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);

const menuButton = $('#menuButton');
const mobileMenu = $('#mobileMenu');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', open ? '打开菜单' : '关闭菜单');
  mobileMenu.hidden = open;
});
$$('a,button', mobileMenu).forEach(item => item.addEventListener('click', () => { mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded','false'); }));

$$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(button.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));

const heroVideo = $('#heroVideo');
const videoControl = $('#videoControl');
if (heroVideo && videoControl) {
  let videoPausedByUser = false;
  const setVideoControlState = playing => {
    const icon = videoControl.querySelector('span');
    const label = videoControl.querySelector('em');
    if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
    if (label) label.textContent = playing ? '暂停画面' : '播放画面';
    videoControl.setAttribute('aria-label', playing ? '暂停视频' : '播放视频');
  };
  const resumeHeroVideo = async () => {
    if ($$('dialog').some(dialog => dialog.open)) {
      heroVideo.dataset.modalPaused = 'true';
      return;
    }
    try {
      await heroVideo.play();
      setVideoControlState(true);
    } catch {
      setVideoControlState(false);
    }
  };
  heroVideo.addEventListener('play', () => {
    if ($$('dialog').some(dialog => dialog.open)) {
      heroVideo.dataset.modalPaused = 'true';
      heroVideo.pause();
      return;
    }
    setVideoControlState(true);
  });
  heroVideo.addEventListener('pause', () => setVideoControlState(false));
  videoControl.addEventListener('click', () => {
    if (heroVideo.paused) {
      videoPausedByUser = false;
      delete heroVideo.dataset.userPaused;
      delete heroVideo.dataset.autoPaused;
      resumeHeroVideo();
    } else {
      videoPausedByUser = true;
      heroVideo.dataset.userPaused = 'true';
      heroVideo.pause();
      setVideoControlState(false);
    }
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    videoPausedByUser = true;
    heroVideo.dataset.userPaused = 'true';
    heroVideo.pause();
    setVideoControlState(false);
  } else {
    const pauseOffscreenVideo = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !heroVideo.paused) {
        heroVideo.dataset.autoPaused = 'true';
        heroVideo.pause();
        setVideoControlState(false);
      } else if (entry.isIntersecting && heroVideo.dataset.autoPaused === 'true' && !videoPausedByUser && !document.hidden && !$$('dialog').some(dialog => dialog.open)) {
        delete heroVideo.dataset.autoPaused;
        resumeHeroVideo();
      }
    }, { threshold:.05 });
    pauseOffscreenVideo.observe(heroVideo);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !heroVideo.paused) {
        heroVideo.dataset.autoPaused = 'true';
        heroVideo.pause();
      } else if (!document.hidden && heroVideo.dataset.autoPaused === 'true' && !videoPausedByUser && !$$('dialog').some(dialog => dialog.open)) {
        delete heroVideo.dataset.autoPaused;
        resumeHeroVideo();
      }
    });
  }
}

const backgroundMusic = $('#backgroundMusic');
const musicControl = $('#musicControl');
const musicPlayer = $('#musicPlayer');
let musicFadeFrame;

function fadeMusic(target, duration = 650, pauseAfter = false) {
  cancelAnimationFrame(musicFadeFrame);
  const start = backgroundMusic.volume;
  const startedAt = performance.now();
  const tick = now => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    backgroundMusic.volume = start + (target - start) * eased;
    if (progress < 1) musicFadeFrame = requestAnimationFrame(tick);
    else if (pauseAfter) backgroundMusic.pause();
  };
  musicFadeFrame = requestAnimationFrame(tick);
}

function setMusicState(playing) {
  musicControl.setAttribute('aria-pressed', String(playing));
  musicControl.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
  musicControl.querySelector('.music-label').textContent = playing ? '音乐播放中' : '开启音乐';
  musicPlayer.classList.toggle('is-playing', playing);
}

if (backgroundMusic && musicControl && musicPlayer) {
  backgroundMusic.volume = 0;
  musicControl.addEventListener('click', async () => {
    if (!backgroundMusic.paused) {
      setMusicState(false);
      fadeMusic(0, 420, true);
      return;
    }
    try {
      backgroundMusic.volume = 0;
      await backgroundMusic.play();
      setMusicState(true);
      fadeMusic(0.1, 800);
    } catch {
      setMusicState(false);
      showToast('浏览器暂时没有允许播放，请再点一次音乐按钮。');
    }
  });
  backgroundMusic.addEventListener('error', () => {
    setMusicState(false);
    showToast('背景音乐暂时加载失败，请稍后重试。');
  });
}

// Cat-paw interaction layer: native custom cursor plus lightweight tap feedback.
const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
const interactiveSelector = 'a,button,[role="button"],summary,[role="tab"],.recipe-photo,.catalog-image';
const textInputSelector = 'input,textarea,select,[contenteditable="true"]';
const tactileCardSelector = '.benefit-card,.recipe-card,.catalog-card,.review-cards article,.steps li,.account-grid article,.plan-item';

function addPawClickFeedback(x, y, host = document.body) {
  if (reducedMotion.matches) return;
  const oldEffects = $$('.paw-click-feedback');
  if (oldEffects.length >= 4) oldEffects[0].remove();
  const effect = document.createElement('span');
  effect.className = 'paw-click-feedback';
  effect.style.left = `${x}px`;
  effect.style.top = `${y}px`;
  effect.innerHTML = '<i class="paw-ripple"></i>' + [
    ['-4px','-2px','-14deg','0ms'],
    ['14px','-18px','18deg','75ms'],
    ['29px','-31px','-8deg','150ms']
  ].map(([dx,dy,rotation,delay]) => `<i class="paw-stamp" style="--paw-x:${dx};--paw-y:${dy};--paw-rotation:${rotation};--paw-delay:${delay}"></i>`).join('');
  host.append(effect);
  setTimeout(() => effect.remove(), 720);
}

document.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary || event.target.closest(textInputSelector)) return;
  const pressed = event.target.closest(`${interactiveSelector},${tactileCardSelector}`);
  if (!pressed) return;
  const host = event.target.closest('dialog[open]') || document.body;
  addPawClickFeedback(event.clientX, event.clientY, host);
  pressed.classList.add('is-pressed');
});
document.addEventListener('pointerup', () => $$('.is-pressed').forEach(element => element.classList.remove('is-pressed')));
document.addEventListener('pointercancel', () => $$('.is-pressed').forEach(element => element.classList.remove('is-pressed')));

$('#newsletterForm').addEventListener('submit', event => { event.preventDefault(); event.target.reset(); showToast('订阅成功，下一封鲜报见。'); });
$('.account-button').addEventListener('click', () => { location.href = '/account'; });

[quizDialog, cartDialog].forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) { dialog.close(); unlockBody(); }
}));

updateCartCount();

// Rich homepage and inner-page interactions
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealObserver.unobserve(entry.target); }
}), { threshold:.12, rootMargin:'240px 0px 240px' });
$$('[data-reveal], .benefit-card, .steps li, .review-cards article').forEach((element,index) => {
  element.dataset.reveal = '';
  element.style.transitionDelay = `${Math.min(index % 4,3) * 70}ms`;
  revealObserver.observe(element);
});

$$('[data-benefit]').forEach(card => {
  const toggle = () => {
    const expanded = !card.classList.contains('expanded');
    $$('.benefit-card.expanded').forEach(open => { open.classList.remove('expanded'); open.setAttribute('aria-expanded','false'); });
    card.classList.toggle('expanded', expanded); card.setAttribute('aria-expanded', String(expanded));
  };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
});

function openRecipe(id) {
  const recipe = recipeLibrary[id] || recipeLibrary.chicken;
  recipeContent.innerHTML = `<img class="drawer-image" src="${recipe.image}" alt="${recipe.name}"><div class="drawer-copy"><p class="eyebrow"><span></span> ${recipe.tag}</p><h2 id="recipeTitle">${recipe.name}</h2><p>${recipe.ingredients}</p><div class="drawer-facts"><span><small>参考热量</small><strong>${recipe.kcal}</strong></span><span><small>质地</small><strong>${recipe.texture}</strong></span><span><small>储存</small><strong>冷冻保存</strong></span></div><div class="ingredient-list"><strong>为什么推荐</strong><p>适合作为第一次鲜食尝试中的一个口味。实际推荐会结合猫咪档案、过敏与库存重新计算。</p></div><button class="button button-dark" data-prefer="${id}" data-drawer-quiz>把它放进偏好 →</button><p class="summary-note">配方与营养数据为演示内容，正式上线前需要专业审核。</p></div>`;
  recipeDialog.showModal(); lockBody();
}

$('#recipeClose').addEventListener('click', () => { recipeDialog.close(); unlockBody(); });
recipeContent.addEventListener('click', event => {
  const prefer = event.target.closest('[data-prefer]');
  if (prefer) setPreference(prefer.dataset.prefer);
  if (event.target.closest('[data-drawer-quiz]')) { recipeDialog.close(); unlockBody(); openQuiz(); }
});

function setPreference(id) {
  state.proteins = state.proteins.filter(item => item !== 'all');
  if (!state.proteins.includes(id)) state.proteins.push(id);
  saveState();
  const name = recipeLibrary[id]?.name || '这款配方';
  showToast(`已把${name}加入偏好`);
  const cartButton = $('#cartButton'); cartButton.classList.remove('bump'); void cartButton.offsetWidth; cartButton.classList.add('bump');
}

const galleryCaptions = ['第一次见面，先保持一点距离。','蓝眼睛试吃官上线。','今天想要多一点关注。','饭后也要认真洗脸。','这块蕾丝很适合踩奶。','听见开饭两个字了。','让我看看镜头后面是什么。','握个爪，成交。','吃饱后的黄金一小时。'];
let galleryIndex = 0;
function renderGallery() {
  const col = galleryIndex % 3, row = Math.floor(galleryIndex / 3);
  $('#galleryPhoto').style.backgroundPosition = `${col * 50}% ${row * 50}%`;
  $('#galleryCaption').textContent = galleryCaptions[galleryIndex];
}
function openGallery(index) { galleryIndex = index; renderGallery(); galleryDialog.showModal(); lockBody(); }
$('#galleryClose').addEventListener('click', () => { galleryDialog.close(); unlockBody(); });
$$('[data-gallery-nav]').forEach(button => button.addEventListener('click', () => { galleryIndex = (galleryIndex + Number(button.dataset.galleryNav) + 9) % 9; renderGallery(); }));

const processCopy = {
  prep:'每一批原料都应有明确来源、验收状态与批次记录。这里展示的是产品流程设计，正式数据需由供应链系统接入。',
  cook:'按批准的配方控制熟制时间与中心温度，并保存生产记录。温和烹制不是医疗或效果承诺。',
  freeze:'分装完成后尽快进入冷冻流程，包装标明保存方式、批次与开封后的食用期限。',
  deliver:'根据配送区域匹配冷链方案，提供预计到达时间和异常处理入口；到货后及时放入冷冻。'
};

const factCopy = {
  protein:['01','肉是主角，<br>不是一句口号。','配料顺序、蛋白来源、每包热量和主要营养信息都应该能被用户直接读懂。正式配方还需经过营养团队审核与检测。'],
  water:['02','水分放进餐里，<br>不用等待提醒。','鲜食可以自然提供水分，但具体含水比例取决于真实配方与检测。它不能替代兽医针对疾病给出的饮水建议。'],
  process:['03','工艺留下记录，<br>新鲜不是形容词。','从验收到烹制、分装、冷冻和配送都应留下批次信息。正式网站需要把可公开验证的信息连接到商品。'],
  clear:['04','价格和规则，<br>购买前就说清楚。','首箱、续订、运费、扣款日和取消方式会同时出现。用户可以调整推荐，而不是被迫接受系统的唯一答案。']
};

document.addEventListener('click', event => {
  const recipeButton = event.target.closest('[data-recipe]');
  if (recipeButton) openRecipe(recipeButton.dataset.recipe);
  const prefer = event.target.closest('[data-prefer]');
  if (prefer && !event.target.closest('#recipeContent')) setPreference(prefer.dataset.prefer);
  const gallery = event.target.closest('[data-gallery-index]');
  if (gallery) openGallery(Number(gallery.dataset.galleryIndex));
  const filter = event.target.closest('[data-recipe-filter]');
  if (filter) {
    $$('[data-recipe-filter]').forEach(button => button.classList.toggle('active', button === filter));
    $$('.recipe-card').forEach(card => card.classList.toggle('is-hidden', filter.dataset.recipeFilter !== 'all' && !card.dataset.tags.includes(filter.dataset.recipeFilter)));
  }
  const catalogFilter = event.target.closest('[data-catalog-filter]');
  if (catalogFilter) {
    $$('[data-catalog-filter]').forEach(button => button.classList.toggle('active', button === catalogFilter));
    $$('[data-catalog-card]').forEach(card => card.classList.toggle('is-hidden', catalogFilter.dataset.catalogFilter !== 'all' && card.dataset.protein !== catalogFilter.dataset.catalogFilter));
  }
  const process = event.target.closest('[data-process]');
  if (process) {
    $$('[data-process]').forEach(button => { const active = button === process; button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); });
    $('#processDescription').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280});
    $('#processDescription').textContent = processCopy[process.dataset.process];
  }
  const fact = event.target.closest('[data-fact]');
  if (fact) {
    $$('[data-fact]').forEach(button => button.classList.toggle('active', button === fact));
    const [number,title,copy] = factCopy[fact.dataset.fact];
    $('#factNumber').textContent = number; $('#factTitle').innerHTML = title; $('#factCopy').textContent = copy;
  }
  const accountAction = event.target.closest('[data-account-action]');
  if (accountAction) openAccountAction(accountAction.dataset.accountAction);
  if (event.target.closest('[data-account-close]')) { $('#accountDialog').close(); unlockBody(); }
});

function openAccountAction(action) {
  const dialog = $('#accountDialog'); const content = $('#accountDialogContent'); if (!dialog || !content) return;
  const templates = {
    date:`<div class="account-modal-copy"><p class="eyebrow"><span></span> 调整下一箱</p><h2>选择新的配送日</h2><p>订单锁定前都可以调整。演示日历不会产生真实配送。</p><div class="calendar-demo">${[6,7,8,9,10,11,12,13,14,15,16,17,18,19].map(day=>`<button class="${day===10?'active':''}">9/${day}</button>`).join('')}</div><div class="account-modal-actions"><button class="button button-dark" data-account-close>保存日期</button></div></div>`,
    skip:`<div class="account-modal-copy"><p class="eyebrow"><span></span> 跳过一次</p><h2>这一次先不发货？</h2><p>跳过后不会在 9 月 8 日扣款，下一箱预计顺延至 9 月 24 日。</p><div class="account-modal-actions"><button class="button button-outline" data-account-close>先不跳过</button><button class="button button-dark" data-account-confirm="skip">确认跳过</button></div></div>`,
    pause:`<div class="account-modal-copy"><p class="eyebrow"><span></span> 暂停订阅</p><h2>暂停多久，由你决定。</h2><p>暂停期间不扣款、不生成新订单，猫咪档案和配方偏好会保留。</p><div class="account-modal-actions"><button class="button button-outline" data-account-close>返回</button><button class="button button-dark" data-account-confirm="pause">确认暂停</button></div></div>`,
    cancel:`<div class="account-modal-copy"><p class="eyebrow"><span></span> 管理订阅</p><h2>取消不需要联系客服。</h2><p>取消将在当前未锁定订单前生效。演示操作不会改变任何真实服务。</p><div class="account-modal-actions"><button class="button button-outline" data-account-close>保留订阅</button><button class="button button-dark" data-account-confirm="cancel">继续取消</button></div></div>`,
    recipes:`<div class="account-modal-copy"><p class="eyebrow"><span></span> 下一箱配方</p><h2>把 10 包重新分一分。</h2><p>进入推荐结果页即可调整数量并查看价格变化。</p><div class="account-modal-actions"><button class="button button-outline" data-account-close>稍后再说</button><button class="button button-dark" data-account-open-plan>调整配方</button></div></div>`,
    profile:`<div class="account-modal-copy"><p class="eyebrow"><span></span> 猫咪档案</p><h2>布丁最近有变化吗？</h2><p>更新体重或健康关注后，系统会询问是否重新计算推荐。</p><div class="account-modal-actions"><button class="button button-outline" data-account-close>取消</button><button class="button button-dark" data-account-profile>重新填写问卷</button></div></div>`
  };
  content.innerHTML = templates[action] || templates.date; dialog.showModal(); lockBody();
}

document.addEventListener('click', event => {
  const confirm = event.target.closest('[data-account-confirm]');
  if (confirm) { $('#accountDialog').close(); unlockBody(); showToast(confirm.dataset.accountConfirm === 'cancel' ? '演示：订阅已取消' : confirm.dataset.accountConfirm === 'pause' ? '演示：订阅已暂停' : '演示：已跳过下一箱'); }
  if (event.target.closest('[data-account-open-plan]')) { $('#accountDialog').close(); state.step = 9; tunePlanFromAnswers(); saveState(); openQuiz(); }
  if (event.target.closest('[data-account-profile]')) { $('#accountDialog').close(); state.step = 1; saveState(); openQuiz(); }
});

let viewportUpdateFrame = 0;
function updateViewportEffects() {
  viewportUpdateFrame = 0;
  $('.site-header')?.classList.toggle('scrolled', scrollY > 18);
  const max = document.documentElement.scrollHeight - innerHeight;
  const progress = max > 0 ? Math.min(100,scrollY / max * 100) : 0;
  const paw = $('#pawProgress'); if (paw) paw.style.top = `${progress}%`;
}
window.addEventListener('scroll', () => {
  if (!viewportUpdateFrame) viewportUpdateFrame = requestAnimationFrame(updateViewportEffects);
}, {passive:true});
updateViewportEffects();

[recipeDialog,galleryDialog].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { dialog.close(); unlockBody(); } }));

if (routeName === 'quiz') { if (state.step >= 9) state.step = 0; openQuiz(); }
if (routeName === 'plan') { if (!state.name) Object.assign(state,{name:'布丁',weight:4.5,diets:['dry'],proteins:['chicken'],picky:'some',goal:'water',health:['none']}); tunePlanFromAnswers(); state.step = 9; openQuiz(); }
if (routeName === 'cart' || routeName === 'checkout') { if (cart && routeName === 'checkout' && !['delivery','payment','done'].includes(cart.stage)) cart.stage = 'contact'; openCart(); }
