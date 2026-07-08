

// ===== src/treatments.jsx =====
// خطط العلاج + جلسات العلاج

// ── Utilities ─────────────────────────────────────────────────
function downloadCsv(rows, filename) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Treatments({ go }) {
  const [view, setView] = React.useState("list");
  const [selected, setSelected] = React.useState(null);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [template, setTemplate] = React.useState(null);

  const plans = [
    { id:"TP-2231", patient:"هناء مصطفى",   diag:"انزلاق غضروفي L4–L5",     therapist:"كريم صالح", goals:5,  progress:42, sessions:"5/12", status:"نشط",   updated:"اليوم" },
    { id:"TP-2232", patient:"عمر السيد",  diag:"كتف متجمدة (يمين)",        therapist:"لينا فاروق",goals:3,  progress:62, sessions:"5/8",  status:"نشط",   updated:"أمس" },
    { id:"TP-2233", patient:"آية كريم",     diag:"ألم الرضفة الفخذية",        therapist:"كريم صالح", goals:4,  progress:0,  sessions:"0/10", status:"مسودة",    updated:"منذ يومين" },
    { id:"TP-2234", patient:"وليد حسن",   diag:"خشونة الفقرات العنقية",       therapist:"منى حلمي", goals:4,  progress:27, sessions:"4/15", status:"نشط",   updated:"منذ 3 أيام" },
    { id:"TP-2235", patient:"نور عبدالرحمن",diag:"تأهيل بعد جراحة الرباط الصليبي",         therapist:"لينا فاروق",goals:6,  progress:25, sessions:"6/24", status:"نشط",   updated:"اليوم" },
    { id:"TP-2236", patient:"سلمى رضا",     diag:"التهاب اللفافة الأخمصية",          therapist:"كريم صالح", goals:3,  progress:38, sessions:"3/8",  status:"نشط",   updated:"منذ 4 أيام" },
    { id:"TP-2237", patient:"تامر إبراهيم",  diag:"عرق النسا (يسار)",               therapist:"منى حلمي", goals:3,  progress:100,sessions:"6/6",  status:"مكتمل",updated:"منذ أسبوعين" },
  ];

  if (view === "detail" && selected) return <TreatmentPlanDetail plan={selected} onBack={()=>setView("list")} onEdit={()=>{setView("create");}}/>;
  if (view === "create") return <TreatmentPlanCreate template={template} onCancel={()=>{setTemplate(null);setView("list");}} onSave={()=>{
    if (window.showToast) window.showToast("تم نشر خطة العلاج", "success");
    setTemplate(null);
    setView("list");
  }}/>;

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>خطط العلاج</span></div>
          <div className="h1">خطط العلاج</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{plans.filter(p=>p.status==="نشط").length} نشط · {plans.filter(p=>p.status==="مسودة").length} مسودات · متوسط التقدم 42%</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={()=>setTemplatesOpen(true)}><I.FileText size={14}/> القوالب</button>
          <button className="btn btn-blue" onClick={()=>setView("create")}><I.Plus size={14}/> خطة جديدة</button>
        </div>
      </div>

      <div className="grid-3" style={{marginBottom:18}}>
        <StatCard label="خطط نشطة" value={plans.filter(p=>p.status==="نشط").length} accent="#7BBDE8" icon={<I.Clipboard size={15}/>}/>
        <StatCard label="أهداف محققة" value="68%" accent="#3FA984" icon={<I.Check size={15}/>}/>
        <StatCard label="متوسط الجلسات حتى الهدف" value="9.4" accent="#7E6BD3" icon={<I.Activity size={15}/>}/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>الخطة</th><th>المريض</th><th>التشخيص</th><th>الأخصائي</th><th>التقدّم</th><th>الجلسات</th><th>الحالة</th><th>آخر تحديث</th></tr></thead>
          <tbody>
            {plans.map(p=>(
              <tr key={p.id} data-clickable="true" tabIndex={0} onClick={()=>{setSelected(p);setView("detail")}} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(p);setView("detail");} }}>
                <td className="mono" style={{fontWeight:600}}>{p.id}</td>
                <td>{p.patient}</td>
                <td>{p.diag}</td>
                <td>{p.therapist}</td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,maxWidth:100,height:5,background:"var(--ink-100)",borderRadius:999,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${p.progress}%`,background:p.progress===100?"var(--green)":"var(--blue-500)"}}/>
                    </div>
                    <span className="mono" style={{fontSize:11.5}}>{p.progress}%</span>
                  </div>
                </td>
                <td className="mono">{p.sessions}</td>
                <td>
                  <span className={"badge " + (p.status==="نشط"?"b-blue":p.status==="مكتمل"?"b-green":"b-grey")}>
                    <span className="dot"></span>{p.status}
                  </span>
                </td>
                <td className="muted">{p.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {templatesOpen && (
        <Modal title="قوالب خطط العلاج" onClose={()=>setTemplatesOpen(false)}>
          {["انزلاق غضروفي قياسي","تأهيل ما بعد العملية","إعادة تأهيل الركبة","علاج الكتف المتجمدة","ألم أسفل الظهر المزمن"].map((t,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--ink-100)"}}>
              <span style={{fontSize:13}}>{t}</span>
              <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>{setTemplate(t);setTemplatesOpen(false);setView("create");if(window.showToast)window.showToast(`تم تحميل القالب: ${t}`,"success");}}>استخدام</button>
            </div>
          ))}
        </Modal>
      )}
    </Page>
  );
}

function TreatmentPlanDetail({ plan, onBack, onEdit }) {
  return (
    <Page>
      <div className="crumb" style={{cursor:"pointer"}} onClick={onBack}><span>خطط العلاج</span><I.Chevron size={11}/><span style={{color:"var(--ink-700)"}}>{plan.id}</span></div>
      <div className="page-head" style={{alignItems:"flex-start"}}>
        <div>
          <div className="h1">{plan.diag}</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>المريض: {plan.patient} · الأخصائي: {plan.therapist} · Created Apr 30, 2026</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={()=>window.print()}><I.Print size={13}/> طباعة</button>
          <button className="btn btn-blue" onClick={()=>onEdit&&onEdit()}><I.Edit size={13}/> تعديل الخطة</button>
        </div>
      </div>

      <PatientTreatmentPlan/>
    </Page>
  );
}

function TreatmentPlanCreate({ onCancel, onSave, template }) {
  const [diag, setDiag] = React.useState(template || "متلازمة ألم الرضفة الفخذية");
  const [modalities, setModalities] = React.useState([]);
  const toggleModality = (m) => setModalities(list => list.includes(m) ? list.filter(x=>x!==m) : [...list, m]);
  const patients = (window.scopePatients ? window.scopePatients(DATA.patients) : DATA.patients) || [];
  const [patientId, setPatientId] = React.useState(patients[0] ? (patients[0].patient_id || patients[0].id) : "");
  const therapists = (DATA.therapists || []);
  const [therapistId, setTherapistId] = React.useState(therapists[0] ? (therapists[0].staff_id || therapists[0].id || therapists[0].name) : "");
  return (
    <Page>
      <div className="crumb" style={{cursor:"pointer"}} onClick={onCancel}><span>خطط العلاج</span><I.Chevron size={11}/><span style={{color:"var(--ink-700)"}}>خطة جديدة</span></div>
      <div className="page-head">
        <div className="h1">إنشاء خطة علاج{template ? ` — ${template}` : ""}</div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
          <button className="btn btn-secondary" onClick={()=>{if(window.showToast)window.showToast("تم الحفظ كمسودة","success");onCancel();}}>حفظ كمسودة</button>
          <button className="btn btn-blue" onClick={onSave}><I.Check size={13}/> نشر الخطة</button>
        </div>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"1.4fr 1fr"}}>
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>الخطة details</div>
          <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14}}>
            <Field label="مريض" required>
              <PatientCombobox value={patientId} onChange={setPatientId} patients={patients}/>
            </Field>
            <Field label="الأخصائي المسؤول" required>
              <TherapistCombobox value={therapistId} onChange={setTherapistId} therapists={therapists}/>
            </Field>
            <Field label="التشخيص" required span={2}><input className="input" value={diag} onChange={e=>setDiag(e.target.value)}/></Field>
            <Field label="الأهداف (هدف بكل سطر)" span={2}><textarea className="input" style={{height:100,padding:10}} defaultValue={"Restore pain-free stair descent\nReturn to running بواسطة July\nQuad strength symmetry ≥ 90%"}/></Field>
            <Field label="طرق العلاج" span={2}>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {["علاج يدوي","تدريبات قوة","تمارين إطالة","علاج حراري","تحفيز كهربي","موجات فوق صوتية","علاج مائي","حجامة","وخز جاف"].map(m=>{
                  const on = modalities.includes(m);
                  return (
                    <button key={m} onClick={()=>toggleModality(m)} className="btn btn-secondary" style={{fontSize:12,padding:"6px 10px",background:on?"var(--blue-50)":"#fff",borderColor:on?"var(--blue-500)":"var(--ink-200)",color:on?"var(--blue-900)":"var(--ink-700)"}}>
                      {on ? "✓" : "+"} {m}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="ملاحظات" span={2}><textarea className="input" style={{height:80,padding:10}} placeholder="ملاحظات داخلية لفريق الرعاية"/></Field>
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>الجدولة</div>
          <Field label="إجمالي الجلسات"><input className="input" type="number" defaultValue="10"/></Field>
          <div style={{height:12}}/>
          <Field label="التكرار"><select className="input"><option>2× per week</option><option>1× per week</option><option>3× per week</option></select></Field>
          <div style={{height:12}}/>
          <Field label="تاريخ البدء"><input className="input" type="date" defaultValue="2026-05-26"/></Field>
          <div style={{height:12}}/>
          <Field label="النهاية المتوقعة"><input className="input" disabled defaultValue="Jul 7, 2026"/></Field>

          <div style={{padding:14,background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:12,marginTop:18,fontSize:12.5}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <I.Sparkle size={13} style={{color:"var(--blue-700)"}}/>
              <strong style={{color:"var(--blue-900)"}}>اقتراح ذكي</strong>
            </div>
            المرضى ذوو التشخيصات المشابهة يحتاجون في المتوسط <strong>8.4 جلسة</strong> لبلوغ الهدف. ننصح بـ 10 جلسات كهامش أمان.
          </div>
        </div>
      </div>
    </Page>
  );
}

// ───────────────── جلسات العلاج ─────────────────

function Sessions({ go }) {
  const [tab, setTab] = React.useState("current");
  const CC = window.ConcurrentSessions;

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>جلسات العلاج</span></div>
          <div className="h1">جلسات العلاج</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>شغّل عدة جلسات في وقت واحد، سجّل الألم والملاحظات، ووقّع.</div>
        </div>
        <div className="seg">
          <button className={tab==="current"?"on":""} onClick={()=>setTab("current")}>الجلسات الجارية</button>
          <button className={tab==="السجل"?"on":""} onClick={()=>setTab("السجل")}>سجل الجلسات</button>
        </div>
      </div>

      {tab==="current" && <CC/>}
      {tab==="السجل" && <SessionHistoryList/>}
    </Page>
  );
}

function SessionCurrent({ p }) {
  const [pain, setPain] = React.useState(3);
  const [mood, setMood] = React.useState(3);
  const [signed, setSigned] = React.useState(false);
  const [notes, setNotes] = React.useState("انخفض الألم في انحناء الفقرات القطنية. تحمّل المريض التحريك اليدوي درجة 3 جيدًا. أفاد المريض بأنه نام طوال الليل لأول مرة منذ 3 أسابيع.\n\nتمت زيادة مقاومة الثيراباند إلى الأحمر. الالتزام بالبرنامج المنزلي: 6/6 أيام.");
  const goals = [
    { g:"ROM lumbar flexion +5°", done:true },
    { g:"الألم ≤ 3/10 at rest",     done:true },
    { g:"المشي 2 كم دون ألم",   done:false },
  ];

  return (
    <div className="rgrid c-lg" style={{"--gtc":"1.4fr 1fr"}}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {/* جلسة header */}
        <div className="card card-pad" style={{display:"flex",alignItems:"center",gap:18,position:"relative",overflow:"hidden",flexWrap:"wrap"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg, var(--blue-500), var(--blue-300))"}}/>
          <div className="av lg" style={{background:"var(--blue-500)",color:"#fff",width:54,height:54,fontSize:18}}>{p.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div className="h2">{p.name}</div>
              <span className="badge b-violet"><span className="dot"></span>الجلسة #7 قيد التنفيذ</span>
            </div>
            <div style={{display:"flex",gap:"4px 18px",marginTop:6,fontSize:12.5,color:"var(--ink-500)",flexWrap:"wrap"}}>
              <span>{p.diag}</span><span>·</span>
              <span>الخطة TP-2231</span><span>·</span>
              <span>بدأت 10:00 ص · مضى 32 دقيقة</span>
            </div>
          </div>
          <SessionTimer/>
        </div>

        {/* pain & mood */}
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>تسجيل الألم والمزاج</div>
          <div className="label">مستوى الألم (٠ – ١٠)</div>
          <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
            {Array.from({length:11},(_,i)=>i).map(n=>{
              const color = n<=3?"#3FA984":n<=6?"#D49044":"#D8665A";
              const sel = pain===n;
              return (
                <button key={n} onClick={()=>setPain(n)}
                  style={{
                    flex:"1 0 36px", height:44, borderRadius:8,
                    border:`1px solid ${sel?color:"var(--ink-200)"}`,
                    background: sel?color:"#fff",
                    color: sel?"#fff":"var(--ink-700)",
                    fontWeight:600,fontSize:14,cursor:"pointer",
                    transition:"all .12s"
                  }} className="mono">{n}</button>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--ink-500)",marginBottom:18}}>
            <span>لا ألم</span><span>متوسط</span><span>لا يُحتمل</span>
          </div>

          <div className="label">المزاج اليوم</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              {l:"أسوأ بكثير",c:"#D8665A"},
              {l:"أسوأ",c:"#D49044"},
              {l:"كما هو",c:"#8898A8"},
              {l:"أفضل",c:"#7BBDE8"},
              {l:"أفضل بكثير",c:"#3FA984"},
            ].map((m,i)=>(
              <button key={i} className="btn btn-secondary" onClick={()=>setMood(i)} style={{flex:"1 0 30%",justifyContent:"center",fontSize:12,borderColor:i===mood?m.c:"var(--ink-200)",background:i===mood?`${m.c}22`:"#fff",color:i===mood?m.c:"var(--ink-700)",fontWeight:i===mood?600:500}}>{m.l}</button>
            ))}
          </div>
        </div>

        {/* جلسة notes */}
        <div className="card card-pad">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div className="h3">ملاحظات الجلسة</div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{
                window.startDictation && window.startDictation({ onText: (t)=> setNotes(n=>n+"\n"+t) });
              }}><I.Mic size={13}/> إملاء</button>
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{
                setNotes(n=>n+"\n\nاقتراح ذكي: استمر في تمارين التقوية الوظيفية، مع التركيز على تحسين المدى الحركي وتقليل الألم عند الحركة. يُنصح بتكرار التقييم بعد 3 جلسات.");
                if(window.showToast)window.showToast("تمت إضافة اقتراح ذكي","success");
              }}><I.Sparkle size={13}/> اقتراح</button>
            </div>
          </div>
          <textarea className="input" style={{height:200,padding:14,resize:"vertical",fontSize:13.5,lineHeight:1.55}} value={notes} onChange={e=>setNotes(e.target.value)}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,flexWrap:"wrap",gap:8}}>
            <div className="muted" style={{fontSize:11.5}}>محفوظ تلقائيًا منذ 12 ث</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["علاج يدوي","تسخين","تحفيز كهربي","تقوية"].map(t=>(
                <span key={t} className="pill tag-blue">{t}</span>
              ))}
              <button className="btn btn-ghost btn-icon" style={{padding:4}}><I.Plus size={12}/></button>
            </div>
          </div>
        </div>
      </div>

      {/* right aside */}
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {/* progress tracker */}
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>متابعة التقدّم</div>
          <div style={{position:"relative",height:140}}>
            <PainTrendChart/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
            <div><div className="muted" style={{fontSize:11}}>ألم البداية</div><div className="mono" style={{fontWeight:600}}>7/10</div></div>
            <div><div className="muted" style={{fontSize:11}}>اليوم</div><div className="mono" style={{fontWeight:600,color:"var(--green)"}}>{pain}/10</div></div>
            <div><div className="muted" style={{fontSize:11}}>الهدف</div><div className="mono" style={{fontWeight:600}}>≤ 2/10</div></div>
          </div>
        </div>

        {/* goals */}
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:12}}>أهداف اليوم</div>
          {goals.map((g,i)=>(
            <label key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,background:i%2===0?"var(--ink-50)":"transparent",fontSize:13,marginBottom:4}}>
              <input type="checkbox" defaultChecked={g.done}/>
              <span style={{flex:1,textDecoration:g.done?"line-through":"none",color:g.done?"var(--ink-500)":"var(--ink-900)"}}>{g.g}</span>
            </label>
          ))}
        </div>

        {/* signature */}
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:6}}>المريض sign-off</div>
          <div className="muted" style={{fontSize:12,marginBottom:12}}>مطلوب لإنهاء الجلسة وخصم الباقة.</div>
          <div style={{
            height:120,border:`1.5px dashed ${signed?"var(--green)":"var(--ink-300)"}`,
            borderRadius:12,background:signed?"var(--green-bg)":"var(--ink-50)",
            display:"flex",alignItems:"center",justifyContent:"center",position:"relative",
            cursor:"pointer", transition:"all .15s"
          }} onClick={()=>setSigned(!signed)}>
            {signed ? (
              <svg viewBox="0 0 240 80" width="180" height="60">
                <path d="M10 50 C 30 20, 50 70, 70 40 S 110 10, 130 45 S 180 70, 210 30" fill="none" stroke="var(--ink-900)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <div style={{textAlign:"center",color:"var(--ink-500)"}}>
                <I.Edit size={18} style={{marginBottom:6}}/>
                <div style={{fontSize:12.5}}>اضغط للتوقيع أو مرّر للمريض</div>
              </div>
            )}
          </div>
          {signed && <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:12,color:"var(--green)"}}><I.Check size={13}/> Signed بواسطة Hana M. · 10:32 AM</div>}

          <button className="btn btn-blue" style={{width:"100%",justifyContent:"center",marginTop:14}} disabled={!signed} onClick={async ()=>{
            try {
              if (window.KineticData && p) {
                const patientId = p.patient_id || p.id;
                const nextNum = ((p.done || 0) + 1);
                await window.KineticData.upsert("sessions", {
                  session_id: "S-" + patientId + "-" + Date.now(),
                  patient_id: patientId,
                  therapist_id: window.ME && window.ME.match || null,
                  date: new Date().toISOString().slice(0,10),
                  pain_score: pain,
                  session_notes: notes,
                  session_number: nextNum,
                });
              }
              if (window.showToast) window.showToast("تم إنهاء الجلسة وحفظ الملاحظات", "success");
            } catch (e) {
              console.warn("finish session persist failed", e);
              if (window.showToast) window.showToast("تعذّر حفظ الجلسة", "error");
            }
          }}>
            <I.Check size={14}/> إنهاء الجلسة
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionTimer() {
  const [seconds, setSeconds] = React.useState(32*60 + 14);
  const [running, setRunning] = React.useState(true);
  React.useEffect(()=>{
    if (!running) return;
    const id = setInterval(()=>setSeconds(s=>s+1), 1000);
    return ()=>clearInterval(id);
  },[running]);
  const m = Math.floor(seconds/60);
  const s = seconds%60;
  return (
    <div style={{textAlign:"right"}}>
      <div className="mono" style={{fontSize:26,fontWeight:600,color:"var(--blue-700)",letterSpacing:"-.01em"}}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
      <button className="btn btn-ghost" style={{fontSize:11,marginTop:4,padding:"3px 8px"}} onClick={()=>setRunning(!running)}>
        {running ? "إيقاف مؤقت" : "استئناف"}
      </button>
    </div>
  );
}

function PainTrendChart() {
  const data = DATA.sessions.slice().reverse().map((s,i) => ({ label: `S${i+1}`, v: 11 - s.pain }));
  return <AreaChart data={data} height={140} color="#3FA984" fill="rgba(63,169,132,.18)"/>;
}

function SessionHistoryList() {
  return (
    <div>
      <div className="card" style={{padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"1 1 320px",maxWidth:380}}>
          <I.Search size={14} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-400)"}}/>
          <input className="input" placeholder="ابحث بالمريض أو الملاحظة…" style={{paddingLeft:32}}/>
        </div>
        <select className="input" style={{width:"auto",minWidth:150,flex:"0 1 180px"}}><option>كل الأخصائيين</option><option>كريم صالح</option></select>
        <select className="input" style={{width:"auto",minWidth:150,flex:"0 1 180px"}}><option>آخر 30 يوم</option><option>هذا الأسبوع</option></select>
      </div>

      <SessionTimeline/>
    </div>
  );
}

function SessionTimeline({ mini }) {
  const [notesModal, setNotesModal] = React.useState(null);
  return (
    <div className="card" style={{padding:0,overflow:"hidden"}}>
      {DATA.sessions.map((s,i)=>(
        <div key={i} className="rgrid sess-row" style={{
          padding:"16px 22px", borderBottom:i<DATA.sessions.length-1?"1px solid var(--ink-100)":"none",
          "--gtc":"56px 1fr 110px 130px", gap:16, alignItems:"center"
        }}>
          <div style={{textAlign:"center"}}>
            <div className="mono" style={{fontSize:20,fontWeight:600,color:"var(--blue-700)"}}>#{s.session}</div>
            <div className="muted mono" style={{fontSize:10}}>{s.date}</div>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <span style={{fontSize:13,fontWeight:600}}>{mini ? "هناء مصطفى" : "هناء مصطفى"} · جلسة #{s.session}</span>
              <span className="muted" style={{fontSize:11.5}}>بواسطة كريم صالح</span>
            </div>
            <div style={{fontSize:13,color:"var(--ink-700)",lineHeight:1.5}}>{s.notes}</div>
            {s.done && s.done.length>0 && (
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {s.done.map(d=><span key={d} className="badge b-green"><I.Check size={10}/>{d}</span>)}
              </div>
            )}
          </div>
          <div style={{textAlign:"center"}}>
            <div className="muted" style={{fontSize:11}}>الألم</div>
            <div className="mono" style={{fontSize:18,fontWeight:600, color: s.pain<=3?"var(--green)":s.pain<=6?"var(--amber)":"var(--red)"}}>{s.pain}/10</div>
            <div style={{fontSize:11,color:"var(--ink-500)"}}>{s.mood}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>setNotesModal(s)}>عرض الملاحظات <I.ArrowRight size={11}/></button>
          </div>
        </div>
      ))}
      {notesModal && (
        <Modal title={`ملاحظات الجلسة #${notesModal.session}`} onClose={()=>setNotesModal(null)}>
          <div style={{fontSize:13,color:"var(--ink-700)",lineHeight:1.7,marginBottom:12}}>{notesModal.notes}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {(notesModal.done||[]).map(d=><span key={d} className="badge b-green"><I.Check size={10}/>{d}</span>)}
          </div>
          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--ink-100)",display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--ink-500)"}}>
            <span>التاريخ: {notesModal.date}</span>
            <span>مستوى الألم: {notesModal.pain}/10 · {notesModal.mood}</span>
          </div>
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { Treatments, Sessions, SessionTimeline });


