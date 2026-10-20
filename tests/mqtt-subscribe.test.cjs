const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,webkit}=require('playwright');

// The browser's WebSocket is replaced by a scripted broker: CONNECT -> CONNACK, SUBSCRIBE -> SUBACK,
// and window.__mqttPublish(topic,payload) delivers a PUBLISH to every open connection. No network.
const FAKE_BROKER=`(()=>{
  const sockets=[];window.__mqttSockets=sockets;window.__mqttDeny=false;
  const enc=new TextEncoder();
  const frame=(type,body)=>{const len=[];let n=body.length;do{let d=n%128;n=Math.floor(n/128);if(n)d|=128;len.push(d);}while(n);return new Uint8Array([type,...len,...body]).buffer;};
  class FakeSocket{
    constructor(url,protocols){this.url=url;this.protocols=protocols;this.readyState=0;this.sent=[];sockets.push(this);setTimeout(()=>{this.readyState=1;this.onopen&&this.onopen({});},5);}
    send(data){const b=new Uint8Array(data);this.sent.push(b[0]);
      if(b[0]===0x10)setTimeout(()=>this.onmessage&&this.onmessage({data:frame(0x20,[0,0])}),5);
      if(b[0]===0x82)setTimeout(()=>this.onmessage&&this.onmessage({data:frame(0x90,[0,1,window.__mqttDeny?0x80:0])}),5);}
    close(){if(this.readyState===3)return;this.readyState=3;setTimeout(()=>this.onclose&&this.onclose({code:1000}),0);}
  }
  window.WebSocket=FakeSocket;
  window.__mqttPublish=(topic,payload)=>{const t=enc.encode(topic),p=enc.encode(payload);
    for(const s of sockets)if(s.readyState===1)s.onmessage&&s.onmessage({data:frame(0x30,[t.length>>8,t.length&255,...t,...p])});};
})();`;

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8')
  .replace('\n})();','\nwindow.__test={run:source=>eval(source)};\n})();');
const script=fs.readFileSync(path.join(__dirname,'..','examples','mqtt-subscribe.js'),'utf8');
const engine=process.env.BROWSER_ENGINE||'chromium';
let browser;
before(async()=>{browser=await ({chromium,webkit}[engine]).launch({headless:true,
  ...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});});
after(async()=>{if(browser)await browser.close();});

async function app(fn){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(FAKE_BROKER);
  try{
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://mqtt-subscribe.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
    await page.goto('http://mqtt-subscribe.test/index.html');
    const run=source=>page.evaluate(async source=>{await __test.run('appReady');return __test.run(source);},source);
    await run('appStarted');await fn({page,run,context});
    assert.deepEqual(errors,[],'no uncaught editor errors');
  }finally{await context.close();}
}
const place=(inputValues)=>`(async()=>{cancelGesture();items=[{type:'smart',uid:'mq',x:80,y:80,w:320,h:150,color:'#94a3b8',textColor:'#1f2937',
  fill:true,fillColor:'#ffffff',strokeOn:true,size:1,fontFamily:'sans',fontSize:14,font:fontStr('sans',14),script:${JSON.stringify(script)},state:{},
  componentApi:2,componentName:'MQTT subscribe',bindings:{},inputValues:${JSON.stringify(inputValues)}}];setTool('select');selection=[];render();await ensureEditorComponentGraph();})()`;
const outputs=run=>run(`(async()=>{const r=(await ensureEditorComponentGraph()).get(items[0]);return r.error?{error:r.error}:r.io.outputs;})()`);
// polled from Node: page.waitForFunction treats an async predicate's Promise as truthy
async function until(page,run,check,message){
  const test=new Function('o','return '+check);
  for(let i=0;i<50;i++){if(test(await outputs(run)))return;await page.waitForTimeout(100);}
  throw new Error(message+': '+JSON.stringify(await outputs(run)));
}

test('MQTT subscribe connects through the host, publishes payload/topic/count and a received pulse, also offline',async()=>app(async({page,run,context})=>{
  await run(place({broker:'wss://broker.test:9001',topic:'canvas/#',enabled:true}));
  await until(page,run,'o.connected===true','subscribes after CONNACK and SUBACK');
  await page.waitForFunction(()=>window.__mqttSockets.length===1 && window.__mqttSockets[0].url==='wss://broker.test:9001' && window.__mqttSockets[0].protocols[0]==='mqtt' &&
    window.__mqttSockets[0].sent[0]===0x10 && window.__mqttSockets[0].sent.includes(0x82),null,{timeout:5000});   // one connection: CONNECT, then SUBSCRIBE
  await page.evaluate(()=>window.__mqttPublish('canvas/test','{"temp":21.5}'));
  await until(page,run,'o.count===1 && o.payload===\'{"temp":21.5}\' && o.topic==="canvas/test" && o.received===true','delivers the message with a pulse');
  await until(page,run,'o.received===false','the pulse ends after about 100 ms');
  await page.evaluate(()=>{window.__mqttPublish('canvas/a','1');window.__mqttPublish('canvas/b','2');});
  await until(page,run,'o.count===3 && o.payload==="2" && o.topic==="canvas/b"','keeps the latest of quick messages');
  // disabling closes the connection; a deleted component closes it too
  await run('items[0].inputValues.enabled=false;editorComponentEvaluation=null;render()');
  await until(page,run,'o.connected===false && o.status==="Disabled"','enabled false disconnects');
  assert.equal(await page.evaluate(()=>window.__mqttSockets[0].readyState),3);
  // offline HTML connects on its own
  await run('items[0].inputValues.enabled=true;render();save()');await until(page,run,'o.connected===true','reconnects');
  const download=page.waitForEvent('download');await run('exportHtml()');
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'simplecanvas-mqtt-'));context.on('close',()=>fs.rmSync(directory,{recursive:true,force:true}));
  const file=path.join(directory,'reader.html');fs.copyFileSync(await(await download).path(),file);
  const reader=await context.newPage(),errors=[];reader.on('pageerror',e=>errors.push(e.message));
  await reader.goto(pathToFileURL(file).href);
  await reader.waitForFunction(()=>window.__mqttSockets?.some(s=>s.readyState===1 && s.sent.includes(0x82)),null,{timeout:5000});
  await reader.evaluate(()=>window.__mqttPublish('canvas/reader','hello reader'));
  await reader.waitForFunction(()=>[...document.querySelectorAll('[data-smart-index="0"] text')].some(t=>t.textContent==='hello reader'),null,{timeout:5000});
  assert.deepEqual(errors,[]);
}));

