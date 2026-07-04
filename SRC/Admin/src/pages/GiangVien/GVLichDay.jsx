import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'

// ── Timetable helpers (giống LichHocManagement) ──
const fmt = d => { if (!d) return ''; if (typeof d === 'string') return d.slice(0,10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const DAY_FULL = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7']
const HOUR_START = 7, HOUR_END = 18, SLOT_MIN = 60
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * (60 / SLOT_MIN)
const SLOT_H = 26

const timeToSlot = t => { if (!t) return 0; const [h,m] = t.slice(0,5).split(':').map(Number); return (h-HOUR_START)*(60/SLOT_MIN)+m/SLOT_MIN }
const slotLabel  = s => { const tot=HOUR_START*60+s*SLOT_MIN; return `${String(Math.floor(tot/60)).padStart(2,'0')}:${String(tot%60).padStart(2,'0')}` }

const getWeekDates = base => {
  const d=new Date(base), day=d.getDay(), mon=new Date(d)
  mon.setDate(d.getDate()-(day===0?6:day-1))
  return Array.from({length:7},(_,i)=>{ const dt=new Date(mon); dt.setDate(mon.getDate()+i); return dt })
}

const LOAI_COLOR = {
  ly_thuyet: { bg:'#dbeafe', border:'#3b82f6', text:'#1d4ed8' },
  thuc_hanh: { bg:'#dcfce7', border:'#22c55e', text:'#15803d' },
}

const GVLichDay = () => {
  const { token, backendUrl } = useAdmin()
  const headers = { Authorization: `Bearer ${token}` }
  const [lichHoc, setLichHoc] = useState([])
  const [loading, setLoading] = useState(true)
  const [base, setBase]       = useState(new Date())
  const [viewItem, setViewItem] = useState(null)

  const weekDates = getWeekDates(base)
  const fromDate  = fmt(weekDates[0])
  const toDate    = fmt(weekDates[6])

  useEffect(() => {
    setLoading(true)
    axios.get(`${backendUrl}/api/giang-vien/lich-theo-tuan`, {
      headers, params: { from: fromDate, to: toDate }
    })
      .then(r => { if (r.data.success) setLichHoc(r.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fromDate, toDate])

  const getLichByDate = date => lichHoc.filter(l => l.ngay_hoc === fmt(date))
  const isToday = date => fmt(date) === fmt(new Date())

  const getEventStyle = lh => {
    const top = timeToSlot(lh.gio_bat_dau)
    const h   = Math.max(timeToSlot(lh.gio_ket_thuc) - top, 1)
    return { top: `${top*SLOT_H}px`, height: `${h*SLOT_H-4}px` }
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>🗓️ Lịch Dạy Của Tôi</h2><p>Thời khóa biểu các lớp được phân công</p></div>
      </div>

      {/* Nav tuần */}
      <div className="lich-toolbar">
        <div className="week-nav">
          <button className="btn btn-outline btn-sm" onClick={() => { const d=new Date(base); d.setDate(d.getDate()-7); setBase(d) }}>‹ Tuần trước</button>
          <span className="week-label">{weekDates[0].getDate()}/{weekDates[0].getMonth()+1} — {weekDates[6].getDate()}/{weekDates[6].getMonth()+1}/{weekDates[6].getFullYear()}</span>
          <button className="btn btn-outline btn-sm" onClick={() => setBase(new Date())}>Hôm nay</button>
          <button className="btn btn-outline btn-sm" onClick={() => { const d=new Date(base); d.setDate(d.getDate()+7); setBase(d) }}>Tuần sau ›</button>
        </div>
      </div>

      {/* Timetable */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'auto',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
        <div style={{minWidth:700}}>
          {/* Header */}
          <div style={{display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',borderBottom:'2px solid #e2e8f0',position:'sticky',top:0,background:'#fff',zIndex:10}}>
            <div style={{padding:'10px 6px'}} />
            {weekDates.map((date,i) => (
              <div key={i} style={{padding:'10px 6px',textAlign:'center',borderRight:'1px solid #f1f5f9',background:isToday(date)?'#eff6ff':''}}>
                <span style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',textTransform:'uppercase'}}>{DAY_FULL[date.getDay()]}</span>
                <span style={{display:'block',fontSize:16,fontWeight:800,color:isToday(date)?'#0d47a1':'#1a202c',marginTop:2}}>{date.getDate()}/{date.getMonth()+1}</span>
              </div>
            ))}
          </div>

          {/* Body */}
          {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
            <div style={{display:'grid',gridTemplateColumns:'52px repeat(7,1fr)'}}>
              {/* Cột giờ */}
              <div style={{position:'relative',borderRight:'1px solid #e2e8f0',height:`${(TOTAL_SLOTS+1)*SLOT_H}px`}}>
                {Array.from({length:TOTAL_SLOTS+1},(_,i) => (
                  <div key={i} style={{position:'absolute',top:`${i*SLOT_H}px`,right:4,fontSize:10,color:'#9ca3af',fontWeight:600,paddingTop:2}}>{slotLabel(i)}</div>
                ))}
                {Array.from({length:TOTAL_SLOTS+1},(_,i) => (
                  <div key={`l${i}`} style={{position:'absolute',top:`${i*SLOT_H}px`,left:0,right:0,borderTop:'1px solid #e2e8f0'}} />
                ))}
              </div>
              {/* 7 cột ngày */}
              {weekDates.map((date,di) => {
                const items = getLichByDate(date)
                return (
                  <div key={di} style={{position:'relative',height:`${(TOTAL_SLOTS+1)*SLOT_H}px`,borderRight:'1px solid #f1f5f9',background:isToday(date)?'#fafcff':''}}>
                    {Array.from({length:TOTAL_SLOTS+1},(_,i) => (
                      <div key={i} style={{position:'absolute',top:`${i*SLOT_H}px`,left:0,right:0,borderTop:'1px solid #e2e8f0'}} />
                    ))}
                    {items.map(lh => {
                      const c = LOAI_COLOR[lh.loai_buoi] || LOAI_COLOR.ly_thuyet
                      const s = getEventStyle(lh)
                      return (
                        <div key={lh.id} onClick={() => setViewItem(lh)}
                          style={{position:'absolute',left:3,right:3,...s,background:c.bg,borderLeft:`3px solid ${c.border}`,borderRadius:6,padding:'3px 6px',cursor:'pointer',overflow:'hidden',zIndex:2}}>
                          <p style={{fontSize:10,fontWeight:700,color:c.text,margin:0}}>{lh.gio_bat_dau?.slice(0,5)}–{lh.gio_ket_thuc?.slice(0,5)}</p>
                          <p style={{fontSize:11,fontWeight:700,color:c.text,margin:'1px 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lh.lop_hoc?.ten_lop}</p>
                          <p style={{fontSize:10,color:c.border,margin:0}}>{lh.loai_buoi==='ly_thuyet'?'📖 LT':'🚗 TH'}{lh.dia_diem?` · ${lh.dia_diem}`:''}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:12,padding:'8px 0',flexWrap:'wrap'}}>
        <span style={{padding:'4px 10px',borderRadius:6,fontSize:12,fontWeight:600,background:'#dbeafe',borderLeft:'3px solid #3b82f6'}}>📖 Lý thuyết</span>
        <span style={{padding:'4px 10px',borderRadius:6,fontSize:12,fontWeight:600,background:'#dcfce7',borderLeft:'3px solid #22c55e'}}>🚗 Thực hành</span>
        <span style={{fontSize:12,color:'#9ca3af'}}>Nhấn vào buổi học để xem chi tiết</span>
      </div>

      {/* Modal xem chi tiết */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Chi Tiết Buổi Dạy</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{textAlign:'center',padding:'14px',background:'#f0f4ff',borderRadius:10,marginBottom:16}}>
                <div style={{fontSize:28}}>{viewItem.loai_buoi==='ly_thuyet'?'📖':'🚗'}</div>
                <h3 style={{margin:'6px 0 0'}}>{viewItem.lop_hoc?.ten_lop}</h3>
                <span className={`badge ${viewItem.loai_buoi==='ly_thuyet'?'badge-info':'badge-success'}`}>
                  {viewItem.loai_buoi==='ly_thuyet'?'📖 Lý thuyết':'🚗 Thực hành'}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  ['📅 Ngày dạy', new Date(viewItem.ngay_hoc).toLocaleDateString('vi-VN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})],
                  ['⏰ Giờ dạy',  `${viewItem.gio_bat_dau?.slice(0,5)} – ${viewItem.gio_ket_thuc?.slice(0,5)}`],
                  ['📍 Địa điểm', viewItem.dia_diem || '—'],
                  ['🏫 Lớp học',  viewItem.lop_hoc?.ten_lop || '—'],
                  ...(viewItem.xe ? [['🚗 Xe thực hành', `${viewItem.xe.bien_so} — ${viewItem.xe.hang_xe} ${viewItem.xe.dong_xe}`]] : []),
                ].map(([k,v],i) => (
                  <div key={i} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px'}}>
                    <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',marginBottom:4}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'#111827'}}>{v}</div>
                  </div>
                ))}
              </div>
              {viewItem.noi_dung && (
                <div style={{marginTop:12,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',marginBottom:4}}>📝 Nội dung</div>
                  <div style={{fontSize:13,color:'#374151'}}>{viewItem.noi_dung}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GVLichDay
