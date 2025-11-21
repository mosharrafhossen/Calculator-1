(function(){
      const prevEl     = document.getElementById('prev');
      const currEl     = document.getElementById('curr');
      const keys       = document.getElementById('keys');
      const historyPanel = document.getElementById('historyPanel');
      const historyList  = document.getElementById('historyList');
      const historyBtn   = document.getElementById('historyBtn');
      const memoryIndicator = document.getElementById('memoryIndicator');
      const themeToggle = document.getElementById('themeToggle');

      let expression = '';
      let previous   = '';
      let history    = [];  // {expr, result}
      let memory     = 0;

      // ===== Theme =====
      function applySavedTheme(){
        try{
          const saved = localStorage.getItem('calc-theme');
          if (saved === 'dark') {
            document.body.classList.add('dark');
            themeToggle.setAttribute('aria-pressed','true');
          }
        }catch(e){}
      }
      applySavedTheme();

      themeToggle.addEventListener('click', toggleTheme);
      themeToggle.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      });

      function toggleTheme(){
        const isDark = document.body.classList.toggle('dark');
        themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        try{
          localStorage.setItem('calc-theme', isDark ? 'dark' : 'light');
        }catch(e){}
      }

      // ===== Display helpers =====
      function updateDisplay(){
        prevEl.textContent = previous;
        currEl.textContent = expression || '0';
      }

      function updateMemoryIndicator(){
        if (memory !== 0){
          memoryIndicator.classList.add('active');
        } else {
          memoryIndicator.classList.remove('active');
        }
      }

      function addToHistory(expr, result){
        if (!expr) return;
        history.unshift({expr, result});
        if (history.length > 10) history.pop();
        renderHistory();
      }

      function renderHistory(){
        historyList.innerHTML = '';
        history.forEach((item, index)=>{
          const li = document.createElement('li');
          li.className = 'history-item';
          li.dataset.index = index;
          li.innerHTML = `
            <span class="history-expr">${item.expr}</span>
            <span class="history-res">${item.result}</span>
          `;
          historyList.appendChild(li);
        });
      }

      historyList.addEventListener('click', (e)=>{
        const item = e.target.closest('.history-item');
        if (!item) return;
        const idx = Number(item.dataset.index);
        const record = history[idx];
        if (!record) return;
        expression = record.result;
        previous = record.expr + ' =';
        updateDisplay();
      });

      historyBtn.addEventListener('click', ()=>{
        historyPanel.classList.toggle('open');
      });

      // ===== Expression safe evaluate =====
      const validRe = /^[0-9+\-*/().% ]*$/;

      function safeEval(expr){
        expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        expr = expr.trim();

        if (!validRe.test(expr) || expr.length > 200) {
          throw new Error('Invalid expression');
        }
        const result = Function('"use strict"; return (' + expr + ')')();
        if (typeof result === 'number' && !isFinite(result)) {
          throw new Error('Math error');
        }
        return result;
      }

      // ===== Memory actions =====
      function handleMemory(action){
        const currentVal = expression ? Number(expression) : 0;
        switch(action){
          case 'mc':
            memory = 0;
            break;
          case 'mr':
            if (memory !== 0){
              expression = String(memory);
            }
            break;
          case 'mplus':
            if (!Number.isNaN(currentVal)){
              memory += currentVal;
            }
            break;
          case 'mminus':
            if (!Number.isNaN(currentVal)){
              memory -= currentVal;
            }
            break;
        }
        updateMemoryIndicator();
        updateDisplay();
      }

      // ===== Button handling =====
      keys.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const val = btn.dataset.value;
        const action = btn.dataset.action;

        if (action) {
          if (action === 'clear') {
            expression = '';
            previous = '';
            updateDisplay();
            return;
          }
          if (action === 'back') {
            expression = expression.slice(0, -1);
            updateDisplay();
            return;
          }
          if (action === 'equals') {
            compute();
            return;
          }
          if (action === 'mc' || action === 'mr' || action === 'mplus' || action === 'mminus'){
            handleMemory(action);
            return;
          }
        }

        if (val !== undefined){
          appendValue(val);
        }
      });

      function appendValue(v){
        if (v === '×') v = '*';
        if (v === '÷') v = '/';
        if (v === '−') v = '-';

        const last = expression.slice(-1);

        if (/^[+\-*/%]$/.test(v)) {
          if (expression === '' && v !== '-') return;
          if (/^[+\-*/%]$/.test(last)) {
            expression = expression.slice(0, -1) + v;
            updateDisplay();
            return;
          }
        }

        if (v === '.') {
          const parts = expression.split(/[\+\-\*\/%]/);
          const lastPart = parts[parts.length - 1];
          if (lastPart.includes('.')) return;
          if (last === '' || /^[+\-*/%]$/.test(last)) {
            expression += '0';
          }
        }

        expression += v;
        updateDisplay();
      }

      function compute(){
        if (!expression) return;
        try {
          const res = safeEval(expression);
          const displayRes = Number.isInteger(res)
            ? String(res)
            : String(Number.parseFloat(res.toFixed(10)).toString());

          addToHistory(expression, displayRes);
          previous   = expression + ' =';
          expression = displayRes;
          updateDisplay();
        } catch (err) {
          previous = 'Error';
          expression = '';
          updateDisplay();
          currEl.textContent = 'Error';
          setTimeout(()=> updateDisplay(), 800);
        }
      }

      // ===== Keyboard support =====
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          compute();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          expression = '';
          previous = '';
          updateDisplay();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          expression = expression.slice(0,-1);
          updateDisplay();
          return;
        }
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          historyPanel.classList.toggle('open');
          return;
        }

        const allowed = '0123456789+-*/%.()';
        if (allowed.includes(e.key)) {
          e.preventDefault();
          appendValue(e.key);
        }
      });

      // init
      updateDisplay();
      updateMemoryIndicator();
    })();