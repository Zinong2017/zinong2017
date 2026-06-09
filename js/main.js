(function(){
'use strict';

/* ====== 工具 ====== */
function $(id){return document.getElementById(id)}
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML}

/* ====== PM Agent 核心 ====== */
var DEEPSEEK_URL='https://api.deepseek.com/v1/chat/completions';
var DEEPSEEK_KEY='sk-6c4da4b366a840cd9168f1bbbed21f43';

var state={
  messages:[],isStreaming:false,abortController:null,
  currentBubble:null,activeSkill:null,workflow:null,
  conversations:{},activeConvId:null
};

/* ====== DOM 引用 ====== */
var chatList=$('chatList'),chatInput=$('chatInput'),chatSend=$('chatSend');
var welcome=$('welcome'),thinkingBar=$('thinkingBar'),thinkingBody=$('thinkingBody'),thinkingToggle=$('thinkingToggle');
var cmdPopup=$('cmdPopup'),cmdPopupList=$('cmdPopupList');
var sidebar=$('sidebar'),sidebarSkills=$('sidebarSkills'),sidebarSearch=$('sidebarSearch');
var sidebarHistoryList=$('sidebarHistoryList'),sidebarNewChat=$('sidebarNewChat');
var mainMenuBtn=$('mainMenuBtn');
var inputTags=document.querySelectorAll('.input-tag');
var welcomeCards=document.querySelectorAll('.welcome-card');

/* ====== 对话管理 ====== */
function newConversation(){
  state.activeConvId='conv_'+Date.now();
  state.messages=[];
  state.activeSkill=null;state.workflow=null;
  chatList.innerHTML='';
  welcome.hidden=false;
  updateHistoryList();
  saveConversations();
}
function switchConversation(id){
  if(!state.conversations[id])return;
  saveCurrentConversation();
  state.activeConvId=id;
  state.messages=state.conversations[id].messages||[];
  state.activeSkill=null;state.workflow=null;
  renderConversation();
  updateHistoryList();
}
function saveCurrentConversation(){
  if(!state.activeConvId||!state.messages.length)return;
  var title=state.messages[0]?state.messages[0].content.slice(0,30):'新对话';
  state.conversations[state.activeConvId]={title:title,messages:state.messages.slice(-40),time:Date.now()};
  saveConversations();
}
function saveConversations(){
  try{localStorage.setItem('pm_conversations',JSON.stringify(state.conversations))}catch(e){}
}
function loadConversations(){
  try{var raw=localStorage.getItem('pm_conversations');if(raw)state.conversations=JSON.parse(raw)}catch(e){}
}
function renderConversation(){
  chatList.innerHTML='';
  welcome.hidden=true;
  state.messages.forEach(function(m,i){
    if(i===0&&m.role==='assistant')return;
    appendMsg(m.role,m.content,false);
  });
  scrollBottom();
}
function updateHistoryList(){
  if(!sidebarHistoryList)return;
  sidebarHistoryList.innerHTML='';
  var convs=Object.entries(state.conversations).sort(function(a,b){return b[1].time-a[1].time});
  if(state.activeConvId&&!state.conversations[state.activeConvId]&&state.messages.length){
    convs.unshift([state.activeConvId,{title:state.messages[0]?state.messages[0].content.slice(0,30):'当前对话',time:Date.now()}]);
  }
  convs.slice(0,20).forEach(function(e){
    var btn=document.createElement('button');
    btn.className='sidebar__history-item'+(e[0]===state.activeConvId?' sidebar__history-item--active':'');
    btn.textContent=e[1].title||'空对话';
    btn.addEventListener('click',function(){switchConversation(e[0])});
    sidebarHistoryList.appendChild(btn);
  });
}

/* ====== Markdown ====== */
function md2html(md){
  if(!md)return'';
  if(typeof marked!=='undefined'&&marked.parse){
    marked.setOptions({gfm:true,breaks:true,headerIds:false,mangle:false});
    return marked.parse(md).replace(/<a /g,'<a target="_blank" rel="noopener noreferrer" ');
  }
  return md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n\n/g,'<br><br>');
}