test('MQTT subscribe reports address, https and denied subscriptions without connecting',async()=>app(async({page,run})=>{
  await run(place({broker:'',topic:'canvas/#',enabled:true}));
  await until(page,run,'/Set a broker address/.test(o.status)','an empty address is explained');
  assert.equal(await page.evaluate(()=>window.__mqttSockets.length),0,'nothing connects without an address');
  await run(`items[0].inputValues.broker='wss://broker.test:9001';items[0].inputValues.topic='secret/#';editorComponentEvaluation=null;render()`);
  await page.evaluate(()=>{window.__mqttDeny=true;});
  await run('editorComponentEvaluation=null;render()');
  await until(page,run,'/denied the subscription to secret/.test(o.status)','a denied subscription is explained');
  const bad=await run(`(async()=>{const it={...items[0],uid:'bad',script:'({apiVersion:2,mqtt:true,inputs:{url:{type:"string",default:""}},outputs:{},initState(){return {};},children(){return [];},compute(){return {};}})'};
    try{return await requestSmartCaps(it)?'accepted':'rejected';}catch(e){return 'rejected';}})()`);
  assert.equal(bad,'rejected','mqtt:true needs string inputs broker and topic');
}));

test('MQTT messages merge into a JSON state that a spreadsheet reads with STATE, without losing quick messages',async()=>app(async({page,run})=>{
  const jsonState=fs.readFileSync(path.join(__dirname,'..','examples','json-state.js'),'utf8');
  const sheet=fs.readFileSync(path.join(__dirname,'..','examples','spreadsheet.js'),'utf8');
  const base={color:'#94a3b8',textColor:'#1f2937',fill:true,fillColor:'#ffffff',strokeOn:true,size:1,fontFamily:'sans',fontSize:14,font:'',componentApi:2};
  await run(`(async()=>{cancelGesture();const b=${JSON.stringify(base)};b.font=fontStr('sans',14);items=[
    {...b,type:'smart',uid:'mq',x:40,y:40,w:320,h:150,script:${JSON.stringify(script)},state:{},componentName:'MQTT',bindings:{},inputValues:{broker:'wss://broker.test:9001',topic:'canvas/#',enabled:true}},
    {...b,type:'smart',uid:'js',x:40,y:240,w:300,h:150,script:${JSON.stringify(jsonState)},state:{store:{}},componentName:'State',bindings:{json:{uid:'mq',port:'json'}},inputValues:{clear:false}},
    {...b,type:'smart',uid:'sh',x:420,y:40,w:552,h:168,script:${JSON.stringify(sheet)},componentName:'Sheet',bindings:{live:{uid:'js',port:'data'}},inputValues:{},
      state:{cols:6,rows:6,cells:{A1:'=STATE("live","canvas.sensor1.temp")',A2:'=STATE("live","canvas.sensor2.temp")',A3:'=STATE("live","canvas.pump.on")',
        B1:'=OUTPUT(A1+A2,"sum",1)',B2:'=STATE("live","canvas.pump")',B3:'=STATE("live","canvas.nothing")'}}}];
    setTool('select');selection=[];render();await ensureEditorComponentGraph();})()`);
  const graph=()=>run(`(async()=>{const g=await ensureEditorComponentGraph();return items.map(it=>{const r=g.get(it);return r.error?{error:r.error}:r.io.outputs;});})()`);
  await page.waitForFunction(()=>window.__mqttSockets?.some(s=>s.readyState===1 && s.sent.includes(0x82)),null,{timeout:5000});
  await page.evaluate(()=>{window.__mqttPublish('canvas/sensor1','{"temp":21.5}');window.__mqttPublish('canvas/sensor2','{"temp":19}');window.__mqttPublish('canvas/pump','{"on":true}');});
  for(let i=0;;i++){const [,j,o]=await graph();if(o.sum===40.5 && j.entries===3)break;
    if(i>80)throw new Error('three quick messages all reach the state: '+JSON.stringify(await graph()));await page.waitForTimeout(100);}
  const [mq,js,sh]=await graph();
  assert.equal(mq.json,'{"canvas":{"pump":{"on":true}}}','the topic becomes the JSON path');
  assert.equal(js.entries,3);assert.equal(sh.sum,40.5);
  assert.deepEqual(await run(`(async()=>{const it=items[2],io=await resolveSmartComponentIo(it);const s=(await requestSmartCall(it,'children',[it.state,smartResolvedStyle(it),it.w,it.h,false,io])).filter(k=>k.type==='text').map(k=>k.text);return s;})()`).then(t=>['21.5','19','TRUE','#VALUE!','#N/A'].every(v=>t.includes(v))),true,'an object path is #VALUE!, a missing one #N/A');
}));
