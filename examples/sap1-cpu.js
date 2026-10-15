// Smart-shape script for SimpleCanvas: a SAP-1 CPU simulator ("Simple As Possible"), the 8-bit
// teaching computer Ben Eater built on breadboards. 16 bytes of RAM, registers A and B, a program
// counter, an output register and Carry/Zero flags.
//
// To use: SimpleCanvas -> Shape Library -> Manage -> "Add smart shape..." -> pick "Blank" -> paste
// this whole file's content into the Script field (this header comment included).
//
// Operating it: double-click the placed shape to enter edit mode (as with every smart shape);
// only then do the buttons react.
// - Click a RAM row to select it. "Op -/+" change its instruction (high nibble), "Arg -/+" its
//   operand or data value (low nibble). Editing resets the run, so what you see is what runs.
// - Step runs one instruction (the highlighted row is where PC points next). Run continues until
//   HLT, at most 1000 steps per click. Reset restores the edited program and clears the registers.
//
// Instructions (high nibble = opcode, low nibble = operand address or value):
//   0 NOP            1 LDA a  A = RAM[a]       2 ADD a  A = A + RAM[a]   3 SUB a  A = A - RAM[a]
//   4 STA a  RAM[a] = A       5 LDI n  A = n   6 JMP a                   7 JC a   jump if Carry
//   8 JZ a   jump if Zero     E OUT    OUT = A F HLT    stop             (9-D behave as NOP)
// ADD sets Carry when the sum exceeds 255; SUB sets Carry when nothing was borrowed (A >= RAM[a]),
// as with Ben Eater's A + ~B + 1 adder. Both set Zero when the 8-bit result is 0.
//
// The preloaded program is Ben Eater's multiplication: RAM[13] x RAM[15], result in OUT (3 x 5 = 15).
({
  initState(){
    const program = [0x1E, 0x2D, 0x4E, 0x1F, 0x3C, 0x4F, 0x88, 0x60,
                     0x1E, 0xE0, 0xF0, 0x00, 1, 3, 0, 5];
    return { program, ram: program.slice(), pc:0, a:0, b:0, out:0, carry:false, zero:false,
             halted:false, steps:0, sel:13, msg:'' };
  },
  initStyle(){ return { w: 560, h: 360, strokeOn: true, fill: false, size: 1 }; },

  _MNEMONIC: ['NOP','LDA','ADD','SUB','STA','LDI','JMP','JC','JZ','NOP','NOP','NOP','NOP','NOP','OUT','HLT'],
  _NO_ARG: { 0:true, 9:true, 10:true, 11:true, 12:true, 13:true, 14:true, 15:true },
  _decode(byte){
    const op = byte >> 4, arg = byte & 15;
    // NOP never uses its operand, so a small nonzero byte is almost always a data value (x, y, 1...)
    if(op === 0 && arg) return 'data ' + arg;
    return this._MNEMONIC[op] + (this._NO_ARG[op] ? '' : ' ' + arg);
  },
  _hex(v){ return '0x' + (v < 16 ? '0' : '') + v.toString(16).toUpperCase(); },

  // Everything is laid out on a 560 x 360 design grid and scaled to the box, so drawing and
  // hit-testing share one source of truth. Text uses a monospace font sized from the smaller scale.
  _layout(w, h){
    const sx = w/560, sy = h/360, s = Math.min(sx, sy);
    const R = (x, y, bw, bh)=>({ x:x*sx, y:y*sy, w:bw*sx, h:bh*sy });
    const rowH = 20;
    const rows = [];
    for(let i=0; i<16; i++) rows.push(R(10, 30 + i*rowH, 290, rowH));
    const buttons = {
      opDec: R(330, 214, 50, 26), opInc: R(386, 214, 50, 26),
      argDec: R(444, 214, 50, 26), argInc: R(500, 214, 50, 26),
      step: R(330, 306, 66, 40), run: R(404, 306, 66, 40), reset: R(478, 306, 72, 40),
    };
    return { sx, sy, s, R, rows, buttons, px: Math.max(6, Math.floor(11*s)), bigPx: Math.max(6, Math.floor(30*s)) };
  },
  // exactly the app's own 'mono' font string, so the app recognizes it as its Mono family
  _font(px){ return '600 ' + px + 'px ui-monospace,Menlo,Consolas,"Courier New",monospace'; },

  children(state, style, w, h, editing){
    const L = this._layout(w, h), items = [];
    const ink = style.color || '#1f2937', textInk = style.textColor || ink;
    const text = (t, r, align, px)=>items.push({ type:'text', text:String(t), x:r.x, y:r.y, w:r.w, h:r.h,
      align: align || 'left', font: this._font(px || L.px), color: textInk, strokeOn:false, fill:false });
    const box = (r, fillColor, strokeColor, size)=>items.push({ type:'rect', x:r.x, y:r.y, w:r.w, h:r.h,
      color: strokeColor || ink, size: size || 1, strokeOn: !!strokeColor || !fillColor, fill: !!fillColor, fillColor: fillColor || '#ffffff' });

    // frame (follows the toolbar like any rect)
    items.push({ type:'rect', x:0, y:0, w, h, color: ink, size: style.size || 1, strokeOn: style.strokeOn !== false,
      fill: !!style.fill, fillColor: style.fillColor || '#ffffff' });

    // RAM table
    text('Adr', L.R(10, 8, 40, 20)); text('Hex', L.R(52, 8, 56, 20)); text('Dec', L.R(110, 8, 46, 20));
    text('Instruction', L.R(160, 8, 140, 20));
    state.ram.forEach((v, i)=>{
      const r = L.rows[i];
      if(i === state.pc && !state.halted) box(r, '#fde68a');                    // next instruction
      if(i === state.sel) box(r, null, '#6366f1', 2);                           // selected for editing
      text(i, { x:r.x, y:r.y, w:42*L.sx, h:r.h });
      text(this._hex(v), { x:r.x + 42*L.sx, y:r.y, w:58*L.sx, h:r.h });
      text(v, { x:r.x + 100*L.sx, y:r.y, w:46*L.sx, h:r.h });
      text(this._decode(v), { x:r.x + 150*L.sx, y:r.y, w:140*L.sx, h:r.h });
    });
    items.push({ type:'line', x1:L.R(315,0,0,0).x, y1:10*L.sy, x2:L.R(315,0,0,0).x, y2:h-10*L.sy, color: ink, size:1 });

    // registers
    const reg = (label, value, y)=>{ text(label, L.R(330, y, 60, 22)); text(value, L.R(390, y, 160, 22)); };
    reg('PC', state.pc, 10);
    reg('A', state.a + '  ' + this._hex(state.a), 32);
    reg('B', state.b + '  ' + this._hex(state.b), 54);
    reg('Flags', 'C=' + (state.carry ? 1 : 0) + '  Z=' + (state.zero ? 1 : 0), 76);
    text('OUT', L.R(330, 104, 60, 36));
    text(state.out, L.R(390, 100, 160, 44), 'left', L.bigPx);
    // Buttons only react in edit mode; without a hint a click on them just selects the shape and
    // nothing seems to happen. (Exports also render with editing=false, so they show the hint too.)
    const status = state.halted ? 'HLT after ' + state.steps + ' steps' : (state.msg || 'steps: ' + state.steps);
    text(editing ? status : 'Double-click to operate', L.R(330, 146, 220, 22));

    // cell editor
    const selByte = state.ram[state.sel];
    text('Cell ' + state.sel + ':  ' + this._decode(selByte) + '  (' + selByte + ')', L.R(330, 184, 220, 24));
    const button = (r, label)=>{
      box(r, editing ? '#f3f4f6' : '#ffffff', editing ? ink : '#d1d5db', 1);
      items.push({ type:'text', text:label, x:r.x, y:r.y, w:r.w, h:r.h, align:'center', font:this._font(L.px),
        color: editing ? textInk : '#9ca3af', textColor: editing ? textInk : '#9ca3af',   // greyed out = not clickable yet
        strokeOn:false, fill:false });
    };
    const B = L.buttons;
    button(B.opDec, 'Op-'); button(B.opInc, 'Op+'); button(B.argDec, 'Arg-'); button(B.argInc, 'Arg+');
    button(B.step, 'Step'); button(B.run, 'Run'); button(B.reset, 'Reset');
    return items;
  },

  handles(state, w, h){
    const L = this._layout(w, h), hs = [];
    L.rows.forEach((r, i)=>hs.push({ id:'cell' + i, x:r.x + r.w/2, y:r.y + r.h/2, kind:'click' }));
    for(const id in L.buttons){ const r = L.buttons[id]; hs.push({ id, x:r.x + r.w/2, y:r.y + r.h/2, kind:'click' }); }
    return hs;
  },

  hitEdit(state, lx, ly, w, h){
    const L = this._layout(w, h);
    const inside = r=>lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h;
    for(const id in L.buttons) if(inside(L.buttons[id])) return id;
    for(let i=0; i<16; i++) if(inside(L.rows[i])) return 'cell' + i;
    return null;
  },

  // One instruction. Returns the new state; never mutates the one passed in.
  _step(st){
    const s = { ...st, ram: st.ram.slice(), msg:'' };
    if(s.halted) return s;
    const byte = s.ram[s.pc], op = byte >> 4, arg = byte & 15;
    let next = (s.pc + 1) & 15;
    const flags = v=>{ s.zero = (v & 255) === 0; };
    switch(op){
      case 1: s.a = s.ram[arg]; break;
      case 2: { s.b = s.ram[arg]; const v = s.a + s.b; s.carry = v > 255; s.a = v & 255; flags(s.a); break; }
      case 3: { s.b = s.ram[arg]; s.carry = s.a >= s.b; s.a = (s.a - s.b) & 255; flags(s.a); break; }
      case 4: s.ram[arg] = s.a; break;
      case 5: s.a = arg; break;
      case 6: next = arg; break;
      case 7: if(s.carry) next = arg; break;
      case 8: if(s.zero) next = arg; break;
      case 14: s.out = s.a; break;
      case 15: s.halted = true; next = s.pc; break;
    }
    s.pc = next;
    s.steps = s.steps + 1;
    return s;
  },
  _reset(st){
    return { ...st, ram: st.program.slice(), pc:0, a:0, b:0, out:0, carry:false, zero:false, halted:false, steps:0, msg:'' };
  },

  dragEdit(state, handle){
    if(/^cell\d+$/.test(handle)) return { ...state, sel: +handle.slice(4) };
    const edit = (fn)=>{
      const program = state.program.slice();
      program[state.sel] = fn(program[state.sel]) & 255;
      return this._reset({ ...state, program });
    };
    switch(handle){
      case 'opDec': return edit(v=>((((v >> 4) + 15) & 15) << 4) | (v & 15));
      case 'opInc': return edit(v=>((((v >> 4) + 1) & 15) << 4) | (v & 15));
      case 'argDec': return edit(v=>(v & 0xF0) | (((v & 15) + 15) & 15));
      case 'argInc': return edit(v=>(v & 0xF0) | (((v & 15) + 1) & 15));
      case 'step': return this._step(state);
      case 'run': {
        let s = state;
        for(let i=0; i<1000 && !s.halted; i++) s = this._step(s);
        return s.halted ? s : { ...s, msg:'stopped: 1000-step limit' };
      }
      case 'reset': return this._reset(state);
    }
    return state;
  },
})
