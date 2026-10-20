// A JSON state image: every JSON object arriving at json is merged into one stored object (objects merge
// key by key, anything else replaces; the newest value wins). Connect it to MQTT subscribe's json output,
// which already places each message under its topic path. The data output is a table with one row per
// entry: path as a JSON Pointer ("/canvas/sensor1/temp", like JSON Extract; a key's ~ is written ~0 and
// its / is written ~1), type (number, string, boolean, null, object, array) and value as text; a
// spreadsheet reads it with STATE("port","/path"). A rising clear empties the state. The stored object
// must stay within the 4,000-character component state limit.
({
  apiVersion:2,
  inputs:{json:{type:'string',default:''},clear:{type:'boolean',default:false}},
  outputs:{data:{type:'table'},entries:{type:'number'}},
  initState(){return {store:{}};},
  initStyle(){return {w:300,h:150,fontSize:14,fill:true,fillColor:'#ffffff',strokeOn:true,color:'#94a3b8',textColor:'#1f2937',size:1};},
  _merge(into,from){
    const out={...into};
    for(const [k,v] of Object.entries(from)){
      if(['__proto__','prototype','constructor'].includes(k))continue;
      const old=out[k],obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
      out[k]=obj(old)&&obj(v)?this._merge(old,v):v;
    }
    return out;
  },
  transition(inputs,state,memory){
    let store=state.store&&typeof state.store==='object'?state.store:{};
    const next={...memory,json:inputs.json,clear:inputs.clear===true};
    if(memory.clear!==undefined&&inputs.clear===true&&memory.clear!==true)store={};   // rising clear; an initial high only primes
    if(inputs.json&&inputs.json!==memory.json){
      let value;try{value=JSON.parse(inputs.json);}catch{throw new Error('json is not valid JSON');}
      if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('json must be a JSON object, e.g. {"canvas":{"temp":21.5}}');
      store=this._merge(store,value);
    }
    const result={store};
    if(JSON.stringify(result).length>3900)throw new Error('The JSON state exceeds the 4,000-character limit; clear it or send fewer values');
    return {state:result,memory:next,nextWakeAt:null};
  },
  _rows(store){
    const rows=[];
    const walk=(obj,prefix)=>{
      for(const [k,v] of Object.entries(obj)){
        const path=prefix+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1');
        if(v===null)rows.push([path,'null','']);
        else if(Array.isArray(v))rows.push([path,'array',JSON.stringify(v).slice(0,2000)]);
        else if(typeof v==='object'){rows.push([path,'object','']);walk(v,path);}
        else rows.push([path,typeof v,String(v).slice(0,2000)]);
      }
    };
    walk(store&&typeof store==='object'?store:{},'');
    if(rows.length>1000)throw new Error('The JSON state has more than 1,000 entries');
    return rows;
  },
  compute(inputs,state){
    const rows=this._rows(state.store);
    return {data:{table:{name:'JSON state',columns:[{key:'path',name:'path',type:'string'},{key:'type',name:'type',type:'string'},
      {key:'value',name:'value',type:'string'}],rows}},entries:rows.filter(r=>!['object','array'].includes(r[1])).length};
  },
  children(state,style,w,h,editing,io={}){
    const rows=this._rows(state.store).filter(r=>r[1]!=='object');
    const name=(typeof io.name==='string'&&io.name.trim())||'JSON state',px=Math.max(9,Math.min(style.fontSize||14,h/8));
    const fit=(t,size)=>{const max=Math.max(1,Math.floor((w-20)/(size*.55)));t=String(t);return t.length>max?t.slice(0,max-1)+'…':t;};
    const line=(text,y,size,color,bold)=>({type:'text',x:10,y,w:w-20,h:size*1.4,text:fit(text,size),align:'left',font:(bold?'600 ':'400 ')+size+'px sans-serif',color,strokeOn:false,fill:false});
    const shown=Math.max(0,Math.floor((h-px*4.3)/(px*1.3)));
    return [
      {type:'rect',x:0,y:0,w,h,fill:style.fill!==false,fillColor:style.fillColor||'#ffffff',strokeOn:style.strokeOn!==false,color:style.color||'#94a3b8',size:style.size||1},
      line(name,6,px*1.05,style.textColor||'#1f2937',true),
      line(rows.length+(rows.length===1?' value':' values'),6+px*1.5,px*.85,'#64748b',false),
      ...rows.slice(0,shown).map((r,i)=>line(r[0]+' = '+(r[1]==='string'?'"'+r[2]+'"':r[1]==='array'?'[array]':r[2]),6+px*2.9+i*px*1.3,px*.85,'#475569',false))
    ];
  }
})
