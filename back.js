(function () {
  // 共用資料工具
  window.getJSON = function (key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : (def ?? []); } catch { return def ?? []; } };
  window.setJSON = function (key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  // Data Layer（統一入口，保留可替換介面）
  // Data Layer
  window.USE_REMOTE_DB = true;
  const SUPABASE_URL = "https://udilhhmpdmnrkfgkowqo.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaWxoaG1wZG1ucmtmZ2tvd3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjE5MzAsImV4cCI6MjA3OTAzNzkzMH0.BeuRQFIWUmRV32D0a0qyhMwBTvUSO4G-g6yNapIYwE8";

  // Initialize Supabase if SDK is available
  if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn("Supabase SDK not found. Please include the script tag.");
  }

  window.db_read = async function (table) {
    if (window.USE_REMOTE_DB && window.supabaseClient) {
      return await window.remote_get(table);
    }
    return window.getJSON(table, []);
  };

  window.db_write = async function (table, value) {
    if (window.USE_REMOTE_DB && window.supabaseClient) {
      // Note: db_write in local mode overwrites the whole list. 
      // In remote mode, we typically insert/update individual rows.
      // This function might need to be deprecated or adapted for bulk sync if used.
      console.warn("db_write called in remote mode. This might not behave as expected for full table overwrite.");
      return false;
    }
    return window.setJSON(table, value);
  };

  window.remote_get = async function (table) {
    const { data, error } = await window.supabaseClient.from(table).select('*');
    if (error) { console.error('Supabase read error:', error); return []; }
    return data || [];
  };

  window.remote_insert = async function (table, row) {
    const { data, error } = await window.supabaseClient.from(table).insert(row).select();
    if (error) { console.error('Supabase insert error:', error); return null; }
    return data;
  };

  window.remote_update = async function (table, id, patch) {
    const { data, error } = await window.supabaseClient.from(table).update(patch).eq('id', id).select();
    if (error) { console.error('Supabase update error:', error); return null; }
    return data;
  };
  window.keyOf = function (item) { return String(item?.id || '') + '|' + String(item?.position || ''); };
  window.thousand = function (n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(n ?? ''); };

  // 狀態彙整
  window.buildStatusMaps = function () {
    const planned = getJSON('plannedItems', []);
    const today = getJSON('todayRecords', []);
    const used = getJSON('usedRecords', []);
    const receivedKeys = new Set(today.filter(r => r?.status === 'received').map(r => keyOf(r)));
    const latestUsed = new Map();
    const usedSumByKey = new Map();
    used.forEach(u => {
      const k = keyOf(u); const qty = Number(u?.qty ?? u?.quantity ?? u?.usedQty) || 0; usedSumByKey.set(k, (usedSumByKey.get(k) || 0) + qty);
      const cur = latestUsed.get(k) || ''; const curD = (used.find(x => keyOf(x) === k && String(x.usedAt) === cur)?.usedAtDate) || ''; const nd = u?.usedAtDate || ''; if (!cur || (nd && curD && nd > curD)) latestUsed.set(k, String(u.usedAt || ''));
    });
    return { receivedKeys, latestUsed, usedSumByKey };
  };

  // 彙總列供報表/表格
  window.buildSummaryRows = function () {
    const libs = getJSON('componentsLibrary', []);
    const { receivedKeys, latestUsed, usedSumByKey } = buildStatusMaps();
    const rows = libs.slice().sort((a, b) => String(a.id).localeCompare(String(b.id))).map(item => {
      const k = keyOf(item); const qty = Number(item?.quantity) || 0;
      const recvPct = qty ? (receivedKeys.has(k) ? 100 : 0) : 0;
      const usedPct = qty ? Math.round((usedSumByKey.get(k) || 0) * 100 / qty) : 0;
      const planned = getJSON('plannedItems', []).find(p => keyOf(p) === k);
      const today = getJSON('todayRecords', []).find(t => keyOf(t) === k);
      const isDate = /\d{4}-\d{2}-\d{2}/.test(String(planned?.plannedAt || ''));
      const recTime = (isDate ? String(planned?.plannedAt || '') : '') + (today?.actualAt ? (isDate ? (' ' + today.actualAt) : String(today.actualAt)) : '');
      const useTime = latestUsed.get(k) || '';
      const statusLabel = (useTime && String(useTime).trim() !== '') ? '已使用' : (receivedKeys.has(k) ? '已進料' : '');
      return {
        '構件編號': item.id || '', '構件規格': item.spec || '', '構件位置': item.position || '', '構件重量': item.weight ?? '', '構件數量': qty,
        '構件目前狀態': statusLabel, '構件進料時間': recTime, '構件使用時間': useTime, '構件進料進度': `${recvPct}%`, '構件使用進度': `${usedPct}%`
      };
    });
    return rows;
  };

  // 建立 Excel Blob（SheetJS）
  window.buildExcelFromRows = function (rows, sheetName) {
    if (typeof XLSX === 'undefined') throw new Error('未載入 XLSX');
    const header = Object.keys(rows[0] || { '欄位': '值' });
    const aoa = [header, ...rows.map(r => header.map(h => r[h]))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || '報表');
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // 建立 CSV Blob
  window.buildCSVFromRows = function (rows, header) {
    const cols = header && header.length ? header : Object.keys(rows[0] || { '欄位': '值' });
    const csv = [cols, ...rows.map(r => cols.map(h => String(r[h] ?? '')))]
      .map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  };

  // 下載 Blob（瀏覽器 a.download）
  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); setTimeout(() => { try { document.body.removeChild(a); } catch { } URL.revokeObjectURL(url); }, 60000);
    try { window.showExportToast?.(filename, url); } catch { }
    return true;
  }

  // Excel 預覽
  window.showExcelPreview = async function (blob, filename) {
    try {
      if (typeof XLSX === 'undefined') { alert('預覽失敗：未載入 XLSX 解析庫'); return; }
      const buf = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(blob); });
      const wb = XLSX.read(buf, { type: 'array' });
      const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;';
      const card = document.createElement('div'); card.style.cssText = 'background:#1f2430;color:#eaeef2;border:1px solid #2a2f3a;border-radius:12px;padding:16px;min-width:320px;max-width:92vw;max-height:80vh;overflow:auto;';
      const title = document.createElement('div'); title.className = 'app-title'; title.textContent = `預覽：${filename}`;
      const tabs = document.createElement('div'); tabs.style.cssText = 'display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;';
      const content = document.createElement('div');
      const actions = document.createElement('div'); actions.style.cssText = 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end;';
      const saveBtn = document.createElement('button'); saveBtn.className = 'btn'; saveBtn.textContent = '下載';
      const closeBtn = document.createElement('button'); closeBtn.className = 'btn'; closeBtn.textContent = '關閉';
      saveBtn.addEventListener('click', () => downloadBlob(filename, blob));
      closeBtn.addEventListener('click', () => { try { document.body.removeChild(wrap); } catch { } });
      actions.append(saveBtn, closeBtn);
      function renderTable(ws) { const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }); const table = document.createElement('table'); table.style.cssText = 'border-collapse:collapse;width:100%;'; rows.forEach((r, i) => { const tr = document.createElement('tr'); r.forEach(c => { const td = document.createElement(i === 0 ? 'th' : 'td'); td.textContent = String(c ?? ''); td.style.cssText = 'border:1px solid #2a2f3a;padding:6px;'; tr.appendChild(td); }); table.appendChild(tr); }); return table; }
      const sheetNames = wb.SheetNames || [];
      sheetNames.forEach((nm, idx) => { const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = nm; btn.addEventListener('click', () => { content.innerHTML = ''; const ws = wb.Sheets[nm]; content.appendChild(renderTable(ws)); }); tabs.appendChild(btn); if (idx === 0) { const ws = wb.Sheets[nm]; content.appendChild(renderTable(ws)); } });
      card.append(title, tabs, content, actions); wrap.appendChild(card); document.body.appendChild(wrap);
    } catch (e) { alert('預覽失敗：' + (e?.message || e)); }
  };

  // Web 版匯出統一入口（相容現有呼叫）
  window.saveBlobWithPicker = async function (blob, filename) { try { return downloadBlob(filename, blob); } catch { return false; } };

  // 匯出提示
  window.showExportToast = function (filename, url) { try { const toast = document.createElement('div'); toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2430;color:#eaeef2;border:1px solid #2a2f3a;border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:center;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.3)'; const text = document.createElement('div'); text.textContent = `已匯出：${filename}`; const openBtn = document.createElement('button'); openBtn.className = 'btn'; openBtn.textContent = '開啟'; const closeBtn = document.createElement('button'); closeBtn.className = 'btn'; closeBtn.textContent = '關閉'; openBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (url) { try { window.open(url, '_blank'); } catch { location.href = url; } } }); closeBtn.addEventListener('click', () => { try { document.body.removeChild(toast); } catch { } }); toast.append(text, openBtn, closeBtn); document.body.appendChild(toast); setTimeout(() => { try { document.body.removeChild(toast); } catch { } }, 8000); } catch { } };

  // 備份匯出功能
  window.exportBackup = async function () {
    try {
      const db = window.supabaseClient;
      if (!db) {
        alert('資料庫連線失敗');
        return;
      }

      // 獲取所有資料表
      const tables = ['components_library', 'planned_items', 'today_records'];
      const backup = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {}
      };

      // 讀取每個資料表
      for (const table of tables) {
        const { data, error } = await db.from(table).select('*');
        if (error) {
          console.error(`Error reading ${table}:`, error);
          backup.data[table] = [];
        } else {
          backup.data[table] = data || [];
        }
      }

      // 建立 JSON 檔案
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });

      // 下載檔案
      const filename = `鋼構系統備份_${new Date().toISOString().split('T')[0]}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`備份成功！\n已匯出 ${backup.data.components_library.length} 個構件、${backup.data.planned_items.length} 個預定項目、${backup.data.today_records.length} 筆記錄`);
    } catch (error) {
      console.error('Export error:', error);
      alert('備份失敗：' + error.message);
    }
  };

  // 備份匯入功能
  window.importBackup = async function () {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const backup = JSON.parse(text);

          if (!backup.version || !backup.data) {
            alert('備份檔案格式錯誤');
            return;
          }

          const confirmMsg = `確定要匯入備份嗎？\n\n此操作將會：\n- 清除現有資料\n- 匯入備份資料\n\n構件：${backup.data.components_library?.length || 0} 個\n預定：${backup.data.planned_items?.length || 0} 個\n記錄：${backup.data.today_records?.length || 0} 筆\n\n此操作無法復原！`;

          if (!confirm(confirmMsg)) return;

          const db = window.supabaseClient;
          if (!db) {
            alert('資料庫連線失敗');
            return;
          }

          // 清除現有資料並匯入
          const tables = ['components_library', 'planned_items', 'today_records'];

          for (const table of tables) {
            // 刪除現有資料
            const { error: deleteError } = await db.from(table).delete().neq('id', 0);
            if (deleteError) {
              console.error(`Error deleting ${table}:`, deleteError);
            }

            // 匯入新資料
            const data = backup.data[table] || [];
            if (data.length > 0) {
              // 移除 id 欄位讓資料庫自動生成
              const cleanData = data.map(({ id, created_at, ...rest }) => rest);

              const { error: insertError } = await db.from(table).insert(cleanData);
              if (insertError) {
                console.error(`Error inserting ${table}:`, insertError);
                throw new Error(`匯入 ${table} 失敗：${insertError.message}`);
              }
            }
          }

          alert('備份匯入成功！頁面將重新載入...');
          setTimeout(() => location.reload(), 1000);
        } catch (error) {
          console.error('Import error:', error);
          alert('匯入失敗：' + error.message);
        }
      };

      input.click();
    } catch (error) {
      console.error('Import error:', error);
      alert('匯入失敗：' + error.message);
    }
  };

})();