/* ====== System Prompt ====== */
function getSysPrompt(){
  return '你是 Zinong2017，一名资深的 AI Agent 产品经理。你既是 PM 数字员工也是产品导师。\n\n'+
    '## 你的能力\n根据用户输入自行判断他需要什么：答疑解惑、文档产出、方案辅导。\n\n'+
    '### 知识问答 → 导师模式\n- 结构化讲解：概念 → 案例 → 实操建议\n- 引导用户思考更深层问题\n\n'+
    '### 文档产出 → 助手模式\n- PRD：背景→用户故事→功能需求(P0/P1/P2)→指标体系→排期风险\n- 竞品分析：功能/体验/定位/商业模式四维对比\n- 需求拆解：用户故事+功能点+优先级(MoSCoW)+依赖\n- 指标设计：北极星+过程+质量三层\n- 策略画布/SWOT/商业模式等\n\n'+
    '## 输出格式\n- Markdown 组织，标题层级分明，善用表格和列表\n- 中文为主，术语保留英文\n- 每个结论附带可操作建议\n\n'+
    '## 边界\n只回答产品/设计/Agent 问题；不确定时坦诚说明';
}

/* ====== API 调用 ====== */
async function callAPI(messages){
  var ctrl=new AbortController();state.abortController=ctrl;
  return fetch(DEEPSEEK_URL,{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+DEEPSEEK_KEY},
    body:JSON.stringify({model:'deepseek-chat',messages:messages,stream:true,temperature:0.7,max_tokens:4096}),
    signal:ctrl.signal});
}

/* ====== SSE 流解析 ====== */
async function handleStream(resp,bubble){
  var reader=resp.body.getReader(),decoder=new TextDecoder(),full='',buf='';
  try{
    while(true){
      var r=await reader.read();if(r.done)break;
      buf+=decoder.decode(r.value,{stream:true});
      var lines=buf.split('\n');buf=lines.pop()||'';
      for(var i=0;i<lines.length;i++){
        var line=lines[i].trim();
        if(!line||line.indexOf('data:')!==0)continue;
        var data=line.slice(5).trim();if(data==='[DONE]')break;
        try{var d=JSON.parse(data).choices[0].delta;if(d&&d.content){full+=d.content;streamAppend(bubble,d.content)}}
        catch(e){}
      }
    }
  }catch(e){if(e.name!=='AbortError')throw e}
  return full;
}

var cursor=null;
function streamAppend(bubble,text){
  if(!bubble)return;
  if(cursor&&cursor.parentNode)cursor.remove();
  var raw=(bubble.getAttribute('data-raw')||'')+text;
  bubble.setAttribute('data-raw',raw);
  bubble.innerHTML=md2html(raw);
  cursor=document.createElement('span');cursor.className='typing-cursor';bubble.appendChild(cursor);
  scrollBottom();
}
function removeCursor(bubble){
  if(cursor&&cursor.parentNode)cursor.remove();
  if(bubble)bubble.innerHTML=md2html(bubble.getAttribute('data-raw')||'');
}

/* ====== 打字指示器 ====== */
function showTyping(){
  chatSend.classList.add('input-area__send--stop');
  chatSend.querySelector('.input-area__send-icon').hidden=true;
  chatSend.querySelector('.input-area__stop-icon').hidden=false;
}
function hideTyping(){
  chatSend.classList.remove('input-area__send--stop');
  chatSend.querySelector('.input-area__send-icon').hidden=false;
  chatSend.querySelector('.input-area__stop-icon').hidden=true;
}

/* ====== 思考过程 ====== */
var THINK_STEPS=[
  ['🔍','理解需求：识别用户关注的产品维度...'],
  ['🗂','检索知识库：匹配 PM 方法论...'],
  ['📋','构建框架：组织分析结构...'],
  ['✏️','生成内容：按专业格式输出...'],
  ['✅','检查完整性：确认关键要点...']
];
function playThinking(){
  thinkingBar.hidden=false;thinkingBody.innerHTML='';
  thinkingBar.classList.remove('thinking-bar--open');
  if(thinkingToggle)thinkingToggle.setAttribute('aria-expanded','false');
  THINK_STEPS.forEach(function(s,i){
    setTimeout(function(){
      var step=document.createElement('div');step.className='thinking-step';
      step.innerHTML='<span>'+s[0]+'</span><span>'+esc(s[1])+'</span>';
      thinkingBody.appendChild(step);
      thinkingBar.classList.add('thinking-bar--open');
      if(thinkingToggle)thinkingToggle.setAttribute('aria-expanded','true');
    },i*350+150);
  });
}
function hideThinking(){setTimeout(function(){thinkingBar.hidden=true},2000)}

