// Receives messages from an MQTT broker over WebSocket (wss:// on https pages), without credentials.
// The host owns the connection: it subscribes to topic (wildcards + and # allowed) and passes the latest
// message as context.mqtt; this script never touches the network. Outputs: payload and topic of the
// latest message (text, at most 2,000 characters), received (a 100 ms pulse per message), count and
// connected, and status (connected or the reason it is not). json places the message under its topic path,
// e.g. canvas/sensor1 with {"temp":21.5} gives {"canvas":{"sensor1":{"temp":21.5}}}; a spreadsheet reads
// it with JSONVALUE(cell,"/canvas/sensor1/temp"). Messages are delivered one at a time, at most one every
// 250 ms (quicker ones wait in a queue of 200), so each gets its own received pulse: received connected
// to a Dataset's append logs every message. enabled false closes the connection.
({
  apiVersion:2,
  mqtt:true,
  wakePolicy:'latest',
  inputs:{broker:{type:'string',default:''},topic:{type:'string',default:'canvas/#'},enabled:{type:'boolean',default:true}},
  outputs:{payload:{type:'string'},topic:{type:'string'},received:{type:'boolean'},count:{type:'number'},connected:{type:'boolean'},status:{type:'string'},json:{type:'string'}},
  initState(){return {};},
  initStyle(){return {w:320,h:150,fontSize:14,fill:true,fillColor:'#ffffff',strokeOn:true,color:'#94a3b8',textColor:'#1f2937',size:1};},
  _m(context){const m=context&&context.mqtt;return m&&typeof m==='object'?m:{connected:false,error:'Connecting',count:0,topic:'',payload:''};},
  // the payload (parsed when it is JSON, else the text) nested under the topic's levels
  _json(m){
    if(!m.topic)return '';
    let value;try{value=JSON.parse(m.payload);}catch{value=String(m.payload||'');}
    for(const key of String(m.topic).split('/').filter(Boolean).reverse())value={[key]:value};
    const text=JSON.stringify(value);return text.length<=2000&&!m.truncated?text:'';
  },
  compute(inputs,state,context){
    const m=this._m(context),json=this._json(m);
    return {json,payload:String(m.payload||''),topic:String(m.topic||''),received:state.pulse===true,count:Number(m.count)||0,connected:m.connected===true,
      status:m.connected!==true?String(m.error||'not connected').slice(0,200):m.topic&&!json?'message too large for json (2,000 characters)':'connected'};
  },
  // received: true for 100 ms after each new message; a reopened document starts without a pulse.
  transition(inputs,state,memory,context){
    const m=this._m(context),count=Number(m.count)||0,now=context.now;
    if(memory.count===undefined)return {state:{},memory:{count},nextWakeAt:null};
    if(count!==memory.count)return {state:{pulse:true},memory:{count,until:now+100},nextWakeAt:now+100};
    if(state.pulse&&now>=(memory.until||0))return {state:{},memory,nextWakeAt:null};
    return {state,memory,nextWakeAt:state.pulse?memory.until:null};
  },
  children(state,style,w,h,editing,io={}){
    const out=io.outputs||{},connected=out.connected===true;
    const font=(size,bold)=>(bold?'600 ':'400 ')+size+'px sans-serif';
    const fit=(text,px,width)=>{const max=Math.max(1,Math.floor(width/(px*.55)));text=String(text);return text.length>max?text.slice(0,max-1)+'…':text;};
    const name=(typeof io.name==='string'&&io.name.trim())||'MQTT subscribe',px=Math.max(9,Math.min(style.fontSize||14,h/7));
    const line=(text,y,size,color,bold)=>({type:'text',x:10,y,w:w-20,h:size*1.4,text:fit(text,size,w-20),align:'left',font:font(size,bold),color,strokeOn:false,fill:false});
    return [
      {type:'rect',x:0,y:0,w,h,fill:style.fill!==false,fillColor:style.fillColor||'#ffffff',strokeOn:style.strokeOn!==false,color:style.color||'#94a3b8',size:style.size||1},
      {type:'ellipse',x:w-22,y:10,w:12,h:12,fill:true,fillColor:connected?'#16a34a':'#d97706',strokeOn:false},
      line(name,6,px*1.1,style.textColor||'#1f2937',true),
      line((out.status||'not connected')+' · '+(Number(out.count)||0)+' messages',6+px*1.7,px*.85,'#475569',false),
      line(out.topic?'Topic: '+out.topic:'Waiting for a message',6+px*3.1,px*.85,'#475569',false),
      line(out.payload||'',6+px*4.5,px,style.textColor||'#1f2937',false)
    ];
  }
})
