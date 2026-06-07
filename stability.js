(() => {
  'use strict';

  const errors = [];
  const retiredRe = /^(学习|生活|探索|learn|learning|study|life|explore|exploration)$/i;
  const foodRe = /美团(?:外卖)?|饿了么|叮咚(?:买菜)?|盒马|小象超市|朴朴|外卖|全家|7-?11|711|罗森|便利店|永辉|物美|山姆|沃尔玛|超市|买菜|早餐|早饭|午餐|午饭|晚餐|晚饭|宵夜|夜宵|下午茶|吃饭|餐饮|餐厅|饭店|食堂|面条|拉面|米线|馄饨|饺子|包子|煎饼|粥|米饭|盖饭|炒饭|火锅|烧烤|烤肉|炸鸡|汉堡|披萨|牛排|寿司|日料|韩餐|奶茶|咖啡|饮料|果茶|茶饮|果汁|可乐|甜品|蛋糕|面包|零食|水果|肯德基|KFC|麦当劳|必胜客|达美乐|汉堡王|德克士|塔斯汀|华莱士|赛百味|星巴克|瑞幸|喜茶|奈雪|蜜雪冰城|霸王茶姬|茶百道|古茗|CoCo|一点点|海底捞|呷哺|太二|杨国福|张亮|沙县|兰州拉面|老乡鸡|真功夫|味千/i;
  const transitRe = /滴滴|高德打车|曹操出行|T3出行|首汽约车|花小猪|网约车|出租车|打车|地铁|公交|巴士|公交卡|共享单车|单车|骑行|哈啰|青桔|摩拜|美团单车|12306|携程|飞猪|航旅纵横|高铁|动车|火车|机票|飞机|航空|停车|停车费|加油|油费|充电费|过路费|高速费|通行费/i;
  const migrationKey = 'growth-safe-category-migration-v1';

  const lexical = name => {
    try {
      return (0, eval)(name);
    } catch {
      return undefined;
    }
  };
  const compact = value => String(value ?? '').replace(/\s+/g, '');
  const reportError = value => {
    const message = value?.stack || value?.message || String(value || '未知错误');
    if (!errors.includes(message)) errors.push(message);
  };

  window.addEventListener('error', event => reportError(event.error || event.message));
  window.addEventListener('unhandledrejection', event => reportError(event.reason));

  function categoryId(category) {
    return compact([
      category?.id, category?.key, category?.k, category?.value, category?.v,
      category?.name, category?.label, category?.n
    ].filter(Boolean).join(' '));
  }

  function repairModels() {
    const tabs = lexical('TABS');
    if (Array.isArray(tabs)) {
      const kept = tabs.filter(tab => {
        const value = Array.isArray(tab)
          ? tab.join(' ')
          : [tab?.id, tab?.key, tab?.name, tab?.label, tab?.title].filter(Boolean).join(' ');
        return !retiredRe.test(compact(value));
      });
      tabs.splice(0, tabs.length, ...kept);
    }

    const categories = lexical('CATS');
    if (Array.isArray(categories)) {
      categories.forEach(category => {
        const identity = categoryId(category);
        if (/food|吃饭|餐饮/i.test(identity)) category.bk = 'food';
        if (/transit|交通/i.test(identity)) category.bk = 'transit';
      });
    }
  }

  function transactionText(entry) {
    return [
      'note', 'memo', 'remark', 'desc', 'description', 'title', 'name', 'item',
      'text', 'content', 'merchant', 'summary', 'raw', 'original', 'location'
    ].map(key => entry?.[key]).filter(Boolean).join(' ');
  }

  function amountOf(entry) {
    for (const key of ['amount', 'amt', 'money', 'cost', 'price', 'value']) {
      const number = Number(entry?.[key]);
      if (Number.isFinite(number) && number !== 0) return number;
    }
    return 0;
  }

  function currentCategory(entry) {
    for (const key of ['cat', 'category', 'categoryId', 'catId']) {
      if (Object.prototype.hasOwnProperty.call(entry, key)) return { key, value: entry[key] };
    }
    return { key: 'cat', value: '' };
  }

  function classifyText(text) {
    if (foodRe.test(text)) return 'food';
    if (transitRe.test(text)) return 'transit';
    return '';
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== 'object' || !amountOf(entry)) return false;
    const text = transactionText(entry);
    if (
      /待报销|垫付|公司报销|报销中/.test(text)
      || entry.reimbursable === true
      || entry.isReimbursement === true
      || /pending|待报销/i.test(String(entry.reimbursementStatus || entry.status || ''))
    ) return false;
    const category = currentCategory(entry);
    if (category.value && !/^(other|其他|未分类|unknown)$/i.test(String(category.value))) return false;
    const next = classifyText(text);
    if (!next) return false;
    entry[category.key] = next;
    return true;
  }

  function normalizeTree(node, seen = new WeakSet()) {
    if (!node || typeof node !== 'object' || seen.has(node)) return 0;
    seen.add(node);
    let fixed = normalizeEntry(node) ? 1 : 0;
    Object.values(node).forEach(value => { fixed += normalizeTree(value, seen); });
    return fixed;
  }

  function notify(message) {
    const toast = lexical('toast');
    if (typeof toast === 'function') toast(message);
    else console.info(message);
  }

  function saveState() {
    const save = lexical('save');
    if (typeof save === 'function') save();
  }

  function migrateHistoryOnce() {
    if (localStorage.getItem(migrationKey) === 'done') return;
    const state = lexical('S');
    if (!state) return;
    const fixed = normalizeTree(state);
    localStorage.setItem(migrationKey, 'done');
    if (fixed) {
      saveState();
      notify(`已安全修正 ${fixed} 条未分类餐饮/交通记录`);
    }
  }

  function normalizeCurrentState() {
    const fixed = normalizeTree(lexical('S'));
    if (fixed) {
      saveState();
      notify(`已自动归类 ${fixed} 条新记录`);
    }
  }

  function installFirebaseConflictGuard() {
    const nativeFetch = window.fetch.bind(window);
    const isMainTracker = url => /\/tracker\/[^/]+\.json(?:\?|$)/.test(String(url))
      && !/\/tracker_backups\//.test(String(url));
    const keyFor = url => `growth-firebase-etag:${String(url).replace(/[?&]auth=[^&]+/g, '')}`;

    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url;
      const method = String(init.method || input?.method || 'GET').toUpperCase();
      if (!isMainTracker(url)) return nativeFetch(input, init);

      const headers = new Headers(init.headers || input?.headers || {});
      headers.set('X-Firebase-ETag', 'true');
      const guardedInit = { ...init, headers };

      if (method === 'GET') {
        const response = await nativeFetch(input, guardedInit);
        const etag = response.headers.get('etag');
        if (etag) sessionStorage.setItem(keyFor(url), etag);
        return response;
      }

      if (method !== 'PUT') return nativeFetch(input, guardedInit);

      const known = sessionStorage.getItem(keyFor(url));
      if (known) {
        const check = await nativeFetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
        const current = check.headers.get('etag');
        if (current && current !== known) {
          const error = new Error('云端数据已在其他设备更新，本次保存已暂停。请先刷新或重新同步。');
          reportError(error);
          notify(error.message);
          throw error;
        }
        headers.set('if-match', known);
      }

      const response = await nativeFetch(input, guardedInit);
      const next = response.headers.get('etag');
      if (next) sessionStorage.setItem(keyFor(url), next);
      return response;
    };
  }

  function moduleByTitle(pattern) {
    const heading = [...document.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="heading"],[class*="kicker"]')]
      .find(element => pattern.test(compact(element.textContent)));
    return heading?.closest('section,[data-module],.module,.today-section,.card,.panel') || null;
  }

  function reconcileUi() {
    document.querySelectorAll('button,a,[role="tab"],[data-tab],[data-view],option').forEach(element => {
      const marker = compact([
        element.textContent, element.dataset?.tab, element.dataset?.view, element.getAttribute?.('href')
      ].filter(Boolean).join(' '));
      if (retiredRe.test(marker)) element.remove();
    });

    const studyNext = moduleByTitle(/^学习下一步$/);
    const workNext = moduleByTitle(/^工作下一步$/);
    studyNext?.remove();
    if (workNext?.parentElement) {
      workNext.parentElement.style.gridTemplateColumns = 'minmax(0,1fr)';
      workNext.style.gridColumn = '1 / -1';
    }

    const dates = moduleByTitle(/^(重要日期|重要倒计时)$/);
    const overview = moduleByTitle(/^今日总览$/);
    if (dates && overview && dates !== overview && overview.parentElement) {
      overview.parentElement.insertBefore(dates, overview.parentElement.firstElementChild || overview);
    }
  }

  function visibleAppExists() {
    return [...document.body.children].some(element => {
      if (element.tagName === 'SCRIPT') return false;
      const style = getComputedStyle(element);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getBoundingClientRect().height > 30;
    });
  }

  function exportLocalData() {
    const data = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      data[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `growth-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function showRecoveryIfNeeded() {
    if (visibleAppExists()) return;
    document.body.innerHTML = `<main style="max-width:760px;margin:48px auto;padding:24px;font:16px/1.7 system-ui;color:#182230;background:#fff;border:1px solid #dbe3ee;border-radius:12px">
      <h1 style="font-size:22px;margin:0 0 10px">应用没有成功启动</h1>
      <p style="color:#526174">数据仍保存在浏览器中。你可以先导出紧急备份，再根据错误信息修复。</p>
      <button id="emergency-export" style="font:inherit;padding:10px 16px;border:0;border-radius:7px;background:#0f6cbd;color:#fff;cursor:pointer">导出紧急备份</button>
      <pre style="white-space:pre-wrap;word-break:break-word;background:#f5f8fc;padding:16px;border-radius:8px">${errors.join('\n\n') || '未捕获到明确错误。'}</pre>
    </main>`;
    document.getElementById('emergency-export')?.addEventListener('click', exportLocalData);
  }

  function runSmokeTests() {
    const tabs = lexical('TABS');
    const categories = lexical('CATS');
    const checks = [
      ['页面存在可见内容', visibleAppExists()],
      ['没有捕获到启动错误', errors.length === 0],
      ['导航不含学习/生活/探索', !Array.isArray(tabs) || tabs.every(tab => !retiredRe.test(compact(Array.isArray(tab) ? tab.join(' ') : Object.values(tab || {}).join(' '))))],
      ['奶茶识别为吃饭', classifyText('下午买了一杯奶茶 18 元') === 'food'],
      ['滴滴识别为交通', classifyText('滴滴打车 38 元') === 'transit'],
      ['吃饭桶映射正确', !Array.isArray(categories) || categories.some(cat => /food|吃饭|餐饮/i.test(categoryId(cat)) && cat.bk === 'food')],
      ['交通桶映射正确', !Array.isArray(categories) || categories.some(cat => /transit|交通/i.test(categoryId(cat)) && cat.bk === 'transit')]
    ];
    return checks.map(([name, passed]) => ({ name, passed }));
  }

  window.GrowthStability = { runSmokeTests, classifyText, exportLocalData, errors };

  installFirebaseConflictGuard();

  document.addEventListener('DOMContentLoaded', () => {
    try {
      repairModels();
      migrateHistoryOnce();
      reconcileUi();
    } catch (error) {
      reportError(error);
    }
    setTimeout(showRecoveryIfNeeded, 1000);
  }, { once: true });

  document.addEventListener('click', () => setTimeout(() => {
    try {
      normalizeCurrentState();
      reconcileUi();
    } catch (error) {
      reportError(error);
    }
  }, 120), true);
  document.addEventListener('submit', () => setTimeout(() => {
    try {
      normalizeCurrentState();
      reconcileUi();
    } catch (error) {
      reportError(error);
    }
  }, 0), true);
})();