// ===== src/payments.jsx =====
// Payments + invoices + Packages

function Payments({ go }) {
  const [tab, setTab] = React.useState("payments");
  const [statusFilter, setStatusFilter] = React.useState("الكل");
  const [methodFilter, setMethodFilter] = React.useState("الكل");
  const [selected, setSelected] = React.useState(null);
  // Payments were unscoped: a therapist saw everyone's invoices. Scope to
  // the current user's visible patient set first, then apply UI filters.
  const scoped = window.scopePayments ? window.scopePayments(DATA.payments) : DATA.payments;
  const filtered = scoped.filter(p => statusFilter==="الكل" || p.status===statusFilter)
                          .filter(p => methodFilter==="الكل" || p.method===methodFilter);

  const totals = {
    paid: scoped.filter(p=>p.status==="مدفوع").reduce((s,p)=>s+p.paid,0),
    outstanding: scoped.reduce((s,p)=>s+(p.amount-p.paid),0),
    overdue: scoped.filter(p=>p.status==="متأخر").reduce((s,p)=>s+(p.amount-p.paid),0),
    monthly: 410200,
  };

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>المدفوعات والفواتير</span></div>
          <div className="h1">المدفوعات والفواتير</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>نقدي، بطاقة، إنستاباي، فودافون كاش، تحويل بنكي</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={()=>{
            const rows=["الفاتورة,المريض,التاريخ,المبلغ,مدفوع,الطريقة,الحالة",...scoped.map(p=>`${p.id},${p.patient},${p.date},${p.amount},${p.paid},${p.method},${p.status}`)];
            downloadCsv(rows, "payments.csv");
            if(window.showToast)window.showToast("تم تصدير الفواتير","success");
          }}><I.Download size={14}/> تصدير</button>
          <button className="btn btn-blue" onClick={()=>setSelected({mode:"new"})}><I.Plus size={14}/> فاتورة جديدة</button>
        </div>
      </div>

      <div className="grid-4" style={{marginBottom:18}}>
        <StatCard label="محصّل هذا الشهر" value={`EGP ${(totals.monthly/1000).toFixed(0)}K`} delta="+18%" deltaKind="up" accent="#3FA984" icon={<I.Dollar size={15}/>} spark={[210,260,240,300,350,380,410]}/>
        <StatCard label="معلّق"          value={`EGP ${(totals.outstanding/1000).toFixed(1)}K`} delta="-EGP 2.3K" deltaKind="down" accent="#D49044" icon={<I.Clock size={15}/>}/>
        <StatCard label="متأخر (>14ي)"        value={`EGP ${(totals.overdue/1000).toFixed(1)}K`}    delta="2 invoices" deltaKind="down" accent="#D8665A" icon={<I.X size={15}/>}/>
        <StatCard label="متوسط الفاتورة"           value="EGP 7.6K"  delta="+5%" deltaKind="up" accent="#7BBDE8" icon={<I.FileText size={15}/>}/>
      </div>

      <div className="seg" style={{marginBottom:14}}>
        <button className={tab==="payments"?"on":""} onClick={()=>setTab("payments")}>الفواتير</button>
        <button className={tab==="methods"?"on":""}  onClick={()=>setTab("methods")}>الدفع methods</button>
        <button className={tab==="receipts"?"on":""} onClick={()=>setTab("receipts")}>الإيصالات</button>
      </div>

      {tab==="payments" && (
        <>
          <div className="card" style={{padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:"1 1 280px",maxWidth:340}}>
              <I.Search size={14} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-400)"}}/>
              <input className="input" placeholder="ابحث في الفواتير…" style={{paddingLeft:32}}/>
            </div>
            <div className="seg">
              {["الكل","مدفوع","جزئي","معلّق","متأخر"].map(s=>(
                <button key={s} className={statusFilter===s?"on":""} onClick={()=>setStatusFilter(s)}>{s}</button>
              ))}
            </div>
            <select className="input" style={{width:160}} value={methodFilter} onChange={e=>setMethodFilter(e.target.value)}>
              <option>الكل</option><option>نقدي</option><option>فيزا</option><option>إنستاباي</option><option>فودافون كاش</option><option>تحويل بنكي</option>
            </select>
          </div>

          <div className="card" style={{overflow:"hidden"}}>
            <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr>
                <th>فاتورة</th><th>المريض</th><th>التاريخ</th><th>المبلغ</th><th>مدفوع</th><th>الطريقة</th><th>الحالة</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(p=>{
                  const remaining = p.amount - p.paid;
                  const pct = p.amount ? p.paid/p.amount : 0;
                  return (
                    <tr key={p.id} data-clickable="true" tabIndex={0} onClick={()=>setSelected(p)} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(p);} }}>
                      <td className="mono" style={{fontWeight:600}}>{p.id}</td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div className="av sm">{(p.patient||"—").split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                          {p.patient}
                        </div>
                      </td>
                      <td>{p.date}</td>
                      <td className="mono" style={{fontWeight:600}}>EGP {p.amount.toLocaleString()}</td>
                      <td>
                        <div>
                          <div className="mono" style={{fontSize:13}}>EGP {p.paid.toLocaleString()}</div>
                          <div style={{height:3,background:"var(--ink-100)",borderRadius:999,overflow:"hidden",marginTop:3}}>
                            <div style={{height:"100%",width:`${pct*100}%`,background:pct===1?"var(--green)":"var(--amber)"}}/>
                          </div>
                          {remaining>0 && <div className="muted mono" style={{fontSize:10.5,marginTop:2}}>EGP {remaining.toLocaleString()} due</div>}
                        </div>
                      </td>
                      <td>
                        <span className="pill" style={{fontSize:11}}>
                          {p.method==="نقدي" && <I.Dollar size={11}/>}
                          {p.method==="فيزا" && <I.CreditCard size={11}/>}
                          {(p.method==="إنستاباي" || p.method==="فودافون كاش") && <I.Phone size={11}/>}
                          {p.method==="تحويل بنكي" && <I.Layers size={11}/>}
                          {p.method}
                        </span>
                      </td>
                      <td><PayBadge s={p.status}/></td>
                      <td onClick={e=>e.stopPropagation()}>
                        <button className="btn btn-ghost btn-icon" title="عرض" onClick={()=>setSelected(p)}><I.Eye size={13}/></button>
                        <button className="btn btn-ghost btn-icon" title="تحميل" onClick={()=>{
                          const rows=["الفاتورة,المريض,التاريخ,المبلغ,مدفوع,الطريقة,الحالة",`${p.id},${p.patient},${p.date},${p.amount},${p.paid},${p.method},${p.status}`];
                          downloadCsv(rows, `invoice-${p.id}.csv`);
                        }}><I.Download size={13}/></button>
                        <RowMenu size={13} items={[
                          { label:"عرض التفاصيل", icon:<I.Eye size={13}/>, onClick:()=>setSelected(p) },
                          { label:"طباعة", icon:<I.Print size={13}/>, onClick:()=>window.print() },
                          { label:"تصدير CSV", icon:<I.Download size={13}/>, onClick:()=>{
                            const rows=["الفاتورة,المريض,التاريخ,المبلغ,مدفوع,الطريقة,الحالة",`${p.id},${p.patient},${p.date},${p.amount},${p.paid},${p.method},${p.status}`];
                            downloadCsv(rows, `invoice-${p.id}.csv`);
                            if(window.showToast)window.showToast("تم تصدير الفاتورة","success");
                          }},
                          { label:"حذف", icon:<I.X size={13}/>, danger:true, onClick:async ()=>{
                            if (!window.confirm(`حذف الفاتورة ${p.id}؟`)) return;
                            try {
                              if (window.KineticData) await window.KineticData.remove("payments", p.invoice_id || p.id);
                              if (window.showToast) window.showToast("تم حذف الفاتورة","success");
                            } catch (e) { console.warn("delete invoice failed", e); if (window.showToast) window.showToast("تعذّر الحذف","error"); }
                          }},
                        ]}/>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {tab==="methods" && <PaymentMethodsView/>}
      {tab==="receipts" && <ReceiptsView/>}

      {/* invoice preview modal */}
      {selected && selected.id && <InvoiceModal invoice={selected} onClose={()=>setSelected(null)}/>}
      {selected && selected.mode==="new" && <NewInvoiceModal onClose={()=>setSelected(null)}/>}
    </Page>
  );
}

function PaymentMethodsView() {
  const data = [
    { label:"نقدي",          v:32, color:"#7BBDE8", revenue:"131,000" },
    { label:"فيزا / Mastercard", v:28, color:"#3A7FB5", revenue:"114,800" },
    { label:"إنستاباي",      v:18, color:"#7E6BD3", revenue:"73,800" },
    { label:"فودافون كاش", v:14, color:"#D49044", revenue:"57,400" },
    { label:"تحويل بنكي", v:8,  color:"#3FA984", revenue:"32,800" },
  ];
  return (
    <div className="rgrid c-lg" style={{"--gtc":"1fr 1fr"}}>
      <div className="card card-pad">
        <div className="h2" style={{marginBottom:18}}>الطريقة mix · this month</div>
        <DonutChart data={data} size={200} centerLabel="ج.م محصلة" centerValue="410K"/>
      </div>
      <div className="card card-pad">
        <div className="h2" style={{marginBottom:14}}>Revenue بواسطة method</div>
        {data.map(d=>(
          <div key={d.label} style={{padding:"11px 0",borderBottom:"1px dashed var(--ink-100)",display:"flex",alignItems:"center",gap:10}}>
            <span style={{width:8,height:8,borderRadius:3,background:d.color}}></span>
            <span style={{flex:1,fontSize:13}}>{d.label}</span>
            <span className="mono" style={{fontSize:13,fontWeight:600}}>EGP {d.revenue}</span>
            <span className="muted mono" style={{fontSize:11,minWidth:36,textAlign:"right"}}>{d.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReceiptsView() {
  return (
    <EmptyState icon={<I.FileText size={22}/>} title="لا توجد إيصالات بعد" body="Receipts will appear here when مريض pay invoices. You can also upload paper receipts manually." action={<button className="btn btn-blue"><I.Upload size={13}/> رفع إيصال</button>}/>
  );
}

function InvoiceModal({ invoice, onClose }) {
  return (
    <Modal open onClose={onClose} title={`فاتورة ${invoice.id}`} width={680}
      footer={<>
        <button className="btn btn-secondary" onClick={()=>window.print()}><I.Print size={13}/> طباعة</button>
        <button className="btn btn-secondary" onClick={()=>{
          const rows=["البند,الكمية,السعر","الأساسية 10 — علاج يدوي,1,"+invoice.amount];
          downloadCsv(rows, `invoice-${invoice.id}.csv`);
          if(window.showToast)window.showToast("تم تحميل الفاتورة","success");
        }}><I.Download size={13}/> تحميل PDF</button>
        <button className="btn btn-blue" onClick={()=>{
          window.open(`https://wa.me/201002341180?text=فاتورة+${invoice.id}+بمبلغ+${invoice.amount}+جنيه+مصري`,"_blank");
        }}><I.Send size={13}/> Send via واتساب</button>
      </>}>
      <div style={{padding:"clamp(14px, 3vw, 24px)",background:"var(--ink-50)",border:"1px solid var(--ink-200)",borderRadius:12}}>
        {/* header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:14}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <I.Logo size={26}/>
              <span style={{fontSize:18,fontWeight:600}}>كينيتك للعلاج الطبيعي</span>
            </div>
            <div className="muted" style={{fontSize:12,lineHeight:1.5}}>
              14 ش صلاح سالم, مصر الجديدة<br/>
              القاهرة، مصر · الرقم الضريبي 514-203-091<br/>
              billing@kinetic.eg
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="serif" style={{fontSize:30,lineHeight:1}}>فاتورة</div>
            <div className="mono" style={{marginTop:4,fontSize:13}}>{invoice.id}</div>
            <div className="muted" style={{fontSize:12,marginTop:6}}>صدرت في {invoice.date}</div>
            <PayBadge s={invoice.status}/>
          </div>
        </div>

        {/* bill to */}
        <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",marginBottom:24}}>
          <div>
            <div className="muted" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>فاتورة لـ</div>
            <div style={{fontWeight:600}}>{invoice.patient}</div>
            <div className="muted" style={{fontSize:12,lineHeight:1.5,marginTop:2}}>ملف P-10241<br/>مصر الجديدة، القاهرة<br/>+20 100 234 1180</div>
          </div>
          <div>
            <div className="muted" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>فريق الرعاية</div>
            <div style={{fontSize:13}}>د. ياسمين عادل</div>
            <div className="muted" style={{fontSize:12}}>كريم صالح (PT)</div>
          </div>
        </div>

        {/* line items */}
        <div className="tbl-scroll" style={{background:"#fff",borderRadius:10,border:"1px solid var(--ink-200)",marginBottom:16}}>
          <table className="tbl" style={{fontSize:12.5,minWidth:420}}>
            <thead><tr><th>البند</th><th style={{textAlign:"right"}}>الكمية</th><th style={{textAlign:"right"}}>السعر</th><th style={{textAlign:"right"}}>الإجمالي</th></tr></thead>
            <tbody>
              <tr><td>الأساسية 10 — باقة علاج يدوي</td><td style={{textAlign:"right"}}>1</td><td style={{textAlign:"right"}} className="mono">7,250.00</td><td style={{textAlign:"right"}} className="mono">7,250.00</td></tr>
              <tr><td>تقييم أولي</td><td style={{textAlign:"right"}}>1</td><td style={{textAlign:"right"}} className="mono">0.00</td><td style={{textAlign:"right"}} className="mono">0.00</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <div style={{minWidth:240}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12.5}}><span className="muted">المجموع الفرعي</span><span className="mono">EGP 7,250.00</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12.5}}><span className="muted">ض.ق.م (14%)</span><span className="mono">EGP 0.00</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid var(--ink-200)",marginTop:6}}><span style={{fontWeight:600}}>الإجمالي</span><span className="mono" style={{fontWeight:600,fontSize:16}}>EGP {invoice.amount.toLocaleString()}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12.5}}><span className="muted">مدفوعة عبر {invoice.method}</span><span className="mono">EGP {invoice.paid.toLocaleString()}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12.5,color: invoice.amount-invoice.paid>0?"var(--amber)":"var(--green)"}}><span>الرصيد المستحق</span><span className="mono" style={{fontWeight:600}}>EGP {(invoice.amount-invoice.paid).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function NewInvoiceModal({ onClose }) {
  const patients = (window.scopePatients ? window.scopePatients(DATA.patients) : DATA.patients) || [];
  const today = new Date().toISOString().slice(0,10);
  const dueDefault = new Date(Date.now() + 14*86400000).toISOString().slice(0,10);
  const [items, setItems] = React.useState([{ name:"الأساسية 10 — علاج يدوي", qty:1, price:7250 }]);
  const [patientId, setPatientId] = React.useState(patients[0] ? (patients[0].patient_id || patients[0].id) : "");
  const [date, setDate] = React.useState(today);
  const [due, setDue] = React.useState(dueDefault);
  const [method, setMethod] = React.useState("نقدي");
  const subtotal = items.reduce((s,i)=>s+i.qty*i.price,0);

  async function create() {
    if (!patientId) { if (window.showToast) window.showToast("اختر مريضًا", "error"); return; }
    if (subtotal <= 0) { if (window.showToast) window.showToast("أضف بندًا واحدًا على الأقل", "error"); return; }
    try {
      const invoiceId = "INV-" + Date.now();
      const row = {
        invoice_id: invoiceId,
        id: invoiceId,
        patient_id: patientId,
        amount: subtotal,
        paid: 0,
        payment_method: method,
        method,
        status: "معلّق",
        date,
        due,
      };
      if (window.KineticData) await window.KineticData.upsert("payments", row);
      if (window.showToast) window.showToast("تم إنشاء الفاتورة", "success");
      onClose();
    } catch (e) {
      console.warn("create invoice failed", e);
      if (window.showToast) window.showToast("تعذّر إنشاء الفاتورة", "error");
    }
  }

  return (
    <Modal open onClose={onClose} title="فاتورة جديدة" width={720}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
        <button className="btn btn-secondary" onClick={()=>{ if (window.showToast) window.showToast("تم حفظ المسودة","success"); onClose(); }}>حفظ المسودة</button>
        <button className="btn btn-blue" onClick={create}><I.Check size={13}/> إنشاء الفاتورة</button>
      </>}>
      <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:14,marginBottom:14}}>
        <Field label="مريض" required>
          <PatientCombobox
            value={patientId}
            onChange={setPatientId}
            patients={patients}
            placeholder={patients.length === 0 ? "لا يوجد مرضى" : "ابحث عن مريض بالاسم أو الرقم…"}
            disabled={patients.length === 0}
          />
        </Field>
        <Field label="التاريخ"><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
        <Field label="تاريخ الاستحقاق"><input className="input" type="date" value={due} onChange={e=>setDue(e.target.value)}/></Field>
        <Field label="الدفع method">
          <select className="input" value={method} onChange={e=>setMethod(e.target.value)}>
            <option>نقدي</option><option>فيزا</option><option>إنستاباي</option><option>فودافون كاش</option><option>تحويل بنكي</option>
          </select>
        </Field>
      </div>

      <div className="label">بنود الفاتورة</div>
      <div className="card" style={{padding:0,boxShadow:"none",marginBottom:10}}>
        {items.map((it,i)=>(
          <div key={i} className="rgrid inv-item-row" style={{padding:10,"--gtc":"1fr 80px 100px 100px 28px",gap:10,alignItems:"center",borderBottom:i<items.length-1?"1px solid var(--ink-100)":"none"}}>
            <input className="input" value={it.name} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="input" type="number" value={it.qty} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,qty:+e.target.value}:x))}/>
            <input className="input mono" type="number" value={it.price} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,price:+e.target.value}:x))}/>
            <span className="mono" style={{textAlign:"right",fontWeight:600}}>EGP {(it.qty*it.price).toLocaleString()}</span>
            <button className="btn btn-ghost btn-icon" onClick={()=>setItems(items.filter((_,j)=>j!==i))}><I.X size={13}/></button>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={()=>setItems([...items,{name:"",qty:1,price:0}])} style={{fontSize:12}}><I.Plus size={12}/> إضافة بند</button>

      <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}>
        <div style={{minWidth:240,padding:14,background:"var(--ink-50)",borderRadius:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span className="muted">المجموع الفرعي</span><span className="mono">EGP {subtotal.toLocaleString()}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span className="muted">ض.ق.م (14%)</span><span className="mono">EGP 0</span></div>
          <hr className="sep" style={{margin:"8px 0"}}/>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600}}>الإجمالي</span><span className="mono" style={{fontWeight:600,fontSize:18}}>EGP {subtotal.toLocaleString()}</span></div>
        </div>
      </div>
    </Modal>
  );
}

// ───────────── Packages ─────────────
function Packages({ go }) {
  const [editing, setEditing] = React.useState(null);
  const toggleActive = async (p) => {
    const next = { ...p, active: !p.active };
    try { await window.KineticData.upsert("packages", next); }
    catch (e) { console.warn("toggle package failed", e); }
    if (window.showToast) window.showToast(next.active ? `تم تفعيل ${p.name}` : `تم إيقاف ${p.name}`, "success");
  };
  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>الباقات</span></div>
          <div className="h1">باقات العلاج</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{DATA.packages.filter(p=>p.active).length} نشط باقة</div>
        </div>
        <button className="btn btn-blue" onClick={()=>setEditing({mode:"new"})}><I.Plus size={14}/> باقة جديدة</button>
      </div>

      <div className="grid-3">
        {DATA.packages.map(p=>(
          <div key={p.id} className="card" style={{padding:0,overflow:"hidden",opacity:p.active?1:.6,position:"relative"}}>
            <div style={{height:90,background:`linear-gradient(135deg, ${p.color}, ${p.color}99)`,position:"relative",padding:18}}>
              {p.popular && <span style={{position:"absolute",top:14,right:14,background:"#fff",color:p.color,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,boxShadow:"var(--shadow-sm)"}}>الأكثر طلبًا</span>}
              <div className="mono" style={{color:"#fff",opacity:.8,fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase"}}>{p.id}</div>
              <div style={{color:"#fff",fontWeight:600,fontSize:18,marginTop:4,letterSpacing:"-.005em"}}>{p.name}</div>
            </div>
            <div style={{padding:18}}>
              <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:12}}>
                <span className="mono" style={{fontSize:30,fontWeight:600,letterSpacing:"-.01em"}}>EGP {p.price.toLocaleString()}</span>
                <span className="muted" style={{fontSize:12}}>/ للباقة</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}><I.Check size={13} style={{color:p.color}}/> {p.sessions} جلسة{p.sessions>1?"s":""} متضمنة</div>
                <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}><I.Check size={13} style={{color:p.color}}/> تقييم أولي مجاني</div>
                <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}><I.Check size={13} style={{color:p.color}}/> صالحة لمدة 90 يوم</div>
                {p.sessions>=10 && <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12.5}}><I.Check size={13} style={{color:p.color}}/> التقدّم reports متضمنة</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,marginBottom:14}}>
                <span className="muted">مبيعة هذا الشهر</span>
                <span className="mono" style={{fontWeight:600}}>{p.sold}</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-secondary" style={{flex:1,justifyContent:"center"}} onClick={()=>setEditing(p)}><I.Edit size={12}/> تعديل</button>
                <RowMenu size={14} items={[
                  { label:"تعديل الباقة", icon:<I.Edit size={13}/>, onClick:()=>setEditing(p) },
                  { label:p.active?"إيقاف الباقة":"تفعيل الباقة", icon:<I.Check size={13}/>, onClick:()=>toggleActive(p) },
                  { label:"مضاعفة", icon:<I.Plus size={13}/>, onClick:async()=>{
                    const clone = { ...p, id: (p.id||"PK-")+"-Copy-"+Math.random().toString(36).slice(2,6), name:p.name+" — نسخة", sold:0 };
                    try { await window.KineticData.upsert("packages", clone); }
                    catch (e) { console.warn("clone package failed", e); }
                    if (window.showToast) window.showToast(`تم نسخ ${p.name}`,"success");
                  }},
                  { label:"حذف الباقة", icon:<I.X size={13}/>, danger:true, onClick:async()=>{
                    if (!window.confirm(`حذف ${p.name}؟`)) return;
                    try { await window.KineticData.remove("packages", p.id); }
                    catch (e) { console.warn("delete package failed", e); }
                    if (window.showToast) window.showToast(`تم حذف ${p.name}`,"success");
                  }},
                ]}/>
                <button onClick={()=>toggleActive(p)} className={`switch ${p.active?"on":""}`} style={{marginLeft:"auto",border:"none",padding:0,background:"transparent",cursor:"pointer"}} title={p.active?"إيقاف الباقة":"تفعيل الباقة"}>
                  <div className="knob"></div>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal open onClose={()=>setEditing(null)} title={editing.mode==="new"?"باقة جديدة":`تعديل ${editing.name}`}
          footer={<>
            <button className="btn btn-secondary" onClick={()=>setEditing(null)}>إلغاء</button>
            <button className="btn btn-blue" onClick={()=>setEditing(null)}><I.Check size={13}/> حفظ الباقة</button>
          </>}>
          <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14}}>
            <Field label="الاسم" required span={2}><input className="input" defaultValue={editing.name||""} placeholder="مثال: الباقة الأساسية 10"/></Field>
            <Field label="الجلسات"><input className="input" type="number" defaultValue={editing.sessions||""}/></Field>
            <Field label="السعر (ج.م)"><input className="input" type="number" defaultValue={editing.price||""}/></Field>
            <Field label="اللون"><input className="input" type="color" defaultValue={editing.color||"#7BBDE8"}/></Field>
            <Field label="الصلاحية (أيام)"><input className="input" type="number" defaultValue="90"/></Field>
            <Field label="الوصف" span={2}><textarea className="input" style={{height:70,padding:10}} placeholder="ملاحظات داخلية"/></Field>
          </div>
        </Modal>
      )}
    </Page>
  );
}

