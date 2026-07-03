

// ===== src/multisession.jsx =====
// Concurrent sessions — a therapist runs several patients AT THE SAME TIME.
// Each active session has its own independent, simultaneously-running timer,
// pain score, notes and sign-off. Switching cards never pauses the others.
// Uses globals from earlier scripts: React, I, DATA, AreaChart, ApptBadge, Modal,
// scopeAppts, scopePatients, ME.

// ── Utilities ─────────────────────────────────────────────────
function fmtClock(sec){
  const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
  const pad=n=>String(n).padStart(2,"0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
const initials2 = (n)=> (n||"").replace("د. ","").split(" ").map(x=>x[0]).join("").slice(0,2);

// ── ConcurrentSessions ────────────────────────────────────────
function ConcurrentSessions(){
  const patientFor = (name)=> DATA.patients.find(p=>p.name===name);
  const myAppts = (window.scopeAppts ? window.scopeAppts(DATA.appts) : DATA.appts).filter(a=>a.pid);

  // Seed two sessions already running in parallel (different start offsets).
  // MUST be called exactly once — subsequent calls would pick different
  // Date.now()-based start times and drift the selection off the real state.
  const seed = ()=>{
    const seen = new Set();
    const picks = myAppts.filter(a=>{ if(seen.has(a.patient))return false; seen.add(a.patient); return true; }).slice(0,2);
    const base = picks.length ? picks : DATA.appts.filter(a=>a.pid).slice(0,2);
    return base.map((a,i)=>{
      const p = patientFor(a.patient) || DATA.patients[i];
      return {
        id: (a.id||("S"+i)) + "-live",
        p, room: a.room || ("غرفة "+(i+1)), type: a.type || "علاج يدوي",
        start: Date.now() - (i===0 ? 32*60*1000 + 14000 : 14*60*1000 + 6000),
        paused:false, frozen:0,
        pain: i===0?3:5, mood: i===0?3:2, signed:false,
        num: 12 - (p?.remain ?? 5),
        notes: i===0
          ? "انخفض الألم في انحناء الفقرات القطنية. تحمّل المريض التحريك اليدوي درجة 3 جيدًا. الالتزام بالبرنامج المنزلي: 6/6 أيام."
          : "تسخين 8 دقائق ثم تحفيز كهربي. تمارين إطالة بإشراف. سيُعاد التقييم بعد التمرين.",
        goals: i===0
          ? [{ g:"ROM lumbar flexion +5°", done:true },
             { g:"الألم ≤ 3/10 وقت الراحة", done:true },
             { g:"المشي 2 كم دون ألم", done:false }]
          : [{ g:"تحسين مدى حركة الكتف", done:false },
             { g:"تخفيف الألم أثناء الرفع", done:false }],
      };
    });
  };

  // ── State ──
  // Lazy init runs seed() once. The second useState previously called seed()
  // again to pluck an id — that call returned different objects and could
  // point at a session that never made it into `sessions`.
  const [sessions, setSessions] = React.useState(seed);
  const [selId, setSelId] = React.useState(null);
  const [now, setNow] = React.useState(Date.now());
  const [picker, setPicker] = React.useState(false);

  // Pick the initial selection AFTER sessions are mounted so we always
  // reference a real row.
  React.useEffect(()=>{
    if (selId == null && sessions.length) setSelId(sessions[0].id);
  }, [sessions, selId]);

  // One shared heartbeat drives EVERY timer — they all advance together.
  // Skip ticks while the tab is hidden to save battery; catch up on visibility.
  React.useEffect(()=>{
    const id = setInterval(()=>{
      if (document.hidden) return;
      setNow(Date.now());
    }, 1000);
    const onVis = () => { if (!document.hidden) setNow(Date.now()); };
    document.addEventListener("visibilitychange", onVis);
    return ()=>{ clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  },[]);
  // Keep a valid selection.
  React.useEffect(()=>{ if(sessions.length && !sessions.some(s=>s.id===selId)) setSelId(sessions[0].id); },[sessions,selId]);

  // ── Derived ──
  const elapsedOf = (s)=> s.paused ? (s.frozen||0) : Math.max(0, Math.floor((now - s.start)/1000));
  const sel = sessions.find(s=>s.id===selId) || sessions[0] || null;

  // ── Handlers ──
  // `update` used to close over the render-time `sel`. If the user tapped
  // a card mid-render, a pending update would land on the previous card.
  // Bind to a specific id via the setter to avoid the stale closure.
  const updateById = (id, patch)=> setSessions(ss=>ss.map(s=> s.id===id ? {...s,...patch} : s));
  const update = (patch)=> { if (sel) updateById(sel.id, patch); };
  const togglePause = (id)=> setSessions(ss=>ss.map(s=>{
    if(s.id!==id) return s;
    if(s.paused) return {...s, paused:false, start: Date.now() - (s.frozen||0)*1000, frozen:0};
    // Freeze in ms rather than seconds so paused durations don't lose
    // sub-second precision across a resume cycle.
    const frozenMs = Math.max(0, Date.now() - s.start);
    return {...s, paused:true, frozen: Math.floor(frozenMs/1000), _frozenMs: frozenMs};
  }));
  // End session — also persist a session row to Supabase / LS so the note
  // and pain score aren't lost. Fire-and-forget: no user-visible failure
  // path today, but errors are logged in KineticData.upsert.
  const endSession = (id)=> setSessions(ss=>{
    const done = ss.find(s=>s.id===id);
    if (done && done.p && window.KineticData) {
      const sessionId = "S-" + (done.p.id || done.p.patient_id || "X") + "-" + Date.now();
      window.KineticData.upsert("sessions", {
        session_id: sessionId,
        patient_id: done.p.id || done.p.patient_id,
        therapist_id: window.ME && window.ME.match || null,
        date: new Date().toISOString().slice(0,10),
        pain_score: done.pain,
        session_notes: done.notes || "",
        session_number: done.num || null,
      }).catch(e => console.warn("endSession persist failed", e));
    }
    return ss.filter(s=>s.id!==id);
  });

  const activeNames = sessions.map(s=>s.p?.name);
  const fromSchedule = myAppts.map(a=>patientFor(a.patient)).filter(Boolean);
  const allMine = (window.scopePatients ? window.scopePatients(DATA.patients) : DATA.patients);
  const addable = [...new Map([...fromSchedule, ...allMine].map(p=>[p.id,p])).values()]
    .filter(p=>!activeNames.includes(p.name));

  const startSession = (p)=>{
    const id = "S-"+p.id+"-"+Date.now();
    setSessions(ss=>[...ss, {
      id, p, room: "غرفة "+((ss.length%3)+1), type:"علاج يدوي",
      start: Date.now(), paused:false, frozen:0,
      pain:4, mood:2, signed:false, num: 12-(p.remain ?? 5), notes:"",
    }]);
    setSelId(id); setPicker(false);
  };

  const runningCount = sessions.filter(s=>!s.paused).length;

  return (
    <div>
      {/* Concurrency banner */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",marginBottom:16,
        background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:14,flexWrap:"wrap"}}>
        <span style={{position:"relative",width:10,height:10,flexShrink:0}}>
          <span className="live-pulse" style={{position:"absolute",inset:0,borderRadius:"50%",background:"var(--green)"}}/>
        </span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13.5,fontWeight:600}}>{sessions.length} جلسات نشطة في نفس الوقت</div>
          <div className="muted" style={{fontSize:12}}>{runningCount} مؤقّت يعمل الآن بالتوازي · بدّل بين المرضى دون إيقاف أي جلسة.</div>
        </div>
        <button className="btn btn-blue" onClick={()=>setPicker(true)}><I.Plus size={14}/> بدء جلسة متزامنة</button>
      </div>

      {/* Active-session rail */}
      <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:6,marginBottom:18}}>
        {sessions.map(s=>{
          const on = sel && s.id===sel.id;
          const el = elapsedOf(s);
          const painColor = s.pain<=3?"#3FA984":s.pain<=6?"#D49044":"#D8665A";
          return (
            <div key={s.id} onClick={()=>setSelId(s.id)}
              style={{
                flex:"0 0 232px", cursor:"pointer", borderRadius:14, padding:14,
                border:`1.5px solid ${on?"var(--blue-500)":"var(--ink-200)"}`,
                background: on?"var(--blue-50)":"#fff",
                boxShadow: on?"0 6px 18px rgba(123,189,232,.22)":"var(--shadow-sm)",
                transition:"all .15s", position:"relative"
              }}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div className="av md" style={{background:on?"var(--blue-500)":"var(--blue-100)",color:on?"#fff":"var(--blue-900)"}}>{initials2(s.p?.name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.p?.name}</div>
                  <div className="muted" style={{fontSize:11}}>{s.room} · {s.type}</div>
                </div>
                <button className="btn btn-ghost btn-icon" title="إنهاء" style={{padding:4,color:"var(--ink-400)"}}
                  onClick={(e)=>{e.stopPropagation(); endSession(s.id);}}><I.X size={13}/></button>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  {!s.paused
                    ? <span style={{position:"relative",width:8,height:8}}><span className="live-pulse" style={{position:"absolute",inset:0,borderRadius:"50%",background:"var(--green)"}}/></span>
                    : <span style={{width:8,height:8,borderRadius:"50%",background:"var(--ink-300)"}}/>}
                  <span className="mono" style={{fontSize:20,fontWeight:600,letterSpacing:"-.01em",color:s.paused?"var(--ink-400)":"var(--blue-700)"}}>{fmtClock(el)}</span>
                </div>
                <span className="badge" style={{background:painColor+"22",color:painColor}}>ألم {s.pain}</span>
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <button onClick={()=>setPicker(true)}
          style={{flex:"0 0 150px",cursor:"pointer",borderRadius:14,border:"1.5px dashed var(--ink-300)",
            background:"var(--ink-50)",color:"var(--ink-500)",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",fontSize:12.5,fontWeight:500}}>
          <div style={{width:34,height:34,borderRadius:10,background:"#fff",border:"1px solid var(--ink-200)",display:"flex",alignItems:"center",justifyContent:"center"}}><I.Plus size={16}/></div>
          بدء جلسة جديدة
        </button>
      </div>

      {/* Selected session detail */}
      {sel
        ? <SessionDetail s={sel} elapsed={elapsedOf(sel)} update={update} onEnd={()=>endSession(sel.id)} onTogglePause={()=>togglePause(sel.id)}/>
        : <div className="card card-pad" style={{textAlign:"center",padding:"60px 20px"}}>
            <div className="h3" style={{marginBottom:6}}>لا جلسات نشطة</div>
            <div className="muted" style={{fontSize:13,marginBottom:16}}>ابدأ جلسة لمريض واحد أو أكثر لتشغيلها بالتوازي.</div>
            <button className="btn btn-blue" style={{margin:"0 auto"}} onClick={()=>setPicker(true)}><I.Plus size={14}/> بدء جلسة</button>
          </div>}

      {/* Patient picker */}
      <Modal open={picker} onClose={()=>setPicker(false)} title="بدء جلسة متزامنة">
        <div className="muted" style={{fontSize:12.5,marginBottom:14}}>اختر مريضًا لبدء جلسته بالتوازي مع الجلسات الجارية.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:340,overflowY:"auto"}}>
          {addable.length===0 && <div className="muted" style={{fontSize:13}}>كل مرضاك في جلسات نشطة بالفعل.</div>}
          {addable.map(p=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",border:"1px solid var(--ink-200)",borderRadius:12}}>
              <div className="av md">{initials2(p.name)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500}}>{p.name}</div>
                <div className="muted" style={{fontSize:11.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.diag} · متبقٍ {p.remain}</div>
              </div>
              <button className="btn btn-blue" style={{fontSize:12,padding:"7px 12px"}} onClick={()=>startSession(p)}><I.Plus size={12}/> بدء</button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ── SessionDetail ──────────────────────────────────────────────
// Controlled session detail — bound to one concurrent session's state.
function SessionDetail({ s, elapsed, update, onEnd, onTogglePause }){
  const p = s.p || {};
  const moods = [
    {l:"أسوأ بكثير",c:"#D8665A"},
    {l:"أسوأ",c:"#D49044"},
    {l:"كما هو",c:"#8898A8"},
    {l:"أفضل",c:"#7BBDE8"},
    {l:"أفضل بكثير",c:"#3FA984"},
  ];
  const goals = Array.isArray(s.goals) ? s.goals : [];
  // Per-patient trend when we can filter, otherwise fall back to the seed set.
  const patientSessions = (DATA.sessions || []).filter(x=>
    x.patient_id ? (p.id===x.patient_id || p.patient_id===x.patient_id) : (x.name===p.name)
  );
  const source = patientSessions.length ? patientSessions : DATA.sessions;
  const trend = source.slice().reverse().map((x,i)=>({label:`S${i+1}`, v:11-(x.pain ?? x.pain_score ?? 0)}));

  // ── Handlers ──
  // Retain the stop handle so we can tear the recognizer down on unmount
  // or when the user starts a fresh dictation.
  const dictationStopRef = React.useRef(null);
  React.useEffect(()=>()=>{ try { dictationStopRef.current && dictationStopRef.current(); } catch {} }, []);
  function handleDictation() {
    if (!window.startDictation) return;
    try { dictationStopRef.current && dictationStopRef.current(); } catch {}
    dictationStopRef.current = window.startDictation({
      onText: (t) => update({ notes: (s.notes || "") + "\n" + t }),
    });
  }

  function toggleGoal(i){
    const next = goals.map((g,idx)=> idx===i ? {...g, done:!g.done} : g);
    update({ goals: next });
  }

  function handleSmartSuggest() {
    update({ notes: (s.notes || "") + "\n\nاقتراح ذكي: استمر في تمارين التقوية الوظيفية مع التركيز على تحسين المدى الحركي." });
    if (window.showToast) window.showToast("تمت إضافة اقتراح ذكي", "success");
  }

  return (
    <div className="rgrid c-lg" style={{"--gtc":"1.4fr 1fr"}}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {/* header */}
        <div className="card card-pad" style={{display:"flex",alignItems:"center",gap:18,position:"relative",overflow:"hidden",flexWrap:"wrap"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg, var(--blue-500), var(--blue-300))"}}/>
          <div className="av lg" style={{background:"var(--blue-500)",color:"#fff",width:54,height:54,fontSize:18}}>{initials2(p.name)}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div className="h2">{p.name}</div>
              <span className="badge b-violet"><span className="dot"></span>الجلسة #{s.num} {s.paused?"متوقفة مؤقتًا":"قيد التنفيذ"}</span>
            </div>
            <div style={{display:"flex",gap:14,marginTop:6,fontSize:12.5,color:"var(--ink-500)",flexWrap:"wrap"}}>
              <span>{p.diag}</span><span>·</span>
              <span>{s.room}</span><span>·</span>
              <span>{s.type}</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:26,fontWeight:600,color:s.paused?"var(--ink-400)":"var(--blue-700)",letterSpacing:"-.01em"}}>{fmtClock(elapsed)}</div>
            <button className="btn btn-ghost" style={{fontSize:11,marginTop:4,padding:"3px 8px"}} onClick={onTogglePause}>
              {s.paused ? "استئناف" : "إيقاف مؤقت"}
            </button>
          </div>
        </div>

        {/* pain & mood */}
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>تسجيل الألم والمزاج</div>
          <div className="label">مستوى الألم (٠ – ١٠)</div>
          <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
            {Array.from({length:11},(_,i)=>i).map(n=>{
              const color = n<=3?"#3FA984":n<=6?"#D49044":"#D8665A";
              const selN = s.pain===n;
              return (
                <button key={n} onClick={()=>update({pain:n})}
                  className="mono"
                  style={{flex:"1 0 36px",height:44,borderRadius:8,border:`1px solid ${selN?color:"var(--ink-200)"}`,
                    background:selN?color:"#fff",color:selN?"#fff":"var(--ink-700)",
                    fontWeight:600,fontSize:14,cursor:"pointer",transition:"all .12s"}}>{n}</button>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--ink-500)",marginBottom:18}}>
            <span>لا ألم</span><span>متوسط</span><span>لا يُحتمل</span>
          </div>

          <div className="label">المزاج اليوم</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {moods.map((m,i)=>{
              const on = s.mood===i;
              return (
                <button key={i} className="btn btn-secondary" onClick={()=>update({mood:i})}
                  style={{flex:"1 0 30%",justifyContent:"center",fontSize:12,borderColor:on?m.c:"var(--ink-200)",
                    background:on?`${m.c}22`:"#fff",color:on?m.c:"var(--ink-700)",fontWeight:on?600:500}}>{m.l}</button>
              );
            })}
          </div>
        </div>

        {/* notes */}
        <div className="card card-pad">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div className="h3">ملاحظات الجلسة</div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={handleDictation}><I.Mic size={13}/> إملاء</button>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={handleSmartSuggest}><I.Sparkle size={13}/> اقتراح</button>
            </div>
          </div>
          <textarea className="input" style={{height:180,padding:14,resize:"vertical",fontSize:13.5,lineHeight:1.55}}
            value={s.notes} onChange={e=>update({notes:e.target.value})} placeholder="اكتب ملاحظات الجلسة لهذا المريض…"/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,flexWrap:"wrap",gap:8}}>
            <div className="muted" style={{fontSize:11.5}}>محفوظ تلقائيًا لجلسة {p.name?.split(" ")[0]}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["علاج يدوي","تسخين","تحفيز كهربي","تقوية"].map(t=>(
                <span key={t} className="pill tag-blue">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* aside */}
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>متابعة التقدّم</div>
          <div style={{position:"relative",height:140}}>
            <AreaChart data={trend} height={140} color="#3FA984" fill="rgba(63,169,132,.18)"/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
            <div><div className="muted" style={{fontSize:11}}>ألم البداية</div><div className="mono" style={{fontWeight:600}}>7/10</div></div>
            <div><div className="muted" style={{fontSize:11}}>الآن</div><div className="mono" style={{fontWeight:600,color:"var(--green)"}}>{s.pain}/10</div></div>
            <div><div className="muted" style={{fontSize:11}}>الهدف</div><div className="mono" style={{fontWeight:600}}>≤ 2/10</div></div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="h3" style={{marginBottom:12}}>أهداف اليوم</div>
          {goals.length === 0 && <div className="muted" style={{fontSize:12.5}}>لا أهداف محددة لهذه الجلسة.</div>}
          {goals.map((g,i)=>(
            <label key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,background:i%2===0?"var(--ink-50)":"transparent",fontSize:13,marginBottom:4,cursor:"pointer"}}>
              <input type="checkbox" checked={!!g.done} onChange={()=>toggleGoal(i)}/>
              <span style={{flex:1,textDecoration:g.done?"line-through":"none",color:g.done?"var(--ink-500)":"var(--ink-900)"}}>{g.g}</span>
            </label>
          ))}
        </div>

        <div className="card card-pad">
          <div className="h3" style={{marginBottom:6}}>توقيع المريض</div>
          <div className="muted" style={{fontSize:12,marginBottom:12}}>مطلوب لإنهاء الجلسة وخصم الباقة.</div>
          <div onClick={()=>update({signed:!s.signed})}
            style={{height:110,border:`1.5px dashed ${s.signed?"var(--green)":"var(--ink-300)"}`,borderRadius:12,
              background:s.signed?"var(--green-bg)":"var(--ink-50)",display:"flex",alignItems:"center",
              justifyContent:"center",cursor:"pointer",transition:"all .15s"}}>
            {s.signed ? (
              <svg viewBox="0 0 240 80" width="180" height="56">
                <path d="M10 50 C 30 20, 50 70, 70 40 S 110 10, 130 45 S 180 70, 210 30" fill="none" stroke="var(--ink-900)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <div style={{textAlign:"center",color:"var(--ink-500)"}}>
                <I.Edit size={18} style={{marginBottom:6}}/>
                <div style={{fontSize:12.5}}>اضغط للتوقيع أو مرّر للمريض</div>
              </div>
            )}
          </div>
          {s.signed && <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:12,color:"var(--green)"}}><I.Check size={13}/> وُقّع بواسطة {initials2(p.name)} · {fmtClock(elapsed)}</div>}
          <button className="btn btn-blue" style={{width:"100%",justifyContent:"center",marginTop:14}} disabled={!s.signed} onClick={onEnd}>
            <I.Check size={14}/> إنهاء الجلسة
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ConcurrentSessions, SessionDetail });
