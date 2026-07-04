import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useTeacher } from '../../context/TeacherContext'
import './Dashboard.css'

// ── Timetable helpers ──
const fmtD = d => { if (!d) return ''; if (typeof d === 'string') return d.slice(0,10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const DAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const HS = 7, HE = 18, SM = 60, SH = 26
const TS = (HE - HS) * (60 / SM)
const t2s = t => { if (!t) return 0; const [h, m] = t.slice(0, 5).split(':').map(Number); return (h - HS) * (60 / SM) + m / SM }
const s2l = s => { const tot = HS * 60 + s * SM; return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}` }
const getWD = base => {
  const d = new Date(base), day = d.getDay(), mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => { const dt = new Date(mon); dt.setDate(mon.getDate() + i); return dt })
}
const LC = {
  ly_thuyet: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  thuc_hanh: { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
}

const Dashboard = () => {
  const { token, teacherInfo, backendUrl } = useTeacher()
  const [lopHoc, setLopHoc]         = useState([])
  const [lichHomNay, setLichHomNay] = useState([])
  const [lichTuan, setLichTuan]     = useState([])
  const [base, setBase]             = useState(new Date())
  const [loading, setLoading]       = useState(true)
  const headers = { Authorization: `Bearer ${token}` }

  const weekDates = getWD(base)
  const fromDate  = fmtD(weekDates[0])
  const toDate    = fmtD(weekDates[6])

  useEffect(() => {
    Promise.all([
      axios.get(`${backendUrl}/api/giang-vien/lop-cua-toi`, { headers }),
      axios.get(`${backendUrl}/api/giang-vien/lich-hom-nay`, { headers }),
    ]).then(([r1, r2]) => {
      if (r1.data.success) setLopHoc(r1.data.data)
      if (r2.data.success) setLichHomNay(r2.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    axios.get(`${backendUrl}/api/giang-vien/lich-theo-tuan`, {
      headers, params: { from: fromDate, to: toDate }
    }).then(r => { if (r.data.success) setLichTuan(r.data.data) }).catch(() => {})
  }, [fromDate, toDate])

  const getLichByDate = date => lichTuan.filter(l => l.ngay_hoc === fmtD(date))
  const isToday = date => fmtD(date) === fmtD(new Date())
  const getES = lh => {
    const top = t2s(lh.gio_bat_dau)
    const h = Math.max(t2s(lh.gio_ket_thuc) - top, 1)
    return { top: `${top * SH}px`, height: `${h * SH - 4}px` }
  }

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  const lopDangHoc = lopHoc.filter(l => l.trang_thai === 'dang_hoc').length
  const tongHV = lopHoc.reduce((s, l) => s + (l.hoc_vien_count || 0), 0)

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  return (
    <div className="tv-dashboard">
      {/* Greeting */}
      <div className="tv-greeting">
        <div>
          <h2>{greeting}, <span>{teacherInfo?.ho_ten?.split(' ').pop()}!</span> 👋</h2>
          <p>Đây là tổng quan hoạt động giảng dạy của bạn hôm nay.</p>
        </div>
        <div className="tv-greeting-date">
          {now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div className="tv-stats">
        {[
          { icon: '🏫', label: 'Lớp đang dạy',  value: lopDangHoc,        color: 'green'  },
          { icon: '👥', label: 'Tổng học viên', value: tongHV,             color: 'blue'   },
          { icon: '📚', label: 'Tổng lớp',       value: lopHoc.length,     color: 'purple' },
          { icon: '📅', label: 'Buổi hôm nay',  value: lichHomNay.length,  color: 'orange' },
        ].map((s, i) => (
          <div key={i} className={`tv-stat-card ${s.color}`}>
            <span className="tv-stat-icon">{s.icon}</span>
            <div>
              <p className="tv-stat-value">{s.value}</p>
              <p className="tv-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Thời khóa biểu tuần */}
      <div className="card">
        <div className="card-header">
          <h3>🗓️ Thời Khóa Biểu Tuần</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm"
              onClick={() => { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d) }}>‹ Trước</button>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>
              {weekDates[0].getDate()}/{weekDates[0].getMonth() + 1} — {weekDates[6].getDate()}/{weekDates[6].getMonth() + 1}/{weekDates[6].getFullYear()}
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => setBase(new Date())}>Hôm nay</button>
            <button className="btn btn-outline btn-sm"
              onClick={() => { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d) }}>Sau ›</button>
            <Link to="/lich-hoc" className="btn btn-primary btn-sm">Xem đầy đủ →</Link>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ minWidth: 700 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ padding: '8px 4px' }} />
              {weekDates.map((date, i) => (
                <div key={i} style={{ padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #f1f5f9', background: isToday(date) ? '#eff6ff' : '' }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{DAY_SHORT[date.getDay()]}</span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: isToday(date) ? '#0d47a1' : '#1a202c' }}>{date.getDate()}/{date.getMonth() + 1}</span>
                </div>
              ))}
            </div>
            {/* Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)' }}>
              {/* Cột giờ */}
              <div style={{ position: 'relative', borderRight: '1px solid #e2e8f0', height: `${(TS + 1) * SH}px` }}>
                {Array.from({ length: TS + 1 }, (_, i) => (
                  <div key={i} style={{ position: 'absolute', top: `${i * SH}px`, right: 3, fontSize: 9, color: '#9ca3af', fontWeight: 600, paddingTop: 2 }}>{s2l(i)}</div>
                ))}
                {Array.from({ length: TS + 1 }, (_, i) => (
                  <div key={`l${i}`} style={{ position: 'absolute', top: `${i * SH}px`, left: 0, right: 0, borderTop: '1px solid #e2e8f0' }} />
                ))}
              </div>
              {/* 7 cột ngày */}
              {weekDates.map((date, di) => {
                const items = getLichByDate(date)
                return (
                  <div key={di} style={{ position: 'relative', height: `${(TS + 1) * SH}px`, borderRight: '1px solid #f1f5f9', background: isToday(date) ? '#fafcff' : '' }}>
                    {Array.from({ length: TS + 1 }, (_, i) => (
                      <div key={i} style={{ position: 'absolute', top: `${i * SH}px`, left: 0, right: 0, borderTop: '1px solid #e2e8f0' }} />
                    ))}
                    {items.map(lh => {
                      const c = LC[lh.loai_buoi] || LC.ly_thuyet
                      const s = getES(lh)
                      return (
                        <div key={lh.id} style={{ position: 'absolute', left: 2, right: 2, ...s, background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: 5, padding: '2px 5px', overflow: 'hidden', zIndex: 2 }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: c.text, margin: 0 }}>{lh.gio_bat_dau?.slice(0, 5)}–{lh.gio_ket_thuc?.slice(0, 5)}</p>
                          <p style={{ fontSize: 10, fontWeight: 700, color: c.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lh.lop_hoc?.ten_lop}</p>
                          <p style={{ fontSize: 9, color: c.border, margin: 0 }}>{lh.loai_buoi === 'ly_thuyet' ? '📖 LT' : '🚗 TH'}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, padding: '10px 16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#dbeafe', borderLeft: '3px solid #3b82f6' }}>📖 Lý thuyết</span>
          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#dcfce7', borderLeft: '3px solid #22c55e' }}>🚗 Thực hành</span>
        </div>
      </div>

      {/* Lịch dạy hôm nay */}
      <div className="card">
        <div className="card-header">
          <h3>📅 Lịch Dạy Hôm Nay</h3>
          <Link to="/lich-hoc" className="btn btn-success btn-sm">✅ Điểm danh →</Link>
        </div>
        <div className="card-body">
          {lichHomNay.length === 0 ? (
            <div className="empty-state">
              <span>🎉</span>
              <p>Hôm nay bạn không có lịch dạy. Hãy nghỉ ngơi!</p>
            </div>
          ) : (
            <div className="tv-lich-list">
              {lichHomNay.map(lh => (
                <div key={lh.id} className={`tv-lich-item ${lh.loai_buoi}`}>
                  <div className="tv-lich-time">
                    <span>{lh.gio_bat_dau?.slice(0, 5)}</span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>
                    <span>{lh.gio_ket_thuc?.slice(0, 5)}</span>
                  </div>
                  <div className="tv-lich-info">
                    <p className="tv-lich-lop">{lh.lop_hoc?.ten_lop}</p>
                    <p className="tv-lich-type">{lh.loai_buoi === 'ly_thuyet' ? '📖 Lý thuyết' : '🚗 Thực hành'}</p>
                    {lh.dia_diem && <p className="tv-lich-dia">📍 {lh.dia_diem}</p>}
                  </div>
                  <Link to="/lich-hoc" className="btn btn-success btn-sm">✅ Điểm danh</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lớp được phân công */}
      <div className="card">
        <div className="card-header">
          <h3>🏫 Lớp Được Phân Công ({lopHoc.length})</h3>
          <Link to="/lop-hoc" className="btn btn-outline btn-sm">Xem tất cả →</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {lopHoc.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span>🏫</span><p>Chưa được phân công lớp nào</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Tên lớp</th><th>Khóa học</th><th>Học viên</th><th>Khai giảng</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {lopHoc.map(lop => (
                  <tr key={lop.id}>
                    <td><strong>{lop.ten_lop}</strong></td>
                    <td style={{ fontSize: 12, color: '#718096' }}>{lop.khoa_hoc?.ten_khoa}</td>
                    <td>{lop.hoc_vien_count || 0} HV</td>
                    <td style={{ fontSize: 12 }}>{lop.ngay_khai_giang ? new Date(lop.ngay_khai_giang).toLocaleDateString('vi-VN') : '—'}</td>
                    <td>
                      <span className={`badge ${lop.trang_thai === 'dang_hoc' ? 'badge-success' : 'badge-info'}`}>
                        {lop.trang_thai === 'dang_hoc' ? '🟢 Đang học' : '🔵 Chuẩn bị'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