Object.assign(window, { Payments, Packages, NewInvoiceModal });


// ===== src/campaigns.jsx =====
// واتساب الحملة System

function Campaigns({ go }) {
  const [view, setView] = React.useState("list"); // list | builder | analytics
  const [selected, setSelected] = React.useState(null);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [initialTemplate, setInitialTemplate] = React.useState(null);

  if (view === "builder") return <CampaignBuilder initialTemplate={initialTemplate} onCancel={()=>{setInitialTemplate(null);setView("list");}} onSave={()=>{
    if (window.showToast) window.showToast("تم إطلاق الحملة", "success");
    setInitialTemplate(null);
    setView("list");
  }}/>;
  if (view === "analytics" && selected) return <CampaignAnalytics c={selected} onBack={()=>setView("list")}/>;

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>حملات واتساب</span></div>
          <div className="h1">حملات واتساب</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>تواصل مع مرضاك عبر التذكيرات والمتابعات والإعلانات.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={()=>setTemplatesOpen(true)}><I.FileText size={14}/> القوالب</button>
          <button className="btn btn-blue" onClick={()=>setView("builder")}><I.Plus size={14}/> حملة جديدة</button>
        </div>
      </div>

      <div className="grid-4" style={{marginBottom:18}}>
        <StatCard label="رسائل مُرسلة (شهر)"   value="3,812" delta="+24%"  deltaKind="up"   accent="#25D366" icon={<I.WhatsApp size={15}/>} spark={[120,180,210,240,290,340,380]}/>
        <StatCard label="معدل القراءة"             value="89%"   delta="+3%"   deltaKind="up"   accent="#7BBDE8" icon={<I.Eye size={15}/>}/>
        <StatCard label="معدل الرد"         value="14.2%" delta="+1.8%" deltaKind="up"   accent="#7E6BD3" icon={<I.Send size={15}/>}/>
        <StatCard label="رسائل فاشلة"       value="2.1%"  delta="-0.4%" deltaKind="up"   accent="#D8665A" icon={<I.X size={15}/>}/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:"1px solid var(--ink-200)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div className="h3">الحملات</div>
          <div style={{flex:1}}/>
          <div className="seg">
            <button className="on">الكل</button>
            <button>جارٍ</button>
            <button>مجدول</button>
            <button>مكتمل</button>
          </div>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>الحملة</th><th>الجمهور</th><th>مُرسلة</th><th>مقروءة</th><th>ردّ</th><th>القالب</th><th>الجدولة</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {DATA.campaigns.map(c=>(
              <tr key={c.id} data-clickable="true" tabIndex={0} onClick={()=>{setSelected(c);setView("analytics")}} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(c);setView("analytics");} }}>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:c.best?"linear-gradient(135deg,#25D366,#1FA351)":"var(--blue-100)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <I.WhatsApp size={15} style={{color: c.best?"#fff":"var(--blue-700)"}}/>
                    </div>
                    <div>
                      <div style={{fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                        {c.name}
                        {c.best && <span className="badge b-green" style={{fontSize:10}}><I.Sparkle size={10}/>الأفضل أداءً</span>}
                      </div>
                      <div className="mono" style={{fontSize:11,color:"var(--ink-500)"}}>{c.id}</div>
                    </div>
                  </div>
                </td>
                <td className="mono">{c.audience.toLocaleString()}</td>
                <td className="mono">{c.sent.toLocaleString()}</td>
                <td>
                  <div>
                    <span className="mono">{c.read.toLocaleString()}</span>
                    {c.sent>0 && <div style={{height:3,background:"var(--ink-100)",borderRadius:999,overflow:"hidden",marginTop:3,width:80}}>
                      <div style={{height:"100%",width:`${c.read/c.sent*100}%`,background:"var(--blue-500)"}}/>
                    </div>}
                  </div>
                </td>
                <td className="mono">{c.replied} <span className="muted" style={{fontSize:11}}>{c.sent?`(${(c.replied/c.sent*100).toFixed(1)}%)`:""}</span></td>
                <td><span className="pill">{c.template}</span></td>
                <td><span style={{fontSize:12}}>{c.schedule}</span></td>
                <td>
                  <span className={"badge " + (c.status==="جارٍ"?"b-green":c.status==="مجدول"?"b-blue":c.status==="مكتمل"?"b-grey":"b-amber")}>
                    <span className="dot"></span>{c.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-icon" onClick={(e)=>{e.stopPropagation();setSelected(c);setView("analytics")}}><I.Chart size={13}/></button>
                  <RowMenu size={13} items={[
                    { label:"عرض التحليلات", icon:<I.Chart size={13}/>, onClick:()=>{setSelected(c);setView("analytics");} },
                    { label:"مضاعفة الحملة", icon:<I.Plus size={13}/>, onClick:async()=>{
                      const clone = { ...c, id: (c.id||"CM-")+"-C-"+Math.random().toString(36).slice(2,6), name: c.name+" — نسخة", status:"مسودة", sent:0, read:0, replied:0 };
                      try { await window.KineticData.upsert("campaigns", clone); }
                      catch (e) { console.warn("clone campaign failed", e); }
                      if (window.showToast) window.showToast(`تم نسخ الحملة`,"success");
                    }},
                    { label:c.status==="جارٍ"?"إيقاف مؤقت":"استئناف", icon:<I.X size={13}/>, onClick:async()=>{
                      const nextStatus = c.status==="جارٍ" ? "مجدول" : "جارٍ";
                      try { await window.KineticData.upsert("campaigns", { ...c, status: nextStatus }); }
                      catch (e) { console.warn("toggle campaign failed", e); }
                      if (window.showToast) window.showToast(nextStatus==="جارٍ"?"تم الاستئناف":"تم الإيقاف المؤقت","success");
                    }},
                    { label:"حذف الحملة", icon:<I.X size={13}/>, danger:true, onClick:async()=>{
                      if (!window.confirm(`حذف حملة ${c.name}؟`)) return;
                      try { await window.KineticData.remove("campaigns", c.id); }
                      catch (e) { console.warn("delete campaign failed", e); }
                      if (window.showToast) window.showToast("تم حذف الحملة","success");
                    }},
                  ]}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {templatesOpen && (
        <Modal title="قوالب الحملات" onClose={()=>setTemplatesOpen(false)}>
          {["تذكير موعد","متابعة ما بعد الجلسة","عرض خاص على الباقات","رسالة رمضان","استطلاع رضا المريض"].map((t,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--ink-100)"}}>
              <span style={{fontSize:13}}>{t}</span>
              <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>{setInitialTemplate(t);setTemplatesOpen(false);setView("builder");if(window.showToast)window.showToast(`تم تحميل القالب: ${t}`,"success");}}>استخدام</button>
            </div>
          ))}
        </Modal>
      )}
    </Page>
  );
}

