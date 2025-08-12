// CXR v1.1 — acrescenta 'Base dos Saques' no resumo
const BR = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const DT = new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short' });
const KEY='cxr_store_v1'; // mantém a mesma chave de dados

function toCents(txt){
  let s=(txt||'').toString().trim().replace(/\s+/g,'').replace('R$','').replace(/\./g,'');
  if(!s) return 0;
  if(s.includes(',')){ const [r,c='0']=s.split(','); return (parseInt(r||'0',10)*100)+parseInt((c+'0').slice(0,2),10); }
  return parseInt(s,10)*100;
}
function fmt(c){ const sign = c<0?'-':''; const a=Math.abs(c); return sign+BR.format(a/100); }
function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch{ return {}; } }
function save(o){ localStorage.setItem(KEY, JSON.stringify(o)); }

function getDay(bucket, iso){ if(!bucket[iso]) bucket[iso]=[]; return bucket[iso]; }
function addVenda(cents){
  const store=load(); const iso=todayISO();
  getDay(store, iso).unshift({t:'venda', a:cents, ts:Date.now()});
  save(store);
}
function addSaque(cents){
  const base=cents;
  const resto=Math.round(base*0.30);
  const bruto=base+resto;
  const store=load(); const iso=todayISO();
  getDay(store, iso).unshift({t:'saque', base, resto, bruto, ts:Date.now()});
  save(store);
  return {base, resto, bruto};
}
function addRetira(cents){
  const store=load(); const iso=todayISO();
  getDay(store, iso).unshift({t:'retira', a:cents, ts:Date.now()});
  save(store);
}

function renderHoje(){
  const list=document.getElementById('histList');
  const store=load(); const iso=todayISO();
  const dia = store[iso] || [];
  list.innerHTML='';
  dia.forEach(it=>{
    const row=document.createElement('div'); row.className='item';
    const left=document.createElement('div'); left.className='left';
    const right=document.createElement('div');
    if(it.t==='venda'){
      left.innerHTML = `<div><b class="in">Venda</b></div><div class="meta">${DT.format(new Date(it.ts))}</div>`;
      right.textContent = fmt(it.a);
    }else if(it.t==='saque'){
      left.innerHTML = `<div><b>Saque</b></div>
        <div class="calc">Base: ${fmt(it.base)} • +30%: ${fmt(it.resto)} • Total: <b>${fmt(it.bruto)}</b> • Resto (entrada): <b>${fmt(it.resto)}</b></div>
        <div class="meta">${DT.format(new Date(it.ts))}</div>`;
      right.textContent = fmt(it.bruto);
    }else{
      left.innerHTML = `<div><b class="out">Retira</b></div><div class="meta">${DT.format(new Date(it.ts))}</div>`;
      right.textContent = fmt(-it.a);
    }
    row.appendChild(left); row.appendChild(right);
    list.appendChild(row);
  });
}

function resumoPeriodo(fromIso, toIso){
  const store=load();
  const dates=[];
  const d=s=>{ const [y,m,d]=s.split('-').map(n=>parseInt(n,10)); return new Date(y,m-1,d); };
  for(let dt=new Date(d(fromIso)); dt<=d(toIso); dt.setDate(dt.getDate()+1)){
    dates.push(dt.toISOString().slice(0,10));
  }
  let totVendas=0, totSaqueBase=0, totSaqueBruto=0, totSobra=0, totRetira=0;
  dates.forEach(iso=>{
    const dia = store[iso] || [];
    dia.forEach(it=>{
      if(it.t==='venda'){ totVendas += it.a; }
      else if(it.t==='saque'){ totSaqueBase += it.base; totSaqueBruto += it.bruto; totSobra += it.resto; }
      else if(it.t==='retira'){ totRetira += it.a; }
    });
  });
  const entradas = totVendas + totSobra;
  const saldo = entradas - totRetira;
  return { totVendas, totSaqueBase, totSaqueBruto, totSobra, entradas, totRetira, saldo };
}