/* ====== 消息 ====== */
function appendMsg(role,content,animate){
  if(role==='assistant'&&welcome&&!welcome.hidden){welcome.hidden=true}
  var el=document.createElement('div');
  el.className='chat-msg chat-msg--'+role;
  if(animate===false)el.style.animation='none';
  var avatar=role==='user'?'我':'Z';
  el.innerHTML='<div class="chat-msg__avatar">'+avatar+'</div><div class="chat-msg__bubble">'+md2html(content)+'</div>';
  chatList.appendChild(el);scrollBottom();return el;
}

function addAllActions(bubble,content){
  var isMentor=state.activeSkill&&PM_SKILLS[state.activeSkill.domain]&&PM_SKILLS[state.activeSkill.domain].skills[state.activeSkill.key]&&PM_SKILLS[state.activeSkill.domain].skills[state.activeSkill.key].interactive;
  var a=document.createElement('div');a.className='chat-msg__actions';
  if(isMentor){a.innerHTML='<button class="chat-msg__action chat-msg__action--copy">📋 复制对话</button>'}
  else{a.innerHTML='<button class="chat-msg__action chat-msg__action--word">📄 Word</button><button class="chat-msg__action chat-msg__action--ppt">📊 PPT</button><button class="chat-msg__action chat-msg__action--dashboard">📈 仪表盘</button><button class="chat-msg__action chat-msg__action--copy">📋 复制</button>'}
  bubble.parentNode.appendChild(a);
  a.querySelector('.chat-msg__action--word')&&a.querySelector('.chat-msg__action--word').addEventListener('click',function(){downloadWord(content)});
  a.querySelector('.chat-msg__action--ppt')&&a.querySelector('.chat-msg__action--ppt').addEventListener('click',function(){downloadPPT(content)});
  a.querySelector('.chat-msg__action--dashboard')&&a.querySelector('.chat-msg__action--dashboard').addEventListener('click',function(){openDashboard(content)});
  a.querySelector('.chat-msg__action--copy').addEventListener('click',function(){copyText(content)});
}

/* ====== 发送消息 ====== */
async function sendMessage(text){
  if(!text||!text.trim()||state.isStreaming)return;
  text=text.trim();state.isStreaming=true;
  if(!state.activeConvId)state.activeConvId='conv_'+Date.now();

  state.messages.push({role:'user',content:text});
  appendMsg('user',text,true);
  playThinking();

  var sysPrompt=getSysPrompt();
  if(state.activeSkill){
    var sk=state.activeSkill;
    var isInt=PM_SKILLS[sk.domain]&&PM_SKILLS[sk.domain].skills[sk.key]&&PM_SKILLS[sk.domain].skills[sk.key].interactive;
    sysPrompt+=isInt?'\n\n## 当前模式：🎓 导师引导\n每次只问一个问题，等用户回答后再继续。用鼓励的语气，最后给出结构化总结。':
      '\n\n## 当前技能：['+sk.key+']\n按该技能的专业方法论组织输出，但不限制结合其他知识。';
  }
  var apiMsgs=[{role:'system',content:sysPrompt}].concat(state.messages.slice(-22));

  setTimeout(function(){hideThinking()},THINK_STEPS.length*350+400);

  var msgEl=document.createElement('div');msgEl.className='chat-msg chat-msg--assistant';
  msgEl.innerHTML='<div class="chat-msg__avatar">Z</div><div class="chat-msg__bubble" data-raw=""></div>';
  chatList.appendChild(msgEl);
  var bubble=msgEl.querySelector('.chat-msg__bubble');state.currentBubble=bubble;

  try{
    var resp=await callAPI(apiMsgs);
    if(!resp.ok)throw new Error('API 错误: '+resp.status);
    var content=await handleStream(resp,bubble);removeCursor(bubble);
    if(content){
      state.messages.push({role:'assistant',content:content});
      addAllActions(bubble,content);
      saveCurrentConversation();updateHistoryList();
      if(state.workflow)setTimeout(function(){advanceWorkflow()},1500);
    }
  }catch(err){
    hideThinking();
    if(err.name==='AbortError')bubble.innerHTML=md2html((bubble.getAttribute('data-raw')||'')+'\n\n*[已停止]*');
    else bubble.innerHTML='<p style="color:#EF4444">请求失败: '+esc(err.message)+'</p>';
  }finally{state.isStreaming=false;state.currentBubble=null;state.abortController=null;hideTyping()}
}

