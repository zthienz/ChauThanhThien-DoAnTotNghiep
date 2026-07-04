import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useTeacher } from '../../context/TeacherContext'
import './GVLichHoc.css'

// ── Helpers ──
const fmt = d => { if (!d) return ''; if (typeof d === 'string') return d.slice(0,10); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const DAY_FULL  = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const HOUR_START = 7, HOUR_END = 18, SLOT_MIN = 60
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * (60 / SLOT_MIN)
const SLOT_H = 26

const timeToSlot = t => { if (!t) return 0; const [h, m] = t.slice(0, 5).split(':').map(Number); return (h - HOUR_START) * (60 / SLOT_MIN) + m / SLOT_MIN }
const slotLabel  = s => { const tot = HOUR_START * 60 + s * SLOT_MIN; return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}` }

const getWeekDates = base => {
  const d = new Date(base), day = d.getDay(), mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => { const dt = new Date(mon); dt.setDate(mon.getDate() + i); return dt })
}

const LOAI_COLOR = {
  ly_thuyet: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8', label: '📖 Lý thuyết' },
  thuc_hanh: { bg: '#dcfce7', border: '#22c55e', text: '#15803d', label: '🚗 Thực hành' },
}

const GVLichHoc = () => {
  const { token, teacherInfo, backendUrl } = useTeacher()
  const [lichHoc, setLichHoc]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [base, setBase]                   = useState(new Date())
  const [viewItem, setViewItem]           = useState(null)

  // Điểm danh
  const [showDiemDanh, setShowDiemDanh]   = useState(false)
  const [selectedLich, setSelectedLich]   = useState(null)
  const [diemDanhData, setDiemDanhData]   = useState([])
  const [ddLoading, setDdLoading]         = useState(false)
  const [saving, setSaving]               = useState(false)

  const headers    = { Authorization: `Bearer ${token}` }
  const chuyenMon  = teacherInfo?.chuyen_mon  // 'ly_thuyet' | 'thuc_hanh' | 'ca_hai'
  const isThucHanh = chuyenMon === 'thuc_hanh' || chuyenMon === 'ca_hai'

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
    return { top: `${top * SLOT_H}px`, height: `${h * SLOT_H - 4}px` }
  }

  // Mở form điểm danh
  const openDiemDanh = async lh => {
    setSelectedLich(lh)
    setDdLoading(true)
    setShowDiemDanh(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/lich-hoc/${lh.id}/diem-danh`, { headers })
      if (res.data.success) {
        setDiemDanhData(res.data.data.map(d => ({
          ...d, co_mat: d.co_mat || false, km_chay: d.km_chay || '', ghi_chu: d.ghi_chu || ''
        })))
      } else {
        toast.error(res.data.message || 'Không có quyền')
        setShowDiemDanh(false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách')
      setShowDiemDanh(false)
    }
    setDdLoading(false)
  }

  // Kiểm tra học viên đã đủ tiến độ cho buổi học này không
  const isDuTienDo = (d, loaiBuoi) => {
    if (loaiBuoi === 'ly_thuyet') return d.du_buoi_ly_thuyet === true
    if (loaiBuoi === 'thuc_hanh') return d.du_km_thuc_hanh === true
    return false
  }

  const handleSaveDiemDanh = async () => {
    setSaving(true)
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/lich-hoc/${selectedLich.id}/diem-danh`,
        { diem_danh: diemDanhData.map(d => ({ ho_so_id: d.ho_so_id, co_mat: d.co_mat, km_chay: d.km_chay || null, ghi_chu: d.ghi_chu || null })) },
        { headers }
      )
      if (res.data.success) { toast.success('Điểm danh thành công!'); setShowDiemDanh(false) }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
    setSaving(false)
  }

  const coMatCount = diemDanhData.filter(d => !isDuTienDo(d, selectedLich?.loai_buoi) && d.co_mat).length
  const canDiemDanhList = diemDanhData.filter(d => !isDuTienDo(d, selectedLich?.loai_buoi))
  const duTienDoList    = diemDanhData.filter(d =>  isDuTienDo(d, selectedLich?.loai_buoi))

  return (
    <div className="gvlh2-page">
      <div className="page-header">
        <div>
          <h2>🗓️ Lịch Dạy Của Tôi</h2>
          <p>Thời khóa biểu các lớp được phân công giảng dạy</p>
        </div>
      </div>

      {/* Nav tuần */}
      <div className="gvlh2-toolbar">
        <div className="gvlh2-week-nav">
          <button className="btn btn-outline btn-sm"
            onClick={() => { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d) }}>
            ‹ Tuần trước
          </button>
          <span className="gvlh2-week-label">
            {weekDates[0].getDate()}/{weekDates[0].getMonth() + 1} — {weekDates[6].getDate()}/{weekDates[6].getMonth() + 1}/{weekDates[6].getFullYear()}
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setBase(new Date())}>Hôm nay</button>
          <button className="btn btn-outline btn-sm"
            onClick={() => { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d) }}>
            Tuần sau ›
          </button>
        </div>
      </div>

      {/* ── DANH SÁCH BUỔI DẠY TRONG TUẦN ── */}
      <div className="card">
        <div className="card-header">
          <h3>📋 Danh Sách Buổi Dạy Trong Tuần ({lichHoc.length} buổi)</h3>
          <span style={{ fontSize: 12, color: '#718096' }}>Sắp xếp theo ngày &amp; giờ</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : lichHoc.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span>🎉</span><p>Không có buổi dạy nào trong tuần này</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Thứ</th>
                  <th>Giờ</th>
                  <th>Lớp học</th>
                  <th>Loại</th>
                  <th>Địa điểm</th>
                  {isThucHanh && <th>Xe</th>}
                  <th>Điểm danh</th>
                </tr>
              </thead>
              <tbody>
                {[...lichHoc]
                  .sort((a, b) => (a.ngay_hoc + ' ' + (a.gio_bat_dau || '')).localeCompare(b.ngay_hoc + ' ' + (b.gio_bat_dau || '')))
                  .map(lh => {
                    const c    = LOAI_COLOR[lh.loai_buoi] || LOAI_COLOR.ly_thuyet
                    const ngay = new Date(lh.ngay_hoc)
                    const isHN = fmt(ngay) === fmt(new Date())
                    return (
                      <tr key={lh.id} style={isHN ? { background: '#f0fdf4' } : {}}>
                        <td>
                          <strong style={{ color: isHN ? '#059669' : '#1a202c' }}>
                            {ngay.getDate()}/{ngay.getMonth() + 1}/{ngay.getFullYear()}
                          </strong>
                          {isHN && <span className="badge badge-success" style={{ marginLeft: 6, fontSize: 10 }}>Hôm nay</span>}
                        </td>
                        <td style={{ fontSize: 12, color: '#718096' }}>{DAY_FULL[ngay.getDay()]}</td>
                        <td style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {lh.gio_bat_dau?.slice(0, 5)} – {lh.gio_ket_thuc?.slice(0, 5)}
                        </td>
                        <td>
                          <strong style={{ fontSize: 13 }}>{lh.lop_hoc?.ten_lop}</strong>
                          {lh.lop_hoc?.khoa_hoc?.ten_khoa && (
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{lh.lop_hoc.khoa_hoc.ten_khoa}</p>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, borderLeft: `3px solid ${c.border}` }}>
                            {c.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#374151' }}>{lh.dia_diem || '—'}</td>
                        {isThucHanh && (
                          <td style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{lh.xe?.bien_so || '—'}</td>
                        )}
                        <td>
                          <button className="btn btn-success btn-sm" onClick={() => openDiemDanh(lh)}>
                            ✅ Điểm danh
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Timetable */}
      <div className="gvlh2-timetable-wrap">
        <div className="gvlh2-timetable">
          {/* Header */}
          <div className="gvlh2-tt-header">
            <div className="gvlh2-time-col" />
            {weekDates.map((date, i) => (
              <div key={i} className={`gvlh2-day-header ${isToday(date) ? 'today' : ''}`}>
                <span className="gvlh2-day-name">{DAY_FULL[date.getDay()]}</span>
                <span className={`gvlh2-day-num ${isToday(date) ? 'today-num' : ''}`}>
                  {date.getDate()}/{date.getMonth() + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Body */}
          {loading ? (
            <div className="loading-wrap"><div className="spinner" /></div>
          ) : (
            <div className="gvlh2-tt-body">
              {/* Cột giờ */}
              <div className="gvlh2-time-col" style={{ height: `${(TOTAL_SLOTS + 1) * SLOT_H}px`, position: 'relative' }}>
                {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => (
                  <div key={i} className="gvlh2-time-label" style={{ top: `${i * SLOT_H}px` }}>{slotLabel(i)}</div>
                ))}
                {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => (
                  <div key={`l${i}`} className="gvlh2-hline" style={{ top: `${i * SLOT_H}px` }} />
                ))}
              </div>

              {/* 7 cột ngày */}
              {weekDates.map((date, di) => {
                const items = getLichByDate(date)
                return (
                  <div key={di} className={`gvlh2-day-col ${isToday(date) ? 'today-col' : ''}`}
                    style={{ height: `${(TOTAL_SLOTS + 1) * SLOT_H}px`, position: 'relative' }}>
                    {Array.from({ length: TOTAL_SLOTS + 1 }, (_, i) => (
                      <div key={i} className="gvlh2-hline" style={{ top: `${i * SLOT_H}px` }} />
                    ))}
                    {items.map(lh => {
                      const c = LOAI_COLOR[lh.loai_buoi] || LOAI_COLOR.ly_thuyet
                      const s = getEventStyle(lh)
                      return (
                        <div key={lh.id} className="gvlh2-event"
                          style={{ ...s, background: c.bg, borderLeft: `3px solid ${c.border}` }}
                          onClick={() => setViewItem(lh)}>
                          <p className="gvlh2-ev-time" style={{ color: c.text }}>
                            {lh.gio_bat_dau?.slice(0, 5)}–{lh.gio_ket_thuc?.slice(0, 5)}
                          </p>
                          <p className="gvlh2-ev-lop" style={{ color: c.text }}>{lh.lop_hoc?.ten_lop}</p>
                          <p className="gvlh2-ev-type" style={{ color: c.border }}>
                            {lh.loai_buoi === 'ly_thuyet' ? '📖 LT' : '🚗 TH'}
                            {lh.dia_diem ? ` · ${lh.dia_diem}` : ''}
                          </p>
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
      <div className="gvlh2-legend">
        <span className="gvlh2-legend-item" style={{ borderLeft: '3px solid #3b82f6', background: '#dbeafe' }}>📖 Lý thuyết</span>
        <span className="gvlh2-legend-item" style={{ borderLeft: '3px solid #22c55e', background: '#dcfce7' }}>🚗 Thực hành</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>Nhấn vào buổi học để xem chi tiết</span>
      </div>

      {/* ── MODAL ĐIỂM DANH ── */}
      {showDiemDanh && selectedLich && (
        <div className="modal-overlay" onClick={() => setShowDiemDanh(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>✅ Điểm Danh — {selectedLich.lop_hoc?.ten_lop}</h3>
                <p style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>
                  {new Date(selectedLich.ngay_hoc).toLocaleDateString('vi-VN')} &nbsp;|&nbsp;
                  {selectedLich.gio_bat_dau?.slice(0, 5)}–{selectedLich.gio_ket_thuc?.slice(0, 5)} &nbsp;|&nbsp;
                  {selectedLich.loai_buoi === 'ly_thuyet' ? '📖 Lý thuyết' : '🚗 Thực hành'}
                  {selectedLich.dia_diem && <> &nbsp;|&nbsp; 📍 {selectedLich.dia_diem}</>}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDiemDanh(false)}>✕</button>
            </div>
            <div className="modal-body">
              {ddLoading ? (
                <div className="loading-wrap"><div className="spinner" /></div>
              ) : diemDanhData.length === 0 ? (
                <div className="empty-state"><span>👥</span><p>Chưa có học viên trong lớp này</p></div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" onClick={() => setDiemDanhData(prev => prev.map(d =>
                      isDuTienDo(d, selectedLich.loai_buoi) ? d : { ...d, co_mat: true }
                    ))}>✅ Tất cả có mặt</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setDiemDanhData(prev => prev.map(d =>
                      isDuTienDo(d, selectedLich.loai_buoi) ? d : { ...d, co_mat: false }
                    ))}>❌ Bỏ chọn tất cả</button>
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: '#374151' }}>{coMatCount}/{canDiemDanhList.length} có mặt</span>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Học viên</th>
                        <th style={{ textAlign: 'center' }}>Có mặt</th>
                        <th>Lý do vắng</th>
                        {selectedLich.loai_buoi === 'thuc_hanh' && <th>Km chạy được</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Học viên đã đủ tiến độ */}
                      {duTienDoList.map((d, _i) => {
                        const i = diemDanhData.indexOf(d)
                        return (
                          <tr key={i} style={{ background: '#f0fdf4', opacity: 0.75 }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                                  {d.ho_ten?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p style={{ fontWeight: 700, fontSize: 14 }}>{d.ho_ten}</p>
                                  <p style={{ fontSize: 12, color: '#718096' }}>{d.so_cccd}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }} colSpan={selectedLich.loai_buoi === 'thuc_hanh' ? 3 : 2}>
                              <span style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: '#dcfce7', color: '#15803d', border: '1px solid #86efac'
                              }}>
                                {selectedLich.loai_buoi === 'ly_thuyet' ? '📖 Đủ tiến độ lý thuyết' : '🚗 Đủ tiến độ thực hành'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {/* Học viên chưa đủ tiến độ — cần điểm danh */}
                      {canDiemDanhList.map((d) => {
                        const i = diemDanhData.indexOf(d)
                        return (
                          <tr key={i} style={d.co_mat ? { background: '#f0fdf4' } : {}}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                                  {d.ho_ten?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p style={{ fontWeight: 700, fontSize: 14 }}>{d.ho_ten}</p>
                                  <p style={{ fontSize: 12, color: '#718096' }}>{d.so_cccd}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div
                                onClick={() => setDiemDanhData(prev => prev.map((x, j) => j === i ? { ...x, co_mat: !x.co_mat } : x))}
                                style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}
                              >
                                <span style={{ position: 'absolute', inset: 0, background: d.co_mat ? '#22c55e' : '#e2e8f0', borderRadius: 24, transition: '.2s' }}>
                                  <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: d.co_mat ? 23 : 3, transition: '.2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                                </span>
                              </div>
                            </td>
                            <td>
                              {!d.co_mat && (
                                <input type="text" value={d.ghi_chu} placeholder="Lý do vắng..."
                                  onChange={e => setDiemDanhData(diemDanhData.map((x, j) => j === i ? { ...x, ghi_chu: e.target.value } : x))}
                                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12 }} />
                              )}
                            </td>
                            {selectedLich.loai_buoi === 'thuc_hanh' && (
                              <td>
                                <input type="number" step="0.1" min="0" value={d.km_chay} disabled={!d.co_mat}
                                  onChange={e => setDiemDanhData(diemDanhData.map((x, j) => j === i ? { ...x, km_chay: e.target.value } : x))}
                                  placeholder="0.0 km"
                                  style={{ width: 90, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, background: d.co_mat ? '#fff' : '#f9fafb', color: d.co_mat ? '#111' : '#9ca3af' }} />
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDiemDanh(false)}>Hủy</button>
              <button className="btn btn-success" onClick={handleSaveDiemDanh} disabled={saving || ddLoading}>
                {saving ? 'Đang lưu...' : '💾 Lưu Điểm Danh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Chi Tiết Buổi Dạy</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '14px', background: '#f0f4ff', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 28 }}>{viewItem.loai_buoi === 'ly_thuyet' ? '📖' : '🚗'}</div>
                <h3 style={{ margin: '6px 0 0' }}>{viewItem.lop_hoc?.ten_lop}</h3>
                <span className={`badge ${viewItem.loai_buoi === 'ly_thuyet' ? 'badge-info' : 'badge-success'}`} style={{ marginTop: 8 }}>
                  {viewItem.loai_buoi === 'ly_thuyet' ? '📖 Lý thuyết' : '🚗 Thực hành'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['📅 Ngày dạy', new Date(viewItem.ngay_hoc).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                  ['⏰ Giờ dạy',  `${viewItem.gio_bat_dau?.slice(0, 5)} – ${viewItem.gio_ket_thuc?.slice(0, 5)}`],
                  ['📍 Địa điểm', viewItem.dia_diem || '—'],
                  ['🏫 Lớp học',  viewItem.lop_hoc?.ten_lop || '—'],
                  ...(viewItem.xe ? [['🚗 Xe thực hành', `${viewItem.xe.bien_so} — ${viewItem.xe.hang_xe} ${viewItem.xe.dong_xe}`]] : []),
                ].map(([k, v], i) => (
                  <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{v}</div>
                  </div>
                ))}
              </div>
              {viewItem.noi_dung && (
                <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>📝 Nội dung</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{viewItem.noi_dung}</div>
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

export default GVLichHoc