function init(){
  const val=document.getElementById('valueInput');
  const venda=document.getElementById('btnVenda');
  const saque=document.getElementById('btnSaque');
  const retira=document.getElementById('btnRetira');
  const saqueCalc=document.getElementById('saqueCalc');
  const from=document.getElementById('fromDate');
  const to=document.getElementById('toDate');
  const btnResumo=document.getElementById('btnResumo');
  const btnLimpar=document.getElementById('btnLimpar');
  const resumoBox=document.getElementById('resumoBox');
  const totVendas=document.getElementById('totVendas');
  const totSaqueBase=document.getElementById('totSaqueBase');
  const totSaqueBruto=document.getElementById('totSaqueBruto');
  const totSobraSaque=document.getElementById('totSobraSaque');
  const totEntradas=document.getElementById('totEntradas');
  const totRetiradas=document.getElementById('totRetiradas');
  const totSaldo=document.getElementById('totSaldo');

  setTimeout(()=>{ try{ val.focus({preventScroll:true}); val.select(); }catch(e){} }, 100);
  function clearInput(){ val.value=''; setTimeout(()=>{ try{ val.focus({preventScroll:true}); }catch(e){} }, 50); }

  venda.addEventListener('click', ()=>{
    const c=toCents(val.value);
    if(c<=0){ alert('Informe um valor válido.'); return; }
    addVenda(c);
    saqueCalc.textContent='';
    renderHoje();
    clearInput();
  });

  saque.addEventListener('click', ()=>{
    const c=toCents(val.value);
    if(c<=0){ alert('Informe um valor válido.'); return; }
    const {base, resto, bruto}=addSaque(c);
    saqueCalc.textContent = `Saque: Base ${fmt(base)} + 30% ${fmt(resto)} = Total ${fmt(bruto)} • Resto (30%) que entra no total: ${fmt(resto)}`;
    renderHoje();
    clearInput();
  });

  retira.addEventListener('click', ()=>{
    const c=toCents(val.value);
    if(c<=0){ alert('Informe um valor válido.'); return; }
    addRetira(c);
    saqueCalc.textContent='';
    renderHoje();
    clearInput();
  });

  const today = new Date(); const iso = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0,10);
  from.value = iso; to.value = iso;

  btnResumo.addEventListener('click', ()=>{
    if(!from.value || !to.value){ alert('Selecione as duas datas.'); return; }
    if(from.value > to.value){ alert('A data "De" não pode ser maior que "Até".'); return; }
    const r = resumoPeriodo(from.value, to.value);
    totVendas.textContent    = fmt(r.totVendas);
    totSaqueBase.textContent = fmt(r.totSaqueBase);
    totSaqueBruto.textContent= fmt(r.totSaqueBruto);
    totSobraSaque.textContent= fmt(r.totSobra);
    totEntradas.textContent  = fmt(r.entradas);
    totRetiradas.textContent = fmt(r.totRetira);
    totSaldo.textContent     = fmt(r.saldo);
    resumoBox.style.display='block';
  });

  btnLimpar.addEventListener('click', ()=>{
    if(!from.value || !to.value){ alert('Selecione as duas datas.'); return; }
    if(from.value > to.value){ alert('A data "De" não pode ser maior que "Até".'); return; }
    if(!confirm(`Apagar todos os registros de ${from.value} até ${to.value}?`)) return;
    const store=load();
    const d=s=>{ const [y,m,d]=s.split('-').map(n=>parseInt(n,10)); return new Date(y,m-1,d); };
    for(let dt=new Date(d(from.value)); dt<=d(to.value); dt.setDate(dt.getDate()+1)){
      delete store[dt.toISOString().slice(0,10)];
    }
    save(store);
    resumoBox.style.display='none';
    renderHoje();
  });

  renderHoje();
}
document.addEventListener('DOMContentLoaded', init);