function CampaignBuilder({ onCancel, onSave, initialTemplate }) {
  const templateNameMap = { "تذكير موعد":1, "متابعة ما بعد الجلسة":2, "عرض خاص على الباقات":3, "رسالة رمضان":3, "استطلاع رضا المريض":0 };
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState(initialTemplate || "متابعة ربع سنوية لمرضى أسفل الظهر");
  const [template, setTemplate] = React.useState(initialTemplate != null ? (templateNameMap[initialTemplate] || 0) : 0);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    diag:"انزلاق غضروفي L4–L5",
    age:[35,75],
    payment:"Any",
    chronic:"Any",
    lastVisit:"30+ days",
    remaining:"≥ 3",
    gender:"Any"
  });

  const templates = [
    { name:"متابعة ربع سنوية", body:"أهلاً {{first_name}} 👋 it's been a while! How is your {{condition}} feeling? Reply 1 to book a جلسة, 2 to chat مع a therapist." },
    { name:"تذكير بموعد", body:"أهلاً {{first_name}}, reminder for your جلسة tomorrow at {{time}} مع {{therapist}}. Reply CONFIRM to confirm or RESCHEDULE." },
    { name:"متابعة بعد العمليات", body:"أهلاً {{first_name}}, how's your recovery? Your therapist {{therapist}} wants to check in. Are you experiencing any discomfort?" },
    { name:"تهاني عيد الميلاد", body:"Happy birthday {{first_name}}! 🎉 Wishing you a year من pain-free movement. Enjoy 15% off your next package this month." },
  ];

  return (
    <Page>
      <div className="crumb" style={{cursor:"pointer"}} onClick={onCancel}><span>حملات واتساب</span><I.Chevron size={11}/><span style={{color:"var(--ink-700)"}}>حملة جديدة</span></div>
      <div className="h1" style={{marginBottom:6}}>إنشاء حملة</div>
      <div className="muted" style={{fontSize:13.5,marginBottom:22}}>ابنِ، استهدف وجدول في 4 خطوات.</div>

      <div className="card" style={{padding:18,marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div className="stepper" style={{gap:0,flex:1}}>
          {["أساسيات","الجمهور","الرسالة","الجدولة"].map((s,i)=>(
            <React.Fragment key={i}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <div style={{
                  width:24,height:24,borderRadius:999,
                  background:i+1<step?"var(--green)":i+1===step?"var(--blue-500)":"var(--ink-100)",
                  color:i+1<=step?"#fff":"var(--ink-500)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,fontWeight:600
                }}>{i+1<step ? <I.Check size={12}/> : i+1}</div>
                <span className="step-label" style={{fontSize:12.5,fontWeight:i+1===step?600:500,color:i+1===step?"var(--ink-900)":"var(--ink-500)"}}>{s}</span>
              </div>
              {i<3 && <div style={{flex:1,minWidth:12,height:1,background:i+1<step?"var(--green)":"var(--ink-200)",margin:"0 14px"}}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"1fr 360px"}}>
        <div className="card card-pad" style={{minHeight:540}}>
          {step===1 && (
            <div>
              <div className="h2" style={{marginBottom:18}}>الحملة basics</div>
              <Field label="الاسم" required><input className="input" value={name} onChange={e=>setName(e.target.value)}/></Field>
              <div style={{height:14}}/>
              <Field label="الهدف">
                <div className="rgrid half-sm" style={{"--gtc":"repeat(4,1fr)",gap:8}}>
                  {["حجوزات","إعادة تفاعل","تذكيرات","إعلانات"].map((g,i)=>(
                    <button key={g} className="btn btn-secondary" style={{justifyContent:"flex-start",padding:12,background:i===1?"var(--blue-50)":"#fff",borderColor:i===1?"var(--blue-500)":"var(--ink-200)"}}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
              <div style={{height:14}}/>
              <Field label="وصف داخلي"><textarea className="input" style={{height:70,padding:10}} placeholder="ما هدف هذه الحملة؟"/></Field>
            </div>
          )}

          {step===2 && (
            <div>
              <div className="h2" style={{marginBottom:18}}>الجمهور المستهدف</div>
              <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14}}>
                <Field label="التشخيص"><input className="input" value={filters.diag} onChange={e=>setFilters({...filters,diag:e.target.value})}/></Field>
                <Field label="الحالة/نوع الإصابة"><select className="input"><option>أي</option><option>بعد العمليات</option><option>أمراض مزمنة pain</option></select></Field>
                <Field label="الفئة العمرية"><input className="input" defaultValue="35 – 75"/></Field>
                <Field label="الجنس"><select className="input" value={filters.gender} onChange={e=>setFilters({...filters,gender:e.target.value})}><option>أي</option><option>أنثى</option><option>ذكر</option></select></Field>
                <Field label="طبيب"><select className="input"><option>أي</option><option>د. ياسمين عادل</option></select></Field>
                <Field label="الأخصائي"><select className="input"><option>أي</option><option>كريم صالح</option></select></Field>
                <Field label="الجلسات المتبقية"><select className="input" value={filters.remaining} onChange={e=>setFilters({...filters,remaining:e.target.value})}><option>أي</option><option>0</option><option>1–2</option><option>≥ 3</option></select></Field>
                <Field label="آخر زيارة"><select className="input" value={filters.lastVisit} onChange={e=>setFilters({...filters,lastVisit:e.target.value})}><option>آخر 7 أيام</option><option>14+ days</option><option>30+ days</option><option>60+ days</option></select></Field>
                <Field label="أمراض مزمنة disease"><select className="input"><option>أي</option><option>سكري</option><option>ضغط دم</option></select></Field>
                <Field label="الدفع status"><select className="input"><option>أي</option><option>مدفوع</option><option>معلّق</option><option>متأخر</option></select></Field>
              </div>

              <div style={{padding:14,background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:12,marginTop:18,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{width:42,height:42,borderRadius:11,background:"var(--blue-500)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <I.Users size={18}/>
                </div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontWeight:600,fontSize:13.5,color:"var(--blue-900)"}}>هذا الجمهور يشمل <span className="mono">312 مريض</span></div>
                  <div className="muted" style={{fontSize:12,marginTop:2}}>L4–L5 diagnosis · 35–75 yrs · last visit 30+ days · est. cost EGP 156</div>
                </div>
                <button className="btn btn-secondary" onClick={()=>setPreviewOpen(true)}>معاينة القائمة</button>
              </div>
            </div>
          )}

          {step===3 && (
            <div>
              <div className="h2" style={{marginBottom:18}}>الرسالة</div>
              <div className="label">القالب</div>
              <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:10,marginBottom:18}}>
                {templates.map((t,i)=>(
                  <button key={i} onClick={()=>setTemplate(i)} style={{
                    padding:14,textAlign:"left",cursor:"pointer",
                    border:`1px solid ${template===i?"var(--blue-500)":"var(--ink-200)"}`,
                    borderRadius:11,background: template===i?"var(--blue-50)":"#fff",
                  }}>
                    <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                    <div className="muted" style={{fontSize:11.5,marginTop:4,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{t.body}</div>
                  </button>
                ))}
              </div>

              <Field label="الرسالة body"><textarea className="input" style={{height:160,padding:14,resize:"vertical",fontSize:13.5,lineHeight:1.55}} defaultValue={templates[template].body}/></Field>
              <div className="muted" style={{fontSize:11.5,marginTop:6}}>استخدم <span className="mono">{"{{first_name}}"}</span>, <span className="mono">{"{{therapist}}"}</span>, <span className="mono">{"{{condition}}"}</span> للتخصيص.</div>

              <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                <button className="btn btn-secondary" style={{fontSize:12}}><I.Image size={13}/> إرفاق صورة</button>
                <button className="btn btn-secondary" style={{fontSize:12}}><I.FileText size={13}/> إرفاق PDF</button>
                <button className="btn btn-secondary" style={{fontSize:12}}><I.Plus size={13}/> زر رد سريع</button>
              </div>
            </div>
          )}

          {step===4 && (
            <div>
              <div className="h2" style={{marginBottom:18}}>الجدولة</div>
              <Field label="متى ترسل">
                <div className="rgrid c-sm" style={{"--gtc":"repeat(3,1fr)",gap:10}}>
                  {[
                    {l:"إرسال الآن",sub:"خلال 5 دقائق"},
                    {l:"الجدولة one-shot",sub:"اختر تاريخًا ووقتًا"},
                    {l:"متكررة",sub:"يومي، أسبوعي، شهري"},
                  ].map((s,i)=>(
                    <button key={i} className="btn btn-secondary" style={{flexDirection:"column",alignItems:"flex-start",padding:14,background:i===1?"var(--blue-50)":"#fff",borderColor:i===1?"var(--blue-500)":"var(--ink-200)"}}>
                      <div style={{fontWeight:600,fontSize:13.5}}>{s.l}</div>
                      <div className="muted" style={{fontSize:11.5,marginTop:3}}>{s.sub}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14,marginTop:14}}>
                <Field label="التاريخ"><input className="input" type="date" defaultValue="2026-06-02"/></Field>
                <Field label="الوقت"><input className="input" type="time" defaultValue="09:00"/></Field>
                <Field label="المنطقة الزمنية" span={2}><select className="input"><option>Cairo (GMT+2)</option></select></Field>
              </div>

              <div style={{padding:14,background:"var(--green-bg)",border:"1px solid #BCE0D1",borderRadius:12,marginTop:18,display:"flex",alignItems:"center",gap:14}}>
                <I.Check size={20} style={{color:"var(--green)"}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:13.5,color:"#2C8067"}}>جاهزة للإطلاق</div>
                  <div className="muted" style={{fontSize:12}}>312 messages will be queued for Jun 2, 09:00 (Cairo) at ~EGP 156 total.</div>
                </div>
              </div>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",marginTop:24,flexWrap:"wrap",gap:10}}>
            <button className="btn btn-secondary" disabled={step===1} onClick={()=>setStep(step-1)} style={{opacity:step===1?.5:1}}>
              <I.ArrowLeft size={13}/> رجوع
            </button>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
              {step<4 ? (
                <button className="btn btn-blue" onClick={()=>setStep(step+1)}>متابعة <I.ArrowRight size={13}/></button>
              ) : (
                <button className="btn btn-blue" onClick={onSave}><I.Send size={13}/> إطلاق الحملة</button>
              )}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div className="label">Live preview · واتساب</div>
          <div style={{
            background:"#ECE5DD",
            borderRadius:18, padding:16,
            backgroundImage:"radial-gradient(circle at 20% 10%, rgba(255,255,255,.4) 0, transparent 50%)",
            border:"1px solid var(--ink-200)",
            minHeight:520
          }}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"4px 4px"}}>
              <div className="av md" style={{background:"#25D366",color:"#fff"}}>
                <I.Logo size={20}/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#075E54"}}>عيادة كينيتك</div>
                <div style={{fontSize:11,color:"#888"}}>متصل</div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}>
              <div style={{
                background:"#fff",borderRadius:"12px 12px 12px 4px",
                padding:"10px 12px",fontSize:13,maxWidth:"86%",
                boxShadow:"0 1px 1px rgba(0,0,0,.1)",lineHeight:1.45
              }}>
                أهلاً <strong>هناء</strong> 👋<br/>
                مرّ وقت طويل! كيف حال <strong>انزلاق غضروفي L4–L5</strong> مؤخرًا؟<br/><br/>
                اضغط <strong>1</strong> لحجز جلسة<br/>
                اضغط <strong>2</strong> للتحدث مع أخصائي
                <div style={{fontSize:10,color:"#888",textAlign:"right",marginTop:6}}>09:00 · ✓✓</div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
              <div style={{background:"#DCF8C6",borderRadius:"12px 12px 4px 12px",padding:"10px 12px",fontSize:13}}>
                1 — book a جلسة
                <div style={{fontSize:10,color:"#888",textAlign:"right",marginTop:6}}>09:04 · ✓✓</div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-start",marginBottom:8}}>
              <div style={{background:"#fff",borderRadius:"12px 12px 12px 4px",padding:"10px 12px",fontSize:13,maxWidth:"86%",boxShadow:"0 1px 1px rgba(0,0,0,.1)"}}>
                تمام! غدًا 10:00 مع كريم؟<br/>
                اضغط <strong>نعم</strong> للتأكيد.
                <div style={{fontSize:10,color:"#888",textAlign:"right",marginTop:6}}>09:04 · ✓</div>
              </div>
            </div>

            <div style={{textAlign:"center",fontSize:11,color:"#888",marginTop:20}}>هذه معاينة توضيحية تلقائية</div>
          </div>
        </div>
      </div>
      {previewOpen && (
        <Modal title="معاينة جمهور الحملة" onClose={()=>setPreviewOpen(false)}>
          <div className="muted" style={{fontSize:12,marginBottom:10}}>عرض عيّنة من المرضى المطابقين للفلاتر الحالية:</div>
          <div style={{maxHeight:360,overflowY:"auto"}}>
            {(DATA.patients || []).slice(0,20).map((p,i)=>(
              <div key={p.patient_id||p.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 4px",borderBottom:"1px solid var(--ink-100)"}}>
                <div className="av sm" style={{background:"var(--blue-100)",color:"var(--blue-700)"}}>{(p.name||"?").split(" ").map(x=>x[0]).slice(0,2).join("")}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500}}>{p.name}</div>
                  <div className="muted mono" style={{fontSize:11}}>{p.patient_id || p.id} · {p.phone || "—"}</div>
                </div>
                <span className="muted" style={{fontSize:11}}>{p.diagnosis || p.diag || "—"}</span>
              </div>
            ))}
            {(!DATA.patients || DATA.patients.length===0) && <div className="muted" style={{fontSize:12,padding:14,textAlign:"center"}}>لا يوجد مرضى في قاعدة البيانات بعد.</div>}
          </div>
        </Modal>
      )}
    </Page>
  );
}

function CampaignAnalytics({ c, onBack }) {
  const [status, setStatus] = React.useState(c.status);
  const flipStatus = (next, msg) => {
    c.status = next;
    setStatus(next);
    try { window.dispatchEvent(new CustomEvent("kinetic:data-updated", { detail: { table: "campaigns" } })); } catch(_) {}
    if (window.showToast) window.showToast(msg, "success");
  };
  const funnelData = [
    { label:"مستهدف", v:c.audience, color:"#BDD8E9" },
    { label:"مُرسلة",     v:c.sent,     color:"#7BBDE8" },
    { label:"مقروءة",     v:c.read,     color:"#3A7FB5" },
    { label:"ردّ",  v:c.replied,  color:"#1E4A6E" },
  ];
  const timeSeries = [
    { label:"يوم 1", v:240 }, { label:"يوم 2", v:320 }, { label:"يوم 3", v:280 },
    { label:"يوم 4", v:340 }, { label:"يوم 5", v:390 }, { label:"يوم 6", v:280 },
    { label:"يوم 7", v:120 },
  ];

  return (
    <Page>
      <div className="crumb" style={{cursor:"pointer"}} onClick={onBack}><span>الحملات</span><I.Chevron size={11}/><span style={{color:"var(--ink-700)"}}>{c.name}</span></div>
      <div className="page-head">
        <div>
          <div className="h1" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            {c.name}
            {c.best && <span className="badge b-green"><I.Sparkle size={12}/>الأفضل أداءً</span>}
            <span className={"badge " + (status==="جارٍ"?"b-green":status==="مجدول"?"b-blue":status==="مكتمل"?"b-grey":"b-amber")}><span className="dot"></span>{status}</span>
          </div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{c.id} · {c.schedule} · template "{c.template}"</div>
        </div>
        <div className="page-actions">
          {status==="جارٍ"
            ? <button className="btn btn-secondary" onClick={()=>flipStatus("مجدول","تم إيقاف الحملة مؤقتًا")}><I.X size={13}/> إيقاف مؤقت</button>
            : <button className="btn btn-secondary" onClick={()=>flipStatus("جارٍ","تم استئناف الحملة")}><I.Send size={13}/> استئناف</button>}
          <button className="btn btn-secondary" onClick={()=>onBack&&onBack()}><I.Edit size={13}/> تعديل</button>
          <button className="btn btn-blue" onClick={()=>flipStatus("جارٍ","تم تشغيل الحملة الآن")}><I.Send size={13}/> تشغيل الآن</button>
        </div>
      </div>

      <div className="grid-4" style={{marginBottom:18}}>
        <StatCard label="مُرسلة"        value={c.sent.toLocaleString()}    accent="#7BBDE8" icon={<I.Send size={15}/>}/>
        <StatCard label="مقروءة"        value={`${(c.read/c.sent*100).toFixed(0)}%`} accent="#3A7FB5" icon={<I.Eye size={15}/>}/>
        <StatCard label="ردّ"     value={`${(c.replied/c.sent*100).toFixed(1)}%`} accent="#7E6BD3" icon={<I.WhatsApp size={15}/>}/>
        <StatCard label="تحويلات" value="42" delta="+12" deltaKind="up" accent="#3FA984" icon={<I.Check size={15}/>}/>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"1.5fr 1fr",marginBottom:18}}>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:18}}>الرسائل بمرور الوقت</div>
          <AreaChart data={timeSeries} height={220} formatY={v=>v}/>
        </div>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:18}}>القمع</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {funnelData.map((f,i)=>{
              const w = f.v/funnelData[0].v*100;
              return (
                <div key={f.label}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12.5,fontWeight:500}}>{f.label}</span>
                    <span className="mono" style={{fontSize:12.5}}>{f.v.toLocaleString()} <span className="muted">({Math.round(w)}%)</span></span>
                  </div>
                  <div style={{height:24,background:"var(--ink-100)",borderRadius:6,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${w}%`,background:f.color,transition:"width .3s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr"}}>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>أفضل الردود</div>
          {[
            {p:"هناء مصطفى", t:"نعم please, can I book Wednesday at 10?", time:"منذ 14 دقيقة"},
            {p:"وليد حسن", t:"ما المواعيد المتاحة هذا الأسبوع؟", time:"منذ ساعة"},
            {p:"سلمى رضا", t:"ألمي أفضل بكثير، شكرًا لك 🙏", time:"منذ 3 ساعات"},
            {p:"تامر إبراهيم", t:"أحتاج إعادة جدولة موعد الثلاثاء الماضي", time:"أمس"},
          ].map((r,i)=>(
            <div key={i} style={{padding:"10px 0",borderBottom:i<3?"1px dashed var(--ink-100)":"none",display:"flex",gap:12}}>
              <div className="av md">{r.p.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:500,fontSize:13}}>{r.p}</span>
                  <span className="muted" style={{fontSize:11}}>{r.time}</span>
                </div>
                <div style={{fontSize:12.5,color:"var(--ink-700)",marginTop:2}}>{r.t}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>رسائل فاشلة</div>
          {[
            {p:"+20 100 ███ ███",r:"Invalid واتساب number"},
            {p:"+20 122 ███ ███",r:"المستخدم حظر الحساب"},
            {p:"+20 101 ███ ███",r:"Number not on واتساب"},
          ].map((f,i)=>(
            <div key={i} style={{padding:"10px 0",borderBottom:i<2?"1px dashed var(--ink-100)":"none",display:"flex",alignItems:"center",gap:10}}>
              <I.X size={14} style={{color:"var(--red)"}}/>
              <span className="mono" style={{fontSize:12.5,flex:1}}>{f.p}</span>
              <span className="muted" style={{fontSize:12}}>{f.r}</span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

Object.assign(window, { Campaigns });


// ===== src/reports.jsx =====
// Reports module + Settings + 404

function Reports({ go }) {
  const [section, setSection] = React.useState("financial");

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>التقارير</span></div>
          <div className="h1">التقارير</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>طبي, تحليلات مالية وتشغيلية.</div>
        </div>
        <div className="page-actions">
          <select className="input" style={{width:"auto",minWidth:150,flex:"0 1 180px"}}><option>آخر 30 يوم</option><option>هذا الشهر</option><option>هذا الربع</option><option>منذ بداية السنة</option></select>
          <button className="btn btn-secondary" onClick={()=>{
            const rows=["التقرير,القيمة","الإيرادات الشهرية,410200","مرضى نشطون,248","جلسات هذا الشهر,892","متوسط الفاتورة,7600"];
            downloadCsv(rows, "report.csv");
            if(window.showToast)window.showToast("تم تصدير التقرير","success");
          }}><I.Download size={14}/> تصدير</button>
          <button className="btn btn-secondary" onClick={()=>window.print()}><I.Print size={14}/> طباعة</button>
        </div>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"220px 1fr"}}>
        <div className="card side-tabs" style={{padding:8,height:"fit-content"}}>
          {[
            { id:"financial", l:"المالية",       icon:<I.Dollar size={14}/>, items:["إيرادات يومية","الإيرادات الشهرية","مدفوعات معلقة","توزيع طرق الدفع"]},
            { id:"medical",   l:"طبي",         icon:<I.Heart size={14}/>,  items:["المريض history","تقدّم العلاج","الأخصائي activity","التشخيص trends"]},
            { id:"operational",l:"التشغيلية",   icon:<I.Activity size={14}/>, items:["إحصاءات المواعيد","معدّل الحضور","حالات عدم الحضور","استخدام الغرف"]},
          ].map(s=>(
            <div key={s.id} style={{marginBottom:4}}>
              <div className={"nav-item" + (section===s.id?" active":"")} style={{margin:0}} onClick={()=>setSection(s.id)}>
                {s.icon}{s.l}
              </div>
              {section===s.id && (
                <div style={{padding:"6px 16px 6px 36px"}}>
                  {s.items.map(it=>(
                    <div key={it} style={{padding:"4px 0",fontSize:12,color:"var(--ink-500)",cursor:"pointer"}}>{it}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          {section==="financial" && <FinancialReport/>}
          {section==="medical" && <MedicalReport/>}
          {section==="operational" && <OperationalReport/>}
        </div>
      </div>
    </Page>
  );
}

function FinancialReport() {
  const monthly = [
    {label:"ينا",v:296},{label:"فبر",v:312},{label:"مار",v:341},{label:"أبر",v:382},{label:"مايو",v:410}
  ];
  const daily = [
    {label:"أحد",v:18200},{label:"إثن",v:22400},{label:"ثلا",v:19800},{label:"أرب",v:27100},{label:"خمي",v:31200},{label:"جمع",v:24800},{label:"سبت",v:14200}
  ];
  return (
    <div>
      <div className="grid-4" style={{marginBottom:18}}>
        <StatCard label="إجمالي الإيرادات (شهر)" value="EGP 410.2K" delta="+18%" deltaKind="up" accent="#3FA984" icon={<I.Dollar size={15}/>}/>
        <StatCard label="المتوسط اليومي"      value="EGP 13.2K" delta="+9%"  deltaKind="up" accent="#7BBDE8" icon={<I.Chart size={15}/>}/>
        <StatCard label="محصّل"          value="EGP 391.8K" delta="95.5%" deltaKind="up" accent="#3A7FB5" icon={<I.Check size={15}/>}/>
        <StatCard label="معلّق"        value="EGP 18.4K"  delta="4.5%" deltaKind="down" accent="#D49044" icon={<I.Clock size={15}/>}/>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"1.5fr 1fr",marginBottom:18}}>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>اتجاه الإيرادات الشهري</div>
          <AreaChart data={monthly} height={240} formatY={v=>`${v}K`}/>
        </div>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>يوميًا — الأسبوع الحالي</div>
          <BarChart data={daily} height={240} formatY={v=>v>=1000?`${Math.round(v/1000)}K`:v}/>
        </div>
      </div>

      <div className="card card-pad">
        <div className="h2" style={{marginBottom:14}}>أفضل الخدمات حسب الإيرادات</div>
        {[
          {l:"الأساسية 10 — علاج يدوي",  v:182400, c:"#7BBDE8"},
          {l:"بعد العمليات 24 — التعافي",      v:108200, c:"#7E6BD3"},
          {l:"جلسة واحدة",             v:55400,  c:"#BDD8E9"},
          {l:"البداية 6",                   v:38400,  c:"#3A7FB5"},
          {l:"التعافي 15",                 v:25800,  c:"#1E4A6E"},
        ].map((s,i)=>{
          const max = 182400;
          return (
            <div key={i} style={{padding:"11px 0",borderBottom:i<4?"1px dashed var(--ink-100)":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:500}}>{s.l}</span>
                <span className="mono" style={{fontSize:13,fontWeight:600}}>EGP {s.v.toLocaleString()}</span>
              </div>
              <div style={{height:5,background:"var(--ink-100)",borderRadius:999,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${s.v/max*100}%`,background:s.c}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MedicalReport() {
  const diagData = [
    { label:"أسفل الظهر / القطنية",   v:38, color:"#7BBDE8" },
    { label:"الركبة (رباط صليبي)",       v:24, color:"#3A7FB5" },
    { label:"الكتف",              v:14, color:"#7E6BD3" },
    { label:"الرقبة / العنقية",       v:12, color:"#3FA984" },
    { label:"أخرى",                 v:12, color:"#BDD8E9" },
  ];
  return (
    <div>
      <div className="grid-3" style={{marginBottom:18}}>
        <StatCard label="مرضى تحت العلاج" value="184" delta="+12" deltaKind="up" accent="#7BBDE8" icon={<I.Users size={15}/>}/>
        <StatCard label="متوسط الجلسات حتى الهدف"   value="9.4" delta="-0.6" deltaKind="up" accent="#3FA984" icon={<I.Activity size={15}/>}/>
        <StatCard label="تحقيق الأهداف"        value="68%" delta="+4%" deltaKind="up" accent="#7E6BD3" icon={<I.Check size={15}/>}/>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"1fr 1fr",marginBottom:18}}>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:18}}>التشخيص breakdown</div>
          <DonutChart data={diagData} size={180} centerLabel="مريض" centerValue="184"/>
        </div>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>الأخصائي activity</div>
          {DATA.therapists.map((t,i)=>{
            const Sessions = [142, 128, 89, 96][i] || 80;
            return (
              <div key={t.name} style={{padding:"11px 0",borderBottom:i<3?"1px dashed var(--ink-100)":"none",display:"flex",alignItems:"center",gap:10}}>
                <span className="av md" style={{background:t.color+"33",color:t.color}}>{t.name.split(" ").map(x=>x[0]).join("")}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,fontSize:13}}>{t.name}</div>
                  <div className="muted" style={{fontSize:11.5}}>{t.spec}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="mono" style={{fontSize:14,fontWeight:600}}>{Sessions}</div>
                  <div className="muted" style={{fontSize:10.5}}>جلسات/شهر</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card card-pad">
        <div className="h2" style={{marginBottom:14}}>تقدّم العلاج · cohort</div>
        <div className="muted" style={{fontSize:12.5,marginBottom:14}}>متوسط انخفاض الألم لجميع المرضى النشطين · آخر 8 أسابيع</div>
        <AreaChart data={[
          {label:"أ1",v:6.8},{label:"أ2",v:6.4},{label:"أ3",v:5.9},{label:"أ4",v:5.3},
          {label:"أ5",v:4.7},{label:"أ6",v:4.1},{label:"أ7",v:3.5},{label:"أ8",v:3.0}
        ]} height={200} color="#3FA984" fill="rgba(63,169,132,.16)" formatY={v=>v.toFixed(1)}/>
      </div>
    </div>
  );
}

function OperationalReport() {
  return (
    <div>
      <div className="grid-4" style={{marginBottom:18}}>
        <StatCard label="مواعيد/شهر"   value="1,420" delta="+8%" deltaKind="up" accent="#7BBDE8" icon={<I.Calendar size={15}/>}/>
        <StatCard label="معدّل الحضور"     value="93%"   delta="+1%" deltaKind="up" accent="#3FA984" icon={<I.Check size={15}/>}/>
        <StatCard label="معدل عدم الحضور"         value="4.2%"  delta="-0.6%" deltaKind="up" accent="#D49044" icon={<I.X size={15}/>}/>
        <StatCard label="استخدام الغرف"    value="78%"   delta="+5%" deltaKind="up" accent="#7E6BD3" icon={<I.MapPin size={15}/>}/>
      </div>

      <div className="rgrid c-lg" style={{"--gtc":"1fr 1fr",marginBottom:18}}>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>Appointments بواسطة day من week</div>
          <BarChart data={[
            {label:"إثن",v:218,color:"#7BBDE8"},{label:"ثلا",v:248,color:"#7BBDE8"},
            {label:"أرب",v:262,color:"#7BBDE8"},{label:"خمي",v:284,color:"#3A7FB5"},
            {label:"جمع",v:271,color:"#7BBDE8"},{label:"سبت",v:198,color:"#BDD8E9"},{label:"أحد",v:84,color:"#BDD8E9"}
          ]} height={220}/>
        </div>
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>Appointments بواسطة hour</div>
          <AreaChart data={[
            {label:"8a",v:42},{label:"10a",v:78},{label:"12p",v:62},
            {label:"2p",v:51},{label:"4p",v:88},{label:"6p",v:64}
          ]} height={220}/>
        </div>
      </div>

      <div className="card card-pad">
        <div className="h2" style={{marginBottom:14}}>قمع الحضور</div>
        {[
          {l:"مجدول",v:1420,c:"#BDD8E9"},
          {l:"مؤكد",v:1372,c:"#7BBDE8"},
          {l:"تم الحضور",v:1340,c:"#3A7FB5"},
          {l:"مكتمل",v:1320,c:"#1E4A6E"},
          {l:"لم يحضر",v:60,c:"#D8665A"},
        ].map((f,i)=>{
          const w = f.v/1420*100;
          return (
            <div key={i} style={{padding:"8px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:13,fontWeight:500}}>{f.l}</span>
                <span className="mono" style={{fontSize:12.5}}>{f.v.toLocaleString()}</span>
              </div>
              <div style={{height:18,background:"var(--ink-100)",borderRadius:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${w}%`,background:f.c}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────── Settings ─────────────────
function SettingsPage({ go }) {
  const [tab, setTab] = React.useState("clinic");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("موظف استقبال");
  // Guard: only admins may reach Settings. Everyone else sees a friendly
  // 403 instead of clinic branding, user management, and integration keys.
  const role = (window.ME && window.ME.role) || "";
  if (role && role !== "مدير") {
    return (
      <Page>
        <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>الإعدادات</span></div>
        <div className="card card-pad" style={{textAlign:"center",padding:"60px 20px",maxWidth:520,margin:"40px auto"}}>
          <I.Lock size={36} style={{color:"var(--ink-400)",marginBottom:12}}/>
          <div className="h2" style={{marginBottom:8}}>الوصول مقيّد</div>
          <div className="muted" style={{fontSize:13.5,marginBottom:20}}>الإعدادات متاحة للمديرين فقط. تواصل مع مدير النظام إذا كنت تحتاج تعديلًا هنا.</div>
          <button className="btn btn-blue" style={{margin:"0 auto"}} onClick={()=>go && go("dashboard")}><I.ArrowLeft size={13}/> العودة</button>
        </div>
      </Page>
    );
  }
  return (
    <Page>
      <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>الإعدادات</span></div>
      <div className="h1" style={{marginBottom:18}}>الإعدادات</div>

      <div className="rgrid c-lg" style={{"--gtc":"220px 1fr"}}>
        <div className="card side-tabs" style={{padding:8,height:"fit-content"}}>
          {[
            { id:"clinic",   l:"بيانات العيادة",   ic:<I.MapPin size={14}/>},
            { id:"branding", l:"الهوية البصرية",         ic:<I.Image size={14}/>},
            { id:"sections", l:"أقسام مخصصة",       ic:<I.Layers size={14}/>},
            { id:"users",    l:"المستخدمون والأدوار",    ic:<I.Users size={14}/>},
            { id:"billing",  l:"الفوترة",          ic:<I.CreditCard size={14}/>},
            { id:"notifs",   l:"الإشعارات",    ic:<I.Bell size={14}/>},
            { id:"integ",    l:"التكاملات",     ic:<I.Layers size={14}/>},
            { id:"sec",      l:"الأمان",         ic:<I.Lock size={14}/>},
          ].map(s=>(
            <div key={s.id} className={"nav-item" + (tab===s.id?" active":"")} style={{margin:0}} onClick={()=>setTab(s.id)}>
              {s.ic}{s.l}
            </div>
          ))}
        </div>

        <div className="card card-pad">
          {tab==="clinic" && <ClinicDetailsPanel/>}
          {tab==="users" && (
            <div>
              <div className="h2" style={{marginBottom:14}}>المستخدمون والأدوار</div>
              <div className="tbl-scroll">
              <table className="tbl">
                <thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>الدور</th><th>Last نشط</th><th></th></tr></thead>
                <tbody>
                  {[
                    {n:"شريف عادل",e:"sherif@kinetic.eg",r:"مدير",l:"الآن"},
                    {n:"د. ياسمين عادل",e:"yasmin@kinetic.eg",r:"طبيب",l:"منذ 5 دقائق"},
                    {n:"كريم صالح",e:"karim@kinetic.eg",r:"الأخصائي",l:"منذ 12 دقيقة"},
                    {n:"مريم خليل",e:"mariam@kinetic.eg",r:"موظف استقبال",l:"منذ ساعة"},
                    {n:"لينا فاروق",e:"lina@kinetic.eg",r:"الأخصائي",l:"أمس"},
                  ].map((u,i)=>(
                    <tr key={i}>
                      <td><div style={{display:"flex",alignItems:"center",gap:10}}><div className="av sm">{u.n.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>{u.n}</div></td>
                      <td className="mono" style={{fontSize:12}}>{u.e}</td>
                      <td><span className={"badge " + (u.r==="مدير"?"b-violet":u.r==="طبيب"?"b-blue":"b-grey")}><span className="dot"></span>{u.r}</span></td>
                      <td className="muted">{u.l}</td>
                      <td>
                        <RowMenu size={13} items={[
                          { label:"إرسال دعوة جديدة", icon:<I.Send size={13}/>, onClick:()=>{ if (window.showToast) window.showToast(`تم إرسال دعوة إلى ${u.e}`, "success"); } },
                          { label:"نسخ البريد", icon:<I.Mail size={13}/>, onClick:()=>{ try { navigator.clipboard.writeText(u.e); if (window.showToast) window.showToast("تم نسخ البريد","success"); } catch(_){} } },
                          { label:"إزالة المستخدم", icon:<I.X size={13}/>, danger:true, onClick:async ()=>{
                            if (!window.confirm(`إزالة ${u.n}؟`)) return;
                            try {
                              if (window.KineticData) {
                                const rows = await window.KineticData.list("staff");
                                const match = (rows || []).find(r => r.email === u.e);
                                if (match) await window.KineticData.remove("staff", match.staff_id || match.id);
                              }
                              if (window.showToast) window.showToast(`تم إزالة ${u.n}`,"success");
                            } catch (e) { console.warn("remove user failed", e); if (window.showToast) window.showToast("تعذّر الإزالة","error"); }
                          }},
                        ]}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <button className="btn btn-blue" style={{marginTop:14}} onClick={()=>setInviteOpen(true)}><I.Plus size={13}/> دعوة مستخدم</button>
            </div>
          )}
          {tab==="branding" && <BrandingPanel/>}
          {tab==="sections" && <CustomSectionsPanel/>}
          {tab!=="clinic" && tab!=="users" && tab!=="branding" && tab!=="sections" && (
            <EmptyState icon={<I.Settings size={22}/>} title="قريبًا" body={`The "${tab}" section is part من the next release. Reach out to support if you need something configured.`}/>
          )}
        </div>
      </div>
      {inviteOpen && (
        <Modal title="دعوة مستخدم جديد" onClose={()=>setInviteOpen(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setInviteOpen(false)}>إلغاء</button>
            <button className="btn btn-blue" onClick={async ()=>{
              const email = (inviteEmail || "").trim();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (window.showToast) window.showToast("أدخل بريدًا إلكترونيًا صحيحًا", "error");
                return;
              }
              // Map Arabic role labels to the canonical role slug used everywhere else.
              const roleMap = { "مدير":"admin", "طبيب":"doctor", "الأخصائي":"therapist", "موظف استقبال":"receptionist" };
              const canonicalRole = roleMap[inviteRole] || "receptionist";
              try {
                if (window.KineticData) {
                  const staffId = "U-" + Date.now();
                  await window.KineticData.upsert("staff", {
                    staff_id: staffId,
                    name: email.split("@")[0],
                    email,
                    role: canonicalRole,
                    phone: null,
                    auth_uid: null,
                  });
                }
                if (window.showToast) window.showToast(`تم إرسال الدعوة إلى ${email}`, "success");
                setInviteEmail("");
                setInviteOpen(false);
              } catch (e) {
                console.warn("invite user failed", e);
                if (window.showToast) window.showToast("تعذّر إرسال الدعوة", "error");
              }
            }}>
              <I.Send size={13}/> إرسال الدعوة
            </button>
          </>}>
          <Field label="البريد الإلكتروني" required>
            <input className="input" type="email" placeholder="user@example.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/>
          </Field>
          <div style={{height:12}}/>
          <Field label="الدور">
            <select className="input" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
              <option>مدير</option>
              <option>طبيب</option>
              <option>الأخصائي</option>
              <option>موظف استقبال</option>
            </select>
          </Field>
        </Modal>
      )}
    </Page>
  );
}

// ── Admin: Clinic details (name, contact, tax id) ────────────
function ClinicDetailsPanel() {
  const seed = window.CLINIC || {};
  const [form, setForm] = React.useState({
    name: seed.name || "كينيتك للعلاج الطبيعي",
    branch: seed.branch || "مصر الجديدة",
    phone: seed.phone || "+20 2 2638 1100",
    email: seed.email || "hello@kinetic.eg",
    address: seed.address || "14 ش صلاح سالم, مصر الجديدة، القاهرة",
    tax_id: seed.tax_id || "514-203-091",
    hours: seed.hours || "الأحد–الخميس 08:00 – 20:00",
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function onSave() {
    if (!form.name.trim()) { if (window.showToast) window.showToast("أدخل اسم العيادة","error"); return; }
    setSaving(true);
    try {
      if (window.saveClinic) await window.saveClinic(form);
      if (window.showToast) window.showToast("تم حفظ التغييرات","success");
    } catch (e) {
      console.warn("save clinic details failed", e);
      if (window.showToast) window.showToast("تعذّر حفظ التغييرات","error");
    } finally { setSaving(false); }
  }
  return (
    <div>
      <div className="h2" style={{marginBottom:18}}>بيانات العيادة</div>
      <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14,maxWidth:720}}>
        <Field label="اسم العيادة" span={2}><input className="input" value={form.name} onChange={e=>set("name", e.target.value)}/></Field>
        <Field label="الفرع" span={2}><input className="input" value={form.branch} onChange={e=>set("branch", e.target.value)}/></Field>
        <Field label="الهاتف"><input className="input" value={form.phone} onChange={e=>set("phone", e.target.value)}/></Field>
        <Field label="البريد الإلكتروني"><input className="input" value={form.email} onChange={e=>set("email", e.target.value)}/></Field>
        <Field label="العنوان" span={2}><input className="input" value={form.address} onChange={e=>set("address", e.target.value)}/></Field>
        <Field label="الرقم الضريبي"><input className="input" value={form.tax_id} onChange={e=>set("tax_id", e.target.value)}/></Field>
        <Field label="ساعات العمل"><input className="input" value={form.hours} onChange={e=>set("hours", e.target.value)}/></Field>
      </div>
      <button className="btn btn-blue" style={{marginTop:18}} disabled={saving} onClick={onSave}>
        <I.Check size={13}/> {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
      </button>
    </div>
  );
}

// 404
// ── Admin: Clinic branding (logo + name) ─────────────────────
function BrandingPanel() {
  const [clinic, setClinic] = React.useState(window.CLINIC || { name:"كينيتك", subtitle:"نظام العيادة", logo:null, primary:"#7BBDE8" });
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef(null);

  function onPickFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      if (window.showToast) window.showToast("يجب اختيار ملف صورة","error");
      return;
    }
    if (file.size > 512*1024) {
      if (window.showToast) window.showToast("حجم الصورة أكبر من 512KB","error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setClinic(c => ({ ...c, logo: reader.result }));
    reader.readAsDataURL(file);
  }

  async function onSave() {
    setSaving(true);
    try {
      if (window.saveClinic) await window.saveClinic(clinic);
      if (window.showToast) window.showToast("تم حفظ الهوية البصرية","success");
    } catch (e) {
      console.warn("save branding failed", e);
      if (window.showToast) window.showToast("تعذّر حفظ الهوية البصرية","error");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="h2" style={{marginBottom:6}}>الهوية البصرية</div>
      <div className="muted" style={{fontSize:13,marginBottom:18}}>خصّص شعار العيادة واسمها الظاهر في كل الشاشات.</div>

      <div className="rgrid c-sm" style={{"--gtc":"180px 1fr",gap:24,alignItems:"start",maxWidth:720}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{width:140,height:140,borderRadius:20,border:"1px dashed var(--ink-300)",background:"var(--ink-50)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
            {clinic.logo
              ? <img src={clinic.logo} alt="logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <I.Image size={40} style={{color:"var(--ink-300)"}}/>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onPickFile}/>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>fileRef.current && fileRef.current.click()}>
              <I.Upload size={12}/> رفع شعار
            </button>
            {clinic.logo && (
              <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setClinic(c=>({...c,logo:null}))}>
                <I.Trash size={12}/> إزالة
              </button>
            )}
          </div>
          <div className="muted" style={{fontSize:11,textAlign:"center"}}>PNG/JPG · حتى 512KB</div>
        </div>

        <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14}}>
          <Field label="اسم العيادة" span={2}>
            <input className="input" value={clinic.name||""} onChange={e=>setClinic(c=>({...c,name:e.target.value}))}/>
          </Field>
          <Field label="العنوان الفرعي" span={2}>
            <input className="input" value={clinic.subtitle||""} onChange={e=>setClinic(c=>({...c,subtitle:e.target.value}))}/>
          </Field>
          <Field label="اللون الأساسي">
            <input className="input" type="color" value={clinic.primary||"#7BBDE8"} onChange={e=>setClinic(c=>({...c,primary:e.target.value}))}/>
          </Field>
        </div>
      </div>

      <button className="btn btn-blue" style={{marginTop:22}} disabled={saving} onClick={onSave}>
        <I.Check size={13}/> {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
      </button>
    </div>
  );
}

// ── Admin: Custom sections management ────────────────────────
const CUSTOM_SECTION_ICONS = ["Layers","Clipboard","FileText","Chart","Activity","Package","Heart","Sparkle","Pin","Megaphone","Users","Calendar"];

function CustomSectionsPanel() {
  const [sections, setSections] = React.useState(window.CUSTOM_SECTIONS || []);
  const [editing, setEditing] = React.useState(null);
  React.useEffect(()=>{
    const h = ()=> setSections([...(window.CUSTOM_SECTIONS || [])]);
    window.addEventListener("kinetic:sections-updated", h);
    return ()=> window.removeEventListener("kinetic:sections-updated", h);
  },[]);

  function startNew() {
    setEditing({ id:null, label:"", slug:"", icon:"Layers", group:"مخصص", description:"", content:"", visible:true });
  }
  async function onDelete(s) {
    if (!confirm(`حذف قسم "${s.label}"؟`)) return;
    if (window.removeSection) await window.removeSection(s.id);
    if (window.showToast) window.showToast("تم حذف القسم","success");
  }

  return (
    <div>
      <div className="page-head" style={{marginBottom:12}}>
        <div>
          <div className="h2" style={{marginBottom:4}}>أقسام مخصصة</div>
          <div className="muted" style={{fontSize:13}}>أضف أقسامًا تظهر في الشريط الجانبي للمدير وعدّل محتواها.</div>
        </div>
        <button className="btn btn-blue" onClick={startNew}><I.Plus size={13}/> قسم جديد</button>
      </div>

      {sections.length === 0 ? (
        <EmptyState icon={<I.Layers size={22}/>} title="لا توجد أقسام مخصصة بعد" body="اضغط «قسم جديد» لإضافة قسم يظهر في القائمة الجانبية."/>
      ) : (
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>القسم</th><th>المجموعة</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {sections.map(s=>{
              const Ico = I[s.icon] || I.Layers;
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:30,height:30,borderRadius:8,background:"var(--blue-100)",color:"var(--blue-700)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ico size={15}/>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{s.label}</div>
                        <div className="mono muted" style={{fontSize:11}}>/{s.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.group}</td>
                  <td><span className={"badge " + (s.visible!==false?"b-green":"b-grey")}><span className="dot"></span>{s.visible!==false?"ظاهر":"مخفي"}</span></td>
                  <td style={{textAlign:"left"}}>
                    <button className="btn btn-ghost btn-icon" title="تعديل" onClick={()=>setEditing({...s})}><I.Edit size={13}/></button>
                    <button className="btn btn-ghost btn-icon" title="حذف" onClick={()=>onDelete(s)}><I.Trash size={13}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}

      {editing && <SectionEditorModal draft={editing} onClose={()=>setEditing(null)}/>}
    </div>
  );
}

function SectionEditorModal({ draft, onClose }) {
  const [d, setD] = React.useState(draft);
  const [saving, setSaving] = React.useState(false);

  function set(k, v) { setD(x => ({ ...x, [k]: v })); }

  async function onSave() {
    if (!d.label || !d.label.trim()) { if(window.showToast) window.showToast("أدخل اسم القسم","error"); return; }
    setSaving(true);
    try {
      if (d.id && window.updateSection) {
        await window.updateSection(d.id, {
          label:d.label, slug:d.slug, icon:d.icon, group:d.group,
          description:d.description, content:d.content, visible:d.visible,
        });
      } else if (window.addSection) {
        await window.addSection(d);
      }
      if (window.showToast) window.showToast(d.id ? "تم تحديث القسم" : "تمت إضافة القسم","success");
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal title={d.id ? "تعديل قسم" : "قسم جديد"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        <button className="btn btn-blue" disabled={saving} onClick={onSave}>
          <I.Check size={13}/> {saving ? "جاري الحفظ…" : "حفظ"}
        </button>
      </>}>
      <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:12}}>
        <Field label="اسم القسم" required span={2}>
          <input className="input" value={d.label||""} onChange={e=>set("label",e.target.value)} placeholder="مثال: العلاج المائي"/>
        </Field>
        <Field label="المعرف (slug)" span={2}>
          <input className="input" value={d.slug||""} onChange={e=>set("slug",e.target.value)} placeholder="hydrotherapy"/>
        </Field>
        <Field label="المجموعة">
          <input className="input" value={d.group||""} onChange={e=>set("group",e.target.value)} placeholder="مخصص"/>
        </Field>
        <Field label="الأيقونة">
          <select className="input" value={d.icon||"Layers"} onChange={e=>set("icon",e.target.value)}>
            {CUSTOM_SECTION_ICONS.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="الوصف" span={2}>
          <input className="input" value={d.description||""} onChange={e=>set("description",e.target.value)}/>
        </Field>
        <Field label="المحتوى" span={2} hint="نص حر يظهر داخل الصفحة">
          <textarea className="input" style={{height:120,padding:10}} value={d.content||""} onChange={e=>set("content",e.target.value)}/>
        </Field>
        <Field label="الحالة" span={2}>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13}}>
            <input type="checkbox" checked={d.visible!==false} onChange={e=>set("visible",e.target.checked)}/>
            ظاهر في القائمة الجانبية
          </label>
        </Field>
      </div>
    </Modal>
  );
}

// ── Renderer for a custom (admin-defined) section route ──────
function CustomSectionPage({ id }) {
  const list = window.CUSTOM_SECTIONS || [];
  const s = list.find(x => x.id === id);
  if (!s) return <NotFound go={()=>{}}/>;
  const Ico = I[s.icon] || I.Layers;
  return (
    <Page>
      <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>{s.group||"مخصص"}</span><I.Chevron size={11}/><span>{s.label}</span></div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{width:44,height:44,borderRadius:12,background:"var(--blue-100)",color:"var(--blue-700)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ico size={22}/>
        </div>
        <div>
          <div className="h1" style={{marginBottom:2}}>{s.label}</div>
          {s.description && <div className="muted" style={{fontSize:13.5}}>{s.description}</div>}
        </div>
      </div>
      <div className="card card-pad" style={{whiteSpace:"pre-wrap",fontSize:14,lineHeight:1.7,color:"var(--ink-700)"}}>
        {s.content || "لا يوجد محتوى بعد. يمكن للمدير تعديل هذا القسم من الإعدادات."}
      </div>
    </Page>
  );
}

function NotFound({ go }) {
  return (
    <Page>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 0"}}>
        <div className="serif" style={{fontSize:120,lineHeight:1,color:"var(--blue-300)"}}>404</div>
        <div className="h1" style={{marginTop:18}}>هذه الصفحة في يوم تعافي.</div>
        <div className="muted" style={{marginTop:8,maxWidth:480,textAlign:"center"}}>الصفحة التي تبحث عنها غير موجودة أو تم نقلها. عُد إلى لوحة التحكم.</div>
        <button className="btn btn-blue" style={{marginTop:20}} onClick={()=>go("dashboard")}><I.ArrowLeft size={13}/> العودة إلى لوحة التحكم</button>
      </div>
    </Page>
  );
}

Object.assign(window, { Reports, SettingsPage, NotFound });


// ─────────── App entrypoint ───────────
// Main app — routing + auth gate

function App() {
  // Re-render the entire app when any DB table changes (upsert / remove /
  // hydrate). Cheap: it just bumps a state counter.
  window.useDataVersion();
  const [rawRoute, setRoute] = React.useState(() => {
    return localStorage.getItem("kinetic.route") || "dashboard";
  });
  const [user, setUser] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("kinetic.user")) || null;
    } catch { return null; }
  });
  const [publicBooking, setPublicBooking] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [notifsOpen, setNotifsOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  // TEMPORARY isolated route for the historical patient import page (?import=1).
  // Bypasses auth/nav entirely. Remove this line, the early return below, and
  // src/import.jsx after the paper-record migration is complete.
  const importMode = React.useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("import") === "1"; }
    catch { return false; }
  }, []);

  // ⌘K / Ctrl+K opens the global command palette (PRD 5.10)
  React.useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      } else if (k === "escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  React.useEffect(()=>{
    localStorage.setItem("kinetic.route", rawRoute);
  },[rawRoute]);

  React.useEffect(()=>{
    window.showToast = (msg, kind="success") => {
      setToast({msg, kind});
      setTimeout(()=>setToast(null), 2400);
    };
  },[]);

  React.useEffect(()=>{
    if (user) localStorage.setItem("kinetic.user", JSON.stringify(user));
    else localStorage.removeItem("kinetic.user");
  },[user]);

  function go(r) {
    if (r === "logout") {
      setUser(null);
      setRoute("dashboard");
      return;
    }
    setRoute(r);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function handleLogin(u) {
    window.ME = u;
    setUser(u);
    setRoute(window.roleDefaultRoute ? window.roleDefaultRoute(u.role) : "dashboard");
    setToast({ msg: `أهلاً بعودتك, ${u.name.split(" ")[0]}`, kind:"success" });
    setTimeout(()=>setToast(null), 2400);
  }

  // TEMPORARY: historical import page — standalone, before auth/nav.
  if (importMode) {
    const ImportPage = window.HistoricalImportPage;
    return <>{ImportPage ? <ImportPage/> : null}{toast && <Toast msg={toast.msg} kind={toast.kind}/>}</>;
  }

  if (publicBooking) return <PublicBookingScreen onBack={()=>setPublicBooking(false)} onDone={()=>{
    setPublicBooking(false);
    setToast({ msg:"Booking confirmed — واتساب sent.", kind:"success" });
    setTimeout(()=>setToast(null), 3500);
  }}/>;

  if (!user) return <><AuthScreen onLogin={handleLogin} onBookAsGuest={()=>setPublicBooking(true)}/>{toast && <Toast msg={toast.msg} kind={toast.kind}/>}</>;

  // Patients get a totally different shell — focused on their care
  if (user.role === "مريض") {
    return <PatientPortal onLogout={() => { setUser(null); setRoute("dashboard"); }}/>;
  }

  // Normalize identity (backfills scope/match for sessions created before role-scoping)
  const profile = (window.ROLE_PROFILES || {})[user.role] || {};
  const acct = {
    ...user,
    scope: user.scope !== undefined ? user.scope : (window.roleScope ? window.roleScope(user.role) : "all"),
    match: user.match !== undefined ? user.match : (profile.match || null),
    email: user.email || profile.email || "sherif@kinetic.eg",
    color: user.color || profile.color,
  };
  // Make the logged-in identity available to data-scoping helpers.
  window.ME = acct;
  // Guard: if the stored route isn't allowed for this job, fall back to its home.
  const route = (window.roleAllows && !window.roleAllows(user.role, rawRoute))
    ? (window.roleDefaultRoute ? window.roleDefaultRoute(user.role) : "dashboard")
    : rawRoute;

  const titles = {
    dashboard:    { title:"لوحة التحكم",            crumb:["الرئيسية","لوحة التحكم"] },
    patients:     { title:"المرضى",             crumb:["الرئيسية","المرضى"] },
    appointments: { title:"المواعيد",         crumb:["الرئيسية","Appointments"] },
    treatments:   { title:"خطط العلاج",      crumb:["الرئيسية","خطط العلاج"] },
    sessions:     { title:"جلسات العلاج",     crumb:["الرئيسية","جلسات العلاج"] },
    payments:     { title:"المدفوعات والفواتير",  crumb:["الرئيسية","Finance","Payments"] },
    packages:     { title:"الباقات",             crumb:["الرئيسية","Finance","Packages"] },
    campaigns:    { title:"حملات واتساب",   crumb:["الرئيسية","Growth","الحملات"] },
    reports:      { title:"التقارير",              crumb:["الرئيسية","Reports"] },
    settings:     { title:"الإعدادات",             crumb:["الرئيسية","Settings"] },
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--ink-50)"}}>
      <div className={"sidebar-backdrop" + (mobileNavOpen ? " open" : "")} onClick={()=>setMobileNavOpen(false)}/>
      <Sidebar active={route} onNav={(id)=>{ setMobileNavOpen(false); go(id); }} role={acct.role} user={acct} isOpen={mobileNavOpen}/>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        {/* Inline topbar replaced — pages own their own headers for richer context */}
        <div className="topbar">
          <button type="button" className="mobile-menu-btn" aria-label="فتح القائمة" onClick={()=>setMobileNavOpen(o=>!o)}>
            <I.Menu size={18}/>
          </button>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <span className="mono" style={{fontSize:11,color:"var(--ink-400)",letterSpacing:".05em",textTransform:"uppercase"}}>{acct.role}</span>
            <span style={{color:"var(--ink-300)"}}>·</span>
            <span style={{fontSize:13,color:"var(--ink-700)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>فرع مصر الجديدة</span>
            <span className="badge b-green" style={{marginLeft:6}}><span className="dot"></span>متصل</span>
          </div>
          <button type="button" className="search-wrap" onClick={()=>setPaletteOpen(true)}
            style={{position:"relative",width:"min(340px, 32vw)",height:36,padding:"0 34px",borderRadius:10,
              border:"1px solid transparent",background:"var(--ink-50)",cursor:"pointer",
              alignItems:"center",gap:8,color:"var(--ink-500)",fontSize:13,fontFamily:"inherit"}}
            aria-label="فتح البحث الشامل">
            <I.Search size={15} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--ink-400)"}}/>
            <span style={{flex:1,textAlign:"right"}}>ابحث عن مرضى، مواعيد، فواتير…</span>
            <span className="mono" style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--ink-400)",background:"#fff",border:"1px solid var(--ink-200)",borderRadius:5,padding:"1px 5px"}}>⌘K</span>
          </button>
          {/* Phone: the full search bar collapses to this icon (opens the same palette) */}
          <button type="button" className="btn btn-ghost btn-icon mobile-search-btn" title="بحث" aria-label="فتح البحث الشامل" onClick={()=>setPaletteOpen(true)}>
            <I.Search size={17}/>
          </button>
          <div style={{position:"relative"}}>
            <button className="btn btn-ghost btn-icon" title="الإشعارات" style={{position:"relative"}} onClick={()=>setNotifsOpen(o=>!o)}>
              <I.Bell size={17}/>
              <span style={{position:"absolute",top:6,right:6,width:7,height:7,background:"var(--red)",borderRadius:"50%",border:"2px solid #fff"}}></span>
            </button>
            {notifsOpen && (
              <div style={{position:"fixed",top:60,insetInlineEnd:"max(8px, min(56px, 4vw))",width:"min(320px, calc(100vw - 16px))",background:"#fff",border:"1px solid var(--ink-200)",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,.12)",zIndex:999,padding:"12px 0"}}>
                <div style={{padding:"4px 16px 10px",fontWeight:600,fontSize:13,borderBottom:"1px solid var(--ink-100)"}}>الإشعارات</div>
                {[
                  {title:"موعد جديد — هناء مصطفى", time:"منذ 5 دقائق", dot:"var(--blue-500)"},
                  {title:"تم استلام دفعة 850 ج.م", time:"منذ 20 دقيقة", dot:"var(--green)"},
                  {title:"تذكير: جلسة خالد يوسف 3:00 م", time:"منذ ساعة", dot:"var(--amber)"},
                ].map((n,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",borderBottom:"1px solid var(--ink-50)"}}
                    onClick={()=>setNotifsOpen(false)}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:n.dot,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12.5,fontWeight:500}}>{n.title}</div>
                      <div style={{fontSize:11,color:"var(--ink-400)"}}>{n.time}</div>
                    </div>
                  </div>
                ))}
                <div style={{padding:"8px 16px 2px",textAlign:"center"}}>
                  <button className="btn btn-ghost" style={{fontSize:12,width:"100%"}} onClick={()=>setNotifsOpen(false)}>عرض كل الإشعارات</button>
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" title="مساعدة" onClick={()=>window.showToast&&window.showToast("فتح المساعدة — قريباً","success")}>
            <I.Sparkle size={17}/>
          </button>
        </div>

        <main style={{flex:1}}>
          {route==="dashboard" && <RoleHome role={acct.role} go={go} user={acct}/>}
          {route==="patients" && <Patients go={go}/>}
          {route==="appointments" && <Appointments go={go}/>}
          {route==="treatments" && <Treatments go={go}/>}
          {route==="sessions" && <Sessions go={go}/>}
          {route==="payments" && <Payments go={go}/>}
          {route==="packages" && <Packages go={go}/>}
          {route==="campaigns" && <Campaigns go={go}/>}
          {route==="reports" && <Reports go={go}/>}
          {route==="settings" && <SettingsPage go={go}/>}
          {typeof route === "string" && route.startsWith("custom:") && <CustomSectionPage id={route.slice(7)}/>}
          {!titles[route] && !(typeof route === "string" && route.startsWith("custom:")) && <NotFound go={go}/>}
        </main>
      </div>
      {toast && <Toast msg={toast.msg} kind={toast.kind}/>}
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} onNav={(r)=>{ setPaletteOpen(false); go(r); }}/>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);


// ═══════════════════════════════════════════════════════════════
// PATIENT-FACING PORTAL — different shell, simpler nav, friendly tone
// ═══════════════════════════════════════════════════════════════

// Fallback shape when we can't derive from window.ME (unauthenticated /demo).
const PATIENT_FALLBACK = {
  name: "هناء مصطفى",
  initials: "HM",
  file: "P-10241",
  phone: "+20 100 234 1180",
  diag: "انزلاق غضروفي L4–L5",
  doctor: "د. ياسمين عادل",
  therapist: "كريم صالح",
  remaining: 5,
  total: 12,
  next: { date: "غدًا، 25 مايو", time: "09:00", dur: 45, with: "كريم صالح", room: "غرفة 2", type: "علاج يدوي" },
};

// Look up the logged-in patient from ME.patient_id (or ME.match) against the
// current DATA.patients cache. Falls back to the seed record when running
// without a real login (previously the whole portal displayed هناء's data
// regardless of who logged in).
function getPatientMe(){
  const ME = window.ME || {};
  const patients = (window.DATA && window.DATA.patients) || [];
  const pid = ME.patient_id || ME.match || null;
  const row = pid ? patients.find(p => p.patient_id === pid || p.id === pid) : null;
  if (!row) return PATIENT_FALLBACK;
  const initials = (row.name || "").split(" ").map(x=>x[0]||"").join("").slice(0,2).toUpperCase();
  const remaining = row.remain != null ? row.remain : PATIENT_FALLBACK.remaining;
  const total = row.total || (row.pkg && Number((row.pkg.match(/(\d+)/)||[])[1])) || PATIENT_FALLBACK.total;
  return {
    name: row.name || PATIENT_FALLBACK.name,
    initials: initials || PATIENT_FALLBACK.initials,
    file: row.patient_id || row.id || PATIENT_FALLBACK.file,
    phone: row.phone || PATIENT_FALLBACK.phone,
    diag: row.diag || row.diagnosis || PATIENT_FALLBACK.diag,
    doctor: row.doctor || PATIENT_FALLBACK.doctor,
    therapist: row.th || row.therapist || PATIENT_FALLBACK.therapist,
    remaining,
    total,
    next: PATIENT_FALLBACK.next,
  };
}
// Proxy so every property read hits getPatientMe() at that moment. Direct
// object destructuring still works. Without this, PATIENT_ME would freeze
// to whatever DATA.patients held at script-load time — before hydration.
const PATIENT_ME = new Proxy({}, {
  get(_, key){ return getPatientMe()[key]; },
});

function PatientPortal({ onLogout }) {
  const [route, setRoute] = React.useState("home");
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  function go(r) {
    if (r === "book") { setBookingOpen(true); return; }
    if (r === "logout") { onLogout(); return; }
    setRoute(r);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function handleBookingComplete(slot) {
    setBookingOpen(false);
    setToast({ msg: `Appointment booked for ${slot.date} at ${slot.time}`, kind:"success" });
    setTimeout(()=>setToast(null), 3000);
    setRoute("appointments");
  }

  return (
    <div style={{minHeight:"100vh",background:"var(--blue-50)"}}>
      <PatientTopbar onNav={go} active={route}/>
      <main style={{maxWidth: 980, margin:"0 auto", padding:"clamp(16px, 3vw, 28px) clamp(14px, 3vw, 24px) 110px"}}>
        {route==="home"         && <PatientHome onBook={()=>setBookingOpen(true)} go={go}/>}
        {route==="appointments" && <PatientAppointments onBook={()=>setBookingOpen(true)}/>}
        {route==="plan"         && <PatientPlanView/>}
        {route==="messages"     && <PatientMessages/>}
        {route==="bills"        && <PatientBills/>}
        {route==="profile"      && <PatientProfile/>}
      </main>
      {bookingOpen && <PatientBookingFlow onClose={()=>setBookingOpen(false)} onDone={handleBookingComplete}/>}
      {toast && <Toast msg={toast.msg} kind={toast.kind}/>}

      {/* Mobile bottom nav (visible always — patient portal feels app-like) */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"#fff",borderTop:"1px solid var(--ink-200)",
        padding:"8px 12px calc(12px + env(safe-area-inset-bottom, 0px))",display:"flex",justifyContent:"space-around",
        boxShadow:"0 -2px 14px rgba(15,30,43,.05)", zIndex: 20
      }}>
        {[
          { id:"home", l:"الرئيسية", ic:<I.Heart size={18}/> },
          { id:"appointments", l:"زيارات", ic:<I.Calendar size={18}/> },
          { id:"book", l:"حجز", ic:<I.Plus size={20}/>, primary:true },
          { id:"messages", l:"messages", ic:<I.WhatsApp size={18}/> },
          { id:"profile", l:"حسابي", ic:<I.User size={18}/> },
        ].map(it => (
          <button key={it.id} onClick={()=>go(it.id)}
            style={{
              background:"transparent",border:"none",cursor:"pointer",padding:"4px 8px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              color: route===it.id?"var(--blue-700)":"var(--ink-500)",
              position:"relative"
            }}>
            {it.primary ? (
              <div style={{
                width:46,height:46,borderRadius:14,
                background:"linear-gradient(135deg, var(--blue-500), var(--blue-700))",
                color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 6px 18px rgba(123,189,232,.45)",
                marginTop:-22
              }}>
                {it.ic}
              </div>
            ) : it.ic}
            <span style={{fontSize:10.5,fontWeight: route===it.id?600:500}}>{it.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PatientTopbar({ onNav, active }) {
  return (
    <header style={{
      background:"#fff",borderBottom:"1px solid var(--ink-200)",
      position:"sticky",top:0,zIndex:10
    }}>
      <div style={{maxWidth:980,margin:"0 auto",padding:"12px clamp(12px, 3vw, 24px)",display:"flex",alignItems:"center",gap:"clamp(8px, 1.5vw, 14px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",flexShrink:0}} onClick={()=>onNav("home")}>
          <I.Logo size={30}/>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1.1}}>
            <span style={{fontWeight:600,fontSize:15,letterSpacing:"-.01em"}}>Kinetic</span>
            <span style={{fontSize:10,color:"var(--ink-500)",letterSpacing:".06em",textTransform:"uppercase"}}>بوابة المريض</span>
          </div>
        </div>
        <nav className="pt-nav" style={{marginLeft:12}}>
          {[
            { id:"home", l:"الرئيسية" },
            { id:"appointments", l:"زياراتي" },
            { id:"plan", l:"خطة العلاج" },
            { id:"messages", l:"messages" },
            { id:"bills", l:"الفواتير" },
          ].map(it=>(
            <button key={it.id} onClick={()=>onNav(it.id)} style={{
              border:"none",background: active===it.id?"var(--blue-100)":"transparent",
              color: active===it.id?"var(--blue-900)":"var(--ink-700)",
              padding:"7px 14px",borderRadius:9,fontSize:13.5,fontWeight:500,cursor:"pointer",
              fontFamily:"inherit"
            }}>{it.l}</button>
          ))}
        </nav>
        <button className="btn btn-ghost btn-icon" style={{position:"relative"}}>
          <I.Bell size={16}/>
          <span style={{position:"absolute",top:6,right:6,width:7,height:7,background:"var(--red)",borderRadius:"50%",border:"2px solid #fff"}}></span>
        </button>
        <button onClick={()=>onNav("profile")} style={{border:"none",background:"transparent",padding:0,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          <div className="av md" style={{background:"var(--blue-500)",color:"#fff"}}>{PATIENT_ME.initials}</div>
          <I.ChevronDown size={12} style={{color:"var(--ink-500)"}}/>
        </button>
        <button className="btn btn-ghost btn-icon" title="تسجيل الخروج" onClick={()=>onNav("logout")}>
          <I.Logout size={15}/>
        </button>
      </div>
    </header>
  );
}

function PatientHome({ onBook, go }) {
  const progress = PATIENT_ME.total - PATIENT_ME.remaining;
  const [nextCancelled, setNextCancelled] = React.useState(false);
  const [nextTime, setNextTime] = React.useState(PATIENT_ME.next.time);
  const [rescheduling, setRescheduling] = React.useState(false);
  const [reTime, setReTime] = React.useState(PATIENT_ME.next.time);
  const NEXT_ID = "B-NEXT-" + (PATIENT_ME.file || "me");
  const cancelNext = async () => {
    try {
      if (window.KineticData) {
        await window.KineticData.upsert("appts", {
          booking_id: NEXT_ID,
          patient_id: PATIENT_ME.file,
          status: "ملغى",
        });
      }
      setNextCancelled(true);
      if (window.showToast) window.showToast("تم إلغاء الموعد","success");
    } catch (e) {
      console.warn("cancel next appt failed", e);
      if (window.showToast) window.showToast("تعذّر إلغاء الموعد","error");
    }
  };
  const confirmReschedule = async () => {
    if (!reTime) { if (window.showToast) window.showToast("اختر وقتًا جديدًا","error"); return; }
    try {
      if (window.KineticData) {
        await window.KineticData.upsert("appts", {
          booking_id: NEXT_ID,
          patient_id: PATIENT_ME.file,
          time: reTime,
          status: "مؤكد",
        });
      }
      setNextTime(reTime);
      setRescheduling(false);
      if (window.showToast) window.showToast("تم إعادة جدولة الموعد","success");
    } catch (e) {
      console.warn("reschedule next appt failed", e);
      if (window.showToast) window.showToast("تعذّر إعادة الجدولة","error");
    }
  };
  return (
    <div>
      {/* Greeting */}
      <div style={{marginBottom:24}}>
        <div className="muted" style={{fontSize:13.5,marginBottom:4}}>الأحد، 24 مايو</div>
        <h1 style={{fontSize:"clamp(24px, 5.5vw, 32px)",fontWeight:600,letterSpacing:"-.015em",margin:0}}>
          أهلاً <span className="serif" style={{fontWeight:400, fontStyle:"italic"}}>هناء</span> — تشعرين بتحسّن؟
        </h1>
      </div>

      {/* Next appointment hero */}
      {!nextCancelled && <div className="card" style={{padding:0,overflow:"hidden",marginBottom:24,position:"relative"}}>
        <div style={{
          background:"linear-gradient(135deg, #7BBDE8 0%, #BDD8E9 80%)",
          padding:"22px 26px", color:"#0F1E2B", position:"relative", overflow:"hidden"
        }}>
          <svg style={{position:"absolute",top:-40,right:-40,opacity:.25}} width="220" height="220" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#fff" strokeWidth="1.5"/>
            <circle cx="100" cy="100" r="50" fill="none" stroke="#fff" strokeWidth="1.5"/>
            <circle cx="100" cy="100" r="20" fill="#fff" opacity=".6"/>
          </svg>
          <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:18}}>
            <div>
              <div style={{fontSize:11.5,letterSpacing:".06em",textTransform:"uppercase",color:"#1E4A6E",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:999,background:"#1E4A6E",animation:"pulse 1.8s infinite"}}></span>
                Your next جلسة
              </div>
              <div className="serif" style={{fontSize:"clamp(28px, 6vw, 40px)",lineHeight:1.05,letterSpacing:"-.01em"}}>
                {PATIENT_ME.next.date}
              </div>
              <div className="mono" style={{fontSize:18,marginTop:6,color:"#1E4A6E",fontWeight:600}}>
                {nextTime} · {PATIENT_ME.next.dur} min
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"6px 14px",marginTop:14,fontSize:13,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:6}}>
                  <div className="av sm" style={{background:"#fff",color:"var(--blue-700)"}}>KS</div>
                  مع {PATIENT_ME.next.with}
                </span>
                <span style={{color:"#1E4A6E",opacity:.7}}>·</span>
                <span style={{display:"flex",alignItems:"center",gap:6}}>
                  <I.MapPin size={13}/> {PATIENT_ME.next.room}
                </span>
                <span style={{color:"#1E4A6E",opacity:.7}}>·</span>
                <span>{PATIENT_ME.next.type}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{padding:"14px 26px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-blue" onClick={onBook}><I.Plus size={13}/> احجز موعدًا آخر</button>
          <button className="btn btn-secondary" onClick={()=>{setReTime(nextTime);setRescheduling(true);}}><I.Calendar size={13}/> إعادة جدولة</button>
          <button className="btn btn-secondary" onClick={cancelNext}><I.X size={13}/> إلغاء</button>
          <div style={{flex:1}}/>
          <button className="btn btn-ghost" style={{fontSize:12.5}} onClick={()=>{
            const ics=`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:جلسة كينيتك - ${PATIENT_ME.next.with}\nDTSTART:20260601T100000Z\nDTEND:20260601T110000Z\nLOCATION:${PATIENT_ME.next.room}\nEND:VEVENT\nEND:VCALENDAR`;
            const blob=new Blob([ics],{type:"text/calendar"});
            const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="appointment.ics";a.click();URL.revokeObjectURL(url);
            if(window.showToast)window.showToast("تم تنزيل الموعد للتقويم","success");
          }}><I.Download size={13}/> أضف إلى التقويم</button>
        </div>
      </div>}
      {nextCancelled && (
        <div className="card card-pad" style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <div style={{fontWeight:600,fontSize:14}}>لا يوجد موعد قادم</div>
            <div className="muted" style={{fontSize:12,marginTop:4}}>احجزي زيارتك القادمة عند جاهزيتك.</div>
          </div>
          <button className="btn btn-blue" onClick={onBook}><I.Plus size={13}/> احجز زيارة</button>
        </div>
      )}
      {rescheduling && (
        <Modal title="إعادة جدولة الموعد" onClose={()=>setRescheduling(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setRescheduling(false)}>إلغاء</button>
            <button className="btn btn-blue" onClick={confirmReschedule}><I.Check size={13}/> تأكيد</button>
          </>}>
          <Field label="الوقت الجديد"><input className="input" type="time" value={reTime} onChange={e=>setReTime(e.target.value)}/></Field>
          <div className="muted" style={{fontSize:12,marginTop:10}}>سيتم إبلاغ {PATIENT_ME.next.with}.</div>
        </Modal>
      )}

      {/* إجراءات سريعة */}
      <div className="rgrid c-sm" style={{"--gtc":"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {[
          { l:"احجز زيارة",   sub:"45 ثانية للحجز",       ic:<I.Calendar size={20}/>, color:"#7BBDE8", onClick:onBook },
          { l:"الرسالة therapist", sub:"الرد عادةً خلال ساعتين", ic:<I.WhatsApp size={20}/>, color:"#25D366", onClick:()=>go("messages") },
          { l:"اعرض خطتي",   sub:"أهداف · تمارين · ملاحظات", ic:<I.Clipboard size={20}/>, color:"#7E6BD3", onClick:()=>go("plan") },
        ].map((q,i)=>(
          <button key={i} onClick={q.onClick} style={{
            background:"#fff",border:"1px solid var(--ink-200)",borderRadius:14,
            padding:"18px",textAlign:"left",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,transition:"all .15s",
            fontFamily:"inherit"
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=q.color;e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="var(--shadow-md)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--ink-200)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="";}}
          >
            <div style={{width:44,height:44,borderRadius:12,background:q.color+"22",color:q.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {q.ic}
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:14.5}}>{q.l}</div>
              <div className="muted" style={{fontSize:12,marginTop:2}}>{q.sub}</div>
            </div>
            <I.ArrowRight size={16} style={{color:"var(--ink-300)",marginLeft:"auto"}}/>
          </button>
        ))}
      </div>

      {/* التقدّم + recovery */}
      <div className="rgrid c-sm" style={{"--gtc":"1.3fr 1fr",marginBottom:24}}>
        <div className="card card-pad">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
            <div>
              <div className="h2">تعافيك</div>
              <div className="muted" style={{fontSize:12.5,marginTop:2}}>الألم has dropped بواسطة 4 points in 4 weeks 🎉</div>
            </div>
            <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>go("plan")}>افتح الخطة <I.ArrowRight size={11}/></button>
          </div>

          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
            <span className="mono" style={{fontSize:38,fontWeight:600,letterSpacing:"-.01em"}}>{progress}</span>
            <span className="muted">من {PATIENT_ME.total} Sessions مكتملة</span>
          </div>
          <div style={{height:10,background:"var(--ink-100)",borderRadius:999,overflow:"hidden",marginBottom:16}}>
            <div style={{height:"100%",width:`${progress/PATIENT_ME.total*100}%`,background:"linear-gradient(90deg, var(--blue-500), var(--blue-700))",borderRadius:999,transition:"width .6s"}}/>
          </div>

          <div style={{padding:14,background:"var(--blue-50)",borderRadius:12,marginBottom:14}}>
            <div className="muted" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>الألم trend · last 7 Sessions</div>
            <PainTrendChart/>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5}}>
            <div><div className="muted">البداية</div><div>7/10</div></div>
            <div><div className="muted">اليوم</div><div className="mono" style={{color:"var(--green)",fontWeight:600}}>3/10</div></div>
            <div><div className="muted">الهدف</div><div>≤ 2/10</div></div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="h2" style={{marginBottom:14}}>تمارين اليوم</div>
          {[
            { l:"تمدد القط-الجمل", sub:"10 تكرارات × 2 مجموعة", done:true },
            { l:"ديد-باج، بالتبادل", sub:"8 لكل جانب × 3", done:true },
            { l:"جسر الأرداف", sub:"15 تكرار × 3 مجموعة", done:false },
            { l:"امشي 20 دقيقة", sub:"في أي وقت اليوم", done:false },
          ].map((h,i)=>(
            <label key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<3?"1px dashed var(--ink-100)":"none",fontSize:13.5,cursor:"pointer"}}>
              <input type="checkbox" defaultChecked={h.done} style={{width:18,height:18,accentColor:"var(--blue-500)"}}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,textDecoration:h.done?"line-through":"none",color:h.done?"var(--ink-500)":"var(--ink-900)"}}>{h.l}</div>
                <div className="muted" style={{fontSize:11.5,marginTop:1}}>{h.sub}</div>
              </div>
            </label>
          ))}
          <div style={{padding:10,background:"var(--blue-50)",borderRadius:10,marginTop:14,display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--blue-900)"}}>
            <I.Sparkle size={13}/> 2 من 4 done — keep going!
          </div>
        </div>
      </div>

      {/* فريق الرعاية */}
      <div className="card card-pad" style={{marginBottom:24}}>
        <div className="h2" style={{marginBottom:14}}>فريق الرعاية</div>
        <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:14}}>
          {[
            { name:PATIENT_ME.doctor, role:"الطبيب المسؤول", spec:"تأهيل عظام", color:"#7E6BD3" },
            { name:PATIENT_ME.therapist, role:"الأخصائي الأساسي", spec:"علاج يدوي", color:"#7BBDE8" },
          ].map((c,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:14,border:"1px solid var(--ink-200)",borderRadius:12}}>
              <div className="av lg" style={{background:c.color+"33",color:c.color}}>{c.name.split(" ").slice(-2).map(x=>x[0]).join("")}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14}}>{c.name}</div>
                <div className="muted" style={{fontSize:12}}>{c.role} · {c.spec}</div>
              </div>
              <button className="btn btn-ghost btn-icon" title="الرسالة" onClick={()=>window.open("https://wa.me/201001234567","_blank")}><I.WhatsApp size={15}/></button>
              <button className="btn btn-ghost btn-icon" title="اتصال" onClick={()=>window.open("tel:+201001234567")}><I.Phone size={15}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatientAppointments({ onBook }) {
  const [notesModal, setNotesModal] = React.useState(null);
  const [upcoming, setUpcoming] = React.useState([
    { id:"B-2601", date:"غدًا، 25 مايو", time:"09:00", dur:45, th:"كريم صالح", type:"علاج يدوي", status:"مؤكد", room:"غرفة 2" },
    { id:"B-2602", date:"الأربعاء، 28 مايو", time:"09:00", dur:45, th:"كريم صالح", type:"علاج يدوي", status:"مؤكد", room:"غرفة 2" },
    { id:"B-2603", date:"السبت، 31 مايو", time:"10:30", dur:45, th:"كريم صالح", type:"تدريبات قوة", status:"معلّق", room:"غرفة 2" },
  ]);
  const [rescheduling, setRescheduling] = React.useState(null);
  const [reTime, setReTime] = React.useState("");
  const cancelAppt = async (a) => {
    try {
      if (window.KineticData) {
        await window.KineticData.upsert("appts", {
          booking_id: a.id,
          patient_id: PATIENT_ME.file,
          status: "ملغى",
        });
      }
      setUpcoming(list => list.filter(x => x.id !== a.id));
      if (window.showToast) window.showToast("تم إلغاء الموعد","success");
    } catch (e) {
      console.warn("cancel appt failed", e);
      if (window.showToast) window.showToast("تعذّر إلغاء الموعد","error");
    }
  };
  const confirmReschedule = async () => {
    if (!reTime) { if (window.showToast) window.showToast("اختر وقتًا جديدًا","error"); return; }
    const a = rescheduling;
    try {
      if (window.KineticData) {
        await window.KineticData.upsert("appts", {
          booking_id: a.id,
          patient_id: PATIENT_ME.file,
          time: reTime,
          status: "مؤكد",
        });
      }
      setUpcoming(list => list.map(x => x.id === a.id ? { ...x, time: reTime, status: "مؤكد" } : x));
      if (window.showToast) window.showToast("تم إعادة جدولة الموعد","success");
      setRescheduling(null);
      setReTime("");
    } catch (e) {
      console.warn("reschedule appt failed", e);
      if (window.showToast) window.showToast("تعذّر إعادة الجدولة","error");
    }
  };
  const past = [
    { date:"الخميس، 22 مايو", time:"08:30", dur:45, th:"كريم صالح", type:"علاج يدوي", status:"مكتمل", pain:"7 → 3" },
    { date:"الإثنين، 18 مايو", time:"08:30", dur:45, th:"كريم صالح", type:"علاج يدوي", status:"مكتمل", pain:"7 → 4" },
    { date:"الخميس، 15 مايو", time:"09:00", dur:45, th:"كريم صالح", type:"تقييم أولي", status:"مكتمل", pain:"— → 5" },
  ];

  return (
    <div>
      <div className="page-head" style={{alignItems:"flex-end"}}>
        <div>
          <h1 style={{fontSize:"clamp(22px, 5vw, 28px)",fontWeight:600,letterSpacing:"-.01em",margin:0}}>زياراتي</h1>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{upcoming.length} قادمة · {past.length} مكتملة</div>
        </div>
        <button className="btn btn-blue" onClick={onBook}><I.Plus size={13}/> احجز زيارة</button>
      </div>

      <div className="h3" style={{marginBottom:10,marginTop:8}}>قادمة</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:30}}>
        {upcoming.map((a,i)=>(
          <div key={i} className="card" style={{padding:16,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{
              width:64,height:64,borderRadius:14,
              background: i===0?"linear-gradient(135deg, var(--blue-500), var(--blue-700))":"var(--blue-50)",
              color: i===0?"#fff":"var(--blue-700)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              flexShrink:0
            }}>
              <div className="mono" style={{fontSize:11,opacity:.8,fontWeight:500}}>{a.date.split(",")[0].slice(0,3).toUpperCase()}</div>
              <div className="mono" style={{fontSize:22,fontWeight:600,lineHeight:1}}>{a.date.includes("Tomorrow") ? "25" : a.date.match(/\d+/)?.[0]}</div>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontWeight:600,fontSize:14.5}}>{a.date} · {a.time}</span>
                <ApptBadge s={a.status}/>
              </div>
              <div className="muted" style={{fontSize:12.5}}>
                {a.type} مع {a.th} · {a.dur} min · {a.room}
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>{setRescheduling(a);setReTime(a.time);}}> إعادة جدولة</button>
              <button className="btn btn-ghost btn-icon" title="إلغاء الموعد" onClick={()=>cancelAppt(a)}><I.X size={14}/></button>
            </div>
          </div>
        ))}
      </div>

      <div className="h3" style={{marginBottom:10}}>سابقة</div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        {past.map((a,i)=>(
          <div key={i} className="rgrid pvisit-row" style={{padding:"14px 18px","--gtc":"140px 1fr 100px 110px 90px",alignItems:"center",gap:12,borderBottom:i<past.length-1?"1px solid var(--ink-100)":"none"}}>
            <div>
              <div style={{fontSize:13,fontWeight:500}}>{a.date}</div>
              <div className="mono" style={{fontSize:11.5,color:"var(--ink-500)"}}>{a.time} · {a.dur}m</div>
            </div>
            <div>
              <div style={{fontSize:13}}>{a.type}</div>
              <div className="muted" style={{fontSize:11.5}}>مع {a.th}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div className="muted" style={{fontSize:11}}>الألم</div>
              <div className="mono" style={{fontSize:13,fontWeight:600,color:"var(--green)"}}>{a.pain}</div>
            </div>
            <ApptBadge s={a.status}/>
            <button className="btn btn-ghost" style={{fontSize:12,justifyContent:"flex-end"}} onClick={()=>setNotesModal(a)}>عرض الملاحظات <I.ArrowRight size={11}/></button>
          </div>
        ))}
      </div>
      {notesModal && (
        <Modal title={`ملاحظات جلسة ${notesModal.date}`} onClose={()=>setNotesModal(null)}>
          <div style={{fontSize:13,lineHeight:1.7,marginBottom:12}}>
            <strong>{notesModal.type}</strong> مع {notesModal.th}<br/>
            مستوى الألم: <span style={{color:"var(--green)",fontWeight:600}}>{notesModal.pain}</span>
          </div>
          <div style={{padding:14,background:"var(--ink-50)",borderRadius:10,fontSize:13,color:"var(--ink-700)"}}>
            المريض يُظهر تقدمًا جيدًا. تم تطبيق تمارين التقوية والتحريك اليدوي. الالتزام بالبرنامج المنزلي ممتاز.
          </div>
        </Modal>
      )}
      {rescheduling && (
        <Modal title={`إعادة جدولة موعد ${rescheduling.date}`} onClose={()=>{setRescheduling(null);setReTime("");}}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>{setRescheduling(null);setReTime("");}}>إلغاء</button>
            <button className="btn btn-blue" onClick={confirmReschedule}><I.Check size={13}/> تأكيد</button>
          </>}>
          <Field label="الوقت الجديد"><input className="input" type="time" value={reTime} onChange={e=>setReTime(e.target.value)}/></Field>
          <div className="muted" style={{fontSize:12,marginTop:10}}>سيتم إشعار الأخصائي {rescheduling.th}.</div>
        </Modal>
      )}
    </div>
  );
}

function PatientPlanView() {
  return (
    <div>
      <h1 style={{fontSize:"clamp(22px, 5vw, 28px)",fontWeight:600,letterSpacing:"-.01em",margin:"0 0 4px"}}>خطة علاجك</h1>
      <div className="muted" style={{fontSize:13.5,marginBottom:20}}>{PATIENT_ME.diag} · بدأت 30 أبريل 2026</div>
      <PatientTreatmentPlan/>
    </div>
  );
}

function PatientMessages() {
  return (
    <div>
      <h1 style={{fontSize:"clamp(22px, 5vw, 28px)",fontWeight:600,letterSpacing:"-.01em",margin:"0 0 4px"}}>الرسائل</h1>
      <div className="muted" style={{fontSize:13.5,marginBottom:20}}>تحدّث مع فريق الرعاية — الردود عادةً خلال ساعتين.</div>

      <div className="rgrid c-sm" style={{"--gtc":"260px 1fr"}}>
        <div className="card chat-list" style={{padding:0}}>
          {[
            { n:"كريم صالح", r:"الأخصائي", last:"أراك غدًا 09:00", time:"2h", unread:1, active:true },
            { n:"د. ياسمين عادل", r:"طبيب", last:"كيف البرنامج الجديد؟", time:"أمس", unread:0 },
            { n:"مريم خليل", r:"الاستقبال", last:"تم إرسال الإيصال للبريد", time:"3d", unread:0 },
          ].map((c,i)=>(
            <div key={i} style={{
              padding:"12px 14px",borderBottom:"1px solid var(--ink-100)",
              background: c.active?"var(--blue-50)":"transparent",cursor:"pointer",
              display:"flex",gap:10,alignItems:"center"
            }}>
              <div className="av md" style={{background:"var(--blue-100)",color:"var(--blue-700)"}}>{c.n.split(" ").slice(-2).map(x=>x[0]).join("")}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:600,fontSize:13}}>{c.n}</span>
                  <span className="muted" style={{fontSize:11}}>{c.time}</span>
                </div>
                <div style={{fontSize:12,color:"var(--ink-500)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.last}</div>
              </div>
              {c.unread>0 && <span className="mono" style={{background:"var(--blue-500)",color:"#fff",borderRadius:999,padding:"1px 7px",fontSize:10,fontWeight:600}}>{c.unread}</span>}
            </div>
          ))}
        </div>

        <div className="card chat-pane" style={{padding:0,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--ink-100)",display:"flex",alignItems:"center",gap:10}}>
            <div className="av md" style={{background:"var(--blue-100)",color:"var(--blue-700)"}}>KS</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>كريم صالح</div>
              <div style={{fontSize:11,color:"var(--green)"}}>● متصل</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={()=>window.open("tel:+201002341180")}><I.Phone size={15}/></button>
          </div>
          <div style={{flex:1,padding:18,background:"#F4F8FB",overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{alignSelf:"flex-start",maxWidth:"75%",background:"#fff",padding:"10px 14px",borderRadius:"14px 14px 14px 4px",fontSize:13.5,boxShadow:"var(--shadow-sm)"}}>أهلاً Hana! How are you feeling after أمس's جلسة?</div>
            <div style={{alignSelf:"flex-end",maxWidth:"75%",background:"var(--blue-500)",color:"#fff",padding:"10px 14px",borderRadius:"14px 14px 4px 14px",fontSize:13.5}}>أفضل بكثير — نمت طوال الليل لأول مرة منذ أسابيع 🙏</div>
            <div style={{alignSelf:"flex-start",maxWidth:"75%",background:"#fff",padding:"10px 14px",borderRadius:"14px 14px 14px 4px",fontSize:13.5,boxShadow:"var(--shadow-sm)"}}>That's wonderful! Keep up the home exercises. See you tomorrow at 09:00 for جلسة #8.</div>
            <div style={{alignSelf:"flex-end",fontSize:11,color:"var(--ink-500)",marginTop:6}}>منذ ساعتين</div>
          </div>
          <div style={{padding:14,borderTop:"1px solid var(--ink-100)",display:"flex",gap:8}}>
            <input className="input" placeholder="اكتب رسالة…" style={{flex:1}}/>
            <button className="btn btn-blue" style={{padding:"8px 12px"}}><I.Send size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientBills() {
  const bills = [
    { id:"INV-2026-0421", date:"22 مايو 2026", desc:"الأساسية 10 — باقة علاج يدوي", amount:7250, paid:7250, method:"فيزا", status:"مدفوع" },
    { id:"INV-2026-0410", date:"1 مايو 2026",  desc:"جلسة واحدة — تقييم", amount:850, paid:850, method:"نقدي", status:"مدفوع" },
  ];
  return (
    <div>
      <h1 style={{fontSize:"clamp(22px, 5vw, 28px)",fontWeight:600,letterSpacing:"-.01em",margin:"0 0 4px"}}>الفواتير</h1>
      <div className="muted" style={{fontSize:13.5,marginBottom:20}}>Your full payment history مع Kinetic.</div>

      <div className="rgrid c-sm" style={{"--gtc":"repeat(3,1fr)",gap:14,marginBottom:24}}>
        <div className="card card-pad">
          <div className="muted" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".05em"}}>مدفوع هذه السنة</div>
          <div className="mono" style={{fontSize:26,fontWeight:600,marginTop:4}}>EGP 8,100</div>
        </div>
        <div className="card card-pad">
          <div className="muted" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".05em"}}>معلّق</div>
          <div className="mono" style={{fontSize:26,fontWeight:600,marginTop:4,color:"var(--green)"}}>EGP 0</div>
        </div>
        <div className="card card-pad">
          <div className="muted" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".05em"}}>جلسات متبقية</div>
          <div className="mono" style={{fontSize:26,fontWeight:600,marginTop:4}}>{PATIENT_ME.remaining} <span style={{fontSize:14,color:"var(--ink-500)"}}>/ {PATIENT_ME.total}</span></div>
        </div>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>فاتورة</th><th>التاريخ</th><th>البند</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {bills.map(b=>(
              <tr key={b.id}>
                <td className="mono">{b.id}</td>
                <td>{b.date}</td>
                <td>{b.desc}</td>
                <td className="mono" style={{fontWeight:600}}>EGP {b.amount.toLocaleString()}</td>
                <td>{b.method}</td>
                <td><PayBadge s={b.status}/></td>
                <td><button className="btn btn-ghost btn-icon" onClick={()=>{
                  const rows=["الفاتورة,التاريخ,البند,المبلغ,الطريقة,الحالة",`${b.id},${b.date},${b.desc},${b.amount},${b.method},${b.status}`];
                  downloadCsv(rows, `${b.id}.csv`);
                  if(window.showToast)window.showToast("تم تحميل الفاتورة","success");
                }}><I.Download size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function PatientProfile() {
  const [editOpen, setEditOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name:PATIENT_ME.name, phone:PATIENT_ME.phone, email:"hana.m@gmail.com", address:"١٤ ش صلاح سالم، مصر الجديدة" });
  return (
    <div>
      <h1 style={{fontSize:"clamp(22px, 5vw, 28px)",fontWeight:600,letterSpacing:"-.01em",margin:"0 0 4px"}}>ملفي الشخصي</h1>
      <div className="muted" style={{fontSize:13.5,marginBottom:20}}>بياناتك on file مع Kinetic.</div>

      <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr"}}>
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>البيانات الشخصية</div>
          <InfoRow k="رقم الملف" v={<span className="mono">{PATIENT_ME.file}</span>}/>
          <InfoRow k="الاسم الكامل" v={form.name}/>
          <InfoRow k="الهاتف" v={form.phone}/>
          <InfoRow k="البريد" v={form.email}/>
          <InfoRow k="التاريخ من birth" v="Mar 12, 1992"/>
          <InfoRow k="العنوان" v={form.address}/>
          <button className="btn btn-secondary" style={{marginTop:14}} onClick={()=>setEditOpen(true)}><I.Edit size={13}/> تعديل details</button>
        </div>
      {editOpen && (
        <Modal title="تعديل البيانات الشخصية" onClose={()=>setEditOpen(false)}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setEditOpen(false)}>إلغاء</button>
            <button className="btn btn-blue" onClick={async ()=>{
              if (!form.name.trim()) { if (window.showToast) window.showToast("أدخل الاسم","error"); return; }
              try {
                if (window.KineticData) {
                  await window.KineticData.upsert("patients", {
                    patient_id: PATIENT_ME.file,
                    name: form.name.trim(),
                    phone: form.phone || null,
                  });
                }
                if (window.showToast) window.showToast("تم حفظ التغييرات","success");
                setEditOpen(false);
              } catch (e) {
                console.warn("patient profile save failed", e);
                if (window.showToast) window.showToast("تعذّر حفظ التغييرات","error");
              }
            }}>
              <I.Check size={13}/> حفظ
            </button>
          </>}>
          <Field label="الاسم الكامل"><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
          <div style={{height:10}}/>
          <Field label="الهاتف"><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
          <div style={{height:10}}/>
          <Field label="البريد الإلكتروني"><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
          <div style={{height:10}}/>
          <Field label="العنوان"><input className="input" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
        </Modal>
      )}
        <div className="card card-pad">
          <div className="h3" style={{marginBottom:14}}>التفضيلات</div>
          {[
            { l:"تذكير appointments", sub:"رسالة واتساب قبل 24 ساعة", on:true },
            { l:"الأخصائي messages", sub:"بريد + إشعار عندما يراسلك الأخصائي", on:true },
            { l:"تسويق وعروض", sub:"عروض ومستجدات العيادة أحيانًا", on:false },
            { l:"مشاركة التقدّم مع الطبيب", sub:"إرسال ملخص أسبوعي للدكتورة ياسمين", on:true },
          ].map((p,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<3?"1px dashed var(--ink-100)":"none"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13.5,fontWeight:500}}>{p.l}</div>
                <div className="muted" style={{fontSize:11.5}}>{p.sub}</div>
              </div>
              <div className={`switch ${p.on?"on":""}`}><div className="knob"></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────── المريض booking flow (focused, friendly) ────────
function PatientBookingFlow({ onClose, onDone }) {
  const [step, setStep] = React.useState(1);
  const [picks, setPicks] = React.useState({
    reason: null,
    therapist: "كريم صالح",
    date: "الثلاثاء، 26 مايو",
    time: "10:00",
  });
  const [confirming, setConfirming] = React.useState(false);

  function next() {
    // Validate the current step before advancing so incomplete state can't
    // silently slip through to booking. Each step guards its own field.
    if (step === 1 && !picks.reason) { if (window.showToast) window.showToast("اختر سبب الزيارة", "error"); return; }
    if (step === 2 && !picks.therapist) { if (window.showToast) window.showToast("اختر المعالج", "error"); return; }
    if (step === 3 && (!picks.date || !picks.time)) { if (window.showToast) window.showToast("اختر التاريخ والوقت", "error"); return; }
    if (step < 4) { setStep(step+1); return; }
    setConfirming(true);
    const me = getPatientMe();
    // Persist the booking so it appears in Appointments after the modal closes.
    if (window.KineticData) {
      const therapistRow = (DATA.therapists || []).find(t => t.name === picks.therapist);
      const bookingId = "B-" + Date.now();
      window.KineticData.upsert("appts", {
        booking_id: bookingId,
        id: bookingId,
        patient_id: me.file,
        therapist_id: (therapistRow && (therapistRow.staff_id || therapistRow.id)) || null,
        date: new Date().toISOString().slice(0,10),
        time: picks.time,
        status: "مؤكد",
        notes: picks.reason || "",
      }).catch(e => console.warn("booking persist failed", e));
    }
    setTimeout(()=>{
      onDone(picks);
    }, 1100);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{width:760,maxWidth:"calc(100% - 40px)",maxHeight:"calc(100vh - 60px)",padding:0,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:"1px solid var(--ink-100)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,borderRadius:10,background:"var(--blue-100)",color:"var(--blue-700)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <I.Calendar size={17}/>
          </div>
          <div style={{flex:1}}>
            <div className="h3">احجز زيارة</div>
            <div className="muted" style={{fontSize:12}}>خطوة {step} من 4 — تستغرق عادةً 30 ثانية</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><I.X size={16}/></button>
        </div>

        {/* Stepper */}
        <div style={{padding:"14px 24px",background:"var(--ink-50)",borderBottom:"1px solid var(--ink-100)",display:"flex",gap:6}}>
          {[1,2,3,4].map(n=>(
            <div key={n} style={{
              flex:1,height:5,borderRadius:999,
              background: n<step?"var(--green)":n===step?"var(--blue-500)":"var(--ink-200)",
              transition:"background .25s"
            }}/>
          ))}
        </div>

        {/* Body */}
        <div style={{padding:"28px 28px 24px",minHeight:380,maxHeight:"60vh",overflowY:"auto"}}>
          {confirming ? (
            <div style={{textAlign:"center",padding:"40px 0"}}>
              <div style={{width:60,height:60,borderRadius:999,background:"var(--green-bg)",color:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
                <I.Check size={28}/>
              </div>
              <div className="serif" style={{fontSize:30,marginBottom:6}}>تم حجزك!</div>
              <div className="muted">Confirmation sent to {PATIENT_ME.phone} via واتساب.</div>
            </div>
          ) : step===1 ? (
            <div>
              <div className="serif" style={{fontSize:26,marginBottom:6}}>ما الذي يحضرك إلينا؟</div>
              <div className="muted" style={{fontSize:13.5,marginBottom:22}}>This helps us match you مع the right therapist.</div>

              <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:10}}>
                {[
                  { id:"continue", l:"متابعة my plan",     sub:`${PATIENT_ME.remaining} Sessions left · انزلاق غضروفي L4–L5`, ic:<I.Heart size={18}/>, primary:true },
                  { id:"new",      l:"مشكلة جديدة",            sub:"شيء جديد يضايقك",                                  ic:<I.Plus size={18}/> },
                  { id:"followup", l:"متابعة مع الطبيب", sub:"متابعة مع د. ياسمين عادل",                                   ic:<I.Stethoscope size={18}/> },
                  { id:"assess",   l:"تقييم أولي",   sub:"أول زيارة",                                                  ic:<I.Sparkle size={18}/> },
                ].map(o=>(
                  <button key={o.id} onClick={()=>{setPicks({...picks,reason:o.id}); next();}} style={{
                    padding:18,textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${picks.reason===o.id?"var(--blue-500)":"var(--ink-200)"}`,
                    background:picks.reason===o.id||o.primary?"var(--blue-50)":"#fff",
                    borderRadius:14,display:"flex",alignItems:"center",gap:14,transition:"all .15s"
                  }}>
                    <div style={{width:42,height:42,borderRadius:11,background:o.primary?"var(--blue-500)":"var(--blue-100)",color:o.primary?"#fff":"var(--blue-700)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {o.ic}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14}}>{o.l} {o.primary && <span className="badge b-blue" style={{marginLeft:4,fontSize:10}}>موصى به</span>}</div>
                      <div className="muted" style={{fontSize:12,marginTop:3}}>{o.sub}</div>
                    </div>
                    <I.ArrowRight size={14} style={{color:"var(--ink-400)"}}/>
                  </button>
                ))}
              </div>
            </div>
          ) : step===2 ? (
            <div>
              <div className="serif" style={{fontSize:26,marginBottom:6}}>من تود زيارته؟</div>
              <div className="muted" style={{fontSize:13.5,marginBottom:22}}>أخصائيك المعتاد أو شخص جديد — الخيار لك.</div>

              <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:10}}>
                {[
                  { name:"كريم صالح",  spec:"علاج يدوي",     yourUsual:true,  color:"#7BBDE8", rating:"4.9", nextSlot:"Tomorrow 09:00" },
                  { name:"لينا فاروق",  spec:"تأهيل بعد العمليات",      color:"#7E6BD3", rating:"4.8", nextSlot:"Tue 14:30" },
                  { name:"منى حلمي",   spec:"كبار السن / أعصاب",  color:"#3FA984", rating:"4.7", nextSlot:"Wed 11:00" },
                  { name:"أي أخصائي",spec:"الأقرب توفرًا",  color:"#BDD8E9", rating:"—",   nextSlot:"Today 16:30", any:true },
                ].map((t,i)=>(
                  <button key={i} onClick={()=>{setPicks({...picks,therapist:t.name}); next();}} style={{
                    padding:16,textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${picks.therapist===t.name?"var(--blue-500)":"var(--ink-200)"}`,
                    background: picks.therapist===t.name?"var(--blue-50)":"#fff",
                    borderRadius:14,display:"flex",alignItems:"center",gap:12,transition:"all .15s"
                  }}>
                    {t.any ? (
                      <div style={{width:44,height:44,borderRadius:12,background:"var(--ink-100)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-700)",flexShrink:0}}>
                        <I.Users size={18}/>
                      </div>
                    ) : (
                      <div className="av lg" style={{background:t.color+"33",color:t.color}}>{t.name.split(" ").map(x=>x[0]).join("")}</div>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontWeight:600,fontSize:14}}>{t.name}</span>
                        {t.yourUsual && <span className="badge b-blue" style={{fontSize:10}}>المعتاد</span>}
                      </div>
                      <div className="muted" style={{fontSize:11.5,marginTop:1}}>{t.spec} {t.rating!=="—" && <>· ★ {t.rating}</>}</div>
                      <div style={{fontSize:11.5,color:"var(--blue-700)",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                        <span className="dot" style={{background:"var(--blue-700)"}}></span>Next: {t.nextSlot}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : step===3 ? (
            <div>
              <div className="serif" style={{fontSize:26,marginBottom:6}}>ما الوقت المناسب لك؟</div>
              <div className="muted" style={{fontSize:13.5,marginBottom:22}}>Showing live availability for {picks.therapist}.</div>

              <div className="label">اختيار سريع</div>
              <div className="rgrid quarter-sm" style={{"--gtc":"repeat(4,1fr)",gap:8,marginBottom:18}}>
                {[
                  { l:"غدًا", sub:"25 مايو", slots:3 },
                  { l:"ثلا", sub:"26 مايو", slots:5 },
                  { l:"أرب", sub:"27 مايو", slots:2 },
                  { l:"خمي", sub:"28 مايو", slots:4 },
                  { l:"جمع", sub:"29 مايو", slots:6 },
                  { l:"سبت", sub:"30 مايو", slots:1 },
                  { l:"إثن", sub:"1 يونيو", slots:7 },
                  { l:"مخصص…", sub:"اختر تاريخًا", slots:0, custom:true },
                ].map(d=>{
                  const sel = picks.date.includes(d.sub);
                  return (
                    <button key={d.sub} onClick={()=>setPicks({...picks,date:`${d.l}, ${d.sub}`})} style={{
                      padding:"10px 6px",cursor:"pointer",fontFamily:"inherit",
                      border:`1px solid ${sel?"var(--blue-500)":"var(--ink-200)"}`,
                      background:sel?"var(--blue-500)":d.custom?"var(--ink-50)":"#fff",
                      color:sel?"#fff":"var(--ink-900)",borderRadius:10
                    }}>
                      <div style={{fontWeight:600,fontSize:13}}>{d.l}</div>
                      <div className="mono" style={{fontSize:10.5,opacity:.7}}>{d.sub}</div>
                      {!d.custom && <div style={{fontSize:10,marginTop:3,color:sel?"#fff":"var(--green)"}}>● {d.slots} slots</div>}
                    </button>
                  );
                })}
              </div>

              <div className="label">وقت</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["08:30","09:00","09:30","10:00","10:30","11:00","13:00","14:00","14:30","15:00","16:00","16:30"].map(t=>{
                  const unavail = ["09:30","14:30"].includes(t);
                  const sel = picks.time === t && !unavail;
                  return (
                    <button key={t} disabled={unavail} onClick={()=>setPicks({...picks,time:t})} style={{
                      padding:"8px 14px",fontFamily:"inherit",cursor:unavail?"not-allowed":"pointer",
                      border:`1px solid ${sel?"var(--blue-500)":unavail?"var(--ink-200)":"var(--ink-200)"}`,
                      background:sel?"var(--blue-500)":unavail?"var(--ink-100)":"#fff",
                      color:sel?"#fff":unavail?"var(--ink-300)":"var(--ink-900)",
                      textDecoration:unavail?"line-through":"none",
                      borderRadius:9,fontSize:13,fontWeight:500
                    }} className="mono">{t}</button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="serif" style={{fontSize:26,marginBottom:6}}>هل يبدو جيدًا؟</div>
              <div className="muted" style={{fontSize:13.5,marginBottom:22}}>مراجعة and confirm. You can reschedule or cancel up to 4 hours before.</div>

              <div style={{
                padding:20,
                background:"linear-gradient(135deg, var(--blue-50), #fff)",
                border:"1px solid var(--blue-100)",borderRadius:14,marginBottom:14
              }}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <div className="mono" style={{fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase",color:"var(--ink-500)",marginBottom:4}}>موعدك</div>
                    <div className="serif" style={{fontSize:30,lineHeight:1.05}}>{picks.date}</div>
                    <div className="mono" style={{fontSize:18,marginTop:4,color:"var(--blue-700)",fontWeight:600}}>{picks.time} · 45 minutes</div>
                  </div>
                  <I.Calendar size={28} style={{color:"var(--blue-500)"}}/>
                </div>
                <hr className="sep" style={{margin:"14px 0"}}/>
                <div className="rgrid half-sm" style={{"--gtc":"1fr 1fr",gap:12,fontSize:13}}>
                  <div>
                    <div className="muted" style={{fontSize:11}}>الأخصائي</div>
                    <div style={{fontWeight:500}}>{picks.therapist}</div>
                  </div>
                  <div>
                    <div className="muted" style={{fontSize:11}}>النوع</div>
                    <div style={{fontWeight:500}}>{picks.reason==="new"?"مشكلة جديدة assessment":picks.reason==="followup"?"الطبيب follow-up":picks.reason==="assess"?"تقييم أولي":"علاج يدوي"}</div>
                  </div>
                  <div>
                    <div className="muted" style={{fontSize:11}}>المكان</div>
                    <div style={{fontWeight:500}}>Kinetic مصر الجديدة · غرفة 2</div>
                  </div>
                  <div>
                    <div className="muted" style={{fontSize:11}}>التكلفة</div>
                    <div style={{fontWeight:500}}>{picks.reason==="continue" ? "من الباقة" : "EGP 850"}</div>
                  </div>
                </div>
              </div>

              <label style={{display:"flex",alignItems:"flex-start",gap:10,padding:14,background:"var(--ink-50)",borderRadius:10,fontSize:12.5,cursor:"pointer"}}>
                <input type="checkbox" defaultChecked style={{marginTop:2}}/>
                <span>Send me a واتساب reminder 24 hours before this visit at <span className="mono">{PATIENT_ME.phone}</span>.</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {!confirming && (
          <div style={{padding:"14px 24px",borderTop:"1px solid var(--ink-100)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",flexWrap:"wrap",gap:8}}>
            <button className="btn btn-ghost" onClick={step===1?onClose:()=>setStep(step-1)}>
              <I.ArrowLeft size={13}/> {step===1?"إلغاء":"رجوع"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              {step>=3 && (
                <span className="muted" style={{fontSize:12}}>
                  {picks.date} · {picks.time}
                </span>
              )}
              <button className="btn btn-blue" onClick={next} disabled={step===1 && !picks.reason}>
                {step<4 ? "متابعة" : "تأكيد الحجز"} <I.ArrowRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PatientPortal });


// ═══════════════════════════════════════════════════════════════
// PUBLIC BOOKING — no account, accessible from login screen
// ═══════════════════════════════════════════════════════════════

function PublicBookingScreen({ onBack, onDone }) {
  const [step, setStep] = React.useState(1); // 1..5
  const [picks, setPicks] = React.useState({
    reason: null,
    therapist: null,
    date: "الثلاثاء، 26 مايو",
    time: "10:00",
    name: "",
    phone: "",
    isExisting: null, // true / false / null
  });
  const [confirming, setConfirming] = React.useState(false);

  function update(k,v) { setPicks(p=>({...p,[k]:v})); }
  function next() {
    if (step < 5) { setStep(step+1); return; }
    setConfirming(true);
    setTimeout(()=>{ onDone(picks); }, 1400);
  }

  const stepsMeta = ["السبب","الأخصائي","التاريخ & time","بياناتك","التأكيد"];

  return (
    <div style={{minHeight:"100vh",background:"var(--blue-50)",display:"flex",flexDirection:"column"}}>
      {/* Top */}
      <header style={{background:"#fff",borderBottom:"1px solid var(--ink-200)",padding:"12px clamp(12px, 3vw, 24px)",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <I.Logo size={30}/>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1.1}}>
            <span style={{fontWeight:600,fontSize:15,letterSpacing:"-.01em"}}>Kinetic</span>
            <span style={{fontSize:10,color:"var(--ink-500)",letterSpacing:".06em",textTransform:"uppercase"}}>العلاج الطبيعي</span>
          </div>
        </div>
        <div style={{flex:1}}/>
        <span className="muted" style={{fontSize:13}}>تحتاج مساعدة؟ <a href="tel:+20226381100" style={{color:"var(--blue-700)",fontWeight:500}}>+20 2 2638 1100</a></span>
        <button className="btn btn-ghost" onClick={onBack}><I.X size={14}/> إغلاق</button>
      </header>

      <div style={{flex:1,display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"32px 20px 60px"}}>
        <div style={{width:"100%",maxWidth:780}}>
          {/* Hero copy */}
          {!confirming && (
            <div style={{textAlign:"center",marginBottom:28}}>
              <div className="muted" style={{fontSize:13,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>احجز زيارة</div>
              <div className="serif" style={{fontSize:"clamp(28px, 6.5vw, 44px)",lineHeight:1.05,letterSpacing:"-.01em",color:"var(--ink-900)",maxWidth:560,margin:"0 auto"}}>
                {step===1 && <>هيا بنا نعيدك إلى <em>الحركة</em> من جديد.</>}
                {step===2 && <>اختر من تود زيارته.</>}
                {step===3 && <>ما الوقت المناسب لك؟</>}
                {step===4 && <>آخر خطوة — كيف نتواصل معك؟</>}
                {step===5 && <>جاهز للتأكيد.</>}
              </div>
            </div>
          )}

          {/* Stepper */}
          {!confirming && (
            <div style={{display:"flex",gap:6,marginBottom:22,maxWidth:560,marginLeft:"auto",marginRight:"auto"}}>
              {stepsMeta.map((s,i)=>(
                <div key={i} style={{flex:1}}>
                  <div style={{
                    height:5,borderRadius:999,
                    background: i+1<step?"var(--green)":i+1===step?"var(--blue-500)":"var(--ink-200)",
                    transition:"background .25s"
                  }}/>
                  <div style={{
                    fontSize:10.5,letterSpacing:".02em",
                    color:i+1===step?"var(--ink-900)":"var(--ink-500)",
                    fontWeight:i+1===step?600:500,
                    textAlign:"center",marginTop:6,
                    textTransform:"uppercase"
                  }}>{s}</div>
                </div>
              ))}
            </div>
          )}

          {/* Card */}
          <div className="card" style={{padding:0,boxShadow:"0 20px 50px rgba(15,30,43,.06)",overflow:"hidden"}}>
            <div style={{padding:"clamp(18px, 4vw, 32px) clamp(14px, 4vw, 36px)",minHeight:380}}>

              {confirming && (
                <div style={{textAlign:"center",padding:"40px 0"}}>
                  <div style={{width:64,height:64,borderRadius:999,background:"var(--green-bg)",color:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px"}}>
                    <I.Check size={30}/>
                  </div>
                  <div className="serif" style={{fontSize:38,lineHeight:1.1,marginBottom:8}}>تم حجزك!</div>
                  <div className="muted" style={{fontSize:14,maxWidth:380,margin:"0 auto"}}>
                    A واتساب confirmation just went to <span className="mono">{picks.phone || "your phone"}</span> بكل التفاصيل.
                  </div>

                  <div style={{
                    marginTop:30, padding:18,
                    background:"linear-gradient(135deg, var(--blue-50), #fff)",
                    border:"1px solid var(--blue-100)",borderRadius:14,
                    maxWidth:380,margin:"30px auto 0",textAlign:"left"
                  }}>
                    <div className="muted" style={{fontSize:11,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>زيارتك</div>
                    <div className="serif" style={{fontSize:24,lineHeight:1.1}}>{picks.date}</div>
                    <div className="mono" style={{fontSize:16,color:"var(--blue-700)",fontWeight:600,marginTop:4}}>{picks.time}</div>
                    <hr className="sep" style={{margin:"12px 0"}}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:12.5}}>
                      <div><div className="muted" style={{fontSize:10.5}}>الأخصائي</div>{picks.therapist || "أي متاح"}</div>
                      <div><div className="muted" style={{fontSize:10.5}}>المكان</div>مصر الجديدة · غرفة 2</div>
                    </div>
                  </div>

                  <button className="btn btn-secondary" style={{marginTop:24}} onClick={onBack}>رجوع to home</button>
                </div>
              )}

              {/* STEP 1 — reason / new vs existing */}
              {!confirming && step===1 && (
                <div>
                  <div className="label" style={{marginBottom:10}}>ما الذي يحضرك إلينا؟</div>
                  <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:10}}>
                    {[
                      { id:"existing-pain",  l:"ألم أو إصابة موجودة", sub:"ظهر، رقبة، ركبة، كتف، إلخ.",      ic:<I.Heart size={18}/> },
                      { id:"post-op",        l:"التعافي بعد جراحة",  sub:"رباط صليبي، استبدال مفصل، إلخ.",          ic:<I.Activity size={18}/> },
                      { id:"sports",         l:"إصابة رياضية",           sub:"شدّ، التواء، العودة للنشاط",        ic:<I.Sparkle size={18}/> },
                      { id:"assess",         l:"تقييم فقط",      sub:"لست متأكدًا بعد — لنتحدث أولًا",        ic:<I.Stethoscope size={18}/> },
                    ].map(o=>(
                      <button key={o.id} onClick={()=>{update("reason",o.id); next();}} style={{
                        padding:18,textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                        border:`1px solid ${picks.reason===o.id?"var(--blue-500)":"var(--ink-200)"}`,
                        background:picks.reason===o.id?"var(--blue-50)":"#fff",
                        borderRadius:14,display:"flex",alignItems:"center",gap:14,transition:"all .15s"
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue-500)";}}
                        onMouseLeave={e=>{if(picks.reason!==o.id)e.currentTarget.style.borderColor="var(--ink-200)";}}
                      >
                        <div style={{width:44,height:44,borderRadius:12,background:"var(--blue-100)",color:"var(--blue-700)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {o.ic}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14}}>{o.l}</div>
                          <div className="muted" style={{fontSize:12,marginTop:3}}>{o.sub}</div>
                        </div>
                        <I.ArrowRight size={15} style={{color:"var(--ink-400)"}}/>
                      </button>
                    ))}
                  </div>

                  <div style={{marginTop:22,padding:14,background:"var(--ink-50)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13}}>
                      <I.User size={15} style={{color:"var(--ink-500)"}}/>
                      <span>هل أنت مريض حالي؟</span>
                    </div>
                    <div className="seg">
                      <button className={picks.isExisting===true?"on":""}  onClick={()=>update("isExisting",true)}>نعم</button>
                      <button className={picks.isExisting===false?"on":""} onClick={()=>update("isExisting",false)}>لا، أول مرة</button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 — therapist */}
              {!confirming && step===2 && (
                <div>
                  <div className="label" style={{marginBottom:10}}>اختر أخصائيًا</div>
                  <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:10}}>
                    {[
                      { name:"أي أخصائي",  spec:"أقرب موعد",        color:"#BDD8E9", rating:"—",   nextSlot:"Today 16:30", any:true, recommended:true },
                      ...DATA.therapists.map(t=>({ name:t.name, spec:t.spec, color:t.color, rating:"4.8", nextSlot:"Tomorrow 09:00" }))
                    ].map((t,i)=>(
                      <button key={i} onClick={()=>{update("therapist",t.any?null:t.name); next();}} style={{
                        padding:16,textAlign:"left",cursor:"pointer",fontFamily:"inherit",
                        border:`1px solid ${picks.therapist===(t.any?null:t.name)?"var(--blue-500)":"var(--ink-200)"}`,
                        background:picks.therapist===(t.any?null:t.name)?"var(--blue-50)":"#fff",
                        borderRadius:14,display:"flex",alignItems:"center",gap:12,transition:"all .15s"
                      }}>
                        {t.any ? (
                          <div style={{width:44,height:44,borderRadius:12,background:"var(--ink-100)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-700)",flexShrink:0}}>
                            <I.Users size={18}/>
                          </div>
                        ) : (
                          <div className="av lg" style={{background:t.color+"33",color:t.color}}>{t.name.split(" ").map(x=>x[0]).join("")}</div>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontWeight:600,fontSize:14}}>{t.name}</span>
                            {t.recommended && <span className="badge b-blue" style={{fontSize:10}}>الأسرع</span>}
                          </div>
                          <div className="muted" style={{fontSize:11.5,marginTop:1}}>{t.spec} {t.rating!=="—" && <>· ★ {t.rating}</>}</div>
                          <div style={{fontSize:11.5,color:"var(--blue-700)",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                            <span className="dot" style={{background:"var(--blue-700)"}}></span>Next: {t.nextSlot}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3 — date & time */}
              {!confirming && step===3 && (
                <div>
                  <div className="label" style={{marginBottom:10}}>اختر يومًا</div>
                  <div className="rgrid quarter-sm" style={{"--gtc":"repeat(7,1fr)",gap:6,marginBottom:22}}>
                    {[
                      { l:"غدًا", sub:"25 مايو", slots:3 },
                      { l:"ثلا", sub:"26 مايو", slots:5 },
                      { l:"أرب", sub:"27 مايو", slots:2 },
                      { l:"خمي", sub:"28 مايو", slots:4 },
                      { l:"جمع", sub:"29 مايو", slots:6 },
                      { l:"سبت", sub:"30 مايو", slots:1 },
                      { l:"إثن", sub:"1 يونيو", slots:7 },
                    ].map(d=>{
                      const sel = picks.date.includes(d.sub);
                      return (
                        <button key={d.sub} onClick={()=>update("date",`${d.l}, ${d.sub}`)} style={{
                          padding:"12px 4px",cursor:"pointer",fontFamily:"inherit",
                          border:`1px solid ${sel?"var(--blue-500)":"var(--ink-200)"}`,
                          background:sel?"var(--blue-500)":"#fff",
                          color:sel?"#fff":"var(--ink-900)",borderRadius:10
                        }}>
                          <div style={{fontWeight:600,fontSize:13}}>{d.l}</div>
                          <div className="mono" style={{fontSize:10.5,opacity:.7}}>{d.sub}</div>
                          <div style={{fontSize:10,marginTop:3,color:sel?"#fff":"var(--green)"}}>● {d.slots} slots</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="label" style={{marginBottom:10}}>اختر وقتًا</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {["08:30","09:00","09:30","10:00","10:30","11:00","13:00","14:00","14:30","15:00","16:00","16:30","17:00"].map(t=>{
                      const unavail = ["09:30","14:30"].includes(t);
                      const sel = picks.time === t && !unavail;
                      return (
                        <button key={t} disabled={unavail} onClick={()=>update("time",t)} style={{
                          padding:"10px 16px",fontFamily:"inherit",cursor:unavail?"not-allowed":"pointer",
                          border:`1px solid ${sel?"var(--blue-500)":"var(--ink-200)"}`,
                          background:sel?"var(--blue-500)":unavail?"var(--ink-100)":"#fff",
                          color:sel?"#fff":unavail?"var(--ink-300)":"var(--ink-900)",
                          textDecoration:unavail?"line-through":"none",
                          borderRadius:10,fontSize:13,fontWeight:500
                        }} className="mono">{t}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4 — contact info */}
              {!confirming && step===4 && (
                <div style={{maxWidth:480,margin:"0 auto"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr",gap:14}}>
                    <Field label="الاسم الكامل" required>
                      <input className="input" style={{height:44,fontSize:14}}
                        placeholder="مثال: آية حسن"
                        value={picks.name} onChange={e=>update("name",e.target.value)} autoFocus/>
                    </Field>
                    <Field label="الموبايل (واتساب)" required hint="سنرسل التأكيد والتذكيرات هنا.">
                      <input className="input" style={{height:44,fontSize:14}}
                        placeholder="+20 1XX XXX XXXX"
                        value={picks.phone} onChange={e=>update("phone",e.target.value)}/>
                    </Field>
                    {picks.isExisting === false && (
                      <Field label="باختصار، ما الذي يضايقك؟" hint="اختياري — يساعد الأخصائي على التحضير">
                        <textarea className="input" style={{height:72,padding:10,resize:"vertical"}}
                          placeholder="مثال: ألم أسفل الظهر منذ رفع أثقال بالجيم الأسبوع الماضي"/>
                      </Field>
                    )}
                    <label style={{display:"flex",alignItems:"flex-start",gap:10,padding:12,background:"var(--ink-50)",borderRadius:10,fontSize:12.5,cursor:"pointer"}}>
                      <input type="checkbox" defaultChecked style={{marginTop:2}}/>
                      <span>I agree to receive a واتساب confirmation and a reminder 24 hours before my visit.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 5 — confirm */}
              {!confirming && step===5 && (
                <div>
                  <div style={{
                    padding:24,
                    background:"linear-gradient(135deg, var(--blue-50), #fff)",
                    border:"1px solid var(--blue-100)",borderRadius:14,marginBottom:14
                  }}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
                      <div>
                        <div className="mono" style={{fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase",color:"var(--ink-500)",marginBottom:4}}>موعدك</div>
                        <div className="serif" style={{fontSize:36,lineHeight:1.05}}>{picks.date}</div>
                        <div className="mono" style={{fontSize:20,marginTop:6,color:"var(--blue-700)",fontWeight:600}}>{picks.time} · 45 minutes</div>
                      </div>
                      <I.Calendar size={30} style={{color:"var(--blue-500)"}}/>
                    </div>
                    <hr className="sep" style={{margin:"14px 0"}}/>
                    <div className="rgrid half-sm" style={{"--gtc":"1fr 1fr",gap:14,fontSize:13}}>
                      <div>
                        <div className="muted" style={{fontSize:11}}>الأخصائي</div>
                        <div style={{fontWeight:500}}>{picks.therapist || "أي متاح"}</div>
                      </div>
                      <div>
                        <div className="muted" style={{fontSize:11}}>السبب</div>
                        <div style={{fontWeight:500}}>{({
                          "existing-pain":"ألم أو إصابة موجودة",
                          "post-op":"التعافي بعد جراحة",
                          "sports":"إصابة رياضية",
                          "assess":"Assessment",
                        })[picks.reason] || "—"}</div>
                      </div>
                      <div>
                        <div className="muted" style={{fontSize:11}}>الاسم</div>
                        <div style={{fontWeight:500}}>{picks.name || <span className="muted">غير مزوّد</span>}</div>
                      </div>
                      <div>
                        <div className="muted" style={{fontSize:11}}>واتساب</div>
                        <div className="mono" style={{fontWeight:500}}>{picks.phone || <span className="muted">غير مزوّد</span>}</div>
                      </div>
                      <div>
                        <div className="muted" style={{fontSize:11}}>المكان</div>
                        <div style={{fontWeight:500}}>Kinetic مصر الجديدة · غرفة 2</div>
                      </div>
                      <div>
                        <div className="muted" style={{fontSize:11}}>التكلفة</div>
                        <div style={{fontWeight:500}}>850 ج.م — تُدفع بالعيادة</div>
                      </div>
                    </div>
                  </div>

                  <div style={{padding:14,background:"var(--green-bg)",border:"1px solid #BCE0D1",borderRadius:11,fontSize:12.5,color:"#2C8067",display:"flex",alignItems:"center",gap:10}}>
                    <I.Check size={15}/>
                    مجاناً لإعادة الجدولة أو الإلغاء قبل 4 ساعات من الزيارة.
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            {!confirming && (
              <div style={{padding:"14px 24px",borderTop:"1px solid var(--ink-100)",display:"flex",justifyContent:"space-between",background:"var(--ink-50)",flexWrap:"wrap",gap:8}}>
                <button className="btn btn-secondary" onClick={step===1?onBack:()=>setStep(step-1)}>
                  <I.ArrowLeft size={13}/> {step===1?"إلغاء":"رجوع"}
                </button>
                <button className="btn btn-blue" onClick={next}
                  disabled={(step===1 && !picks.reason) || (step===4 && (!picks.name || !picks.phone))}>
                  {step<5 ? "متابعة" : "تأكيد الحجز"} <I.ArrowRight size={13}/>
                </button>
              </div>
            )}
          </div>

          {/* Trust strip */}
          {!confirming && (
            <div style={{display:"flex",justifyContent:"center",gap:32,marginTop:24,flexWrap:"wrap"}}>
              {[
                { ic:<I.Check size={14}/>, t:"4.9 ★ from 1,400+ مريض" },
                { ic:<I.Lock size={14}/>,  t:"طبي-grade privacy" },
                { ic:<I.WhatsApp size={14}/>, t:"Confirmation بواسطة واتساب" },
              ].map((tr,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--ink-500)"}}>
                  <span style={{color:"var(--blue-700)"}}>{tr.ic}</span>{tr.t}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PublicBookingScreen });
