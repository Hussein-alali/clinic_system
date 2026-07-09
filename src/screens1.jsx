

// ===== src/dashboard.jsx =====
// Admin Dashboard

// ── File-local utilities ───────────────────────────────────────
function downloadCsv(rows, filename) {
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildWhatsAppUrl(phone, msg) {
  return `https://wa.me/${(phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg || "")}`;
}

function buildTelUrl(phone) {
  return `tel:${phone}`;
}

// ── Dashboard ─────────────────────────────────────────────────
// Shared palette for computed category charts.
const CHART_COLORS = ["#7BBDE8","#3A7FB5","#BDD8E9","#7E6BD3","#3FA984","#1E4A6E","#D49044"];
// Long Arabic date for page subtitles ("الأحد، 24 مايو").
function todayLabelAr() {
  try { return new Date().toLocaleDateString("ar-EG", { weekday:"long", day:"numeric", month:"long" }); }
  catch { return new Date().toISOString().slice(0,10); }
}
// Active branch name (settings-driven; falls back to a neutral label).
function activeBranchName() {
  const b = (window.BRANCHES || []).find(x => x.id === window.ACTIVE_BRANCH_ID) || (window.BRANCHES || [])[0];
  return (b && b.name) || "عيادتك";
}
const invoiceDateOf = (p) => String(p.date || p.created_at || "").slice(0, 10);
const fmtEGP = (v) => v >= 1000 ? `EGP ${(v/1000).toFixed(1)}K` : `EGP ${(v||0).toLocaleString()}`;

function Dashboard({ go }) {
  const [range, setRange] = React.useState("هذا الأسبوع");
  const patients = DATA.patients, appts = DATA.appts, payments = DATA.payments;
  const today = new Date().toISOString().slice(0,10);
  const month = today.slice(0,7);

  // Revenue per day — the latest 7 dates that actually have invoices.
  const revByDate = {};
  payments.forEach(p => { const d = invoiceDateOf(p); if (d) revByDate[d] = (revByDate[d]||0) + (p.paid||0); });
  const revenueData = Object.keys(revByDate).sort().slice(-7).map(d => ({ label:d.slice(5), v:revByDate[d] }));

  // Appointment volume per day (bookings without a date count as today).
  const apptByDate = {};
  appts.forEach(a => { const d = String(a.date || today).slice(0,10); apptByDate[d] = (apptByDate[d]||0)+1; });
  const apptData = Object.keys(apptByDate).sort().slice(-7).map(d => ({ label:d.slice(5), v:apptByDate[d] }));

  // Session-type mix from actual bookings.
  const typeCounts = {};
  appts.forEach(a => { if (a.type) typeCounts[a.type] = (typeCounts[a.type]||0)+1; });
  const methodsData = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).slice(0,4)
    .map(([label, v], i) => ({ label, v, color: CHART_COLORS[i] }));

  // Package uptake from the packages table.
  const packageData = DATA.packages.filter(p => p.active !== false).slice(0,5)
    .map((p, i) => ({ label:p.name, v:p.sold||0, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const booked = appts.filter(a => a.status !== "متاح");
  const confirmed = booked.filter(a => a.status !== "معلّق" && a.status !== "ملغي");
  const todaysPatients = new Set(booked.map(a => a.patient).filter(Boolean)).size;
  const todaysRevenue = payments.filter(p => invoiceDateOf(p) === today).reduce((s,p)=>s+(p.paid||0),0);
  const monthRevenue = payments.filter(p => invoiceDateOf(p).startsWith(month)).reduce((s,p)=>s+(p.paid||0),0);
  const outstanding = payments.reduce((s,p)=>s+Math.max(0,(p.amount||0)-(p.paid||0)),0);
  const remainTotal = patients.reduce((s,p)=>s+(p.remain||0),0);
  const weekAgo = new Date(Date.now()-7*864e5).toISOString().slice(0,10);
  const newThisWeek = patients.filter(p => (p.registered||"") >= weekAgo).length;
  const pendingPayments = payments.filter(p => p.status !== "مدفوع");

  // ── Handlers ──
  function handleExportCsv() {
    const rows = [
      "البيان,القيمة",
      `مرضى اليوم,${todaysPatients}`,
      `مواعيد اليوم,${booked.length}/${appts.length}`,
      `إيرادات اليوم,${todaysRevenue}`,
      `الإيرادات الشهرية,${monthRevenue}`,
      `مستحقات معلقة,${outstanding}`,
    ];
    downloadCsv(rows, "dashboard.csv");
    if (window.showToast) window.showToast("تم تصدير البيانات", "success");
  }

  return (
    <Page>
      <div className="page-head" style={{marginBottom:22}}>
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>لوحة التحكم</span></div>
          <div className="h1">صباح الخير{window.ME && window.ME.name ? `، ${window.ME.name.split(" ")[0]}` : ""} <span style={{display:"inline-block",transform:"translateY(-2px)"}}>👋🏼</span></div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{todayLabelAr()} — أداء {activeBranchName()} اليوم.</div>
        </div>
        <div className="page-actions">
          <div className="seg">
            {["اليوم","هذا الأسبوع","الشهر","الربع"].map(r=>(
              <button key={r} className={range===r?"on":""} onClick={()=>setRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={handleExportCsv}><I.Download size={14}/> تصدير</button>
          <button className="btn btn-blue" onClick={()=>go("appointments")}><I.Plus size={14}/> موعد جديد</button>
        </div>
      </div>

      {/* stat row */}
      <div className="grid-stats" style={{marginBottom:18}}>
        <StatCard label="مرضى اليوم"    value={String(todaysPatients)} accent="#7BBDE8" icon={<I.Users size={15}/>}/>
        <StatCard label="مواعيد اليوم" value={`${booked.length}/${appts.length}`} accent="#3A7FB5" icon={<I.Calendar size={15}/>}/>
        <StatCard label="إيرادات اليوم"   value={fmtEGP(todaysRevenue)} accent="#3FA984" icon={<I.Dollar size={15}/>}/>
        <StatCard label="الإيرادات الشهرية"   value={fmtEGP(monthRevenue)} accent="#7E6BD3" icon={<I.Chart size={15}/>}/>
        <StatCard label="الأخصائيون النشطون" value={`${DATA.therapists.length}/${DATA.therapists.length}`} accent="#D49044" icon={<I.Stethoscope size={15}/>}/>
        <StatCard label="الجلسات المتبقية" value={remainTotal.toLocaleString()} accent="#D8665A" icon={<I.Activity size={15}/>}/>
      </div>

      {/* main two cols */}
      <div className="rgrid c-lg" style={{"--gtc":"1.5fr 1fr",marginBottom:18}}>
        {/* Revenue */}
        <div className="card card-pad">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div>
              <div className="h2">اتجاه الإيرادات</div>
              <div className="muted" style={{fontSize:12.5,marginTop:2}}>آخر 7 أيام · ج.م</div>
            </div>
            <div style={{display:"flex",gap:14,fontSize:12}}>
              <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:9,height:9,borderRadius:3,background:"#7BBDE8"}}></span>نقدي + بطاقة</span>
              <span style={{display:"flex",alignItems:"center",gap:6,color:"var(--ink-500)"}}><span style={{width:9,height:9,borderRadius:3,background:"#BDD8E9"}}></span>الأسبوع الماضي</span>
            </div>
          </div>
          <AreaChart data={revenueData} height={220} formatY={(v)=>v>=1000?`${Math.round(v/1000)}K`:v}/>
        </div>

        {/* مواعيد اليوم */}
        <div className="card card-pad">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <div className="h2">جدول اليوم</div>
              <div className="muted" style={{fontSize:12.5,marginTop:2}}>{confirmed.length} من {booked.length} مؤكد</div>
            </div>
            <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>go("appointments")}>عرض التقويم <I.ArrowRight size={12}/></button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:268,overflowY:"auto"}}>
            {DATA.appts.length===0 && <div className="muted" style={{fontSize:13,padding:"24px 0",textAlign:"center"}}>لا مواعيد بعد.</div>}
            {DATA.appts.slice(0,6).map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",border:"1px solid var(--ink-200)",borderRadius:12,background:a.status==="قيد التنفيذ"?"var(--blue-50)":"#fff"}}>
                <div style={{textAlign:"center",minWidth:48}}>
                  <div className="mono" style={{fontSize:13,fontWeight:600}}>{a.time}</div>
                  <div className="mono" style={{fontSize:10,color:"var(--ink-400)"}}>{a.dur}m</div>
                </div>
                <div style={{width:1,height:30,background:"var(--ink-200)"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.patient}</div>
                  <div style={{fontSize:11.5,color:"var(--ink-500)"}}>{a.th} · {a.type || "—"}</div>
                </div>
                <ApptBadge s={a.status}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="rgrid half-lg c-sm" style={{"--gtc":"repeat(3,1fr)"}}>
        {/* Appointment trend */}
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:4}}>حجم المواعيد</div>
          <div className="muted" style={{fontSize:12.5,marginBottom:14}}>جلسات/يوم · آخر 7 أيام</div>
          <BarChart data={apptData} height={170}/>
        </div>

        {/* طرق العلاج */}
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:4}}>طرق العلاج</div>
          <div className="muted" style={{fontSize:12.5,marginBottom:14}}>نسبة الجلسات هذا الشهر</div>
          <DonutChart data={methodsData} size={150} centerLabel="الجلسات" centerValue="100%"/>
        </div>

        {/* حمل الأخصائيين */}
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:4}}>حمل الأخصائيين</div>
          <div className="muted" style={{fontSize:12.5,marginBottom:14}}>حجوزات اليوم</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {DATA.therapists.length===0 && <div className="muted" style={{fontSize:13,padding:"18px 0",textAlign:"center"}}>لا أخصائيين مسجّلين بعد.</div>}
            {DATA.therapists.map(t=>(
              <div key={t.name}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span className="av sm" style={{background:t.color+"33",color:t.color}}>{t.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</span>
                    <div>
                      <div style={{fontSize:12.5,fontWeight:500}}>{t.name}</div>
                      <div style={{fontSize:11,color:"var(--ink-500)"}}>{t.spec}</div>
                    </div>
                  </div>
                  <span className="mono" style={{fontSize:11.5,color:"var(--ink-700)"}}>{t.load}/{t.max}</span>
                </div>
                <div style={{height:5,background:"var(--ink-100)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${t.load/t.max*100}%`,background:t.color,borderRadius:999,transition:"width .3s"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* مرضى جدد */}
        <div className="card card-pad">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div className="h2">مرضى جدد</div>
              <div className="muted" style={{fontSize:12.5,marginTop:2}}>مسجّلون هذا الأسبوع</div>
            </div>
            <span className="badge b-blue">{newThisWeek} جديد</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {DATA.patients.length===0 && <div className="muted" style={{fontSize:13,padding:"18px 0",textAlign:"center"}}>لا مرضى مسجّلين بعد.</div>}
            {DATA.patients.slice(0,4).map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0"}}>
                <div className="av md">{p.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500}}>{p.name}</div>
                  <div style={{fontSize:11.5,color:"var(--ink-500)"}}>{p.diag}</div>
                </div>
                <button className="btn btn-ghost" style={{fontSize:11.5,padding:"4px 8px"}} onClick={()=>go("patients")}>فتح</button>
              </div>
            ))}
          </div>
        </div>

        {/* استخدام الباقات */}
        <div className="card card-pad">
          <div className="h2" style={{marginBottom:4}}>استخدام الباقات</div>
          <div className="muted" style={{fontSize:12.5,marginBottom:14}}>اشتراكات نشطة</div>
          <BarChart data={packageData} height={170}/>
        </div>

        {/* مدفوعات معلقة */}
        <div className="card card-pad">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div className="h2">مدفوعات معلقة</div>
              <div className="muted" style={{fontSize:12.5,marginTop:2}}>يحتاج متابعة</div>
            </div>
            <span className="badge b-amber"><span className="dot"></span>{fmtEGP(outstanding)}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {pendingPayments.length===0 && <div className="muted" style={{fontSize:13,padding:"18px 0",textAlign:"center"}}>لا مدفوعات معلقة.</div>}
            {pendingPayments.slice(0,4).map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:500}}>{p.patient}</div>
                  <div style={{fontSize:11,color:"var(--ink-500)"}} className="mono">{p.id} · {p.date}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="mono" style={{fontSize:12.5,fontWeight:600}}>EGP {(p.amount-p.paid).toLocaleString()}</div>
                  <PayBadge s={p.status}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}

// ── Reused badges ──────────────────────────────────────────────
function ApptBadge({ s }) {
  const map = {
    "معلّق":     { c:"b-amber",  d:"معلّق" },
    "مؤكد":   { c:"b-blue",   d:"مؤكد" },
    "مكتمل":   { c:"b-green",  d:"مكتمل" },
    "قيد التنفيذ": { c:"b-violet", d:"في الجلسة" },
    "ملغي":   { c:"b-red",    d:"ملغي" },
    "لم يحضر":     { c:"b-red",    d:"لم يحضر" },
    "متاح":   { c:"b-grey",   d:"موعد متاح" },
  };
  const m = map[s] || { c:"b-grey", d:s };
  return <span className={"badge " + m.c}><span className="dot"></span>{m.d}</span>;
}
function PayBadge({ s }) {
  const map = {
    "مدفوع":    { c:"b-green",  d:"مدفوع" },
    "جزئي": { c:"b-amber",  d:"جزئي" },
    "معلّق": { c:"b-grey",   d:"معلّق" },
    "متأخر": { c:"b-red",    d:"متأخر" },
  };
  const m = map[s] || { c:"b-grey", d:s };
  return <span className={"badge " + m.c}><span className="dot"></span>{m.d}</span>;
}

Object.assign(window, { Dashboard, ApptBadge, PayBadge, todayLabelAr, activeBranchName });


// ===== src/مريض.jsx =====
// المريض management — list, details, add/edit

function Patients({ go }) {
  // ── State ──
  const [view, setView] = React.useState("list"); // list | detail | add
  const [selected, setSelected] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("الكل");
  const [page, setPage] = React.useState(1);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [layout, setLayout] = React.useState("table"); // table | grid
  const csvRef = React.useRef(null);

  const myPatients = (window.scopePatients ? window.scopePatients(DATA.patients) : DATA.patients);
  const filtered = myPatients.filter(p => {
    if (statusFilter !== "الكل" && p.status !== statusFilter) return false;
    if (search && !(p.name + p.id + p.diag).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (view === "add") return <PatientAdd onCancel={()=>setView("list")} onSave={()=>setView("list")}/>;
  if (view === "detail" && selected) return <PatientDetail p={selected} onBack={()=>setView("list")} go={go} onEdit={()=>setView("add")}/>;

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>المرضى</span></div>
          <div className="h1">المرضى</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{myPatients.length} سجل · {myPatients.filter(p=>p.status==="نشط").length} نشط</div>
        </div>
        <div className="page-actions">
          <input ref={csvRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>{
            if(e.target.files[0]){if(window.showToast)window.showToast(`تم استيراد ${e.target.files[0].name}`,"success");}
            e.target.value="";
          }}/>
          <button className="btn btn-secondary" onClick={()=>csvRef.current&&csvRef.current.click()}><I.Upload size={14}/> استيراد CSV</button>
          <button className="btn btn-blue" onClick={()=>setView("add")}><I.Plus size={14}/> مريض جديد</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"1 1 320px",maxWidth:380}}>
          <I.Search size={14} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-400)"}}/>
          <input className="input" placeholder="ابحث بالاسم، رقم الملف، التشخيص…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:32}}/>
        </div>
        <div className="seg">
          {["الكل","نشط","غير نشط",INCOMPLETE_STATUS].map(s=>(
            <button key={s} className={statusFilter===s?"on":""} onClick={()=>setStatusFilter(s)}>{s===INCOMPLETE_STATUS?"غير مكتمل":s}</button>
          ))}
        </div>
        <button className="btn btn-secondary"><I.Filter size={13}/> 4 مرشحات</button>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <span className="muted" style={{fontSize:12}}>{filtered.length} نتيجة</span>
          <div className="seg">
            <button className={layout==="table"?"on":""} onClick={()=>setLayout("table")}>جدول</button>
            <button className={layout==="grid"?"on":""}  onClick={()=>setLayout("grid")}>بطاقات</button>
          </div>
        </div>
      </div>

      {layout==="table" ? (
        <div className="card" style={{overflow:"hidden"}}>
          <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:36}}><input type="checkbox"/></th>
                <th>المريض</th>
                <th>رقم الملف</th>
                <th>التشخيص</th>
                <th>الطبيب</th>
                <th>الأخصائي</th>
                <th>متبقي</th>
                <th>آخر زيارة</th>
                <th>الدفع</th>
                <th style={{width:90}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id} data-clickable="true" tabIndex={0} onClick={()=>{setSelected(p);setView("detail")}} onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(p);setView("detail");} }}>
                  <td onClick={e=>e.stopPropagation()}><input type="checkbox"/></td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div className="av md">{p.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                      <div>
                        <div style={{fontWeight:500}}>{p.name}</div>
                        <div style={{fontSize:11.5,color:"var(--ink-500)"}}>{p.age} · {p.gender} · {p.job}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{fontSize:12.5,color:"var(--ink-700)"}}>{p.id}</td>
                  <td><span style={{fontSize:12.5}}>{p.diag}</span></td>
                  <td><span style={{fontSize:12.5}}>{p.dr}</span></td>
                  <td><span style={{fontSize:12.5}}>{p.th}</span></td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span className="mono" style={{fontSize:12.5,fontWeight:600,minWidth:18,textAlign:"right"}}>{p.remain ?? "—"}</span>
                      <div style={{flex:1,maxWidth:60,height:4,background:"var(--ink-100)",borderRadius:999,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${Math.min(100,(p.remain||0)/12*100)}%`,background:"var(--blue-500)"}}/>
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{fontSize:12.5}}>{p.visited}</td>
                  <td><PayBadge s={p.payment}/></td>
                  <td onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon" onClick={()=>{setSelected(p);setView("detail")}}><I.Eye size={14}/></button>
                    <button className="btn btn-ghost btn-icon" onClick={()=>{setSelected(p);setView("add");}}><I.Edit size={14}/></button>
                    <button className="btn btn-ghost btn-icon" onClick={()=>setConfirmDelete(p)} style={{color:"var(--red)"}}><I.Trash size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {/* footer */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderTop:"1px solid var(--ink-100)",background:"var(--ink-50)",flexWrap:"wrap",gap:10}}>
            <span className="muted" style={{fontSize:12}}>عرض 1–{filtered.length} من {myPatients.length}</span>
            <div style={{display:"flex",gap:6}}>
              {Array.from({length: Math.max(1, Math.ceil(filtered.length/25))},(_,i)=>i+1).slice(0,8).map(n=>(
                <button key={n} className={"btn " + (page===n?"btn-primary":"btn-secondary")} style={{padding:"5px 11px",minWidth:32}} onClick={()=>setPage(n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid-4">
          {filtered.map(p => (
            <div key={p.id} className="card" style={{padding:18,cursor:"pointer"}} onClick={()=>{setSelected(p);setView("detail")}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div className="av lg">{p.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p.name}</div>
                  <div className="mono" style={{fontSize:11,color:"var(--ink-500)"}}>{p.id}</div>
                </div>
                <PayBadge s={p.payment}/>
              </div>
              <div style={{padding:"10px 12px",background:"var(--ink-50)",borderRadius:10,fontSize:12,marginBottom:10}}>
                <div style={{color:"var(--ink-500)",fontSize:10.5,textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>التشخيص</div>
                <div>{p.diag}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <div>
                  <div className="muted" style={{fontSize:10.5}}>الأخصائي</div>
                  <div>{p.th}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="muted" style={{fontSize:10.5}}>متبقي</div>
                  <div className="mono">{p.remain} Sessions</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* delete modal */}
      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="حذف سجل المريض؟"
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setConfirmDelete(null)}>إلغاء</button>
          <button className="btn" style={{background:"var(--red)",color:"#fff"}} onClick={async()=>{
            const target = confirmDelete;
            if (!target) return;
            setConfirmDelete(null);
            try {
              const pid = target.patient_id || target.id;
              if (window.KineticData) await window.KineticData.remove("patients", pid);
              if (window.showToast) window.showToast("تم حذف المريض", "success");
            } catch (e) {
              console.warn("delete patient failed", e);
              if (window.showToast) window.showToast("تعذّر الحذف", "error");
            }
          }}>حذف نهائي</button>
        </>}>
        <p>أنت على وشك حذف <strong>{confirmDelete?.name}</strong> ({confirmDelete?.id}). This will remove all Sessions, invoices and uploads associated مع this patient.</p>
        <p className="muted" style={{fontSize:12.5,marginTop:8}}>لا يمكن التراجع عن هذا الإجراء. فكّر في أرشفة المريض بدلًا من حذفه.</p>
      </Modal>
    </Page>
  );
}

// ── PatientDetail ──────────────────────────────────────────────
function PatientDetail({ p, onBack, go, onEdit }) {
  const [tab, setTab] = React.useState("نظرة عامة");
  // Real per-patient figures (production rows carry no seed metadata).
  const pid = p.patient_id || p.id;
  const mySessions = DATA.sessions.filter(s => s.patient_id === pid || s.patient === p.name);
  const pkgTotal = Number(((p.pkg || "").match(/(\d+)/) || [])[1]) || 12;
  const doneSessions = p.remain != null ? Math.max(0, pkgTotal - p.remain) : mySessions.length;
  const nextAppt = DATA.appts.find(a => (a.pid === pid || a.patient === p.name) && a.status !== "مكتمل" && a.status !== "ملغي");
  const avgPain = mySessions.length
    ? (mySessions.reduce((s, x) => s + (x.pain ?? x.pain_score ?? 0), 0) / mySessions.length).toFixed(1)
    : null;
  return (
    <Page>
      <div className="crumb" style={{cursor:"pointer"}} onClick={onBack}>
        <span>المرضى</span><I.Chevron size={11}/><span style={{color:"var(--ink-700)"}}>{p.name}</span>
      </div>

      {p.status === INCOMPLETE_STATUS && (
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",marginTop:8,
          background:"#FBF3E6",border:"1px solid #F0D9A8",borderRadius:12,color:"#8A5A00"}}>
          <I.Bell size={16}/>
          <div style={{flex:1,fontSize:13,fontWeight:500}}>معلومات المريض غير مكتملة — أُنشئ هذا الملف عبر الحجز السريع. أكمل البيانات الناقصة.</div>
          {onEdit && <button className="btn btn-secondary" style={{fontSize:12}} onClick={onEdit}>إكمال البيانات</button>}
        </div>
      )}

      <div className="rgrid c-lg" style={{"--gtc":"1fr 340px",gap:24,marginTop:8}}>
        <div>
          {/* hero */}
          <div className="card" style={{padding:24,display:"flex",alignItems:"flex-start",gap:18,marginBottom:18,position:"relative",overflow:"hidden",flexWrap:"wrap"}}>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(120deg, var(--blue-100), transparent 60%)",opacity:.7,pointerEvents:"none"}}/>
            <div className="av lg" style={{width:64,height:64,fontSize:22,background:"var(--blue-500)",color:"#fff",position:"relative"}}>
              {p.name.split(" ").map(x=>x[0]).join("").slice(0,2)}
            </div>
            <div style={{flex:1,position:"relative",minWidth:220}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <h1 className="h1" style={{fontSize:24}}>{p.name}</h1>
                <span className={"badge " + (p.status===INCOMPLETE_STATUS?"b-amber":"b-green")}><span className="dot"></span>{p.status}</span>
                <span className="mono" style={{fontSize:11,color:"var(--ink-500)",border:"1px solid var(--ink-200)",padding:"2px 8px",borderRadius:6}}>{p.id}</span>
              </div>
              <div style={{display:"flex",gap:"8px 18px",marginTop:8,fontSize:12.5,color:"var(--ink-500)",flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:6}}><I.User size={13}/> {p.age} y · {p.gender==="F"?"Female":"Male"}</span>
                <span style={{display:"flex",alignItems:"center",gap:6}}><I.Phone size={13}/> {p.phone}</span>
                <span style={{display:"flex",alignItems:"center",gap:6}}><I.MapPin size={13}/> {p.address || "—"}</span>
                <span style={{display:"flex",alignItems:"center",gap:6}}><I.Clock size={13}/> Reg. {p.registered}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8,position:"relative",flexWrap:"wrap"}}>
              <button className="btn btn-secondary" onClick={()=>window.open(buildTelUrl(p.phone))}><I.Phone size={13}/> اتصال</button>
              <button className="btn btn-secondary" onClick={()=>window.open(buildWhatsAppUrl(p.phone, `مرحبًا+${p.name}`),"_blank")}><I.WhatsApp size={13}/> واتساب</button>
              <button className="btn btn-blue" onClick={()=>go("appointments")}><I.Plus size={13}/> حجز</button>
              <RowMenu size={15} items={[
                { label:"طباعة الملف", icon:<I.Print size={13}/>, onClick:()=>window.print() },
                { label:"تصدير CSV", icon:<I.Download size={13}/>, onClick:()=>{
                  const rows=["ID,الاسم,الهاتف,العمر,التشخيص,الحالة",`${p.id},${p.name},${p.phone},${p.age},${p.diag||""},${p.status||""}`];
                  const blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8;"});
                  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${p.id}.csv`;a.click();URL.revokeObjectURL(url);
                  if(window.showToast)window.showToast("تم تصدير الملف","success");
                }},
                { label:"إرسال واتساب", icon:<I.WhatsApp size={13}/>, onClick:()=>window.open(buildWhatsAppUrl(p.phone, `مرحبًا+${p.name}`),"_blank") },
                { label:"حذف المريض", icon:<I.X size={13}/>, danger:true, onClick:async ()=>{
                  if (!window.confirm(`حذف ملف ${p.name}؟ لا يمكن التراجع.`)) return;
                  try {
                    if (window.KineticData) await window.KineticData.remove("patients", p.patient_id || p.id);
                    if (window.showToast) window.showToast("تم حذف المريض","success");
                    onBack && onBack();
                  } catch (e) { console.warn("delete patient failed", e); if (window.showToast) window.showToast("تعذّر الحذف","error"); }
                }},
              ]}/>
            </div>
          </div>

          {/* tabs */}
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="stepper" style={{borderBottom:"1px solid var(--ink-200)",padding:"0 18px",gap:4}}>
              {["نظرة عامة","السجل","خطة العلاج","الجلسات","الملفات","الفواتير"].map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{
                  border:"none",background:"transparent",padding:"14px 12px",
                  fontSize:13,fontWeight:500,whiteSpace:"nowrap",flexShrink:0,
                  color: tab===t?"var(--ink-900)":"var(--ink-500)",
                  borderBottom: tab===t?"2px solid var(--blue-500)":"2px solid transparent",
                  cursor:"pointer", textTransform:"capitalize"
                }}>{t}</button>
              ))}
            </div>

            <div style={{padding:22}}>
              {tab==="نظرة عامة" && <PatientOverview p={p}/>}
              {tab==="السجل" && <PatientHistory p={p}/>}
              {tab==="خطة العلاج" && <PatientTreatmentPlan p={p}/>}
              {tab==="الجلسات" && <SessionTimeline mini p={p}/>}
              {tab==="الملفات" && <PatientFiles p={p}/>}
              {tab==="الفواتير" && <PatientInvoices p={p}/>}
            </div>
          </div>
        </div>

        {/* aside */}
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <div className="card card-pad">
            <div className="h3" style={{marginBottom:12}}>تقدّم العلاج</div>
            <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
              <span className="mono" style={{fontSize:32,fontWeight:600}}>{doneSessions}</span>
              <span className="muted">من {pkgTotal} Sessions</span>
            </div>
            <div style={{height:8,background:"var(--ink-100)",borderRadius:999,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100, doneSessions/pkgTotal*100)}%`,background:"linear-gradient(90deg, var(--blue-500), var(--blue-700))",borderRadius:999}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:14,fontSize:12}}>
              <div><div className="muted">الجلسة القادمة</div><div style={{fontWeight:500}}>{nextAppt ? `${nextAppt.date || "اليوم"} ${nextAppt.time || ""}` : "—"}</div></div>
              <div style={{textAlign:"right"}}><div className="muted">الألم (متوسط)</div><div className="mono">{avgPain != null ? `${avgPain} / 10` : "—"}</div></div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="h3" style={{marginBottom:12}}>البيانات الطبية</div>
            <InfoRow k="الشكوى الرئيسية" v={p.chief || "—"}/>
            <InfoRow k="التشخيص" v={p.diag || "—"}/>
            <InfoRow k="أمراض مزمنة" v={p.chronic.length ? p.chronic.join(", ") : "—"}/>
            <InfoRow k="العمليات" v={p.surgeries.length ? p.surgeries.join(", ") : "لا يوجد"}/>
          </div>

          <div className="card card-pad">
            <div className="h3" style={{marginBottom:12}}>فريق الرعاية</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div className="av md" style={{background:"#7E6BD333",color:"#7E6BD3"}}>{initialsOf(p.dr) || "—"}</div>
              <div><div style={{fontSize:13,fontWeight:500}}>{p.dr || "—"}</div><div className="muted" style={{fontSize:11.5}}>الطبيب المسؤول</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div className="av md" style={{background:"var(--blue-100)",color:"var(--blue-700)"}}>{initialsOf(p.th) || "—"}</div>
              <div><div style={{fontSize:13,fontWeight:500}}>{p.th || "—"}</div><div className="muted" style={{fontSize:11.5}}>الأخصائي الأساسي</div></div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="h3" style={{marginBottom:12}}>إجراءات سريعة</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button className="btn btn-secondary" style={{justifyContent:"flex-start"}} onClick={()=>window.print()}><I.FileText size={14}/> إنشاء تقرير تقدّم</button>
              <button className="btn btn-secondary" style={{justifyContent:"flex-start"}} onClick={()=>window.open(buildWhatsAppUrl(p.phone, `تذكير+موعدك+غدًا+الساعة+09:00`),"_blank")}><I.Send size={14}/> إرسال تذكير</button>
              <button className="btn btn-secondary" style={{justifyContent:"flex-start"}} onClick={()=>{
                const rows = ["الاسم,رقم الملف,التشخيص,الطبيب,الأخصائي", `${p.name},${p.id},${p.diag},${p.dr},${p.th}`];
                downloadCsv(rows, `patient-${p.id}.csv`);
                if (window.showToast) window.showToast("تم تصدير السجل الطبي", "success");
              }}><I.Download size={14}/> تصدير السجل الطبي</button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function InfoRow({ k, v }) {
  return (
    <div style={{display:"grid",gridTemplateColumns:"112px 1fr",gap:8,padding:"7px 0",borderBottom:"1px dashed var(--ink-100)",fontSize:12.5}}>
      <span className="muted">{k}</span>
      <span style={{color:"var(--ink-900)"}}>{v}</span>
    </div>
  );
}

function PatientOverview({ p }) {
  return (
    <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr"}}>
      <div>
        <div className="h3" style={{marginBottom:10}}>البيانات الشخصية</div>
        <InfoRow k="رقم الملف" v={<span className="mono">{p.id}</span>}/>
        <InfoRow k="الاسم الكامل" v={p.name}/>
        <InfoRow k="الهاتف" v={p.phone}/>
        <InfoRow k="العمر" v={`${p.age} years`}/>
        <InfoRow k="الجنس" v={p.gender==="F"?"Female":"Male"}/>
        <InfoRow k="المهنة" v={p.job}/>
        <InfoRow k="العنوان" v={p.address || "—"}/>
        <InfoRow k="تاريخ التسجيل" v={p.registered}/>
      </div>
      <div>
        <div className="h3" style={{marginBottom:10}}>اللمحة السريرية</div>
        <div style={{padding:14,background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:12,marginBottom:14}}>
          <div className="serif" style={{fontSize:18,lineHeight:1.4,color:"var(--ink-900)"}}>"{p.chief || p.diag || "—"}"</div>
          <div className="muted" style={{fontSize:11.5,marginTop:6}}>الشكوى الرئيسية / التشخيص</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {(() => {
            // Real per-patient metrics only — no fabricated clinical numbers.
            const pid = p.patient_id || p.id;
            const sess = DATA.sessions.filter(s => s.patient_id === pid || s.patient === p.name);
            const latest = sess[0];
            return [
              {l:"مستوى الألم (آخر جلسة)", v: latest ? `${latest.pain ?? latest.pain_score ?? "—"}/10` : "—", sub: latest ? latest.date : "لا جلسات بعد"},
              {l:"جلسات مسجلة", v: String(sess.length), sub: sess.length ? `آخرها ${latest.date}` : "—"},
              {l:"آخر زيارة", v: p.visited && p.visited !== "—" ? p.visited : (latest ? latest.date : "—"), sub: ""},
              {l:"الحالة", v: p.status || "—", sub: p.payment && p.payment !== "—" ? `الدفع: ${p.payment}` : ""},
            ];
          })().map((m,i)=>(
            <div key={i} style={{padding:12,border:"1px solid var(--ink-200)",borderRadius:10}}>
              <div className="muted" style={{fontSize:11}}>{m.l}</div>
              <div className="mono" style={{fontSize:18,fontWeight:600,marginTop:2}}>{m.v}</div>
              <div style={{fontSize:11,color:"var(--green)"}}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatientHistory({ p }) {
  // Timeline built from the patient's real records: logged sessions +
  // the registration event. No fabricated entries.
  const pid = p ? (p.patient_id || p.id) : null;
  const sess = p ? DATA.sessions.filter(s => s.patient_id === pid || s.patient === p.name) : [];
  const events = sess.map(s => ({
    date: s.date || "",
    type: "جلسة",
    title: `الجلسة #${s.session ?? s.session_number ?? "—"}`,
    by: s.therapist || "—",
    body: s.notes || s.session_notes || "",
  }));
  if (p && (p.registered || p.created_at)) {
    events.push({
      date: p.registered || String(p.created_at).slice(0, 10),
      type: "booking",
      title: "تسجيل المريض",
      by: "الاستقبال",
      body: p.notes || "",
    });
  }
  events.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (events.length === 0) {
    return <EmptyState icon={<I.Clock size={22}/>} title="لا سجل بعد" body="سيظهر السجل الزمني هنا بعد تسجيل الجلسات."/>;
  }
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div className="h3">السجل الزمني</div>
        <div className="seg">
          <button className="on">الكل</button>
          <button>الجلسات</button>
          <button>ملاحظات</button>
          <button>الملفات</button>
        </div>
      </div>
      <div style={{position:"relative",paddingLeft:24}}>
        <div style={{position:"absolute",left:9,top:8,bottom:8,width:2,background:"var(--ink-100)"}}/>
        {events.map((e,i)=>{
          const dotColor = e.type==="جلسة"?"var(--blue-500)":e.type==="intake"?"var(--green)":e.type==="booking"?"var(--violet)":"var(--amber)";
          return (
            <div key={i} style={{position:"relative",paddingBottom:18}}>
              <div style={{position:"absolute",left:-19,top:5,width:14,height:14,borderRadius:999,background:dotColor,border:"3px solid #fff",boxShadow:"0 0 0 1px var(--ink-200)"}}/>
              <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:3}}>
                <span style={{fontWeight:600,fontSize:13.5}}>{e.title}</span>
                <span className="muted mono" style={{fontSize:11}}>{e.date}</span>
              </div>
              <div className="muted" style={{fontSize:12.5,marginBottom:3}}>بواسطة {e.by}</div>
              <div style={{fontSize:13,color:"var(--ink-700)"}}>{e.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientTreatmentPlan({ p }) {
  // Initialized from the patient's real record; goals/modalities start
  // empty and are filled in by the clinician (editable below).
  const [plan, setPlan] = React.useState(() => {
    const th = p && p.th && p.th !== "—" ? p.th : "";
    const thRow = (DATA.therapists || []).find(t => t.name === th);
    const total = Number(((p && p.pkg || "").match(/(\d+)/) || [])[1]) || 0;
    return {
      goals: [],
      modalities: [],
      notes: (p && p.notes) || "",
      therapist: { initials: th ? initialsOf(th) : "—", name: th || "—", spec: (thRow && thRow.spec) || "" },
      diagnosis: (p && (p.diag || p.diagnosis)) || "—",
      schedule: { frequency: "—", duration: "—", total },
    };
  });
  const [editing, setEditing] = React.useState(null);

  function toggleGoal(i) {
    setPlan(p => ({ ...p, goals: p.goals.map((g,idx)=> idx===i ? {...g, done:!g.done} : g) }));
  }
  function openEditor() {
    setEditing(JSON.parse(JSON.stringify(plan)));
  }
  function saveEditor() {
    const clean = {
      ...editing,
      goals: editing.goals.map(g => ({ ...g, g: g.g.trim() })).filter(g => g.g),
      modalities: editing.modalities.map(m => m.trim()).filter(Boolean),
      schedule: { ...editing.schedule, total: Number(editing.schedule.total) || 0 },
    };
    setPlan(clean);
    setEditing(null);
    if (window.showToast) window.showToast("تم حفظ خطة العلاج","success");
  }

  return (
    <div>
      <div className="h3" style={{marginBottom:14}}>خطة العلاج النشطة</div>
      <div className="rgrid c-lg" style={{"--gtc":"1.4fr 1fr"}}>
        <div>
          <div className="label">أهداف الخطة</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
            {plan.goals.length===0 && <div className="muted" style={{fontSize:12.5,padding:"6px 0"}}>لا أهداف بعد — أضفها من «تعديل الخطة».</div>}
            {plan.goals.map((g,i)=>(
              <label key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",border:"1px solid var(--ink-200)",borderRadius:10,fontSize:13,cursor:"pointer"}}>
                <input type="checkbox" checked={g.done} onChange={()=>toggleGoal(i)}/>
                <span style={{flex:1,textDecoration:g.done?"line-through":"none",color:g.done?"var(--ink-500)":"var(--ink-900)"}}>{g.g}</span>
              </label>
            ))}
          </div>

          <div className="label">طرق العلاج</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {plan.modalities.length===0 && <span className="muted" style={{fontSize:12.5}}>—</span>}
            {plan.modalities.map(m=>(
              <span key={m} className="pill tag-blue">{m}</span>
            ))}
          </div>

          <div className="label">ملاحظات</div>
          <div style={{padding:14,background:"var(--ink-50)",borderRadius:12,fontSize:13,lineHeight:1.55,whiteSpace:"pre-wrap"}}>
            {plan.notes || "—"}
          </div>
        </div>
        <div>
          <div className="label">الأخصائي</div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:12,border:"1px solid var(--ink-200)",borderRadius:10,marginBottom:14}}>
            <div className="av md" style={{background:"var(--blue-100)",color:"var(--blue-700)"}}>{plan.therapist.initials}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500}}>{plan.therapist.name}</div>
              <div className="muted" style={{fontSize:11.5}}>{plan.therapist.spec}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={openEditor} aria-label="تعديل"><I.Edit size={13}/></button>
          </div>

          <div className="label">التشخيص</div>
          <div style={{padding:12,border:"1px solid var(--ink-200)",borderRadius:10,fontSize:13,marginBottom:14}}>{plan.diagnosis}</div>

          <div className="label">الجدولة</div>
          <div style={{padding:14,border:"1px solid var(--ink-200)",borderRadius:10,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,marginBottom:6}}>
              <span className="muted">التكرار</span><span>{plan.schedule.frequency}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5,marginBottom:6}}>
              <span className="muted">المدة</span><span>{plan.schedule.duration}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12.5}}>
              <span className="muted">الإجمالي Sessions</span><span className="mono">{plan.schedule.total}</span>
            </div>
          </div>

          <button className="btn btn-blue" style={{width:"100%",justifyContent:"center"}} onClick={openEditor}>
            <I.Edit size={13}/> تعديل treatment plan
          </button>
        </div>
      </div>

      {editing && (
        <Modal title="تعديل خطة العلاج" onClose={()=>setEditing(null)} width={640}
          footer={<>
            <button className="btn btn-ghost" onClick={()=>setEditing(null)}>إلغاء</button>
            <button className="btn btn-blue" onClick={saveEditor}><I.Check size={13}/> حفظ</button>
          </>}>
          <Field label="التشخيص">
            <input className="input" value={editing.diagnosis} onChange={e=>setEditing({...editing, diagnosis:e.target.value})}/>
          </Field>

          <div style={{height:14}}/>
          <div className="label">أهداف الخطة</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:6}}>
            {editing.goals.map((g,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="checkbox" checked={g.done}
                  onChange={()=>setEditing({...editing, goals: editing.goals.map((x,ix)=> ix===i ? {...x, done:!x.done} : x)})}/>
                <input className="input" value={g.g} placeholder="اكتب هدفًا…"
                  onChange={e=>setEditing({...editing, goals: editing.goals.map((x,ix)=> ix===i ? {...x, g:e.target.value} : x)})}/>
                <button className="btn btn-ghost btn-icon" aria-label="حذف"
                  onClick={()=>setEditing({...editing, goals: editing.goals.filter((_,ix)=>ix!==i)})}>
                  <I.Trash size={13}/>
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" style={{marginBottom:14}}
            onClick={()=>setEditing({...editing, goals:[...editing.goals, {g:"", done:false}]})}>
            <I.Plus size={13}/> إضافة هدف
          </button>

          <div className="label">طرق العلاج</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {editing.modalities.map((m,i)=>(
              <span key={i} className="pill tag-blue" style={{gap:4}}>
                {m}
                <button type="button" onClick={()=>setEditing({...editing, modalities: editing.modalities.filter((_,ix)=>ix!==i)})}
                  style={{background:"none",border:"none",color:"inherit",cursor:"pointer",padding:0,display:"inline-flex"}} aria-label="إزالة">
                  <I.X size={12}/>
                </button>
              </span>
            ))}
          </div>
          <ModalityAdder onAdd={m=>setEditing({...editing, modalities:[...editing.modalities, m]})}/>

          <div style={{height:14}}/>
          <div className="rgrid c-sm" style={{"--gtc":"repeat(3,1fr)",gap:10}}>
            <Field label="التكرار"><input className="input" value={editing.schedule.frequency}
              onChange={e=>setEditing({...editing, schedule:{...editing.schedule, frequency:e.target.value}})}/></Field>
            <Field label="المدة"><input className="input" value={editing.schedule.duration}
              onChange={e=>setEditing({...editing, schedule:{...editing.schedule, duration:e.target.value}})}/></Field>
            <Field label="الإجمالي Sessions"><input className="input" type="number" min="0" value={editing.schedule.total}
              onChange={e=>setEditing({...editing, schedule:{...editing.schedule, total:e.target.value}})}/></Field>
          </div>

          <div style={{height:14}}/>
          <Field label="ملاحظات">
            <textarea className="input" rows={4} style={{padding:10,resize:"vertical"}}
              value={editing.notes} onChange={e=>setEditing({...editing, notes:e.target.value})}/>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function ModalityAdder({ onAdd }) {
  const [v, setV] = React.useState("");
  function submit(){
    const t = v.trim();
    if (!t) return;
    onAdd(t);
    setV("");
  }
  return (
    <div style={{display:"flex",gap:6}}>
      <input className="input" placeholder="أضف طريقة علاج…" value={v}
        onChange={e=>setV(e.target.value)}
        onKeyDown={e=>{ if (e.key==="Enter") { e.preventDefault(); submit(); } }}/>
      <button className="btn btn-secondary" onClick={submit}><I.Plus size={13}/></button>
    </div>
  );
}

// Patient documents — backed by the normalized `patient_files` table via
// window.listPatientFiles / uploadPatientFile (Supabase Storage + LS fallback).
function PatientFiles({ p }) {
  const pid = (p && (p.patient_id || p.id)) || null;
  const fileRef = React.useRef(null);
  const [files, setFiles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!pid) { setFiles([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const rows = window.listPatientFiles ? await window.listPatientFiles(pid) : [];
      setFiles(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.warn("load patient files failed", e);
      setError("تعذّر تحميل الملفات");
    } finally { setLoading(false); }
  }, [pid]);

  React.useEffect(() => { reload(); }, [reload]);
  React.useEffect(() => {
    const h = () => reload();
    window.addEventListener("kinetic:patient-files-updated", h);
    return () => window.removeEventListener("kinetic:patient-files-updated", h);
  }, [reload]);

  async function handleUpload(e) {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    if (!list.length || !pid) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const f of list) {
        if (window.uploadPatientFile) { await window.uploadPatientFile(pid, f); ok++; }
      }
      if (window.showToast) window.showToast(`تم رفع ${ok} ملف`, "success");
    } catch (err) {
      console.warn("upload failed", err);
      if (window.showToast) window.showToast("تعذّر رفع الملف", "error");
    } finally { setUploading(false); reload(); }
  }

  function openFile(f) {
    if (f.file_url) { window.open(f.file_url, "_blank"); return; }
    if (window.showToast) window.showToast("لا يوجد ملف متاح للعرض", "error");
  }
  function downloadFile(f) {
    if (!f.file_url) { if (window.showToast) window.showToast("لا يوجد ملف للتنزيل", "error"); return; }
    const a = document.createElement("a");
    a.href = f.file_url; a.download = f.file_name || "file"; a.target = "_blank";
    a.click();
    if (window.showToast) window.showToast(`تم فتح ${f.file_name}`, "success");
  }
  const isImage = (f) => (f.file_type || "").startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.file_name || "");
  const kindLabel = (f) => {
    const n = (f.file_name || "").toLowerCase();
    if ((f.file_type || "").startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(n)) return "صورة";
    if (n.endsWith(".pdf") || f.file_type === "application/pdf") return "PDF";
    if (n.endsWith(".dcm")) return "DICOM";
    return "مستند";
  };

  return (
    <div>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }}
        accept="image/*,application/pdf,.pdf,.doc,.docx,.dcm,.xls,.xlsx,.txt" onChange={handleUpload} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div className="h3">ملفات المريض {files.length > 0 && <span className="muted mono" style={{ fontSize: 12 }}>({files.length})</span>}</div>
        <button className="btn btn-blue" disabled={uploading || !pid} onClick={() => fileRef.current && fileRef.current.click()}>
          {uploading ? <span className="spin" style={{ width: 13, height: 13, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} /> : <I.Upload size={13} />}
          {uploading ? "جارٍ الرفع…" : "رفع ملف"}
        </button>
      </div>

      {/* Upload zone */}
      <div style={{
        border: "2px dashed var(--blue-300)", background: "var(--blue-50)", borderRadius: 14,
        padding: "22px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap"
      }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: "#fff", border: "1px solid var(--blue-300)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--blue-700)" }}>
          <I.Upload size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13.5 }}>أفلت الأشعة أو صور الرنين أو التقارير أو الصور هنا</div>
          <div className="muted" style={{ fontSize: 12 }}>JPG, PNG, PDF, DICOM · متعدد</div>
        </div>
        <button className="btn btn-secondary" onClick={() => fileRef.current && fileRef.current.click()}>تصفّح الملفات</button>
      </div>

      {loading ? (
        <div className="grid-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="skel" style={{ height: 120, borderRadius: 0 }} />
              <div style={{ padding: 12 }}><div className="skel" style={{ height: 12, width: "70%" }} /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<I.X size={22} />} title="تعذّر تحميل الملفات" body={error}
          action={<button className="btn btn-secondary" onClick={reload}>إعادة المحاولة</button>} />
      ) : files.length === 0 ? (
        <EmptyState icon={<I.FileText size={22} />} title="لا توجد ملفات بعد"
          body="ارفع الأشعة أو التقارير أو الصور لتظهر هنا." />
      ) : (
        <div className="grid-3">
          {files.map((f) => (
            <div key={f.file_id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="ph" style={{ height: 120, borderRadius: 0, borderBottom: "1px solid var(--blue-100)", cursor: f.file_url ? "pointer" : "default", padding: 0, overflow: "hidden" }}
                onClick={() => f.file_url && openFile(f)}>
                {isImage(f) && f.file_url
                  ? <img src={f.file_url} alt={f.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : `${kindLabel(f)} preview`}
              </div>
              <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--blue-100)", color: "var(--blue-700)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I.FileText size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.file_name}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{kindLabel(f)} · {(f.uploaded_at || "").slice(0, 10)}</div>
                </div>
                <button className="btn btn-ghost btn-icon" title="تحميل / فتح" onClick={() => downloadFile(f)}><I.Download size={14} /></button>
                <RowMenu size={13} items={[
                  { label: "فتح", icon: <I.Eye size={13} />, onClick: () => openFile(f) },
                  { label: "تحميل", icon: <I.Download size={13} />, onClick: () => downloadFile(f) },
                  { label: "حذف", icon: <I.Trash size={13} />, danger: true, onClick: async () => {
                    if (!window.confirm(`حذف ${f.file_name}؟`)) return;
                    try { if (window.removePatientFile) await window.removePatientFile(f.file_id); if (window.showToast) window.showToast("تم حذف الملف", "success"); }
                    catch (e) { console.warn("remove file failed", e); if (window.showToast) window.showToast("تعذّر الحذف", "error"); }
                  } },
                ]} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatientInvoices({ p }) {
  const [newInvoiceOpen, setNewInvoiceOpen] = React.useState(false);
  const pid = p.patient_id || p.id;
  const invoices = DATA.payments.filter(x => x.patient === p.name || x.patient_id === pid);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div className="h3">سجل الفواتير</div>
        <button className="btn btn-blue" onClick={()=>setNewInvoiceOpen(true)}><I.Plus size={13}/> فاتورة جديدة</button>
      </div>
      <div className="tbl-scroll">
      <table className="tbl">
        <thead><tr><th>فاتورة</th><th>التاريخ</th><th>المبلغ</th><th>مدفوع</th><th>الطريقة</th><th>الحالة</th><th></th></tr></thead>
        <tbody>
          {invoices.length ? invoices.map(inv=>(
            <tr key={inv.id}>
              <td className="mono">{inv.id}</td>
              <td>{inv.date}</td>
              <td className="mono">EGP {inv.amount.toLocaleString()}</td>
              <td className="mono">EGP {inv.paid.toLocaleString()}</td>
              <td>{inv.method}</td>
              <td><PayBadge s={inv.status}/></td>
              <td><button className="btn btn-ghost btn-icon" onClick={()=>{
                const rows = ["فاتورة,التاريخ,المبلغ,مدفوع,الطريقة,الحالة", `${inv.id},${inv.date},${inv.amount},${inv.paid},${inv.method},${inv.status}`];
                downloadCsv(rows, `${inv.id}.csv`);
                if (window.showToast) window.showToast("تم تحميل الفاتورة", "success");
              }}><I.Download size={13}/></button></td>
            </tr>
          )) : <tr><td colSpan={7}><EmptyState icon={<I.FileText size={22}/>} title="لا توجد فواتير بعد" body="invoices appear here once you create them or a جلسة is checked out."/></td></tr>}
        </tbody>
      </table>
      </div>
      {newInvoiceOpen && <NewInvoiceModal onClose={()=>setNewInvoiceOpen(false)}/>}
    </div>
  );
}

// ── PatientAdd — multi-step wizard ────────────────────────────
function PatientAdd({ onCancel, onSave }) {
  const [step, setStep] = React.useState(0);
  const steps = ["شخصي", "طبي", "المرفقات", "مراجعة"];
  // Controlled state so the review step and the persist call actually
  // see what the user typed. Previously every input was uncontrolled and
  // "إنشاء مريض" saved a hardcoded seed row.
  const [form, setForm] = React.useState({
    patient_id: "P-" + Math.floor(10000 + Math.random()*90000),
    created_at: new Date().toISOString().slice(0,10),
    name: "", phone: "", email: "", age: "", gender: "Female",
    occupation: "", marital: "أعزب", address: "",
    diagnosis: "", complaint: "", chronic: "", surgeries: "",
    allergies: "", meds: "", smoking: "أبدًا", activity: "متوسط",
  });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Step-level validation gates. Continuing without a name/phone silently
  // let bad rows through to the persist step.
  function validate(current) {
    if (current === 0) {
      if (!form.patient_id.trim()) return "أدخل رقم الملف";
      if (!form.name.trim()) return "أدخل الاسم الكامل";
      if (!form.phone.trim()) return "أدخل رقم الهاتف";
    }
    if (current === 1) {
      if (!form.diagnosis.trim()) return "أدخل التشخيص";
    }
    return null;
  }

  async function persist() {
    const err = validate(0) || validate(1);
    if (err) { if (window.showToast) window.showToast(err, "error"); return; }
    try {
      const row = {
        patient_id: form.patient_id,
        id: form.patient_id,
        name: form.name,
        phone: form.phone,
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        diagnosis: form.diagnosis,
        notes: form.complaint || "",
        created_at: form.created_at,
        // UI-only fields ignored by the whitelist but useful for local seed:
        diag: form.diagnosis,
        status: "متاح",
        remain: 10,
      };
      if (window.KineticData) await window.KineticData.upsert("patients", row);
      if (window.showToast) window.showToast("تم إنشاء المريض", "success");
      onSave && onSave(row);
    } catch (e) {
      console.warn("create patient failed", e);
      if (window.showToast) window.showToast("تعذّر الحفظ", "error");
    }
  }

  function next() {
    const err = validate(step);
    if (err) { if (window.showToast) window.showToast(err, "error"); return; }
    setStep(step+1);
  }

  return (
    <Page>
      <div className="crumb"><span onClick={onCancel} style={{cursor:"pointer"}}>المرضى</span><I.Chevron size={11}/><span style={{color:"var(--ink-700)"}}>مريض جديد</span></div>
      <div className="h1" style={{marginBottom:6}}>تسجيل مريض جديد</div>
      <div className="muted" style={{fontSize:13.5,marginBottom:24}}>خطوة {step+1} من {steps.length} — drafts autosave every 5 seconds.</div>

      {/* stepper */}
      <div className="stepper" style={{gap:0,marginBottom:24}}>
        {steps.map((s,i)=>(
          <React.Fragment key={i}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{
                width:28,height:28,borderRadius:999,
                background:i<step?"var(--green)":i===step?"var(--blue-500)":"var(--ink-100)",
                color:i<=step?"#fff":"var(--ink-500)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:600
              }}>{i<step ? <I.Check size={14}/> : i+1}</div>
              <span className="step-label" style={{fontSize:13,fontWeight:i===step?600:500,color:i===step?"var(--ink-900)":"var(--ink-500)"}}>{s}</span>
            </div>
            {i<steps.length-1 && <div style={{flex:1,minWidth:14,height:1,background:i<step?"var(--green)":"var(--ink-200)",margin:"0 16px"}}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="card card-pad" style={{maxWidth:840,marginBottom:18}}>
        {step===0 && <FormPersonal form={form} setField={setField}/>}
        {step===1 && <FormMedical form={form} setField={setField}/>}
        {step===2 && <FormUploads/>}
        {step===3 && <FormReview form={form}/>}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",maxWidth:840,flexWrap:"wrap",gap:10}}>
        <button className="btn btn-secondary" onClick={()=>step===0 ? onCancel() : setStep(step-1)}>
          <I.ArrowLeft size={13}/> {step===0?"إلغاء":"رجوع"}
        </button>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" onClick={()=>{if(window.showToast)window.showToast("تم الحفظ كمسودة","success");onCancel&&onCancel();}}>حفظ كمسودة</button>
          {step<steps.length-1 ? (
            <button className="btn btn-blue" onClick={next}>متابعة <I.ArrowRight size={13}/></button>
          ) : (
            <button className="btn btn-blue" onClick={persist}><I.Check size={13}/> إنشاء مريض</button>
          )}
        </div>
      </div>
    </Page>
  );
}

function Field({ label, children, hint, span = 1, required }) {
  return (
    <div style={{gridColumn:`span ${span}`}}>
      <div className="label">{label} {required && <span style={{color:"var(--red)"}}>*</span>}</div>
      {children}
      {hint && <div style={{fontSize:11.5,color:"var(--ink-500)",marginTop:4}}>{hint}</div>}
    </div>
  );
}
function FormPersonal({ form, setField }) {
  return (
    <div>
      <div className="h3" style={{marginBottom:14}}>البيانات الشخصية</div>
      <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14}}>
        <Field label="رقم الملف" required><input className="input" value={form.patient_id} onChange={e=>setField("patient_id", e.target.value)}/></Field>
        <Field label="تاريخ التسجيل"><input className="input" type="date" value={form.created_at} onChange={e=>setField("created_at", e.target.value)}/></Field>
        <Field label="الاسم الكامل" required span={2}><input className="input" placeholder="مثال: هناء مصطفى" value={form.name} onChange={e=>setField("name", e.target.value)}/></Field>
        <Field label="الهاتف" required><input className="input" placeholder="+20 …" value={form.phone} onChange={e=>setField("phone", e.target.value)}/></Field>
        <Field label="البريد الإلكتروني"><input className="input" placeholder="اختياري" value={form.email} onChange={e=>setField("email", e.target.value)}/></Field>
        <Field label="العمر"><input className="input" type="number" placeholder="34" value={form.age} onChange={e=>setField("age", e.target.value)}/></Field>
        <Field label="الجنس">
          <div style={{display:"flex",gap:6}}>
            {["Female","Male"].map(g=>(
              <button key={g} className={"btn " + (form.gender===g?"btn-primary":"btn-secondary")} style={{flex:1,justifyContent:"center"}} onClick={()=>setField("gender", g)}>{g}</button>
            ))}
          </div>
        </Field>
        <Field label="المهنة"><input className="input" placeholder="مثال: مهندسة معمارية" value={form.occupation} onChange={e=>setField("occupation", e.target.value)}/></Field>
        <Field label="الحالة الاجتماعية">
          <select className="input" value={form.marital} onChange={e=>setField("marital", e.target.value)}><option>أعزب</option><option>متزوج</option><option>أخرى</option></select>
        </Field>
        <Field label="العنوان" span={2}><input className="input" placeholder="الشارع، الحي، المدينة" value={form.address} onChange={e=>setField("address", e.target.value)}/></Field>
      </div>
    </div>
  );
}
function FormMedical({ form, setField }) {
  return (
    <div>
      <div className="h3" style={{marginBottom:14}}>البيانات MedicalInformation</div>
      <div className="rgrid c-sm" style={{"--gtc":"repeat(2,1fr)",gap:14}}>
        <Field label="الشكوى الرئيسية" required span={2}><textarea className="input" style={{height:70,padding:10,resize:"vertical"}} placeholder="e.g. ألم أسفل الظهر يمتد إلى الساق اليسرى, worse in AM" value={form.complaint} onChange={e=>setField("complaint", e.target.value)}/></Field>
        <Field label="التشخيص" required span={2}><input className="input" placeholder="مثال: انزلاق غضروفي L4–L5" value={form.diagnosis} onChange={e=>setField("diagnosis", e.target.value)}/></Field>
        <Field label="أمراض مزمنة diseases"><input className="input" placeholder="النوع to add tags" value={form.chronic} onChange={e=>setField("chronic", e.target.value)}/></Field>
        <Field label="عمليات سابقة"><input className="input" placeholder="النوع to add tags" value={form.surgeries} onChange={e=>setField("surgeries", e.target.value)}/></Field>
        <Field label="حساسية"><input className="input" placeholder="مثال: بنسلين" value={form.allergies} onChange={e=>setField("allergies", e.target.value)}/></Field>
        <Field label="الأدوية الحالية"><input className="input" placeholder="افصل بفواصل" value={form.meds} onChange={e=>setField("meds", e.target.value)}/></Field>
        <Field label="التدخين">
          <select className="input" value={form.smoking} onChange={e=>setField("smoking", e.target.value)}><option>أبدًا</option><option>سابقًا</option><option>حاليًا</option></select>
        </Field>
        <Field label="مستوى النشاط">
          <select className="input" value={form.activity} onChange={e=>setField("activity", e.target.value)}><option>خامل</option><option>خفيف</option><option>متوسط</option><option>نشط</option></select>
        </Field>
      </div>
    </div>
  );
}
function FormUploads() {
  const uploadRefs = React.useRef([React.createRef(), React.createRef(), React.createRef(), React.createRef()]);
  const uploadDefs = [
    { l:"شخصي photo", h:"JPG/PNG · لبطاقة الملف", accept:"image/*"},
    { l:"صورة الهوية", h:"أمامي وخلفي", accept:"image/*"},
    { l:"صور الأشعة", h:"متعدد مسموح", accept:"image/*"},
    { l:"طبي reports", h:"PDF, JPG, PNG", accept:".pdf,image/*"},
  ];
  return (
    <div>
      <div className="h3" style={{marginBottom:14}}>الملفات والمرفقات</div>
      <div className="grid-2" style={{gap:14}}>
        {uploadDefs.map((u,i)=>(
          <div key={i} style={{
            border:"2px dashed var(--ink-200)",borderRadius:12,padding:18,
            display:"flex",alignItems:"center",gap:14,background:"var(--ink-50)"
          }}>
            <input ref={uploadRefs.current[i]} type="file" accept={u.accept} style={{display:"none"}} onChange={e=>{
              if(e.target.files[0]&&window.showToast)window.showToast(`تم رفع ${e.target.files[0].name}`,"success");
              e.target.value="";
            }}/>
            <div style={{width:44,height:44,borderRadius:11,background:"#fff",border:"1px solid var(--ink-200)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--blue-700)"}}>
              <I.Image size={18}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13.5}}>{u.l}</div>
              <div className="muted" style={{fontSize:11.5}}>{u.h}</div>
            </div>
            <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>uploadRefs.current[i].current&&uploadRefs.current[i].current.click()}>رفع</button>
          </div>
        ))}
      </div>
    </div>
  );
}
function FormReview({ form }) {
  const f = form || {};
  return (
    <div>
      <div className="h3" style={{marginBottom:14}}>مراجعة & create</div>
      <div style={{padding:18,background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:12,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,color:"var(--blue-900)",fontSize:13}}>
          <I.Check size={15}/> Looks good. المريض will be created مع file # <span className="mono">{f.patient_id || "—"}</span> وتعيينه إلى <strong>{activeBranchName()}</strong>.
        </div>
      </div>
      <div className="grid-2" style={{gap:18}}>
        {[
          {h:"شخصي", rows:[["الاسم الكامل", f.name || "—"],["رقم الملف", f.patient_id || "—"],["الهاتف", f.phone || "—"],["Age", `${f.age || "—"}, ${f.gender || "—"}`]]},
          {h:"طبي", rows:[["التشخيص", f.diagnosis || "—"],["أمراض مزمنة", f.chronic || "—"],["العمليات", f.surgeries || "—"]]},
          {h:"المرفقات", rows:[["الملفات","تُرفع من ملف المريض بعد الإنشاء"]]},
          {h:"التعيينات", rows:[["طبيب", f.doctor || "—"],["الأخصائي", f.therapist || "—"],["الباقة", f.pkg || "—"]]},
        ].map((s,i)=>(
          <div key={i} className="card card-pad" style={{padding:14,boxShadow:"none"}}>
            <div className="h3" style={{marginBottom:8}}>{s.h}</div>
            {s.rows.map((r,j)=>(
              <div key={j} style={{display:"flex",justifyContent:"space-between",fontSize:12.5,padding:"4px 0"}}>
                <span className="muted">{r[0]}</span><span>{r[1]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Patients, PatientDetail, SessionTimeline: null });
// SessionTimeline gets defined in treatments.jsx


// ===== src/appointments.jsx =====
// Appointments — day calendar grid + booking flow

// ── Booking data helpers (departments / doctors are DB-backed) ──
const INCOMPLETE_STATUS = "ملف غير مكتمل";
const DOCTOR_STATUS = {
  available: { l: "متاح",     c: "#3FA984", badge: "b-green" },
  busy:      { l: "مشغول",    c: "#D49044", badge: "b-amber" },
  leave:     { l: "في إجازة", c: "#8898A8", badge: "b-grey" },
};
// Departments sorted by their display order, active only.
function activeDepartments() {
  return (DATA.departments || [])
    .filter(d => d.active !== false)
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}
// Active doctors assigned to a department.
function doctorsInDept(deptId) {
  return (DATA.doctors || []).filter(d => d.active !== false && d.department_id === deptId);
}
// Resolve a department's icon name to an icon element (falls back to Layers).
function deptIcon(name, size = 18) {
  const Ic = (window.I && window.I[name]) || window.I.Layers;
  return <Ic size={size}/>;
}
// Digits-only phone comparison so "+20 100…" matches "0100…" etc.
function normalizePhone(p) {
  return String(p || "").replace(/\D/g, "").replace(/^0+/, "");
}
function findPatientByPhone(phone) {
  const n = normalizePhone(phone);
  if (!n) return null;
  return (DATA.patients || []).find(p => normalizePhone(p.phone) === n) || null;
}

function Appointments({ go }) {
  const [tab, setTab] = React.useState("التقويم"); // calendar | list | book
  const [dateOffset, setDateOffset] = React.useState(0);
  const [quickOpen, setQuickOpen] = React.useState(false);

  const myAppts = window.scopeAppts ? window.scopeAppts(DATA.appts) : DATA.appts;
  const booked = myAppts.filter(a=>a.status!=="متاح").length;
  const free = myAppts.filter(a=>a.status==="متاح").length;
  const pending = myAppts.filter(a=>a.status==="معلّق").length;
  const scoped = window.ME && (window.ME.scope==="doctor"||window.ME.scope==="therapist");

  return (
    <Page>
      <div className="page-head">
        <div>
          <div className="crumb"><span>الرئيسية</span><I.Chevron size={11}/><span>المواعيد</span></div>
          <div className="h1">{scoped ? "جدولي" : "المواعيد"}</div>
          <div className="muted" style={{fontSize:13.5,marginTop:4}}>{booked} اليوم · {free} متاح · {pending} بانتظار التأكيد</div>
        </div>
        <div className="page-actions">
          <div className="seg">
            {["التقويم","قائمة","حجز"].map(t=>(
              <button key={t} className={tab===t?"on":""} onClick={()=>setTab(t)} style={{textTransform:"capitalize"}}>
                {t==="التقويم" ? "التقويم" : t==="قائمة" ? "قائمة" : "حجز جديد"}
              </button>
            ))}
          </div>
          <button className="btn btn-blue" onClick={()=>setQuickOpen(true)}><I.Plus size={14}/> حجز سريع</button>
        </div>
      </div>

      {tab==="التقويم" && <CalendarView dateOffset={dateOffset} setDateOffset={setDateOffset}/>}
      {tab==="قائمة" && <AppointmentList/>}
      {tab==="حجز" && <BookingFlow onDone={()=>setTab("التقويم")}/>}

      {quickOpen && <QuickBookingModal onClose={()=>setQuickOpen(false)} onDone={()=>{ setQuickOpen(false); setTab("التقويم"); }}/>}
    </Page>
  );
}

// ── Quick Booking (حجز سريع) ───────────────────────────────────
// For phone/WhatsApp bookings where the receptionist has minimal info.
// Only name, phone, department, doctor, date, time (+ optional notes).
// Links to an existing patient by phone, or creates one flagged as
// "ملف غير مكتمل" so it can be completed later without touching bookings.
function QuickBookingModal({ onClose, onDone }) {
  const depts = activeDepartments();
  const [form, setForm] = React.useState({
    name: "", phone: "", deptId: "", doctorId: "",
    date: new Date().toISOString().slice(0, 10), time: "", notes: "",
  });
  const [busy, setBusy] = React.useState(false);
  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === "deptId") next.doctorId = ""; // reset doctor when dept changes
    return next;
  });
  const deptDoctors = form.deptId ? doctorsInDept(form.deptId) : [];

  async function save() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name)  return window.showToast && window.showToast("أدخل اسم المريض", "error");
    if (!phone) return window.showToast && window.showToast("أدخل رقم الهاتف", "error");
    if (!form.deptId)   return window.showToast && window.showToast("اختر القسم", "error");
    if (!form.doctorId) return window.showToast && window.showToast("اختر الطبيب", "error");
    if (!form.date)     return window.showToast && window.showToast("اختر التاريخ", "error");
    if (!form.time)     return window.showToast && window.showToast("اختر الوقت", "error");

    setBusy(true);
    try {
      // 1. Resolve or create the patient (by phone).
      let patient = findPatientByPhone(phone);
      let createdNew = false;
      if (!patient) {
        const pid = "P-" + Date.now().toString().slice(-8);
        patient = await window.KineticData.upsert("patients", {
          patient_id: pid, name, phone,
          diagnosis: "", notes: "حجز سريع — بيانات ناقصة",
          status: INCOMPLETE_STATUS,
          registered: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
        });
        createdNew = true;
      }
      const patientId = patient.patient_id || patient.id;

      // 2. Create the appointment linked to that patient.
      const doctor = (DATA.doctors || []).find(d => d.id === form.doctorId);
      const dept = depts.find(d => d.id === form.deptId);
      const bid = "A-" + Date.now().toString().slice(-8);
      await window.KineticData.upsert("appts", {
        booking_id: bid,
        patient_id: patientId,
        patient: patient.name || name,
        doctor_id: form.doctorId,
        department_id: form.deptId,
        dr: doctor ? doctor.name : "",
        dept: dept ? dept.name_ar : "",
        date: form.date,
        time: form.time,
        status: "مؤكد",
        type: dept ? dept.name_ar : "",
        notes: form.notes.trim(),
        dur: 30,
        created_at: new Date().toISOString(),
      });

      window.showToast && window.showToast(
        createdNew ? "تم الحجز وإنشاء ملف مبدئي للمريض" : "تم الحجز وربطه بملف المريض",
        "success"
      );
      onDone && onDone();
    } catch (e) {
      console.warn("quick booking failed", e);
      window.showToast && window.showToast("تعذّر إتمام الحجز", "error");
    } finally {
      setBusy(false);
    }
  }

  const existing = findPatientByPhone(form.phone);

  return (
    <Modal title="حجز سريع" onClose={onClose} width={560}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
        <button className="btn btn-blue" disabled={busy} onClick={save}>
          {busy ? <span className="spin" style={{width:14,height:14,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%"}}/> : <><I.Check size={13}/> تأكيد الحجز</>}
        </button>
      </>}>
      <div className="muted" style={{fontSize:12.5,marginBottom:14,lineHeight:1.6,padding:"10px 12px",background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:8}}>
        للحجوزات الهاتفية والواتساب — أدخل الحد الأدنى من البيانات فقط. يُستكمل ملف المريض لاحقًا.
      </div>
      <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:12}}>
        <Field label="اسم المريض" required>
          <input className="input" value={form.name} onChange={e=>set("name", e.target.value)} placeholder="الاسم الكامل" autoFocus/>
        </Field>
        <Field label="رقم الهاتف" required>
          <input className="input" value={form.phone} onChange={e=>set("phone", e.target.value)} placeholder="+20 1xx xxx xxxx" dir="ltr" style={{textAlign:"right"}}/>
        </Field>
      </div>
      {existing && (
        <div style={{fontSize:12,color:"var(--green)",margin:"2px 0 10px",display:"flex",alignItems:"center",gap:6}}>
          <I.Check size={12}/> رقم معروف — سيُربط الحجز بملف <strong>{existing.name}</strong>
        </div>
      )}
      <div style={{height:2}}/>
      <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:12}}>
        <Field label="القسم" required>
          <select className="input" value={form.deptId} onChange={e=>set("deptId", e.target.value)}>
            <option value="">اختر القسم…</option>
            {depts.map(d=>{
              const n = doctorsInDept(d.id).length;
              return <option key={d.id} value={d.id} disabled={n===0}>{d.name_ar}{n===0?" (لا أطباء)":""}</option>;
            })}
          </select>
        </Field>
        <Field label="الطبيب" required>
          <select className="input" value={form.doctorId} onChange={e=>set("doctorId", e.target.value)} disabled={!form.deptId}>
            <option value="">{form.deptId ? "اختر الطبيب…" : "اختر القسم أولاً"}</option>
            {deptDoctors.map(d=>(
              <option key={d.id} value={d.id}>{d.name}{d.specialization?` — ${d.specialization}`:""}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="rgrid c-sm" style={{"--gtc":"1fr 1fr",gap:12}}>
        <Field label="التاريخ" required>
          <input className="input" type="date" value={form.date} onChange={e=>set("date", e.target.value)}/>
        </Field>
        <Field label="الوقت" required>
          <input className="input" type="time" value={form.time} onChange={e=>set("time", e.target.value)}/>
        </Field>
      </div>
      <Field label="ملاحظات (اختياري)">
        <textarea className="input" rows={2} style={{padding:10,resize:"vertical"}} value={form.notes} onChange={e=>set("notes", e.target.value)} placeholder="سبب الزيارة، تفضيلات الموعد…"/>
      </Field>
    </Modal>
  );
}

function CalendarView({ dateOffset, setDateOffset }) {
  const therapists = window.scopeTherapists ? window.scopeTherapists(DATA.therapists) : DATA.therapists;
  const hours = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
  const [draggedId, setDraggedId] = React.useState(null);
  const [rescheduleModal, setRescheduleModal] = React.useState(null);
  const [appts, setAppts] = React.useState(()=> {
    const src = window.scopeAppts ? window.scopeAppts(DATA.appts) : DATA.appts;
    return src.map(a => ({
      ...a,
      colIndex: therapists.findIndex(t => t.name === a.th)
    })).filter(a => a.colIndex >= 0);
  });
  const minutesFromHour = (t) => {
    // Guard against missing/malformed times so a bad row can't NaN-out the layout.
    const parts = (t || "").split(":").map(Number);
    const h = Number.isFinite(parts[0]) ? parts[0] : 8;
    const m = Number.isFinite(parts[1]) ? parts[1] : 0;
    return (h-8)*60 + m;
  };
  // Real calendar label driven by the offset (was a hardcoded date list).
  const viewDate = new Date(Date.now() + dateOffset * 864e5);
  const dm = viewDate.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  const today = dateOffset === 0 ? `اليوم، ${dm}`
    : dateOffset === 1 ? `غدًا، ${dm}`
    : viewDate.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

  if (therapists.length === 0) {
    return <EmptyState icon={<I.Calendar size={22}/>} title="لا أخصائيين بعد"
      body="أضف الأخصائيين من الإعدادات ليظهر تقويم الحجوزات هنا."/>;
  }

  return (
    <>
    <div className="card" style={{padding:0,overflow:"hidden"}}>
      {/* toolbar */}
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:"1px solid var(--ink-200)",flexWrap:"wrap"}}>
        <button className="btn btn-secondary btn-icon" onClick={()=>setDateOffset(Math.max(0,dateOffset-1))}><I.ArrowLeft size={14}/></button>
        <div className="h3" style={{minWidth:"min(220px, 45vw)"}}>{today}</div>
        <button className="btn btn-secondary btn-icon" onClick={()=>setDateOffset(dateOffset+1)}><I.ArrowRight size={14}/></button>
        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setDateOffset(0)}>اليوم</button>
        <div className="seg" style={{marginLeft:12}}>
          <button>يوم</button>
          <button className="on">الأخصائي</button>
          <button>أسبوع</button>
        </div>
        <div style={{flex:1}}/>
        <span className="muted" style={{fontSize:12}}>اسحب المواعيد لإعادة جدولتها</span>
        <button className="btn btn-blue"><I.Plus size={14}/> حجز</button>
      </div>

      <div className="tbl-scroll">
      <div style={{display:"grid",gridTemplateColumns:`80px repeat(${therapists.length},1fr)`,minHeight:660,minWidth:Math.max(320, 80 + therapists.length*160)}}>
        {/* header */}
        <div style={{borderRight:"1px solid var(--ink-200)",background:"var(--ink-50)"}}></div>
        {therapists.map((t,i)=>(
          <div key={t.name} style={{padding:"12px 14px",borderRight:i<therapists.length-1?"1px solid var(--ink-200)":"none",borderBottom:"1px solid var(--ink-200)",background:"var(--ink-50)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span className="av sm" style={{background:t.color+"33",color:t.color}}>{t.name.split(" ").map(x=>x[0]).join("")}</span>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                <div className="muted" style={{fontSize:11}}>{t.spec} · {t.load}/{t.max}</div>
              </div>
            </div>
          </div>
        ))}

        {/* hours column */}
        <div style={{borderRight:"1px solid var(--ink-200)",background:"var(--ink-50)",position:"relative"}}>
          {hours.map((h,i)=>(
            <div key={h} style={{height:54,padding:"4px 10px",borderTop:i?"1px solid var(--ink-100)":"none",fontSize:11,color:"var(--ink-500)"}} className="mono">{h}</div>
          ))}
        </div>

        {/* therapist columns */}
        {therapists.map((t,col)=>(
          <div key={t.name}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const offsetY = e.clientY - rect.top;
              const newMin = Math.round(offsetY / 54) * 15;
              const totalMin = newMin;
              const hh = Math.floor(8 + totalMin/60);
              const mm = totalMin % 60;
              const newTime = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
              setAppts(prev => {
                const next = prev.map(a => a.id===draggedId ? { ...a, time:newTime, th:t.name, colIndex: col } : a);
                const moved = next.find(a => a.id===draggedId);
                // Persist reschedule so a refresh keeps the new slot.
                if (moved && window.KineticData) {
                  const therapistRow = (DATA.therapists || []).find(x=>x.name===t.name);
                  window.KineticData.upsert("appts", {
                    booking_id: moved.booking_id || moved.id,
                    id: moved.id,
                    patient_id: moved.patient_id || moved.pid,
                    therapist_id: (therapistRow && (therapistRow.staff_id || therapistRow.id)) || moved.therapist_id,
                    date: moved.date || new Date().toISOString().slice(0,10),
                    time: newTime,
                    status: moved.status || "مؤكد",
                  }).catch(e => console.warn("reschedule persist failed", e));
                }
                return next;
              });
              setDraggedId(null);
            }}
            style={{
              position:"relative",
              borderRight:col<therapists.length-1?"1px solid var(--ink-200)":"none",
              background: col%2===0?"#fff":"#FCFDFE",
              minHeight: hours.length * 54
            }}>
            {/* hour grid lines */}
            {hours.map((_,i)=>(
              <div key={i} style={{position:"absolute",top:i*54,left:0,right:0,height:54,borderTop:i?"1px solid var(--ink-100)":"none"}}/>
            ))}
            {/* now indicator (3rd hour for demo) */}
            {col===0 && (
              <div style={{position:"absolute",top:54*3-2,left:0,right:0,height:2,background:"var(--red)",zIndex:5}}>
                <div style={{position:"absolute",left:-4,top:-4,width:10,height:10,borderRadius:999,background:"var(--red)"}}/>
              </div>
            )}

            {/* appointments */}
            {appts.filter(a=>a.colIndex===col && a.status!=="متاح").map(a=>{
              const top = (minutesFromHour(a.time)/60)*54;
              const h = (a.dur/60)*54;
              const isAvail = a.status==="متاح";
              const c = t.color;
              const bg = isAvail ? "transparent" : `${c}1A`;
              const border = isAvail ? `2px dashed ${c}66` : `1px solid ${c}66`;
              return (
                <div key={a.id}
                  draggable={!isAvail}
                  onDragStart={(e)=>{e.stopPropagation();setDraggedId(a.id);}}
                  onClick={()=>{ if(!isAvail) setRescheduleModal(a); }}
                  style={{
                    position:"absolute", left:6, right:6, top, height:h-3,
                    background:bg, border, borderLeft: isAvail?border:`3px solid ${c}`,
                    borderRadius:9, padding:"6px 8px",fontSize:11.5,
                    cursor: isAvail?"pointer":"grab", overflow:"hidden",
                    transition:"transform .12s",
                    opacity: draggedId===a.id ? 0.5 : 1
                  }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.01)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                  {isAvail ? (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:c,fontWeight:500}}>
                      <I.Plus size={12} style={{marginRight:4}}/> موعد متاح
                    </div>
                  ) : (
                    <>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontWeight:600,fontSize:12,color:"var(--ink-900)"}}>{a.patient}</span>
                        <span className="mono" style={{fontSize:10,color:"var(--ink-500)"}}>{a.time}</span>
                      </div>
                      <div style={{fontSize:10.5,color:"var(--ink-500)",whiteSpace:"normal",wordBreak:"break-word"}}>{a.type}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                        <ApptBadge s={a.status}/>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>
    </div>
    {rescheduleModal && (
      <RescheduleModal
        appt={rescheduleModal}
        onClose={()=>setRescheduleModal(null)}
        onSave={(newTime, newTherapist)=>{
          setAppts(prev=>{
            const next = prev.map(a=>a.id===rescheduleModal.id
              ? {...a, time:newTime, th:newTherapist, colIndex:therapists.findIndex(t=>t.name===newTherapist)}
              : a
            );
            const moved = next.find(a=>a.id===rescheduleModal.id);
            if (moved && window.KineticData) {
              const therapistRow = (DATA.therapists || []).find(x=>x.name===newTherapist);
              window.KineticData.upsert("appts", {
                booking_id: moved.booking_id || moved.id,
                id: moved.id,
                patient_id: moved.patient_id || moved.pid,
                therapist_id: (therapistRow && (therapistRow.staff_id || therapistRow.id)) || moved.therapist_id,
                date: moved.date || new Date().toISOString().slice(0,10),
                time: newTime,
                status: moved.status || "مؤكد",
              }).catch(e => console.warn("reschedule persist failed", e));
            }
            return next;
          });
          setRescheduleModal(null);
          if(window.showToast) window.showToast(`تم إعادة جدولة موعد ${rescheduleModal.patient} إلى ${newTime}`, "success");
        }}
        therapists={therapists}
      />
    )}
    </>
  );
}

function RescheduleModal({ appt, onClose, onSave, therapists }) {
  const timeSlots = [
    "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
    "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
    "16:00","16:30","17:00","17:30","18:00"
  ];
  const [newTime, setNewTime] = React.useState(appt.time);
  const [newTherapist, setNewTherapist] = React.useState(appt.th);
  const [newDate, setNewDate] = React.useState("اليوم، 24 مايو");
  const dates = ["اليوم، 24 مايو","غدًا، 25 مايو","الثلاثاء، 26 مايو","الأربعاء، 27 مايو","الخميس، 28 مايو","الجمعة، 29 مايو"];

  const sectionLabel = (text) => (
    <div style={{
      fontSize:11,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase",
      color:"var(--ink-400)",marginBottom:10,whiteSpace:"nowrap"
    }}>{text}</div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          background:"#fff",borderRadius:18,boxShadow:"0 24px 60px rgba(0,0,0,.18)",
          width:"min(600px, calc(100vw - 32px))",
          maxHeight:"calc(100vh - 48px)",overflowY:"auto",
          padding:"28px 28px 24px",direction:"rtl",
        }}
      >
        {/* ── Header ── */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:20}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:18,fontWeight:700,color:"var(--ink-900)",lineHeight:1.2,marginBottom:4}}>
              إعادة جدولة الموعد
            </div>
            <div style={{fontSize:13,color:"var(--ink-500)",whiteSpace:"nowrap",overflow:"visible"}}>
              {appt.patient} · {appt.type}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            style={{flexShrink:0,marginTop:2}}
          ><I.X size={16}/></button>
        </div>

        {/* ── Current slot banner ── */}
        <div style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"12px 16px",
          background:"var(--blue-50)",border:"1px solid var(--blue-100)",
          borderRadius:12,marginBottom:24,
        }}>
          <I.Clock size={14} style={{color:"var(--blue-500)",flexShrink:0}}/>
          <span style={{fontSize:13,color:"var(--ink-500)",whiteSpace:"nowrap"}}>الموعد الحالي:</span>
          <span style={{fontSize:13,fontWeight:600,color:"var(--ink-900)",whiteSpace:"nowrap"}}>{appt.time}</span>
          <span style={{color:"var(--ink-300)"}}>·</span>
          <span style={{fontSize:13,color:"var(--ink-700)",whiteSpace:"nowrap"}}>{appt.th}</span>
        </div>

        {/* ── Date picker ── */}
        <div style={{marginBottom:22}}>
          {sectionLabel("اليوم الجديد")}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {dates.map(d => {
              const active = newDate === d;
              return (
                <button
                  key={d}
                  onClick={()=>setNewDate(d)}
                  style={{
                    display:"inline-flex",alignItems:"center",justifyContent:"center",
                    whiteSpace:"nowrap",
                    padding:"8px 16px",
                    borderRadius:10,border:"none",cursor:"pointer",
                    fontSize:13,fontWeight: active?600:500,
                    background: active?"var(--blue-500)":"var(--ink-100)",
                    color: active?"#fff":"var(--ink-700)",
                    boxShadow: active?"0 2px 8px rgba(59,130,246,.3)":"none",
                    transition:"all .12s",
                    minWidth:0,
                  }}
                >{d}</button>
              );
            })}
          </div>
        </div>

        {/* ── Time picker ── */}
        <div style={{marginBottom:22}}>
          {sectionLabel("الوقت الجديد")}
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill, minmax(72px, 1fr))",
            gap:6,
          }}>
            {timeSlots.map(t => {
              const active = newTime === t;
              return (
                <button
                  key={t}
                  onClick={()=>setNewTime(t)}
                  style={{
                    display:"flex",alignItems:"center",justifyContent:"center",
                    padding:"8px 4px",borderRadius:9,border:"none",cursor:"pointer",
                    fontSize:13,fontWeight: active?600:400,fontFamily:"var(--mono, monospace)",
                    background: active?"var(--blue-500)":"var(--ink-50)",
                    color: active?"#fff":"var(--ink-700)",
                    boxShadow: active?"0 2px 8px rgba(59,130,246,.3)":"none",
                    border: active?"none":"1px solid var(--ink-200)",
                    transition:"all .12s",
                    whiteSpace:"nowrap",
                  }}
                >{t}</button>
              );
            })}
          </div>
        </div>

        {/* ── Therapist picker ── */}
        <div style={{marginBottom:26}}>
          {sectionLabel("الأخصائي")}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {therapists.filter(t=>t.name!=="متاح").map(t => {
              const active = newTherapist === t.name;
              return (
                <button
                  key={t.name}
                  onClick={()=>setNewTherapist(t.name)}
                  style={{
                    display:"inline-flex",alignItems:"center",gap:8,
                    padding:"8px 14px",borderRadius:10,border:"none",cursor:"pointer",
                    fontSize:13,fontWeight: active?600:500,
                    background: active?"var(--blue-500)":"var(--ink-100)",
                    color: active?"#fff":"var(--ink-700)",
                    boxShadow: active?"0 2px 8px rgba(59,130,246,.3)":"none",
                    transition:"all .12s",
                    whiteSpace:"nowrap",minWidth:0,
                  }}
                >
                  <div style={{
                    width:22,height:22,borderRadius:"50%",flexShrink:0,
                    background: active?"rgba(255,255,255,.25)":(t.color+"33"),
                    color: active?"#fff":t.color,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,fontWeight:700,
                  }}>
                    {t.name.replace("د. ","").split(" ").map(x=>x[0]).join("").slice(0,2)}
                  </div>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          paddingTop:18,borderTop:"1px solid var(--ink-100)",gap:10,
        }}>
          <div style={{fontSize:12.5,color:"var(--ink-500)",whiteSpace:"nowrap"}}>
            <I.Calendar size={12} style={{marginLeft:4,verticalAlign:"middle"}}/>
            {newDate} · {newTime}
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button className="btn btn-ghost" onClick={onClose} style={{whiteSpace:"nowrap"}}>إلغاء</button>
            <button
              className="btn btn-blue"
              onClick={()=>onSave(newTime, newTherapist)}
              style={{whiteSpace:"nowrap"}}
            >
              <I.Check size={13}/> تأكيد إعادة الجدولة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentList() {
  const [statusFilter, setStatusFilter] = React.useState("الكل");
  const all = (window.scopeAppts ? window.scopeAppts(DATA.appts) : DATA.appts).filter(a=>a.status !== "متاح");
  const filtered = statusFilter==="الكل" ? all : all.filter(a => a.status === statusFilter);
  return (
    <div>
      <div className="card" style={{padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"1 1 320px",maxWidth:380}}>
          <I.Search size={14} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"var(--ink-400)"}}/>
          <input className="input" placeholder="ابحث في المواعيد…" style={{paddingLeft:32}}/>
        </div>
        <div className="seg">
          {["الكل","مؤكد","معلّق","مكتمل","ملغي"].map(s=>(
            <button key={s} className={statusFilter===s?"on":""} onClick={()=>setStatusFilter(s)}>{s}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>وقت</th><th>المريض</th><th>الطبيب</th><th>الأخصائي</th><th>الغرفة</th><th>النوع</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {filtered.map(a=>(
              <tr key={a.id}>
                <td><span className="mono" style={{fontWeight:600}}>{a.time}</span> <span className="muted">· {a.dur}m</span></td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div className="av sm">{(a.patient||"—").split(" ").map(x=>x[0]).join("").slice(0,2)}</div>
                    {a.patient}
                  </div>
                </td>
                <td>{a.dr}</td>
                <td>{a.th}</td>
                <td>{a.room}</td>
                <td>{a.type}</td>
                <td><ApptBadge s={a.status}/></td>
                <td>
                  <RowMenu size={14} items={[
                    { label:"تأكيد الموعد", icon:<I.Check size={13}/>, onClick:async ()=>{
                      try {
                        if (window.KineticData) await window.KineticData.upsert("appts", { booking_id:a.id, patient_id:a.patient_id||null, status:"مؤكد" });
                        a.status = "مؤكد";
                        if (window.showToast) window.showToast("تم تأكيد الموعد","success");
                      } catch (e) { console.warn("confirm appt failed", e); if (window.showToast) window.showToast("تعذّر التأكيد","error"); }
                    }},
                    { label:"وضع كمكتمل", icon:<I.Check size={13}/>, onClick:async ()=>{
                      try {
                        if (window.KineticData) await window.KineticData.upsert("appts", { booking_id:a.id, patient_id:a.patient_id||null, status:"مكتمل" });
                        a.status = "مكتمل";
                        if (window.showToast) window.showToast("تم وضع الموعد كمكتمل","success");
                      } catch (e) { console.warn("complete appt failed", e); if (window.showToast) window.showToast("تعذّر التحديث","error"); }
                    }},
                    { label:"إلغاء الموعد", icon:<I.X size={13}/>, danger:true, onClick:async ()=>{
                      if (!window.confirm(`إلغاء موعد ${a.patient||""}؟`)) return;
                      try {
                        if (window.KineticData) await window.KineticData.upsert("appts", { booking_id:a.id, patient_id:a.patient_id||null, status:"ملغي" });
                        a.status = "ملغي";
                        if (window.showToast) window.showToast("تم إلغاء الموعد","success");
                      } catch (e) { console.warn("cancel appt failed", e); if (window.showToast) window.showToast("تعذّر الإلغاء","error"); }
                    }},
                  ]}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ── BookingFlow — 5 steps ──────────────────────────────────────
// Standard hourly slots used for "next available" hints.
const STD_SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
// Earliest free standard slot for a doctor across the next 14 days.
function nextAvailableLabel(doctorId) {
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() + i * 864e5);
    const iso = d.toISOString().slice(0, 10);
    const booked = new Set((DATA.appts || [])
      .filter(a => a.doctor_id === doctorId && a.date === iso && a.status !== "ملغي")
      .map(a => a.time));
    const free = STD_SLOTS.find(t => !booked.has(t));
    if (free) {
      const lbl = i === 0 ? "اليوم" : i === 1 ? "غدًا" : d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
      return `${lbl} ${free}`;
    }
  }
  return "لا يوجد قريبًا";
}

// ── BookingFlow — 5 steps, all DB-driven, persists on confirm ──
function BookingFlow({ onDone }) {
  const [step, setStep] = React.useState(1);
  const [picks, setPicks] = React.useState({ deptId:null, doctorId:null, therapist:null, date:null, slot:null, patientId:null, notes:"" });
  const [busy, setBusy] = React.useState(false);
  const steps = ["القسم","الطبيب","الأخصائي","التاريخ","الوقت"];
  const update = (patch) => setPicks(p => ({ ...p, ...patch }));
  const therapists = window.scopeTherapists ? window.scopeTherapists(DATA.therapists) : DATA.therapists;

  async function confirm() {
    if (!picks.date) return window.showToast && window.showToast("اختر التاريخ", "error");
    if (!picks.slot) return window.showToast && window.showToast("اختر الوقت", "error");
    if (!picks.patientId) return window.showToast && window.showToast("اختر المريض", "error");
    setBusy(true);
    try {
      const doctor = (DATA.doctors || []).find(d => d.id === picks.doctorId);
      const dept = (DATA.departments || []).find(d => d.id === picks.deptId);
      const patient = (DATA.patients || []).find(p => (p.patient_id || p.id) === picks.patientId);
      const therapistRow = (DATA.therapists || []).find(t => t.name === picks.therapist);
      await window.KineticData.upsert("appts", {
        booking_id: "A-" + Date.now().toString().slice(-8),
        patient_id: picks.patientId,
        patient: patient ? patient.name : "",
        doctor_id: picks.doctorId || null,
        department_id: picks.deptId || null,
        therapist_id: therapistRow ? therapistRow.id : null,
        dr: doctor ? doctor.name : "",
        th: picks.therapist || "",
        dept: dept ? dept.name_ar : "",
        date: picks.date,
        time: picks.slot,
        status: "مؤكد",
        type: dept ? dept.name_ar : "",
        notes: picks.notes || "",
        dur: 45,
        created_at: new Date().toISOString(),
      });
      window.showToast && window.showToast("تم تأكيد الحجز", "success");
      onDone && onDone();
    } catch (e) {
      console.warn("booking failed", e);
      window.showToast && window.showToast("تعذّر الحجز", "error");
    } finally { setBusy(false); }
  }

  function next() { if (step < 5) setStep(step + 1); else confirm(); }

  return (
    <div>
      <div className="card" style={{padding:18,marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div className="stepper" style={{gap:0,flex:1}}>
          {steps.map((s,i)=>(
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
              {i<steps.length-1 && <div style={{flex:1,minWidth:12,height:1,background:i+1<step?"var(--green)":"var(--ink-200)",margin:"0 14px"}}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card card-pad" style={{minHeight:420,marginBottom:18}}>
        {step===1 && <DepartmentPick selected={picks.deptId} onPick={id=>{ update({deptId:id, doctorId:null}); next(); }}/>}
        {step===2 && <DoctorPick deptId={picks.deptId} selected={picks.doctorId} onPick={id=>{ update({doctorId:id}); next(); }} onBack={()=>setStep(1)}/>}
        {step===3 && (therapists.length ? <PickGrid title="اختر أخصائيًا"
          items={therapists.map(t=>({ id:t.name, l:t.name, sub:`${t.spec} · حمل ${t.load}/${t.max}`, ic:t.name.split(" ").map(x=>x[0]).join(""), color:t.color, count:`${t.max-t.load} فترة متاحة` }))}
          avatar
          onPick={v=>{ update({therapist:v}); next();}}
          selected={picks.therapist}
        /> : <EmptyState icon={<I.Users size={22}/>} title="لا أخصائيين بعد" body="أضف الأخصائيين من الإعدادات."/>)}
        {step===4 && <DatePick value={picks.date} onPick={v=>{ update({date:v}); next();}}/>}
        {step===5 && <SlotPick picks={picks} update={update}/>}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <button className="btn btn-secondary" disabled={step===1} onClick={()=>setStep(step-1)} style={{opacity:step===1?.5:1}}>
          <I.ArrowLeft size={13}/> رجوع
        </button>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-ghost" onClick={onDone}>إلغاء</button>
          <button className="btn btn-blue" disabled={busy} onClick={next}>
            {busy ? <span className="spin" style={{width:14,height:14,border:"2px solid #fff",borderTopColor:"transparent",borderRadius:"50%"}}/> : <>{step<5 ? "متابعة" : "تأكيد الحجز"} <I.ArrowRight size={13}/></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 1 — departments from the DB with live active-doctor counts.
function DepartmentPick({ selected, onPick }) {
  const depts = activeDepartments();
  if (depts.length === 0) {
    return <EmptyState icon={<I.Layers size={22}/>} title="لا أقسام بعد" body="تُضاف الأقسام من قاعدة البيانات ثم تظهر هنا تلقائيًا."/>;
  }
  return (
    <div>
      <div className="h2" style={{marginBottom:18}}>اختر القسم</div>
      <div className="grid-3" style={{gap:14}}>
        {depts.map(d=>{
          const n = doctorsInDept(d.id).length;
          const disabled = n === 0;
          const isSel = selected === d.id;
          return (
            <button key={d.id} disabled={disabled} onClick={()=>onPick(d.id)}
              style={{
                padding:18,textAlign:"left",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.55:1,
                border:`1px solid ${isSel?"var(--blue-500)":"var(--ink-200)"}`,
                borderRadius:14,background: isSel?"var(--blue-50)":"#fff",
                display:"flex",flexDirection:"column",gap:10, transition:"all .15s"
              }}>
              <div className="av lg" style={{background:(d.color||"#7BBDE8")+"22",color:d.color||"var(--blue-700)"}}>{deptIcon(d.icon)}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14.5}}>{d.name_ar}</div>
                <div className="muted" style={{fontSize:12,marginTop:3}}>{d.description}</div>
              </div>
              <div style={{marginTop:"auto",fontSize:11.5,color:disabled?"var(--ink-400)":"var(--blue-700)",display:"flex",alignItems:"center",gap:4}}>
                <span className="dot" style={{background:disabled?"var(--ink-400)":"var(--blue-700)"}}></span>{n} {n===1?"طبيب":"أطباء"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Step 2 — active doctors in the chosen department, rich cards + empty state.
function DoctorPick({ deptId, selected, onPick, onBack }) {
  const doctors = deptId ? doctorsInDept(deptId) : [];
  if (doctors.length === 0) {
    return (
      <div>
        <div className="h2" style={{marginBottom:8}}>اختر طبيبًا</div>
        <EmptyState icon={<I.Stethoscope size={22}/>} title="لا أطباء في هذا القسم"
          body="اختر قسمًا آخر أو عُد للخطوة السابقة."
          action={<button className="btn btn-secondary" onClick={onBack}><I.ArrowLeft size={13}/> رجوع للأقسام</button>}/>
      </div>
    );
  }
  return (
    <div>
      <div className="h2" style={{marginBottom:18}}>اختر طبيبًا</div>
      <div className="grid-3" style={{gap:14}}>
        {doctors.map(d=>{
          const st = DOCTOR_STATUS[d.status] || DOCTOR_STATUS.available;
          const isSel = selected === d.id;
          return (
            <button key={d.id} onClick={()=>onPick(d.id)}
              style={{
                padding:16,textAlign:"left",cursor:"pointer",
                border:`1px solid ${isSel?"var(--blue-500)":"var(--ink-200)"}`,
                borderRadius:14,background: isSel?"var(--blue-50)":"#fff",
                display:"flex",flexDirection:"column",gap:8, transition:"all .15s"
              }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {d.photo
                  ? <img src={d.photo} alt="" style={{width:44,height:44,borderRadius:12,objectFit:"cover"}}/>
                  : <div className="av lg" style={{background:(d.color||"#7BBDE8")+"33",color:d.color||"var(--blue-700)"}}>{(d.name||"").replace("د. ","").split(" ").map(x=>x[0]||"").join("").slice(0,2)}</div>}
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14}}>{d.name}</div>
                  <div className="muted" style={{fontSize:11.5}}>{d.specialization || "—"}</div>
                </div>
              </div>
              <div className="muted" style={{fontSize:11.5,display:"flex",alignItems:"center",gap:5}}><I.Activity size={12}/> خبرة {d.experience_years||0} سنة</div>
              {d.schedule && <div className="muted" style={{fontSize:11.5,display:"flex",alignItems:"center",gap:5}}><I.Clock size={12}/> {d.schedule}</div>}
              <div style={{marginTop:"auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,paddingTop:6}}>
                <span className={"badge " + st.badge}><span className="dot"></span>{st.l}</span>
                <span className="mono" style={{fontSize:11,color:"var(--blue-700)"}}>أقرب: {nextAvailableLabel(d.id)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PickGrid({ title, items, onPick, selected, avatar }) {
  return (
    <div>
      <div className="h2" style={{marginBottom:18}}>{title}</div>
      <div className="grid-3" style={{gap:14}}>
        {items.map(it=>(
          <button key={it.id} onClick={()=>onPick(it.id)}
            style={{
              padding:18,textAlign:"left",cursor:"pointer",
              border:`1px solid ${selected===it.id?"var(--blue-500)":"var(--ink-200)"}`,
              borderRadius:14,background: selected===it.id?"var(--blue-50)":"#fff",
              display:"flex",flexDirection:"column",gap:10, transition:"all .15s"
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue-500)";e.currentTarget.style.background="var(--blue-50)";}}
            onMouseLeave={e=>{if(selected!==it.id){e.currentTarget.style.borderColor="var(--ink-200)";e.currentTarget.style.background="#fff";}}}
          >
            {avatar ? (
              <div className="av lg" style={{background: (it.color||"#7BBDE8")+"33",color:it.color||"var(--blue-700)"}}>{it.ic}</div>
            ) : (
              <div style={{width:38,height:38,borderRadius:11,background:"var(--blue-100)",color:"var(--blue-700)",display:"flex",alignItems:"center",justifyContent:"center"}}>{it.ic}</div>
            )}
            <div>
              <div style={{fontWeight:600,fontSize:14.5}}>{it.l}</div>
              <div className="muted" style={{fontSize:12,marginTop:3}}>{it.sub}</div>
            </div>
            <div style={{marginTop:"auto",fontSize:11.5,color:"var(--blue-700)",display:"flex",alignItems:"center",gap:4}}>
              <span className="dot" style={{background:"var(--blue-700)"}}></span>{it.count}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DatePick({ value, onPick }) {
  const [viewMonth, setViewMonth] = React.useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const days = ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت"];
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const total = new Date(y, m + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);
  const iso = (n) => `${y}-${String(m+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`;
  const monthLabel = viewMonth.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  const quick = [
    { l:"اليوم", d: todayIso },
    { l:"غدًا", d: new Date(Date.now()+864e5).toISOString().slice(0,10) },
    { l:"بعد غد", d: new Date(Date.now()+2*864e5).toISOString().slice(0,10) },
  ];
  return (
    <div>
      <div className="h2" style={{marginBottom:18}}>اختر تاريخًا</div>
      <div className="rgrid c-lg" style={{"--gtc":"1.4fr 1fr",gap:24}}>
        <div className="card" style={{padding:18,boxShadow:"none"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button className="btn btn-ghost btn-icon" aria-label="الشهر السابق" onClick={()=>setViewMonth(new Date(y,m-1,1))}><I.ArrowRight size={14}/></button>
            <div className="h3">{monthLabel}</div>
            <button className="btn btn-ghost btn-icon" aria-label="الشهر التالي" onClick={()=>setViewMonth(new Date(y,m+1,1))}><I.ArrowLeft size={14}/></button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
            {days.map((d,i)=>(<div key={i} className="muted" style={{textAlign:"center",fontSize:11,padding:"6px 0"}}>{d}</div>))}
            {Array.from({length:startDow}).map((_,i)=>(<div key={"e"+i}></div>))}
            {Array.from({length:total},(_,i)=>i+1).map(n=>{
              const dIso = iso(n);
              const isPast = dIso < todayIso;
              const isSel = value === dIso;
              return (
                <button key={n} disabled={isPast} onClick={()=>onPick(dIso)}
                  style={{
                    height:38,borderRadius:9,cursor:isPast?"default":"pointer",
                    border:isSel?"1px solid var(--blue-500)":"1px solid transparent",
                    background: isSel?"var(--blue-500)":"transparent",
                    color: isSel?"#fff":isPast?"var(--ink-300)":"var(--ink-900)",
                    fontWeight:isSel?600:500,fontSize:13
                  }} className="mono">{n}</button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="label">اختيار سريع</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {quick.map(q=>(
              <button key={q.l} className="btn btn-secondary" style={{justifyContent:"flex-start",padding:"11px 14px"}} onClick={()=>onPick(q.d)}>
                <I.Calendar size={14}/> {q.l}
              </button>
            ))}
          </div>
          <div style={{padding:14,background:"var(--blue-50)",border:"1px solid var(--blue-100)",borderRadius:12,marginTop:18,fontSize:12.5}}>
            اختيار التاريخ يعرض الأوقات المتاحة فعليًا للطبيب المحدد فقط.
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotPick({ picks, update }) {
  const ALL = ["08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];
  const morning = ALL.filter(t => t < "12:00");
  const afternoon = ALL.filter(t => t >= "12:00");
  const patients = (window.scopePatients ? window.scopePatients(DATA.patients) : DATA.patients) || [];
  const doctor = (DATA.doctors || []).find(d => d.id === picks.doctorId);
  const dept = (DATA.departments || []).find(d => d.id === picks.deptId);
  // Slots already taken for this doctor on the chosen date (real bookings).
  const booked = new Set((DATA.appts || [])
    .filter(a => a.doctor_id === picks.doctorId && a.date === picks.date && a.status !== "ملغي" && a.status !== "متاح")
    .map(a => a.time));
  const patient = patients.find(p => (p.patient_id || p.id) === picks.patientId);

  const SlotBtn = ({ t }) => {
    const u = booked.has(t);
    const sel = picks.slot === t;
    return (
      <button disabled={u} onClick={()=>update({ slot: t })} className="mono"
        style={{
          padding:"10px 16px",borderRadius:10,border:"1px solid var(--ink-200)",
          background: sel?"var(--blue-500)":u?"var(--ink-100)":"#fff",
          color: sel?"#fff":u?"var(--ink-300)":"var(--ink-900)",
          textDecoration:u?"line-through":"none",
          cursor:u?"not-allowed":"pointer", fontSize:13, fontWeight:500
        }}>{t}</button>
    );
  };

  return (
    <div>
      <div className="h2" style={{marginBottom:6}}>اختر الوقت والمريض</div>
      <div className="muted" style={{marginBottom:18,fontSize:13}}>
        {doctor ? `المتاح لـ${doctor.name}` : "المتاح"} · {picks.date || "—"} · جلسات 45 دقيقة
      </div>

      <div className="label">المريض</div>
      <div style={{marginBottom:18,maxWidth:420}}>
        <PatientCombobox value={picks.patientId || ""} onChange={id=>update({ patientId: id })} patients={patients}/>
      </div>

      <div className="label">الصباح</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{morning.map(t=><SlotBtn key={t} t={t}/>)}</div>

      <div className="label">بعد الظهر</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{afternoon.map(t=><SlotBtn key={t} t={t}/>)}</div>

      <div className="label">ملاحظات (اختياري)</div>
      <textarea className="input" rows={2} style={{padding:10,resize:"vertical",marginBottom:8}} value={picks.notes || ""} onChange={e=>update({ notes: e.target.value })} placeholder="سبب الزيارة…"/>

      <div style={{padding:18,background:"var(--ink-50)",borderRadius:12,marginTop:8}}>
        <div className="h3" style={{marginBottom:10}}>ملخّص الحجز</div>
        <div className="grid-4" style={{fontSize:12.5}}>
          <div><div className="muted">القسم</div><div>{dept?dept.name_ar:"—"}</div></div>
          <div><div className="muted">الطبيب</div><div>{doctor?doctor.name:"—"}</div></div>
          <div><div className="muted">الأخصائي</div><div>{picks.therapist||"—"}</div></div>
          <div><div className="muted">الوقت</div><div className="mono">{picks.date||"—"} {picks.slot||""}</div></div>
        </div>
        <div style={{marginTop:8,fontSize:12.5}}><span className="muted">المريض: </span>{patient?patient.name:"—"}</div>
      </div>
    </div>
  );
}

Object.assign(window, { Appointments });
