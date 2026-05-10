// ── REPLACE your entire ThreadsPage function with this ──

function ThreadsPage({ go }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicker, setActiveTicker] = useState("RKLB");
  const [openThread, setOpenThread] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newComment, setNewComment] = useState({});
  const [votes, setVotes] = useState({});
  const [posting, setPosting] = useState(false);

  const API = "https://orbit-alpha-api.vercel.app/api/threads";

  const fetchThreads = async (ticker) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?ticker=${ticker}`);
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) {
      setThreads([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchThreads(activeTicker); }, [activeTicker]);

  const switchTicker = (t) => {
    setActiveTicker(t);
    setOpenThread(null);
    setShowCompose(false);
  };

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      const diff = (Date.now() - d) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
      return d.toLocaleDateString("en-GB", {day:"numeric",month:"short"});
    } catch { return ""; }
  };

  const postThread = async () => {
    if (!newTitle.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`${API}?ticker=${activeTicker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "thread", thread: { title: newTitle.trim(), body: newBody.trim() } }),
      });
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
      setNewTitle(""); setNewBody(""); setShowCompose(false);
    } catch (e) {}
    setPosting(false);
  };

  const postComment = async (threadId) => {
    const text = newComment[threadId]?.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`${API}?ticker=${activeTicker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", threadId, comment: text }),
      });
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
      setNewComment(prev => ({ ...prev, [threadId]: "" }));
    } catch (e) {}
    setPosting(false);
  };

  const handleVote = async (targetId, dir) => {
    const current = votes[targetId];
    if (current === dir) return;
    setVotes(prev => ({ ...prev, [targetId]: dir }));
    try {
      const res = await fetch(`${API}?ticker=${activeTicker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "vote", targetId, dir }),
      });
      const data = await res.json();
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const getScore = (item, id) => {
    const vote = votes[id];
    let score = (item.upvotes || 0) - (item.downvotes || 0);
    if (vote === "up") score += 1;
    if (vote === "down") score -= 1;
    return score;
  };

  return (
    <div style={{animation:"fu 0.3s ease",maxWidth:800,margin:"0 auto",padding:"32px 20px 60px"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",marginBottom:6}}>ORBIT <span style={{color:"#a78bfa"}}>THREADS</span></div>
        <p style={{fontSize:12,color:"#aab8c2",lineHeight:1.6}}>Discuss any space stock. No account needed — just post.</p>
      </div>

      {/* Ticker selector */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:20,paddingBottom:16,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        {TICKER_LIST.map(t => {
          const isActive = activeTicker === t;
          return (
            <button key={t} onClick={() => switchTicker(t)}
              style={{background:isActive?"rgba(167,139,250,0.12)":"transparent",border:`1px solid ${isActive?"rgba(167,139,250,0.4)":"rgba(255,255,255,0.08)"}`,color:isActive?"#a78bfa":"#aab8c2",padding:"4px 10px",borderRadius:20,fontSize:11,fontFamily:"'DM Mono',monospace",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>
              {t}
            </button>
          );
        })}
      </div>

      {openThread === null ? (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:11,color:"#aab8c2"}}>{loading ? "Loading..." : `${threads.length} thread${threads.length!==1?"s":""} on `}<span style={{color:"#a78bfa",fontWeight:700}}>{!loading&&activeTicker}</span></div>
            <button onClick={() => setShowCompose(c => !c)}
              style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.3)",color:"#a78bfa",padding:"7px 14px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",cursor:"pointer",letterSpacing:"0.06em"}}>
              {showCompose ? "Cancel" : "+ New Thread"}
            </button>
          </div>

          {showCompose && (
            <div style={{background:"rgba(167,139,250,0.04)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:8,padding:"16px",marginBottom:16,animation:"fu 0.2s ease"}}>
              <div style={{fontSize:9,color:"#a78bfa",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>New thread · {activeTicker}</div>
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Thread title..." style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",padding:"9px 12px",borderRadius:4,fontSize:13,fontFamily:"'DM Mono',monospace",outline:"none",marginBottom:8}}/>
              <textarea value={newBody} onChange={e=>setNewBody(e.target.value)} placeholder="Your thoughts... (optional)" rows={3} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",padding:"9px 12px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace",outline:"none",resize:"vertical",display:"block",marginBottom:10}}/>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                <button onClick={()=>{setShowCompose(false);setNewTitle("");setNewBody("");}} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",color:"#aab8c2",padding:"7px 14px",borderRadius:4,fontSize:11,fontFamily:"'DM Mono',monospace",cursor:"pointer"}}>Cancel</button>
                <button onClick={postThread} disabled={posting} style={{background:"#a78bfa",color:"#04060e",border:"none",padding:"7px 18px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",cursor:"pointer",opacity:posting?0.6:1}}>{posting?"Posting...":"Post Thread →"}</button>
              </div>
            </div>
          )}

          {loading && Array.from({length:3}).map((_,i)=>(
            <div key={i} style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,padding:"16px",marginBottom:8}}>
              <div className="skeleton" style={{height:12,width:"60%",marginBottom:8}}/>
              <div className="skeleton" style={{height:10,width:"40%"}}/>
            </div>
          ))}

          {!loading && threads.length === 0 && (
            <div style={{textAlign:"center",padding:"48px 20px",color:"#aab8c2",fontSize:13}}>
              <div style={{fontSize:28,marginBottom:12,opacity:0.3}}>💬</div>
              No threads yet for {activeTicker}.<br/>
              <span style={{color:"#a78bfa",cursor:"pointer"}} onClick={()=>setShowCompose(true)}>Start the first one →</span>
            </div>
          )}

          {!loading && threads.map(thread => {
            const score = getScore(thread, thread.id);
            const vote = votes[thread.id];
            return (
              <div key={thread.id} style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,padding:"16px",marginBottom:8,background:"rgba(255,255,255,0.01)",transition:"border-color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(167,139,250,0.2)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
                <div style={{display:"flex",gap:12}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:28,paddingTop:2}}>
                    <button onClick={e=>{e.stopPropagation();handleVote(thread.id,"up");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:vote==="up"?"#00ff88":"#556",lineHeight:1,padding:0}}>▲</button>
                    <span style={{fontSize:12,fontWeight:600,color:score>0?"#00ff88":score<0?"#ff4466":"#aab8c2"}}>{score}</span>
                    <button onClick={e=>{e.stopPropagation();handleVote(thread.id,"down");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:vote==="down"?"#ff4466":"#556",lineHeight:1,padding:0}}>▼</button>
                  </div>
                  <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>setOpenThread(thread.id)}>
                    <div style={{fontSize:9,color:"#aab8c2",marginBottom:5}}><span style={{color:"#a78bfa"}}>{thread.author}</span> · {formatTime(thread.time)}</div>
                    <div style={{fontSize:14,color:"#fff",fontWeight:500,marginBottom:6,lineHeight:1.4}}>{thread.title}</div>
                    {thread.body && <div style={{fontSize:12,color:"#aab8c2",lineHeight:1.6,marginBottom:8}}>{thread.body}</div>}
                    <div style={{fontSize:11,color:"#556"}}>💬 {thread.comments?.length||0} comment{(thread.comments?.length||0)!==1?"s":""} · <span style={{color:"#a78bfa"}}>view thread →</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        (() => {
          const thread = threads.find(t => t.id === openThread);
          if (!thread) return null;
          const score = getScore(thread, thread.id);
          const vote = votes[thread.id];
          return (
            <div style={{animation:"fu 0.2s ease"}}>
              <button onClick={()=>setOpenThread(null)} style={{background:"none",border:"none",color:"#a78bfa",fontSize:12,fontFamily:"'DM Mono',monospace",cursor:"pointer",padding:"0 0 16px",display:"flex",alignItems:"center",gap:6}}>← Back to {activeTicker} threads</button>
              <div style={{border:"1px solid rgba(167,139,250,0.2)",borderRadius:8,padding:"20px",marginBottom:16,background:"rgba(167,139,250,0.03)"}}>
                <div style={{display:"flex",gap:14}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:28,paddingTop:2}}>
                    <button onClick={()=>handleVote(thread.id,"up")} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:vote==="up"?"#00ff88":"#556",lineHeight:1,padding:0}}>▲</button>
                    <span style={{fontSize:13,fontWeight:600,color:score>0?"#00ff88":score<0?"#ff4466":"#aab8c2"}}>{score}</span>
                    <button onClick={()=>handleVote(thread.id,"down")} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:vote==="down"?"#ff4466":"#556",lineHeight:1,padding:0}}>▼</button>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:"#aab8c2",marginBottom:6}}><span style={{color:"#a78bfa"}}>{thread.author}</span> · {formatTime(thread.time)} · <span style={{color:"#00ff88",background:"rgba(0,255,136,0.06)",padding:"1px 6px",borderRadius:3}}>{activeTicker}</span></div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",marginBottom:10,lineHeight:1.3}}>{thread.title}</div>
                    {thread.body && <div style={{fontSize:13,color:"#ccd0d8",lineHeight:1.7}}>{thread.body}</div>}
                  </div>
                </div>
              </div>

              <div style={{fontSize:9,color:"#aab8c2",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>{thread.comments?.length||0} comment{(thread.comments?.length||0)!==1?"s":""}</div>

              {(thread.comments||[]).map(comment => {
                const cscore = getScore(comment, comment.id);
                const cvote = votes[comment.id];
                return (
                  <div key={comment.id} style={{borderLeft:"2px solid rgba(167,139,250,0.15)",paddingLeft:14,marginBottom:14}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:22,paddingTop:2}}>
                        <button onClick={()=>handleVote(comment.id,"up")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:cvote==="up"?"#00ff88":"#556",lineHeight:1,padding:0}}>▲</button>
                        <span style={{fontSize:10,color:cscore>0?"#00ff88":cscore<0?"#ff4466":"#aab8c2"}}>{cscore}</span>
                        <button onClick={()=>handleVote(comment.id,"down")} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:cvote==="down"?"#ff4466":"#556",lineHeight:1,padding:0}}>▼</button>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,color:"#aab8c2",marginBottom:4}}><span style={{color:"#a78bfa"}}>{comment.author}</span> · {formatTime(comment.time)}</div>
                        <div style={{fontSize:13,color:"#ccd0d8",lineHeight:1.6}}>{comment.body}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{marginTop:16,display:"flex",gap:8}}>
                <input value={newComment[thread.id]||""} onChange={e=>setNewComment(prev=>({...prev,[thread.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&postComment(thread.id)} placeholder="Add a comment..." style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",padding:"9px 12px",borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace",outline:"none"}}/>
                <button onClick={()=>postComment(thread.id)} disabled={posting} style={{background:"#a78bfa",color:"#04060e",border:"none",padding:"9px 16px",borderRadius:4,fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace",cursor:"pointer",whiteSpace:"nowrap",opacity:posting?0.6:1}}>{posting?"...":"Reply →"}</button>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