/* ====== 格式输出 ====== */
function downloadWord(md){var h=md2html(md);var d=new Date();var ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:A4;margin:2cm}body{font-family:"Microsoft YaHei",sans-serif;font-size:12pt;line-height:1.8;color:#333}h1{font-size:18pt;color:#1E293B;border-bottom:2px solid #3B82F6;padding-bottom:8px}h2{font-size:15pt}h3{font-size:13pt;color:#3B82F6}table{border-collapse:collapse}th,td{border:1px solid #E2E8F0;padding:8px}th{background:#F1F5F9}code{background:#F1F5F9;padding:2px 6px}pre{background:#1E293B;color:#fff;padding:12px}</style></head><body><p style="color:#94A3B8;font-size:10pt">Zinong2017 PM | '+ds+'</p>'+h+'<hr><p style="color:#94A3B8;font-size:10pt">© '+d.getFullYear()+' Zinong2017</p></body></html>';var b=new Blob(['﻿'+html],{type:'application/msword;charset=utf-8'});downloadBlob(b,'PM文档_'+ds+'.doc')}
function downloadPPT(md){var h=md2html(md);var slides=h.split(/<h2>(.*?)<\/h2>/);var ppt='<div class="slide slide--cover"><div class="slide__content"><h1>📊 演示文稿</h1><p style="color:#94A3B8">Zinong2017 PM 助手</p></div></div>';for(var i=0;i<slides.length;i++){if(!slides[i].trim())continue;if(i%2===1){ppt+='<div class="slide"><div class="slide__content"><h2>'+slides[i]+'</h2>'+(slides[i+1]||'')+'</div></div>';i++}}var ds=new Date().toISOString().slice(0,10);var html='<html><head><meta charset="utf-8"><style>@page{size:screen;margin:0}body{font-family:"Microsoft YaHei",sans-serif;background:#0F172A;color:#E2E8F0;margin:0}.slide{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;padding:60px;box-sizing:border-box;page-break-after:always}.slide--cover{background:linear-gradient(135deg,#1E293B,#312E81)}.slide__content{max-width:800px}h1{font-size:48px;color:#F8FAFC}h2{font-size:32px;color:#818CF8;border-bottom:2px solid #6366F1;padding-bottom:12px;margin-bottom:20px}p,li{font-size:20px;line-height:1.8;color:#CBD5E1}ul{padding-left:24px}</style></head><body>'+ppt+'<div class="slide slide--cover"><div class="slide__content"><h2>感谢阅读</h2><p>Zinong2017 PM | '+ds+'</p></div></div></body></html>';var b=new Blob(['﻿'+html],{type:'application/msword;charset=utf-8'});downloadBlob(b,'PM演示_'+ds+'.ppt')}
function openDashboard(md){var h=md2html(md);var ds=new Date().toISOString().slice(0,10);var html='<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PM 仪表盘</title><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Inter","Noto Sans SC",sans-serif;background:#0F172A;color:#E2E8F0;padding:24px}.dash-header{text-align:center;margin-bottom:24px;padding:20px;background:linear-gradient(135deg,#1E293B,#312E81);border-radius:16px}.dash-header h1{font-size:24px;color:#F8FAFC}.content{background:#1E293B;border-radius:12px;padding:24px;margin-bottom:16px}.content h2{color:#818CF8;margin-bottom:12px}.content table{width:100%;border-collapse:collapse}.content th,.content td{border:1px solid #334155;padding:8px 12px}.content th{background:#0F172A;color:#818CF8}.footer{text-align:center;color:#64748B;font-size:13px;margin-top:24px;padding-top:16px;border-top:1px solid #1E293B}@media(max-width:768px){body{padding:12px}}</style></head><body><div class="dash-header"><h1>📈 PM 数据仪表盘</h1><p style="color:#94A3B8">Zinong2017 | '+ds+'</p></div><div class="content">'+h+'</div><div class="footer">Zinong2017 AI 分身 · 数据仅供参考</div><script>document.querySelectorAll("table").forEach(function(t,i){if(i>2)return;var hd=[];t.querySelectorAll("th").forEach(function(th){hd.push(th.textContent)});var rows=[];t.querySelectorAll("tr").forEach(function(tr,ri){if(ri===0)return;var r=[];tr.querySelectorAll("td").forEach(function(td){r.push(td.textContent)});if(r.length)rows.push(r)});if(rows.length&&hd.length){var box=document.createElement("div");box.style.cssText="background:#1E293B;border-radius:12px;padding:20px;margin-bottom:16px";box.innerHTML="<h3 style=\\"color:#A5B4FC;margin-bottom:12px\\">📊 数据趋势</h3><canvas id=\\"chart"+i+"\\"></canvas>";t.parentNode.insertBefore(box,t);new Chart(document.getElementById("chart"+i),{type:"bar",data:{labels:rows.map(function(r){return r[0]}),datasets:[{label:hd[1]||"数值",data:rows.map(function(r){return parseFloat(r[1])||0}),backgroundColor:"#818CF8",borderRadius:6}]},options:{responsive:true,plugins:{legend:{labels:{color:"#94A3B8"}}}}})}})<\/script></body></html>';var b=new Blob(['﻿'+html],{type:'text/html;charset=utf-8'});window.open(URL.createObjectURL(b),'_blank')}

function downloadBlob(blob,filename){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a)}
function copyText(text){var done=function(){toast('已复制到剪贴板')};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done).catch(function(){fallbackCopy(text,done)})}else{fallbackCopy(text,done)}}
function fallbackCopy(text,cb){var ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;left:-9999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');cb()}catch(e){toast('复制失败')}document.body.removeChild(ta)}
function toast(msg){var t=document.querySelector('.pm-toast');if(!t){t=document.createElement('div');t.className='pm-toast';document.body.appendChild(t)}t.textContent=msg;t.style.opacity='1';clearTimeout(t._t);t._t=setTimeout(function(){t.style.opacity='0'},2000)}

/* ====== 工作流 ====== */
function showWorkflowProgress(){
  var wf=state.workflow;if(!wf)return;
  var old=document.querySelector('.workflow-progress');if(old)old.remove();
  var bar=document.createElement('div');bar.className='workflow-progress';
  var html='<div class="workflow-progress__inner"><div class="workflow-progress__bar"><div class="workflow-progress__fill" style="width:'+(wf.currentStep/wf.steps.length*100)+'%"></div></div><div class="workflow-progress__steps">';
  wf.steps.forEach(function(s,i){var cls=i<wf.currentStep?'done':(i===wf.currentStep?'current':'');html+='<span class="workflow-progress__step workflow-progress__step--'+cls+'">'+s.icon+' '+s.name+'</span>'});
  html+='<button class="workflow-progress__cancel">✕ 停止</button></div></div>';
  bar.innerHTML=html;
  bar.querySelector('.workflow-progress__cancel').addEventListener('click',function(){state.workflow=null;state.activeSkill=null;bar.innerHTML='<div style="text-align:center;color:var(--text-tertiary);padding:8px;font-size:13px">工作流已停止</div>';setTimeout(function(){if(bar.parentNode)bar.remove()},2000)});
  chatList.insertBefore(bar,chatList.firstChild);
}
function advanceWorkflow(){
  var wf=state.workflow;if(!wf)return;
  wf.currentStep++;
  if(wf.currentStep>=wf.steps.length){
    var bar=document.querySelector('.workflow-progress');if(bar){bar.innerHTML='<div style="text-align:center;color:var(--color-success);padding:8px;font-size:13px">✅ '+wf.name+' — 全部步骤完成</div>';setTimeout(function(){if(bar.parentNode)bar.remove()},5000)}
    state.workflow=null;state.activeSkill=null;return;
  }
  var step=wf.steps[wf.currentStep];state.activeSkill={domain:step.domain,key:step.key,prompt:step.prompt};
  var fill=document.querySelector('.workflow-progress__fill');if(fill)fill.style.width=(wf.currentStep/wf.steps.length*100)+'%';
  var steps=document.querySelectorAll('.workflow-progress__step');steps.forEach(function(s,i){s.className='workflow-progress__step workflow-progress__step--'+(i<wf.currentStep?'done':(i===wf.currentStep?'current':''))});
  chatInput.value='';sendMessage('【'+wf.name+' 步骤'+(wf.currentStep+1)+'/'+wf.steps.length+'：'+step.name+'】\n\n'+step.prompt);
}

/* ====== 命令 ====== */
var cmdIndex=-1;
function showCommands(q){if(!cmdPopup||!cmdPopupList)return;var r=searchCommands(q);if(!r.length){cmdPopup.hidden=true;return}cmdPopup.hidden=false;cmdIndex=-1;cmdPopupList.innerHTML='';r.forEach(function(x,i){var it=document.createElement('button');it.className='cmd-popup__item';it.innerHTML='<span class="cmd-popup__item-key">'+x.key+'</span><span>'+x.cmd.name+'</span><span class="cmd-popup__item-desc">'+(x.cmd.desc||'')+'</span>';it.addEventListener('click',function(){execCommand(x.key,x.cmd)});cmdPopupList.appendChild(it)})}
function hideCommands(){cmdPopup.hidden=true;cmdIndex=-1}
function navCmd(dir){var items=cmdPopupList.querySelectorAll('.cmd-popup__item');if(!items.length)return;if(cmdIndex>=0)items[cmdIndex].classList.remove('cmd-popup__item--active');cmdIndex+=dir;if(cmdIndex>=items.length)cmdIndex=0;if(cmdIndex<0)cmdIndex=items.length-1;items[cmdIndex].classList.add('cmd-popup__item--active')}
function selCmd(){var a=cmdPopupList.querySelector('.cmd-popup__item--active');if(a)a.click()}

function execCommand(key,cmd){
  hideCommands();
  if(cmd.flow){
    var steps=[];cmd.flow.forEach(function(sk){var f=null,fd=null;Object.keys(PM_SKILLS).forEach(function(dk){if(PM_SKILLS[dk].skills[sk]){f=PM_SKILLS[dk].skills[sk];fd=dk}});if(f)steps.push({domain:fd,key:sk,name:f.name,icon:f.icon,prompt:f.prompt});else steps.push({domain:cmd.domain,key:sk,name:sk,icon:'📋',prompt:sk})});
    state.workflow={name:cmd.name,steps:steps,currentStep:0,domain:cmd.domain};
    state.activeSkill={domain:steps[0].domain,key:steps[0].key,prompt:steps[0].prompt};
    chatInput.value=steps[0].prompt;showWorkflowProgress();
  }else if(cmd.skill){
    var s=null,d=null;Object.keys(PM_SKILLS).forEach(function(dk){if(PM_SKILLS[dk].skills[cmd.skill]){s=PM_SKILLS[dk].skills[cmd.skill];d=dk}});
    if(s){state.activeSkill={domain:d,key:cmd.skill,prompt:s.prompt};chatInput.value=s.prompt}else{chatInput.value=key}
  }else{chatInput.value=key}
  chatInput.style.height='auto';chatInput.style.height=Math.min(chatInput.scrollHeight,140)+'px';chatInput.focus();
}

/* ====== 侧边栏 ====== */
function initSidebar(){
  if(!sidebarSkills||!PM_SKILLS)return;
  Object.keys(PM_SKILLS).forEach(function(dk){
    var dom=PM_SKILLS[dk];var de=document.createElement('div');de.className='sidebar__domain sidebar__domain--open';
    de.innerHTML='<button class="sidebar__domain-toggle">'+dom.icon+' '+dom.name+'</button><div class="sidebar__domain-skills"></div>';
    var se=de.querySelector('.sidebar__domain-skills');
    Object.keys(dom.skills).forEach(function(sk){
      var s=dom.skills[sk];var btn=document.createElement('button');btn.className='sidebar__skill-btn';
      btn.textContent=s.icon+' '+s.name;
      btn.addEventListener('click',function(){state.activeSkill={domain:dk,key:sk,prompt:s.prompt};chatInput.value=s.prompt;chatInput.style.height='auto';chatInput.style.height=Math.min(chatInput.scrollHeight,140)+'px';chatInput.focus()});
      se.appendChild(btn);
    });
    de.querySelector('.sidebar__domain-toggle').addEventListener('click',function(){de.classList.toggle('sidebar__domain--open')});
    sidebarSkills.appendChild(de);
  });
  if(sidebarSearch){sidebarSearch.addEventListener('input',function(){var q=sidebarSearch.value.trim().toLowerCase();sidebarSkills.querySelectorAll('.sidebar__domain').forEach(function(d){if(!q){d.style.display='';return}var m=false;d.querySelectorAll('.sidebar__skill-btn').forEach(function(s){if(s.textContent.toLowerCase().indexOf(q)>=0){s.style.display='';m=true}else{s.style.display='none'}});d.style.display=m?'':'';if(m)d.classList.add('sidebar__domain--open')})})}
}

/* ====== 事件 ====== */
chatSend.addEventListener('click',function(){if(state.isStreaming&&state.abortController){state.abortController.abort();return}var t=chatInput.value.trim();if(!t)return;chatInput.value='';hideCommands();sendMessage(t)});
chatInput.addEventListener('keydown',function(e){
  if(!cmdPopup.hidden){if(e.key==='ArrowDown'){e.preventDefault();navCmd(1);return}if(e.key==='ArrowUp'){e.preventDefault();navCmd(-1);return}if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();selCmd();return}if(e.key==='Escape'){e.preventDefault();hideCommands();return}}
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(state.isStreaming)return;var t=chatInput.value.trim();if(t){chatInput.value='';hideCommands();sendMessage(t)}}
});
chatInput.addEventListener('input',function(){chatInput.style.height='auto';chatInput.style.height=Math.min(chatInput.scrollHeight,140)+'px';var v=chatInput.value;if(v.startsWith('/')&&v.indexOf(' ')===-1)showCommands(v.slice(1));else hideCommands()});

