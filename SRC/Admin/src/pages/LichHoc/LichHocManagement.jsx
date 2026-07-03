import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './LichHocManagement.css'

// ── Helpers ──
// Lấy phần ngày từ chuỗi date (xử lý cả "2026-05-24" lẫn "2026-05-24 00:00:00")
const fmt = d => {
  const s = typeof d === 'string' ? d : new Date(d).toISOString()
  return s.slice(0, 10)
}
const DAY_FULL = ['Chủ Nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7']
const DAY_SHORT= ['CN','T2','T3','T4','T5','T6','T7']

// Khung giờ hiển thị: 6:00 → 22:00, mỗi ô = 30 phút
const HOUR_START = 7
const HOUR_END   = 18
const SLOT_MIN   = 60   // phút mỗi ô — 1 giờ = 1 hàng
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * (60 / SLOT_MIN)  // 11 ô

const timeToSlot = (timeStr) => {
  if (!timeStr) return 0
  const [h, m] = timeStr.slice(0,5).split(':').map(Number)
  return (h - HOUR_START) * (60 / SLOT_MIN) + m / SLOT_MIN
}

const slotToLabel = (slot) => {
  const totalMin = HOUR_START * 60 + slot * SLOT_MIN
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

const getWeekDates = base => {
  const d   = new Date(base)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({length:7}, (_,i) => {
    const dt = new Date(mon); dt.setDate(mon.getDate()+i); return dt
  })
}

const LOAI_COLOR = {
  ly_thuyet: { bg:'#dbeafe', border:'#3b82f6', text:'#1d4ed8', label:'📖 Lý thuyết' },
  thuc_hanh: { bg:'#dcfce7', border:'#22c55e', text:'#15803d', label:'🚗 Thực hành' },
}

const LichHocManagement = () => {
  const { token, backendUrl } = useAdmin()
  const headers = { Authorization: `Bearer ${token}` }

  const [lichHoc, setLichHoc]       = useState([])
  const [lopList, setLopList]       = useState([])
  const [xeList, setXeList]         = useState([])
  const [xeBanIds, setXeBanIds]     = useState([])   // xe_id đang bận trong khung giờ đang chọn
  const [loading, setLoading]       = useState(true)
  const [base, setBase]             = useState(new Date())
  const [filterLop, setFilterLop]   = useState('')

  // Modals
  const [showModal, setShowModal]             = useState(false)
  const [editingLich, setEditingLich]         = useState(null)
  const [viewItem, setViewItem]               = useState(null)
  const [showDiemDanhModal, setShowDiemDanhModal] = useState(false)
  const [selectedLich, setSelectedLich]       = useState(null)
  const [diemDanhData, setDiemDanhData]       = useState([])

  const [form, setForm] = useState({
    lop_hoc_id:'', ngay_hoc:'', gio_bat_dau:'', gio_ket_thuc:'',
    loai_buoi:'ly_thuyet', dia_diem:'', noi_dung:'', xe_id:''
  })

  const weekDates = getWeekDates(base)
  const fromDate  = fmt(weekDates[0])
  const toDate    = fmt(weekDates[6])

  const fetchLich = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/lich-hoc`, {
        headers, params: { from: fromDate, to: toDate, lop_hoc_id: filterLop }
      })
      if (res.data.success) setLichHoc(res.data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    axios.get(`${backendUrl}/api/admin/lop-hoc`, { headers })
      .then(r => { if (r.data.success) setLopList(r.data.data) })
    // Lấy toàn bộ xe (kể cả bảo trì/hỏng) để có thể hiển thị cảnh báo
    axios.get(`${backendUrl}/api/admin/xe`, { headers })
      .then(r => { if (r.data.success) setXeList(r.data.data) })
  }, [])

  useEffect(() => { fetchLich() }, [fromDate, toDate, filterLop])

  // Fetch danh sách xe bận khi modal mở và đủ thông tin ngày + giờ
  useEffect(() => {
    if (!showModal || !form.ngay_hoc || !form.gio_bat_dau || !form.gio_ket_thuc || form.loai_buoi !== 'thuc_hanh') {
      setXeBanIds([])
      return
    }
    const params = {
      ngay_hoc:     form.ngay_hoc,
      gio_bat_dau:  form.gio_bat_dau,
      gio_ket_thuc: form.gio_ket_thuc,
    }
    if (editingLich) params.exclude_lich_hoc_id = editingLich.id
    axios.get(`${backendUrl}/api/admin/xe/ban-trong-khung-gio`, { headers, params })
      .then(r => { if (r.data.success) setXeBanIds(r.data.data.map(String)) })
      .catch(() => setXeBanIds([]))
  }, [showModal, form.ngay_hoc, form.gio_bat_dau, form.gio_ket_thuc, form.loai_buoi])

  const getLichByDate = date => lichHoc.filter(l => l.ngay_hoc === fmt(date))
  const isToday = date => fmt(date) === fmt(new Date())

  // ── CRUD ──
  const openAdd = (ngayHoc = '') => {
    setEditingLich(null)
    setXeBanIds([])
    setForm({ lop_hoc_id:'', ngay_hoc: ngayHoc, gio_bat_dau:'', gio_ket_thuc:'', loai_buoi:'ly_thuyet', dia_diem:'', noi_dung:'', xe_id:'' })
    setShowModal(true)
  }

  // Helper: kiểm tra cảnh báo GV theo lớp + loại buổi đang chọn
  const getGvWarning = (lopHocId, loaiBuoi) => {
    if (!lopHocId) return null
    const lop = lopList.find(l => String(l.id) === String(lopHocId))
    if (!lop) return null
    const INACTIVE = ['nghi_phep', 'dinh_chi']
    const ttLabel  = tt => tt === 'nghi_phep' ? 'đang nghỉ phép' : 'đang bị đình chỉ'
    if (loaiBuoi === 'ly_thuyet') {
      const gv = lop.giang_vien_ly_thuyet
      if (!gv) return '⚠️ Lớp này chưa có GV Lý thuyết. Vui lòng phân công giảng viên trước.'
      if (INACTIVE.includes(gv.trang_thai)) return `⚠️ GV Lý thuyết (${gv.user?.ho_ten}) ${ttLabel(gv.trang_thai)}. Vui lòng phân công giảng viên khác.`
    } else {
      const gv = lop.giang_vien_thuc_hanh
      if (!gv) return '⚠️ Lớp này chưa có GV Thực hành. Vui lòng phân công giảng viên trước.'
      if (INACTIVE.includes(gv.trang_thai)) return `⚠️ GV Thực hành (${gv.user?.ho_ten}) ${ttLabel(gv.trang_thai)}. Vui lòng phân công giảng viên khác.`
    }
    return null
  }

  // Helper: kiểm tra cảnh báo xe thực hành theo lớp + xe được chọn
  const getXeWarning = (lopHocId, loaiBuoi, xeId) => {
    if (loaiBuoi !== 'thuc_hanh') return null

    const BAD_STATES  = ['bao_tri', 'hong']
    const STATE_LABEL = { bao_tri: 'đang bảo trì', hong: 'đang hỏng' }

    // Trường hợp 1: admin chọn xe cụ thể trong form
    if (xeId) {
      const xe = xeList.find(x => String(x.id) === String(xeId))
      if (xe && BAD_STATES.includes(xe.trang_thai)) {
        return `⚠️ Xe ${xe.bien_so} (${xe.hang_xe} ${xe.dong_xe}) ${STATE_LABEL[xe.trang_thai]}. Vui lòng chọn xe khác hoặc sửa chữa xe trước khi xếp lịch.`
      }
      return null
    }

    // Trường hợp 2: xe phân qua xe_lop_hoc của lớp (lop.xe_lop)
    if (!lopHocId) return null
    const lop     = lopList.find(l => String(l.id) === String(lopHocId))
    const xeLop   = lop?.xe_lop ?? []   // mảng xe của lớp (từ API lop-hoc with xeLop)
    if (!xeLop.length) return null

    const xeXau   = xeLop.filter(xl => xl.xe && BAD_STATES.includes(xl.xe.trang_thai))
    if (xeXau.length === 0) return null
    if (xeXau.length < xeLop.length) return null  // còn xe tốt → chỉ cảnh báo nhẹ, không chặn

    // Tất cả xe đều hỏng/bảo trì
    const ds = xeXau.map(xl => `${xl.xe.bien_so} (${STATE_LABEL[xl.xe.trang_thai]})`).join(', ')
    return `⚠️ Tất cả xe thực hành của lớp hiện không thể sử dụng: ${ds}. Vui lòng kiểm tra lại trạng thái xe trước khi xếp lịch.`
  }

  const openEdit = lh => {
    setEditingLich(lh)
    setXeBanIds([])
    setForm({
      lop_hoc_id:   lh.lop_hoc_id || '',
      ngay_hoc:     lh.ngay_hoc || '',
      gio_bat_dau:  lh.gio_bat_dau?.slice(0,5) || '',
      gio_ket_thuc: lh.gio_ket_thuc?.slice(0,5) || '',
      loai_buoi:    lh.loai_buoi || 'ly_thuyet',
      dia_diem:     lh.dia_diem || '',
      noi_dung:     lh.noi_dung || '',
      xe_id:        lh.xe_id || '',
    })
    setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    try {
      const res = editingLich
        ? await axios.put(`${backendUrl}/api/admin/lich-hoc/${editingLich.id}`, form, { headers })
        : await axios.post(`${backendUrl}/api/admin/lich-hoc`, form, { headers })
      if (res.data.success) {
        toast.success(editingLich ? 'Cập nhật thành công!' : 'Tạo lịch học thành công!')
        setShowModal(false); setEditingLich(null); fetchLich()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDelete = async id => {
    if (!confirm('Xóa buổi học này?')) return
    const res = await axios.delete(`${backendUrl}/api/admin/lich-hoc/${id}`, { headers })
    if (res.data.success) { toast.success('Đã xóa'); fetchLich() }
  }

  const openDiemDanh = async lich => {
    setSelectedLich(lich)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/lich-hoc/${lich.id}/diem-danh`, { headers })
      if (res.data.success) setDiemDanhData(res.data.data.map(d => ({ ...d, co_mat: d.co_mat || false, km_chay: d.km_chay || '', ghi_chu: d.ghi_chu || '' })))
    } catch {}
    setShowDiemDanhModal(true)
  }

  const handleSaveDiemDanh = async () => {
    try {
      const res = await axios.post(`${backendUrl}/api/admin/lich-hoc/${selectedLich.id}/diem-danh`, {
        diem_danh: diemDanhData.map(d => ({ ho_so_id: d.ho_so_id, co_mat: d.co_mat, km_chay: d.km_chay || null, ghi_chu: d.ghi_chu || null }))
      }, { headers })
      if (res.data.success) { toast.success('Điểm danh thành công!'); setShowDiemDanhModal(false) }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Tính vị trí event trên grid ──
  const SLOT_H = 26  // px mỗi ô 1 giờ — 11 giờ × 26 = 286px tổng

  const getEventStyle = lh => {
    const top    = timeToSlot(lh.gio_bat_dau)
    const bottom = timeToSlot(lh.gio_ket_thuc)
    const height = Math.max(bottom - top, 1)
    return {
      top:    `${top * SLOT_H}px`,
      height: `${height * SLOT_H - 4}px`,
    }
  }

  return (
    <div className="lich-page">
      {/* Header */}
      <div className="page-header">
        <div><h2>📅 Lịch Học</h2><p>Danh sách & thời khóa biểu tuần {weekDates[0].getDate()}/{weekDates[0].getMonth()+1} – {weekDates[6].getDate()}/{weekDates[6].getMonth()+1}/{weekDates[6].getFullYear()}</p></div>
        <button className="btn btn-primary" onClick={() => openAdd()}>+ Tạo buổi học</button>
      </div>

      {/* Tab chuyển chế độ xem — đã bỏ, 2 dạng hiển thị cùng lúc */}

      {/* Toolbar */}
      <div className="lich-toolbar">
        <select className="search-input" style={{maxWidth:220}} value={filterLop} onChange={e => setFilterLop(e.target.value)}>
          <option value="">Tất cả lớp học</option>
          {lopList.map(l => <option key={l.id} value={l.id}>{l.ten_lop}</option>)}
        </select>
        <div className="week-nav">
          <button className="btn btn-outline btn-sm" onClick={() => { const d=new Date(base); d.setDate(d.getDate()-7); setBase(d) }}>‹ Tuần trước</button>
          <span className="week-label">
            {weekDates[0].getDate()}/{weekDates[0].getMonth()+1} — {weekDates[6].getDate()}/{weekDates[6].getMonth()+1}/{weekDates[6].getFullYear()}
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setBase(new Date())}>Hôm nay</button>
          <button className="btn btn-outline btn-sm" onClick={() => { const d=new Date(base); d.setDate(d.getDate()+7); setBase(d) }}>Tuần sau ›</button>
        </div>
      </div>

      {/* ── DANH SÁCH LỊCH HỌC THEO TUẦN ── */}
      <div className="lich-section-title">📋 Danh Sách Buổi Học</div>
      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{margin:0}}>📋 Danh Sách Buổi Học ({lichHoc.length} buổi)</h3>
            <p style={{margin:'4px 0 0',fontSize:12,color:'#718096'}}>
              Thứ 2, {weekDates[0].getDate()}/{weekDates[0].getMonth()+1}/{weekDates[0].getFullYear()} — Chủ nhật, {weekDates[6].getDate()}/{weekDates[6].getMonth()+1}/{weekDates[6].getFullYear()}
            </p>
          </div>
        </div>
        <div className="card-body" style={{padding:0}}>
          {loading ? (
            <div className="loading-wrap"><div className="spinner"/></div>
          ) : lichHoc.length === 0 ? (
            <div className="empty-state" style={{padding:'32px'}}>
              <span>📅</span><p>Không có buổi học nào trong tuần này</p>
            </div>
          ) : (() => {
            // Nhóm theo từng ngày trong tuần (T2→CN), chỉ hiện ngày có buổi học
            const groups = weekDates.map(date => ({
              date,
              key: fmt(date),
              items: lichHoc
                .filter(l => l.ngay_hoc?.slice(0,10) === fmt(date))
                .sort((a, b) => (a.gio_bat_dau || '').localeCompare(b.gio_bat_dau || ''))
            })).filter(g => g.items.length > 0)

            if (groups.length === 0) return (
              <div className="empty-state" style={{padding:'32px'}}>
                <span>📅</span><p>Không có buổi học nào trong tuần này</p>
              </div>
            )

            return (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ngày / Thứ</th>
                    <th>Giờ</th>
                    <th>Lớp học</th>
                    <th>Loại</th>
                    <th>Địa điểm</th>
                    <th>Xe</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(({ date, key, items }) => {
                    const isHN = fmt(date) === fmt(new Date())
                    const thu  = DAY_FULL[date.getDay()]

                    return items.map((lh, idx) => {
                      const c = LOAI_COLOR[lh.loai_buoi] || LOAI_COLOR.ly_thuyet
                      return (
                        <tr key={lh.id} style={isHN ? {background:'#fffbeb'} : idx % 2 === 0 ? {background:'#f9fafb'} : {}}>
                          {idx === 0 ? (
                            <td rowSpan={items.length}
                              style={{
                                verticalAlign:'top',
                                paddingTop:12,
                                borderRight:'2px solid #e2e8f0',
                                background: isHN ? '#fef3c7' : '#f8fafc',
                                minWidth:110,
                              }}>
                              <strong style={{color: isHN ? '#d97706' : '#1a202c', fontSize:14}}>
                                {date.getDate()}/{date.getMonth()+1}/{date.getFullYear()}
                              </strong>
                              <br/>
                              <span style={{fontSize:12,color:'#718096'}}>{thu}</span>
                              {isHN && (
                                <><br/><span className="badge badge-warning" style={{fontSize:10,marginTop:4}}>Hôm nay</span></>
                              )}
                            </td>
                          ) : null}
                          <td style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap'}}>
                            {lh.gio_bat_dau?.slice(0,5)} – {lh.gio_ket_thuc?.slice(0,5)}
                          </td>
                          <td>
                            <strong style={{fontSize:13}}>{lh.lop_hoc?.ten_lop}</strong>
                            {lh.lop_hoc?.khoa_hoc?.ten_khoa && (
                              <p style={{fontSize:11,color:'#9ca3af',marginTop:1}}>{lh.lop_hoc.khoa_hoc.ten_khoa}</p>
                            )}
                          </td>
                          <td>
                            <span className="lh-list-badge" style={{background:c.bg,color:c.text,borderLeft:`3px solid ${c.border}`}}>
                              {c.label}
                            </span>
                          </td>
                          <td style={{fontSize:12,color:'#374151'}}>{lh.dia_diem || '—'}</td>
                          <td style={{fontSize:12,color:'#059669',fontWeight:600}}>
                            {lh.loai_buoi === 'thuc_hanh' && lh.xe ? (
                              ['bao_tri','hong'].includes(lh.xe.trang_thai) ? (
                                <span title={`Xe ${lh.xe.trang_thai === 'bao_tri' ? 'đang bảo trì' : 'đang hỏng'} — cần đổi xe khác`}
                                  style={{display:'inline-flex',alignItems:'center',gap:4,color:'#dc2626',fontWeight:700,cursor:'help'}}>
                                  ⚠️ {lh.xe.bien_so}
                                  <span style={{fontSize:10,background:'#fee2e2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:4,padding:'1px 5px',fontWeight:600}}>
                                    {lh.xe.trang_thai === 'bao_tri' ? 'Bảo trì' : 'Hỏng'}
                                  </span>
                                </span>
                              ) : (
                                <span style={{color:'#059669'}}>{lh.xe.bien_so}</span>
                              )
                            ) : (lh.xe?.bien_so || '—')}
                          </td>
                          <td>
                            <div className="action-cell">
                              <button className="btn btn-success btn-sm" onClick={() => openDiemDanh(lh)} title="Điểm danh">✅</button>
                              <button className="btn btn-outline btn-sm" onClick={() => openEdit(lh)} title="Sửa">✏️</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(lh.id)} title="Xóa">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            )
          })()}
        </div>
      </div>

      {/* ── THỜI KHÓA BIỂU ── */}
      <div>
      <div className="lich-section-title">🗓️ Thời Khóa Biểu Theo Tuần</div>
      <div className="timetable-wrap">
        <div className="timetable">
          {/* Header: cột giờ + 7 ngày */}
          <div className="tt-header">
            <div className="tt-time-col tt-header-cell" />
            {weekDates.map((date, i) => (
              <div key={i} className={`tt-day-col tt-header-cell ${isToday(date) ? 'tt-today' : ''}`}>
                <span className="tt-day-name">{DAY_FULL[date.getDay()]}</span>
                <span className={`tt-day-num ${isToday(date) ? 'tt-today-num' : ''}`}>
                  {date.getDate()}/{date.getMonth()+1}
                </span>
                <button className="tt-add-btn" onClick={() => openAdd(fmt(date))} title="Thêm buổi học">+</button>
              </div>
            ))}
          </div>

          {/* Body: trục thời gian */}
          <div className="tt-body">
            {/* Cột giờ */}
            <div className="tt-time-col" style={{height: `${(TOTAL_SLOTS + 1) * SLOT_H}px`}}>
              {Array.from({length: TOTAL_SLOTS + 1}, (_, i) => (
                <div key={i} className="tt-time-label" style={{top: `${i * SLOT_H}px`}}>
                  {slotToLabel(i)}
                </div>
              ))}
              {/* Đường kẻ ngang */}
              {Array.from({length: TOTAL_SLOTS + 1}, (_, i) => (
                <div key={`line-${i}`} className="tt-hline tt-hline-hour"
                  style={{top: `${i * SLOT_H}px`}} />
              ))}
            </div>

            {/* 7 cột ngày */}
            {weekDates.map((date, di) => {
              const items = getLichByDate(date)
              return (
                <div key={di} className={`tt-day-col tt-day-body ${isToday(date) ? 'tt-today-body' : ''}`}
                  style={{height: `${(TOTAL_SLOTS + 1) * SLOT_H}px`, position:'relative', overflow:'visible'}}>
                  {/* Đường kẻ ngang theo giờ */}
                  {Array.from({length: TOTAL_SLOTS + 1}, (_, i) => (
                    <div key={i} className="tt-hline tt-hline-hour"
                      style={{top: `${i * SLOT_H}px`}} />
                  ))}
                  {/* Events */}
                  {items.map(lh => {
                    const c = LOAI_COLOR[lh.loai_buoi] || LOAI_COLOR.ly_thuyet
                    const style = getEventStyle(lh)
                    return (
                      <div key={lh.id} className="tt-event"
                        style={{ ...style, background: c.bg, borderLeft: `3px solid ${c.border}` }}
                        onClick={() => setViewItem(lh)}>
                        <p className="tt-ev-time" style={{color: c.text}}>
                          {lh.gio_bat_dau?.slice(0,5)} – {lh.gio_ket_thuc?.slice(0,5)}
                        </p>
                        <p className="tt-ev-lop" style={{color: c.text}}>{lh.lop_hoc?.ten_lop}</p>
                        <p className="tt-ev-type" style={{color: c.border, fontSize:10}}>
                          {lh.loai_buoi === 'ly_thuyet' ? '📖 LT' : '🚗 TH'}
                          {lh.dia_diem ? ` · ${lh.dia_diem}` : ''}
                        </p>
                        {lh.loai_buoi === 'thuc_hanh' && lh.xe && ['bao_tri','hong'].includes(lh.xe.trang_thai) && (
                          <p style={{fontSize:10,color:'#dc2626',fontWeight:700,marginTop:2,background:'#fee2e2',borderRadius:3,padding:'1px 4px',display:'inline-block'}}>
                            ⚠️ Xe {lh.xe.bien_so} {lh.xe.trang_thai === 'bao_tri' ? 'bảo trì' : 'hỏng'}
                          </p>
                        )}
                        <div className="tt-ev-actions" onClick={e => e.stopPropagation()}>
                          <button className="tt-ev-btn" onClick={() => openDiemDanh(lh)} title="Điểm danh">✅</button>
                          <button className="tt-ev-btn" onClick={() => openEdit(lh)} title="Sửa">✏️</button>
                          <button className="tt-ev-btn tt-ev-del" onClick={() => handleDelete(lh.id)} title="Xóa">🗑️</button>
                        </div>
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
      <div className="tt-legend">
        <span className="tt-legend-item" style={{borderLeft:'3px solid #3b82f6',background:'#dbeafe'}}>📖 Lý thuyết</span>
        <span className="tt-legend-item" style={{borderLeft:'3px solid #22c55e',background:'#dcfce7'}}>🚗 Thực hành</span>
        <span style={{fontSize:12,color:'#9ca3af'}}>Nhấn vào buổi học để xem chi tiết</span>
      </div>
      </div>

      {/* ── MODAL TẠO / SỬA ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLich ? '✏️ Sửa Buổi Học' : '📅 Tạo Buổi Học'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label>Lớp học *</label>
                  <select value={form.lop_hoc_id} onChange={e=>setForm({...form,lop_hoc_id:e.target.value,xe_id:''})} required>
                    <option value="">-- Chọn lớp --</option>
                    {lopList.map(l => <option key={l.id} value={l.id}>{l.ten_lop}</option>)}
                  </select>
                  {(() => {
                    const warn = getGvWarning(form.lop_hoc_id, form.loai_buoi)
                    return warn ? (
                      <div style={{marginTop:6,padding:'8px 12px',background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:6,fontSize:13,color:'#92400e'}}>
                        {warn}
                      </div>
                    ) : null
                  })()}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label>Ngày học *</label>
                    <input type="date" value={form.ngay_hoc} onChange={e=>setForm({...form,ngay_hoc:e.target.value})} required />
                  </div>
                  <div className="form-group"><label>Loại buổi *</label>
                    <select value={form.loai_buoi} onChange={e=>setForm({...form,loai_buoi:e.target.value})}>
                      <option value="ly_thuyet">📖 Lý thuyết</option>
                      <option value="thuc_hanh">🚗 Thực hành</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Giờ bắt đầu *</label>
                    <input type="time" value={form.gio_bat_dau} onChange={e=>setForm({...form,gio_bat_dau:e.target.value})} required />
                  </div>
                  <div className="form-group"><label>Giờ kết thúc *</label>
                    <input type="time" value={form.gio_ket_thuc} onChange={e=>setForm({...form,gio_ket_thuc:e.target.value})} required />
                  </div>
                </div>
                <div className="form-group"><label>Địa điểm</label>
                  <input value={form.dia_diem} onChange={e=>setForm({...form,dia_diem:e.target.value})} placeholder="VD: Phòng 101, Sân tập A" />
                </div>
                {form.loai_buoi === 'thuc_hanh' && (() => {
                  // Tìm loại bằng của lớp đang chọn
                  const lopChon   = lopList.find(l => String(l.id) === String(form.lop_hoc_id))
                  const loaiBang  = lopChon?.khoa_hoc?.loai_bang || ''
                  // Lọc xe: chỉ còn sẵn sàng, theo hạng bằng
                  const xeFiltered = xeList.filter(x =>
                    x.trang_thai === 'san_sang' &&
                    (loaiBang ? x.hang_bang === loaiBang : true)
                  )
                  const xeWarning = getXeWarning(form.lop_hoc_id, form.loai_buoi, form.xe_id)
                  // Xe đang chọn có bị bận trong khung giờ này không
                  const selectedXeBan = form.xe_id && xeBanIds.includes(String(form.xe_id))
                  const hasTimeInfo   = form.ngay_hoc && form.gio_bat_dau && form.gio_ket_thuc
                  return (
                    <div className="form-group">
                      <label>🚗 Phân xe thực hành {loaiBang && <span style={{fontWeight:400,color:'#6b7280',fontSize:12}}>(Hạng {loaiBang})</span>}</label>
                      <select value={form.xe_id} onChange={e=>setForm({...form,xe_id:e.target.value})}>
                        <option value="">-- Chưa phân xe --</option>
                        {xeFiltered.length === 0 ? (
                          <option disabled>Không có xe phù hợp cho hạng {loaiBang}</option>
                        ) : (
                          xeFiltered.map(x => {
                            const isBan = xeBanIds.includes(String(x.id))
                            return (
                              <option
                                key={x.id}
                                value={x.id}
                                disabled={isBan}
                                style={isBan ? {color:'#9ca3af'} : {}}
                              >
                                {x.bien_so} — {x.hang_xe} {x.dong_xe} (Hạng {x.hang_bang}){isBan ? ' — ⛔ Đã bận khung giờ này' : ''}
                              </option>
                            )
                          })
                        )}
                      </select>
                      {hasTimeInfo && xeBanIds.length > 0 && (
                        <div style={{marginTop:4,fontSize:12,color:'#6b7280'}}>
                          ℹ️ Các xe có dấu ⛔ đã được phân công cho lớp khác trong khung giờ này.
                        </div>
                      )}
                      {selectedXeBan && (
                        <div style={{marginTop:6,padding:'8px 12px',background:'#fee2e2',border:'1px solid #ef4444',borderRadius:6,fontSize:13,color:'#991b1b'}}>
                          ⛔ Xe này đã được phân công cho lớp khác trong cùng khung giờ. Vui lòng chọn xe khác.
                        </div>
                      )}
                      {xeWarning && !selectedXeBan && (
                        <div style={{marginTop:6,padding:'8px 12px',background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:6,fontSize:13,color:'#92400e'}}>
                          {xeWarning}
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div className="form-group"><label>Nội dung buổi học</label>
                  <textarea rows={2} value={form.noi_dung} onChange={e=>setForm({...form,noi_dung:e.target.value})}
                    style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,resize:'vertical'}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    !!getGvWarning(form.lop_hoc_id, form.loai_buoi) ||
                    !!getXeWarning(form.lop_hoc_id, form.loai_buoi, form.xe_id) ||
                    (form.loai_buoi === 'thuc_hanh' && !!form.xe_id && xeBanIds.includes(String(form.xe_id)))
                  }
                  title={
                    getGvWarning(form.lop_hoc_id, form.loai_buoi) ||
                    getXeWarning(form.lop_hoc_id, form.loai_buoi, form.xe_id) ||
                    (form.loai_buoi === 'thuc_hanh' && form.xe_id && xeBanIds.includes(String(form.xe_id))
                      ? 'Xe này đã được phân công cho lớp khác trong cùng khung giờ'
                      : '')
                  }
                >
                  {editingLich ? '💾 Cập nhật' : '➕ Tạo buổi học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL XEM CHI TIẾT ── */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Chi Tiết Buổi Học</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{textAlign:'center',marginBottom:20,padding:'14px',background:'#f0f4ff',borderRadius:10}}>
                <div style={{fontSize:30,marginBottom:4}}>{viewItem.loai_buoi==='ly_thuyet'?'📖':'🚗'}</div>
                <h2 style={{margin:0,fontSize:18}}>{viewItem.lop_hoc?.ten_lop}</h2>
                <div style={{marginTop:8,display:'flex',gap:8,justifyContent:'center'}}>
                  <span className={`badge ${viewItem.loai_buoi==='ly_thuyet'?'badge-info':'badge-success'}`}>
                    {viewItem.loai_buoi==='ly_thuyet'?'📖 Lý thuyết':'🚗 Thực hành'}
                  </span>
                </div>
              </div>
              <div style={lhST}>📋 THÔNG TIN BUỔI HỌC</div>
              <div style={lhG}>
                <div style={lhB}><div style={lhL}>📅 Ngày học</div><div style={lhV}>{new Date(viewItem.ngay_hoc).toLocaleDateString('vi-VN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div></div>
                <div style={lhB}><div style={lhL}>⏰ Giờ học</div><div style={lhV}>{viewItem.gio_bat_dau?.slice(0,5)} – {viewItem.gio_ket_thuc?.slice(0,5)}</div></div>
                <div style={lhB}><div style={lhL}>📍 Địa điểm</div><div style={lhV}>{viewItem.dia_diem||'—'}</div></div>
                <div style={lhB}><div style={lhL}>🏫 Lớp học</div><div style={lhV}>{viewItem.lop_hoc?.ten_lop||'—'}</div></div>
              </div>
              {viewItem.noi_dung && (
                <>
                  <div style={{...lhST,marginTop:16}}>📝 NỘI DUNG BUỔI HỌC</div>
                  <div style={{...lhB,whiteSpace:'pre-wrap',color:'#374151',lineHeight:1.6}}>{viewItem.noi_dung}</div>
                </>
              )}
              <div style={{...lhG,marginTop:12}}>
                <div style={{...lhB,background:'#f9fafb'}}><div style={lhL}>🗓️ Ngày tạo</div><div style={{marginTop:4,fontSize:13,color:'#6b7280'}}>{viewItem.created_at?new Date(viewItem.created_at).toLocaleDateString('vi-VN'):'—'}</div></div>
                <div style={{...lhB,background:'#f9fafb'}}><div style={lhL}>🔄 Cập nhật</div><div style={{marginTop:4,fontSize:13,color:'#6b7280'}}>{viewItem.updated_at?new Date(viewItem.updated_at).toLocaleDateString('vi-VN'):'—'}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
              <button className="btn btn-warning" onClick={() => { setViewItem(null); openEdit(viewItem) }}>✏️ Sửa</button>
              <button className="btn btn-success" onClick={() => { setViewItem(null); openDiemDanh(viewItem) }}>✅ Điểm danh</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ĐIỂM DANH ── */}
      {showDiemDanhModal && selectedLich && (
        <div className="modal-overlay" onClick={() => setShowDiemDanhModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>✅ Điểm Danh — {selectedLich.lop_hoc?.ten_lop}</h3>
                <p style={{fontSize:12,color:'#718096',marginTop:3}}>
                  {new Date(selectedLich.ngay_hoc).toLocaleDateString('vi-VN')} | {selectedLich.gio_bat_dau?.slice(0,5)}–{selectedLich.gio_ket_thuc?.slice(0,5)} |
                  {selectedLich.loai_buoi==='ly_thuyet'?' 📖 Lý thuyết':' 🚗 Thực hành'}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDiemDanhModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {diemDanhData.length === 0 ? (
                <div className="empty-state"><span>👥</span><p>Chưa có học viên trong lớp này</p></div>
              ) : (() => {
                // Phân loại học viên theo tiến độ của buổi học
                const isDuTienDo = d =>
                  selectedLich.loai_buoi === 'ly_thuyet'
                    ? d.du_buoi_ly_thuyet === true
                    : d.du_km_thuc_hanh   === true
                const duTienDoList    = diemDanhData.filter(d =>  isDuTienDo(d))
                const canDiemDanhList = diemDanhData.filter(d => !isDuTienDo(d))
                const coMatCount = canDiemDanhList.filter(d => d.co_mat).length
                return (
                  <>
                    <div className="dd-toolbar">
                      <button className="btn btn-success btn-sm" onClick={() => setDiemDanhData(diemDanhData.map(d => isDuTienDo(d) ? d : {...d,co_mat:true}))}>✅ Điểm danh tất cả</button>
                      <button className="btn btn-outline btn-sm" onClick={() => setDiemDanhData(diemDanhData.map(d => isDuTienDo(d) ? d : {...d,co_mat:false}))}>❌ Bỏ chọn tất cả</button>
                      <span className="dd-count">{coMatCount}/{canDiemDanhList.length} có mặt</span>
                    </div>

                    {/* ── Học viên đã đủ tiến độ ── */}
                    {duTienDoList.length > 0 && (
                      <div style={{marginBottom:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#f0fdf4',borderRadius:8,marginBottom:6,fontSize:12,fontWeight:700,color:'#15803d'}}>
                          <span>✅</span>
                          <span>
                            {selectedLich.loai_buoi === 'ly_thuyet'
                              ? `Đủ tiến độ lý thuyết (${duTienDoList.length} học viên) — Không cần điểm danh`
                              : `Đủ tiến độ thực hành (${duTienDoList.length} học viên) — Không cần điểm danh`}
                          </span>
                        </div>
                        <table className="data-table">
                          <thead><tr>
                            <th>Học viên</th>
                            <th style={{textAlign:'center'}}>Trạng thái</th>
                          </tr></thead>
                          <tbody>
                            {duTienDoList.map((d) => {
                              const i = diemDanhData.indexOf(d)
                              return (
                                <tr key={i} style={{background:'#f0fdf4',opacity:0.75}}>
                                  <td>
                                    <div className="dd-hv-info">
                                      <div className="dd-avatar" style={{background:'#16a34a'}}>{d.ho_ten?.charAt(0).toUpperCase()}</div>
                                      <div>
                                        <p style={{fontWeight:700,fontSize:14}}>{d.ho_ten}</p>
                                        <p style={{fontSize:12,color:'#718096'}}>{d.so_cccd}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{textAlign:'center'}}>
                                    <span style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:700,background:'#dcfce7',color:'#15803d',border:'1px solid #86efac'}}>
                                      {selectedLich.loai_buoi === 'ly_thuyet' ? '📖 Đủ tiến độ LT' : '🚗 Đủ tiến độ TH'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* ── Học viên chưa đủ tiến độ — cần điểm danh ── */}
                    {canDiemDanhList.length > 0 && (
                      <div>
                        {duTienDoList.length > 0 && (
                          <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'#fff7ed',borderRadius:8,marginBottom:6,fontSize:12,fontWeight:700,color:'#c2410c'}}>
                            <span>⏳</span>
                            <span>Chưa đủ tiến độ ({canDiemDanhList.length} học viên) — Cần điểm danh</span>
                          </div>
                        )}
                        <table className="data-table">
                          <thead><tr>
                            <th>Học viên</th>
                            <th style={{textAlign:'center'}}>Có mặt</th>
                            <th>Lý do vắng</th>
                            {selectedLich.loai_buoi==='thuc_hanh'&&<th>Km chạy được</th>}
                          </tr></thead>
                          <tbody>
                            {canDiemDanhList.map((d) => {
                              const i = diemDanhData.indexOf(d)
                              return (
                                <tr key={i} className={d.co_mat?'dd-present':''}>
                                  <td>
                                    <div className="dd-hv-info">
                                      <div className="dd-avatar">{d.ho_ten?.charAt(0).toUpperCase()}</div>
                                      <div>
                                        <p style={{fontWeight:700,fontSize:14}}>{d.ho_ten}</p>
                                        <p style={{fontSize:12,color:'#718096'}}>{d.so_cccd}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{textAlign:'center'}}>
                                    <label className="dd-toggle">
                                      <input type="checkbox" checked={d.co_mat}
                                        onChange={e=>setDiemDanhData(diemDanhData.map((x,j)=>j===i?{...x,co_mat:e.target.checked,ghi_chu:e.target.checked?'':x.ghi_chu}:x))} />
                                      <span className="dd-toggle-slider"/>
                                    </label>
                                  </td>
                                  <td>
                                    {!d.co_mat ? (
                                      <input
                                        type="text"
                                        value={d.ghi_chu}
                                        onChange={e=>setDiemDanhData(diemDanhData.map((x,j)=>j===i?{...x,ghi_chu:e.target.value}:x))}
                                        placeholder="Nhập lý do vắng mặt..."
                                        style={{width:'100%',padding:'5px 8px',border:'1px solid #fca5a5',borderRadius:6,fontSize:12}}
                                      />
                                    ) : (
                                      <span style={{fontSize:12,color:'#9ca3af'}}>—</span>
                                    )}
                                  </td>
                                  {selectedLich.loai_buoi==='thuc_hanh'&&(
                                    <td>
                                      <input type="number" step="0.1" min="0" value={d.km_chay}
                                        onChange={e=>setDiemDanhData(diemDanhData.map((x,j)=>j===i?{...x,km_chay:e.target.value}:x))}
                                        placeholder="0.0 km" className="km-input" disabled={!d.co_mat} />
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDiemDanhModal(false)}>Hủy</button>
              <button className="btn btn-success" onClick={handleSaveDiemDanh}>💾 Lưu điểm danh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const lhST = { fontSize:12, fontWeight:700, color:'#0d47a1', textTransform:'uppercase', letterSpacing:'0.05em', paddingBottom:8, borderBottom:'2px solid #e0ecff', marginBottom:12 }
const lhG  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }
const lhB  = { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px' }
const lhL  = { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }
const lhV  = { fontSize:14, fontWeight:600, color:'#111827' }

export default LichHocManagement
