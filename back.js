(function(){
  // 共用資料工具
  window.getJSON = function(key, def){ try{ const v=localStorage.getItem(key); return v? JSON.parse(v) : (def ?? []); }catch{ return def ?? []; } };
  window.setJSON = function(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); return true; }catch{ return false; } };
  // Data Layer（統一入口，保留可替換介面）
  window.USE_REMOTE_DB = false;
  window.db_read = async function(table){ if (window.USE_REMOTE_DB) { return await window.remote_get(table); } return window.getJSON(table, []); };
  window.db_write = async function(table, value){ if (window.USE_REMOTE_DB) { /* 可換接 remote_update/insert */ } return window.setJSON(table, value); };
  window.remote_get = async function(table){};
  window.remote_insert = async function(table, row){};
  window.remote_update = async function(table, id, patch){};
  window.keyOf = function(item){ return String(item?.id||'') + '|' + String(item?.position||''); };
  window.thousand = function(n){ const v=Number(n); return Number.isFinite(v)? v.toLocaleString(undefined,{maximumFractionDigits:0}) : String(n??''); };

  // 狀態彙整
  window.buildStatusMaps = function(){
    const planned = getJSON('plannedItems', []);
    const today = getJSON('todayRecords', []);
    const used = getJSON('usedRecords', []);
    const receivedKeys = new Set(today.filter(r=> r?.status === 'received').map(r=> keyOf(r)));
    const latestUsed = new Map();
    const usedSumByKey = new Map();
    used.forEach(u=>{ const k=keyOf(u); const qty=Number(u?.qty ?? u?.quantity ?? u?.usedQty) || 0; usedSumByKey.set(k,(usedSumByKey.get(k)||0)+qty);
      const cur=latestUsed.get(k)||''; const curD=(used.find(x=> keyOf(x)===k && String(x.usedAt)===cur)?.usedAtDate)||''; const nd=u?.usedAtDate||''; if(!cur || (nd && curD && nd>curD)) latestUsed.set(k, String(u.usedAt||'')); });
    return { receivedKeys, latestUsed, usedSumByKey };
  };

  // 彙總列供報表/表格
  window.buildSummaryRows = function(){
    const libs = getJSON('componentsLibrary', []);
    const { receivedKeys, latestUsed, usedSumByKey } = buildStatusMaps();
    const rows = libs.slice().sort((a,b)=> String(a.id).localeCompare(String(b.id))).map(item=>{
      const k = keyOf(item); const qty = Number(item?.quantity)||0;
      const recvPct = qty ? (receivedKeys.has(k) ? 100 : 0) : 0;
      const usedPct = qty ? Math.round((usedSumByKey.get(k)||0) * 100 / qty) : 0;
      const planned = getJSON('plannedItems', []).find(p=> keyOf(p)===k);
      const today = getJSON('todayRecords', []).find(t=> keyOf(t)===k);
      const isDate = /\d{4}-\d{2}-\d{2}/.test(String(planned?.plannedAt||''));
      const recTime = (isDate? String(planned?.plannedAt||'') : '') + (today?.actualAt? (isDate? (' ' + today.actualAt) : String(today.actualAt)) : '');
      const useTime = latestUsed.get(k) || '';
      const statusLabel = (useTime && String(useTime).trim()!=='') ? '已使用' : (receivedKeys.has(k) ? '已進料' : '');
      return {
        '構件編號': item.id||'', '構件規格': item.spec||'', '構件位置': item.position||'', '構件重量': item.weight??'', '構件數量': qty,
        '構件目前狀態': statusLabel, '構件進料時間': recTime, '構件使用時間': useTime, '構件進料進度': `${recvPct}%`, '構件使用進度': `${usedPct}%`
      };
    });
    return rows;
  };

  // 建立 Excel Blob（SheetJS）
  window.buildExcelFromRows = function(rows, sheetName){
    if (typeof XLSX === 'undefined') throw new Error('未載入 XLSX');
    const header = Object.keys(rows[0]||{'欄位':'值'});
    const aoa = [header, ...rows.map(r=> header.map(h=> r[h]))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || '報表');
    const data = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    return new Blob([data], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // 建立 CSV Blob
  window.buildCSVFromRows = function(rows, header){
    const cols = header && header.length ? header : Object.keys(rows[0]||{'欄位':'值'});
    const csv = [cols, ...rows.map(r=> cols.map(h=> String(r[h]??'')))]
      .map(row=> row.map(cell=> '"' + String(cell).replace(/"/g,'""') + '"').join(',')).join('\n');
    return new Blob([csv], { type:'text/csv;charset=utf-8;' });
  };

  // 下載 Blob（瀏覽器 a.download）
  function downloadBlob(filename, blob){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.style.display='none';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try{ document.body.removeChild(a);}catch{} URL.revokeObjectURL(url); }, 60000);
    try{ window.showExportToast?.(filename, url); }catch{}
    return true;
  }

  // Excel 預覽
  window.showExcelPreview = async function(blob, filename){
    try {
      if (typeof XLSX === 'undefined') { alert('預覽失敗：未載入 XLSX 解析庫'); return; }
      const buf = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsArrayBuffer(blob); });
      const wb = XLSX.read(buf, { type: 'array' });
      const wrap = document.createElement('div'); wrap.style.cssText='position:fixed;inset:0;z-index:10002;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;';
      const card = document.createElement('div'); card.style.cssText='background:#1f2430;color:#eaeef2;border:1px solid #2a2f3a;border-radius:12px;padding:16px;min-width:320px;max-width:92vw;max-height:80vh;overflow:auto;';
      const title = document.createElement('div'); title.className='app-title'; title.textContent = `預覽：${filename}`;
      const tabs = document.createElement('div'); tabs.style.cssText='display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;';
      const content = document.createElement('div');
      const actions = document.createElement('div'); actions.style.cssText='display:flex;gap:8px;margin-top:10px;justify-content:flex-end;';
      const saveBtn = document.createElement('button'); saveBtn.className='btn'; saveBtn.textContent='下載';
      const closeBtn = document.createElement('button'); closeBtn.className='btn'; closeBtn.textContent='關閉';
      saveBtn.addEventListener('click', ()=> downloadBlob(filename, blob));
      closeBtn.addEventListener('click', ()=>{ try{ document.body.removeChild(wrap); }catch{} });
      actions.append(saveBtn, closeBtn);
      function renderTable(ws){ const rows = XLSX.utils.sheet_to_json(ws, { header:1 }); const table = document.createElement('table'); table.style.cssText='border-collapse:collapse;width:100%;'; rows.forEach((r,i)=>{ const tr=document.createElement('tr'); r.forEach(c=>{ const td=document.createElement(i===0?'th':'td'); td.textContent=String(c??''); td.style.cssText='border:1px solid #2a2f3a;padding:6px;'; tr.appendChild(td); }); table.appendChild(tr); }); return table; }
      const sheetNames = wb.SheetNames || [];
      sheetNames.forEach((nm, idx)=>{ const btn=document.createElement('button'); btn.className='btn'; btn.textContent=nm; btn.addEventListener('click', ()=>{ content.innerHTML=''; const ws=wb.Sheets[nm]; content.appendChild(renderTable(ws)); }); tabs.appendChild(btn); if(idx===0){ const ws=wb.Sheets[nm]; content.appendChild(renderTable(ws)); } });
      card.append(title, tabs, content, actions); wrap.appendChild(card); document.body.appendChild(wrap);
    } catch (e) { alert('預覽失敗：'+(e?.message||e)); }
  };

  // Web 版匯出統一入口（相容現有呼叫）
  window.saveBlobWithPicker = async function(blob, filename){ try{ return downloadBlob(filename, blob); }catch{ return false; } };

  // 匯出提示
  window.showExportToast = function(filename, url){ try{ const toast=document.createElement('div'); toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2430;color:#eaeef2;border:1px solid #2a2f3a;border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:center;z-index:10000;box-shadow:0 8px 24px rgba(0,0,0,.3)'; const text=document.createElement('div'); text.textContent=`已匯出：${filename}`; const openBtn=document.createElement('button'); openBtn.className='btn'; openBtn.textContent='開啟'; const closeBtn=document.createElement('button'); closeBtn.className='btn'; closeBtn.textContent='關閉'; openBtn.addEventListener('click',(e)=>{ e.preventDefault(); e.stopPropagation(); if(url){ try{ window.open(url,'_blank'); }catch{ location.href=url; } } }); closeBtn.addEventListener('click',()=>{ try{ document.body.removeChild(toast);}catch{} }); toast.append(text, openBtn, closeBtn); document.body.appendChild(toast); setTimeout(()=>{ try{ document.body.removeChild(toast);}catch{} }, 8000); }catch{} };

})();