mainMenuBtn.addEventListener('click',function(){sidebar.classList.toggle('sidebar--open')});
sidebarNewChat.addEventListener('click',function(){saveCurrentConversation();newConversation();chatInput.focus()});
thinkingToggle&&thinkingToggle.addEventListener('click',function(){var o=thinkingBar.classList.toggle('thinking-bar--open');thinkingToggle.setAttribute('aria-expanded',String(o))});

inputTags.forEach(function(t){t.addEventListener('click',function(){var dk=t.getAttribute('data-domain');if(!dk||!PM_SKILLS||!PM_SKILLS[dk])return;var dom=PM_SKILLS[dk];var skills=Object.keys(dom.skills).slice(0,4);var prompts=skills.map(function(k){return dom.skills[k].icon+' '+dom.skills[k].name}).join('  ');chatInput.value='请帮我从以下能力中选择：'+prompts;chatInput.style.height='auto';chatInput.style.height=Math.min(chatInput.scrollHeight,140)+'px';chatInput.focus()})});
welcomeCards.forEach(function(c){c.addEventListener('click',function(){var p=c.getAttribute('data-prompt');if(p){chatInput.value=p;chatInput.style.height='auto';chatInput.style.height=Math.min(chatInput.scrollHeight,140)+'px';chatInput.focus()}})});

document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sidebar.classList.contains('sidebar--open')){sidebar.classList.remove('sidebar--open')}});

/* ====== 滚动 ====== */
function scrollBottom(){chatList.parentElement.scrollTop=chatList.parentElement.scrollHeight}

/* ====== 微信 ====== */
(function(){var m=$('wechatModal');if(!m)return;var close=function(){m.hidden=true};document.querySelectorAll('[data-close-modal]').forEach(function(e){e.addEventListener('click',close)});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!m.hidden)close()})})();

/* ====== 启动 ====== */
loadConversations();
if(Object.keys(state.conversations).length===0)newConversation();
initSidebar();
updateHistoryList();
chatInput.focus();
})();
