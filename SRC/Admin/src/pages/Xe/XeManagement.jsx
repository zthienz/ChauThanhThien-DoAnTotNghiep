import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './XeManagement.css'

const TRANG_THAI_MAP = {
  san_sang: { label: '✅ Sẵn sàng', cls: 'badge-success' },
  bao_tri:  { label: '🔧 Bảo trì',  cls: 'badge-warning' },
  hong:     { label: '❌ Hỏng',      cls: 'badge-danger' },
}
const LOAI_XE_MAP = { so_san: 'Số sàn', so_tu_dong: 'Số tự động' }
const MUC_DO_MAP  = {
  nhe:          { label: '🟡 Nhẹ',         cls: 'badge-warning' },
  trung_binh:   { label: '🟠 Trung bình',  cls: 'badge-warning' },
  nghiem_trong: { label: '🔴 Nghiêm trọng',cls: 'badge-danger' },
}
const XLTT_MAP = {
  cho_xu_ly:  { label: '⏳ Chờ xử lý', cls: 'badge-warning' },
  dang_xu_ly: { label: '🔧 Đang xử lý', cls: 'badge-info' },
  da_xu_ly:   { label: '✅ Đã xử lý',   cls: 'badge-success' },
}

const emptyForm = {
  bien_so:'', hang_xe:'', dong_xe:'', nam_san_xuat:'',
  loai_xe:'so_san', hang_bang:'B2', mau_xe:'',
  ngay_dang_kiem:'',
  ngay_dang_kiem_tiep_theo:'', ngay_bao_hiem:'', ghi_chu:''
}

const XeManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [tab, setTab]               = useState('xe')
  const [xeList, setXeList]         = useState([])
  const [baoLoiList, setBaoLoiList] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [showXuLy, setShowXuLy]     = useState(null)
  const [editItem, setEditItem]     = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [xuLyForm, setXuLyForm]     = useState({ trang_thai:'dang_xu_ly', ghi_chu_xu_ly:'' })
  const [filterTT, setFilterTT]     = useState('')
  const [filterLoai, setFilterLoai] = useState('')
  const [filterHang, setFilterHang] = useState('')
  const [filterBL, setFilterBL]     = useState('')
  const [searchXe, setSearchXe]     = useState('')
  const [searchBL, setSearchBL]     = useState('')

  // Ảnh xe
  const [anhFile, setAnhFile]       = useState(null)
  const [anhPreview, setAnhPreview] = useState(null)
  const fileRef = useRef()

  const headers = { Authorization: `Bearer ${token}` }

  const fetchXe = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/xe`, { headers, params: { trang_thai: filterTT } })
      if (res.data.success) setXeList(res.data.data)
    } catch {}
    setLoading(false)
  }
  const fetchBaoLoi = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/bao-loi-xe`, { headers, params: { trang_thai: filterBL } })
      if (res.data.success) setBaoLoiList(res.data.data)
    } catch {}
  }

  useEffect(() => { fetchXe() }, [filterTT])
  useEffect(() => { fetchBaoLoi() }, [filterBL])

  const handleAnhChange = file => {
    if (!file) return
    setAnhFile(file)
    const reader = new FileReader()
    reader.onload = e => setAnhPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const openAdd = () => {
    setEditItem(null); setForm(emptyForm)
    setAnhFile(null); setAnhPreview(null)
    setShowModal(true)
  }

  const openEdit = xe => {
    setEditItem(xe)
    const { anh_xe, ...xeData } = xe   // tách anh_xe ra, không cho vào form state
    setForm({
      ...emptyForm, ...xeData,
      ngay_dang_kiem:            xe.ngay_dang_kiem?.split('T')[0] || '',
      ngay_dang_kiem_tiep_theo:  xe.ngay_dang_kiem_tiep_theo?.split('T')[0] || '',
      ngay_bao_hiem:             xe.ngay_bao_hiem?.split('T')[0] || '',
    })
    setAnhFile(null)
    setAnhPreview(xe.anh_xe ? `/uploads/${xe.anh_xe}` : null)
    setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v) })
      if (anhFile) {
        // Có file mới → upload
        fd.append('anh_xe', anhFile)
      } else if (editItem && !anhPreview) {
        // Đang sửa, không có file mới, và ảnh đã bị xóa → báo backend xóa ảnh cũ
        fd.append('remove_anh_xe', '1')
      }
      // Nếu đang sửa và anhPreview còn (ảnh cũ giữ nguyên) → không append gì → backend giữ ảnh cũ

      const res = editItem
        ? await axios.post(`${backendUrl}/api/admin/xe/${editItem.id}?_method=PUT`, fd,
            { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })
        : await axios.post(`${backendUrl}/api/admin/xe`, fd,
            { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })

      if (res.data.success) {
        toast.success(editItem ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!')
        setShowModal(false); fetchXe()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDelete = async id => {
    if (!confirm('Xóa xe này?')) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/xe/${id}`, { headers })
      if (res.data.success) { toast.success('Đã xóa xe'); fetchXe() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleTrangThai = async (id, tt) => {
    try {
      const res = await axios.patch(`${backendUrl}/api/admin/xe/${id}/trang-thai`, { trang_thai: tt }, { headers })
      if (res.data.success) {
        toast.success('Cập nhật trạng thái thành công')
        // Cập nhật local state thay vì re-fetch để xe không biến mất khi đang lọc
        setXeList(prev => prev.map(x => x.id === id ? { ...x, trang_thai: tt } : x))
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const openDetail = async xe => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/xe/${xe.id}`, { headers })
      if (res.data.success) setShowDetail(res.data.data)
    } catch {}
  }

  const handleXuLy = async e => {
    e.preventDefault()
    try {
      const res = await axios.patch(`${backendUrl}/api/admin/bao-loi-xe/${showXuLy.id}/xu-ly`, xuLyForm, { headers })
      if (res.data.success) { toast.success('Cập nhật xử lý thành công!'); setShowXuLy(null); fetchBaoLoi(); fetchXe() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const tongSanSang = xeList.filter(x => x.trang_thai === 'san_sang').length
  const tongHong    = xeList.filter(x => x.trang_thai === 'hong').length
  const tongBaoTri  = xeList.filter(x => x.trang_thai === 'bao_tri').length
  const choXuLy     = baoLoiList.filter(b => b.trang_thai === 'cho_xu_ly').length

  const filteredXe = xeList.filter(xe => {
    const matchSearch = !searchXe ||
      xe.bien_so?.toLowerCase().includes(searchXe.toLowerCase()) ||
      xe.hang_xe?.toLowerCase().includes(searchXe.toLowerCase()) ||
      xe.dong_xe?.toLowerCase().includes(searchXe.toLowerCase())
    const matchLoai = !filterLoai || xe.loai_xe === filterLoai
    const matchHang = !filterHang || xe.hang_bang === filterHang
    return matchSearch && matchLoai && matchHang
  })

  const filteredBL = baoLoiList.filter(bl => {
    const matchSearch = !searchBL ||
      bl.xe?.bien_so?.toLowerCase().includes(searchBL.toLowerCase()) ||
      bl.tieu_de?.toLowerCase().includes(searchBL.toLowerCase()) ||
      bl.giang_vien?.user?.ho_ten?.toLowerCase().includes(searchBL.toLowerCase())
    return matchSearch
  })

  return (
    <div className="xe-page">
      <div className="page-header">
        <div><h2>🚗 Quản Lý Xe</h2><p>Quản lý đội xe và theo dõi tình trạng</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" onClick={openAdd}>+ Thêm xe</button>
        </div>
      </div>

      {/* Stats */}
      <div className="xe-stats">
        {[
          { icon:'🚗', label:'Tổng xe',    value: xeList.length, cls:'' },
          { icon:'✅', label:'Sẵn sàng',   value: tongSanSang,   cls:'green' },
          { icon:'❌', label:'Hỏng',        value: tongHong,      cls:'red' },
          { icon:'🔧', label:'Bảo trì',    value: tongBaoTri,    cls:'orange' },
          { icon:'⚠️', label:'Chờ xử lý', value: choXuLy,       cls:'yellow' },
        ].map((s,i) => (
          <div key={i} className={`xe-stat-card ${s.cls}`}>
            <span className="xsc-icon">{s.icon}</span>
            <div><p className="xsc-value">{s.value}</p><p className="xsc-label">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="xe-tabs">
        <button className={`xe-tab ${tab==='xe'?'active':''}`} onClick={() => setTab('xe')}>🚗 Danh Sách Xe</button>
        <button className={`xe-tab ${tab==='bao_loi'?'active':''}`} onClick={() => setTab('bao_loi')}>
          ⚠️ Báo Lỗi {choXuLy > 0 && <span className="xe-badge-count">{choXuLy}</span>}
        </button>
      </div>

      {/* Tab: Danh sách xe */}
      {tab === 'xe' && (
        <div className="card">
          <div className="card-header" style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <h3>🚗 Đội Xe ({filteredXe.length}{filterTT ? ` / ${xeList.length} tổng` : ''})</h3>
            <input className="search-input" style={{flex:1,minWidth:200}} placeholder="🔍 Tìm theo biển số, hãng xe, dòng xe..."
              value={searchXe} onChange={e => setSearchXe(e.target.value)} />
            <select className="search-input" style={{maxWidth:160, borderColor: filterLoai ? '#0d47a1' : '', fontWeight: filterLoai ? 700 : 400}}
              value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
              <option value="">Tất cả loại</option>
              {Object.entries(LOAI_XE_MAP).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="search-input" style={{maxWidth:160, borderColor: filterHang ? '#0d47a1' : '', fontWeight: filterHang ? 700 : 400}}
              value={filterHang} onChange={e => setFilterHang(e.target.value)}>
              <option value="">Tất cả hạng</option>
              {['A1','A','B1','B2','C1','C','D','E','CE','C2'].map(h => <option key={h} value={h}>Hạng {h}</option>)}
            </select>
            <select className="search-input" style={{maxWidth:200, borderColor: filterTT ? '#0d47a1' : '', fontWeight: filterTT ? 700 : 400}} value={filterTT} onChange={e=>setFilterTT(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(TRANG_THAI_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(filterTT || filterLoai || filterHang || searchXe) && (
              <button className="btn btn-outline btn-sm" onClick={() => { setFilterTT(''); setFilterLoai(''); setFilterHang(''); setSearchXe('') }}>✕ Bỏ lọc</button>
            )}
          </div>
          <div className="card-body" style={{padding:0}}>
            {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>Xe</th><th>Hãng / Dòng</th><th>Loại</th><th>Hạng</th><th>Trạng thái</th><th>Thao tác</th></tr>
                </thead>
                <tbody>
                  {filteredXe.length === 0
                    ? <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'#a0aec0'}}>
                        {searchXe ? 'Không tìm thấy xe phù hợp' : 'Chưa có xe nào'}
                      </td></tr>
                    : filteredXe.map((xe, i) => {
                      const tt = TRANG_THAI_MAP[xe.trang_thai] || { label: xe.trang_thai, cls:'badge-gray' }
                      return (
                        <tr key={xe.id}>
                          <td>{i+1}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div className="xe-thumb">
                                {xe.anh_xe
                                  ? <img src={`/uploads/${xe.anh_xe}`} alt={xe.bien_so} className="xe-thumb-img" />
                                  : <span>🚗</span>}
                              </div>
                              <div>
                                <strong style={{color:'#0d47a1'}}>{xe.bien_so}</strong>
                                {xe.bao_loi_count > 0 && <span className="xe-loi-badge">⚠️ {xe.bao_loi_count}</span>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <p style={{fontWeight:600}}>{xe.hang_xe}</p>
                            <p style={{fontSize:12,color:'#718096'}}>{xe.dong_xe || '—'} {xe.nam_san_xuat ? `(${xe.nam_san_xuat})` : ''}</p>
                          </td>
                          <td>{LOAI_XE_MAP[xe.loai_xe]}</td>
                          <td><span className="badge badge-info">Hạng {xe.hang_bang}</span></td>
                          <td><span className={`badge ${tt.cls}`}>{tt.label}</span></td>
                          <td>
                            <div className="action-cell">
                              <button className="btn btn-info btn-sm" onClick={() => openDetail(xe)}>👁️ Xem</button>
                              <button className="btn btn-warning btn-sm" onClick={() => openEdit(xe)}>✏️ Sửa</button>
                              <select className="btn btn-outline btn-sm" style={{padding:'4px 6px',cursor:'pointer'}}
                                value={xe.trang_thai} onChange={e => handleTrangThai(xe.id, e.target.value)}>
                                {Object.entries(TRANG_THAI_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(xe.id)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Báo lỗi */}
      {tab === 'bao_loi' && (
        <div className="card">
          <div className="card-header" style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <h3>⚠️ Báo Lỗi Xe ({filteredBL.length})</h3>
            <input className="search-input" style={{flex:1,minWidth:200}} placeholder="🔍 Tìm theo biển số, tiêu đề, giảng viên..."
              value={searchBL} onChange={e => setSearchBL(e.target.value)} />
            <select className="search-input" style={{maxWidth:180}} value={filterBL} onChange={e=>setFilterBL(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(XLTT_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="card-body" style={{padding:0}}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Xe</th><th>Giảng viên</th><th>Tiêu đề</th><th>Mức độ</th><th>Trạng thái</th><th>Ngày báo</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {filteredBL.length === 0
                  ? <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'#a0aec0'}}>
                      {searchBL ? 'Không tìm thấy kết quả phù hợp' : 'Không có báo lỗi nào'}
                    </td></tr>
                  : filteredBL.map((bl, i) => (
                    <tr key={bl.id}>
                      <td>{i+1}</td>
                      <td><strong style={{color:'#0d47a1'}}>{bl.xe?.bien_so}</strong><br/><span style={{fontSize:11,color:'#718096'}}>{bl.xe?.hang_xe}</span></td>
                      <td>{bl.giang_vien?.user?.ho_ten || '—'}</td>
                      <td style={{maxWidth:200}}>
                        <p style={{fontWeight:600,fontSize:13}}>{bl.tieu_de}</p>
                        <p style={{fontSize:11,color:'#718096',marginTop:2}}>{bl.mo_ta?.slice(0,60)}{bl.mo_ta?.length>60?'...':''}</p>
                      </td>
                      <td><span className={`badge ${MUC_DO_MAP[bl.muc_do]?.cls}`}>{MUC_DO_MAP[bl.muc_do]?.label}</span></td>
                      <td><span className={`badge ${XLTT_MAP[bl.trang_thai]?.cls}`}>{XLTT_MAP[bl.trang_thai]?.label}</span></td>
                      <td style={{fontSize:12}}>{new Date(bl.created_at).toLocaleDateString('vi-VN')}</td>
                      <td>
                        {bl.trang_thai !== 'da_xu_ly'
                          ? <button className="btn btn-primary btn-sm" onClick={() => { setShowXuLy(bl); setXuLyForm({ trang_thai:'dang_xu_ly', ghi_chu_xu_ly: bl.ghi_chu_xu_ly||'' }) }}>🔧 Xử lý</button>
                          : <span style={{fontSize:12,color:'#38a169'}}>✅ Hoàn tất</span>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM / SỬA XE ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editItem ? `✏️ Cập Nhật Xe — ${editItem.bien_so}` : '🚗 Thêm Xe Mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="xe-form-layout">

                  {/* Cột ảnh */}
                  <div className="xe-anh-col">
                    <p className="xe-anh-label">📷 Ảnh xe</p>
                    <div className={`xe-anh-upload ${anhPreview ? 'has-image' : ''}`}
                      onClick={() => fileRef.current?.click()}>
                      {anhPreview
                        ? <img src={anhPreview} alt="preview" className="xe-anh-preview" />
                        : <div className="xe-anh-placeholder">
                            <span>🚗</span><p>Nhấn để chọn ảnh</p><small>JPG, PNG — tối đa 5MB</small>
                          </div>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                      style={{display:'none'}} onChange={e => handleAnhChange(e.target.files[0])} />
                    {anhPreview && (
                      <button type="button" className="btn btn-outline btn-sm"
                        style={{marginTop:6,width:'100%'}}
                        onClick={() => { setAnhFile(null); setAnhPreview(null) }}>
                        🗑️ Xóa ảnh
                      </button>
                    )}
                    <p className="xe-anh-hint">Ảnh xe hiển thị trong hệ thống</p>
                  </div>

                  {/* Cột thông tin */}
                  <div className="xe-info-col">
                    <div className="xe-section-title">🚗 Thông Tin Xe</div>
                    <div className="xe-form-grid">
                      <div className="form-group"><label>Biển số *</label>
                        <input value={form.bien_so} onChange={e=>setForm({...form,bien_so:e.target.value.toUpperCase()})} placeholder="VD: 51A-12345" required />
                      </div>
                      <div className="form-group"><label>Hãng xe *</label>
                        <input value={form.hang_xe} onChange={e=>setForm({...form,hang_xe:e.target.value})} placeholder="Toyota, Kia, Honda..." required />
                      </div>
                      <div className="form-group"><label>Dòng xe</label>
                        <input value={form.dong_xe} onChange={e=>setForm({...form,dong_xe:e.target.value})} placeholder="Vios, Morning, City..." />
                      </div>
                      <div className="form-group"><label>Năm sản xuất</label>
                        <input type="number" min={1990} max={2030} value={form.nam_san_xuat} onChange={e=>setForm({...form,nam_san_xuat:e.target.value})} />
                      </div>
                      <div className="form-group"><label>Loại xe *</label>
                        <select value={form.loai_xe} onChange={e=>setForm({...form,loai_xe:e.target.value})}>
                          <option value="so_san">Số sàn</option>
                          <option value="so_tu_dong">Số tự động</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Hạng bằng *</label>
                        <select value={form.hang_bang} onChange={e=>setForm({...form,hang_bang:e.target.value})}>
                          {['A1','A','B1','B2','C1','C','D','E','CE','C2'].map(h => <option key={h} value={h}>Hạng {h}</option>)}
                        </select>
                      </div>
                      <div className="form-group"><label>Màu xe</label>
                        <input value={form.mau_xe} onChange={e=>setForm({...form,mau_xe:e.target.value})} placeholder="Trắng, Đen, Bạc..." />
                      </div>
                    </div>

                    <div className="xe-section-title" style={{marginTop:8}}>📋 Đăng Kiểm & Bảo Hiểm</div>
                    <div className="xe-form-grid">
                      <div className="form-group"><label>Ngày đăng kiểm</label>
                        <input type="date" value={form.ngay_dang_kiem} onChange={e=>setForm({...form,ngay_dang_kiem:e.target.value})} />
                      </div>
                      <div className="form-group"><label>Đăng kiểm tiếp theo</label>
                        <input type="date" value={form.ngay_dang_kiem_tiep_theo} onChange={e=>setForm({...form,ngay_dang_kiem_tiep_theo:e.target.value})} />
                      </div>
                      <div className="form-group"><label>Ngày bảo hiểm</label>
                        <input type="date" value={form.ngay_bao_hiem} onChange={e=>setForm({...form,ngay_bao_hiem:e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group"><label>Ghi chú</label>
                      <textarea rows={2} value={form.ghi_chu} onChange={e=>setForm({...form,ghi_chu:e.target.value})}
                        style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,resize:'vertical'}} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editItem ? '💾 Cập nhật' : '➕ Thêm xe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CHI TIẾT XE ── */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal modal-xl xe-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚗 Chi Tiết Xe — {showDetail.bien_so}</h3>
              <button className="modal-close" onClick={() => setShowDetail(null)}>✕</button>
            </div>
            <div className="modal-body xe-detail-body">
              <div className="xe-detail-layout">

                {/* Cột trái: ảnh + biển số */}
                <div className="xe-detail-left">
                  <div className="xe-detail-anh-wrap">
                    {showDetail.anh_xe
                      ? <img src={`/uploads/${showDetail.anh_xe}`} alt={showDetail.bien_so} className="xe-detail-anh"
                          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                      : null}
                    <div className="xe-detail-anh-fallback"
                      style={{display: showDetail.anh_xe ? 'none' : 'flex'}}>🚗</div>
                  </div>
                  <div className="xe-detail-bien-so">{showDetail.bien_so}</div>
                  <span className={`badge ${TRANG_THAI_MAP[showDetail.trang_thai]?.cls || 'badge-gray'}`} style={{fontSize:13}}>
                    {TRANG_THAI_MAP[showDetail.trang_thai]?.label || showDetail.trang_thai}
                  </span>
                  <span className="badge badge-info" style={{fontSize:13,marginTop:4}}>Hạng {showDetail.hang_bang}</span>
                  {showDetail.bao_loi_count > 0 && (
                    <div className="xe-detail-loi-badge">⚠️ {showDetail.bao_loi_count} lỗi chưa xử lý</div>
                  )}
                </div>

                {/* Cột phải: thông tin */}
                <div className="xe-detail-right">
                  <div className="xe-section-title">🚗 Thông Tin Xe</div>
                  <div className="xe-detail-grid">
                    {[
                      ['🏭 Hãng xe',   showDetail.hang_xe],
                      ['🚙 Dòng xe',   showDetail.dong_xe || '—'],
                      ['📅 Năm SX',    showDetail.nam_san_xuat || '—'],
                      ['⚙️ Loại xe',   LOAI_XE_MAP[showDetail.loai_xe]],
                      ['🎨 Màu xe',    showDetail.mau_xe || '—'],
                      ['🏆 Hạng bằng', `Hạng ${showDetail.hang_bang}`],
                    ].map(([k,v],i) => (
                      <div key={i} className="xe-detail-box">
                        <div className="xe-detail-label">{k}</div>
                        <div className="xe-detail-value">{v}</div>
                      </div>
                    ))}
                  </div>

                  {showDetail.ghi_chu && (
                    <>
                      <div className="xe-section-title" style={{marginTop:16}}>📝 Ghi Chú</div>
                      <div className="xe-detail-box" style={{gridColumn:'1/-1'}}>
                        <div className="xe-detail-value" style={{fontWeight:400,color:'#4b5563'}}>{showDetail.ghi_chu}</div>
                      </div>
                    </>
                  )}

                  {/* Báo lỗi — chỉ hiển thị khi có lỗi chưa xử lý */}
                  {(() => {
                    const loiChuaXuLy = showDetail.bao_loi?.filter(bl => bl.trang_thai !== 'da_xu_ly') || []
                    if (loiChuaXuLy.length === 0) return null
                    return (
                      <>
                        <div className="xe-section-title" style={{marginTop:16,color:'#dc2626',borderBottomColor:'#fecaca'}}>
                          ⚠️ Báo Lỗi Chưa Xử Lý ({loiChuaXuLy.length})
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {loiChuaXuLy.map(bl => (
                            <div key={bl.id} className="xe-bao-loi-item">
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                <strong style={{fontSize:13,color:'#dc2626'}}>{bl.tieu_de}</strong>
                                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                                  <span className={`badge ${MUC_DO_MAP[bl.muc_do]?.cls}`}>{MUC_DO_MAP[bl.muc_do]?.label}</span>
                                  <span className={`badge ${XLTT_MAP[bl.trang_thai]?.cls}`}>{XLTT_MAP[bl.trang_thai]?.label}</span>
                                </div>
                              </div>
                              {bl.mo_ta && (
                                <p style={{fontSize:13,color:'#374151',marginBottom:4,lineHeight:1.5}}>{bl.mo_ta}</p>
                              )}
                              <p style={{fontSize:11,color:'#9ca3af'}}>
                                👨‍🏫 {bl.giang_vien?.user?.ho_ten || '—'} &nbsp;·&nbsp; 📅 {new Date(bl.created_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Đóng</button>
              <button className="btn btn-warning" onClick={() => { setShowDetail(null); openEdit(showDetail) }}>✏️ Sửa</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XỬ LÝ BÁO LỖI ── */}
      {showXuLy && (
        <div className="modal-overlay" onClick={() => setShowXuLy(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔧 Xử Lý Báo Lỗi</h3>
              <button className="modal-close" onClick={() => setShowXuLy(null)}>✕</button>
            </div>
            <form onSubmit={handleXuLy}>
              <div className="modal-body">
                <div style={{marginBottom:12,padding:'10px 14px',background:'#fef3c7',borderRadius:8,border:'1px solid #fde68a'}}>
                  <p style={{fontWeight:600,color:'#92400e',marginBottom:4}}>{showXuLy.tieu_de}</p>
                  <p style={{fontSize:13,color:'#78350f'}}>{showXuLy.mo_ta}</p>
                  <p style={{fontSize:12,color:'#a16207',marginTop:4}}>
                    🚗 {showXuLy.xe?.bien_so} &nbsp;·&nbsp;
                    <span className={`badge ${MUC_DO_MAP[showXuLy.muc_do]?.cls}`}>{MUC_DO_MAP[showXuLy.muc_do]?.label}</span>
                  </p>
                </div>
                <div className="form-group">
                  <label>Trạng thái xử lý</label>
                  <select value={xuLyForm.trang_thai} onChange={e => setXuLyForm({...xuLyForm, trang_thai: e.target.value})}>
                    <option value="dang_xu_ly">🔧 Đang xử lý</option>
                    <option value="da_xu_ly">✅ Đã xử lý</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ghi chú xử lý</label>
                  <textarea rows={3} value={xuLyForm.ghi_chu_xu_ly}
                    onChange={e => setXuLyForm({...xuLyForm, ghi_chu_xu_ly: e.target.value})}
                    placeholder="Mô tả cách xử lý, linh kiện thay thế..."
                    style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,resize:'vertical'}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowXuLy(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">💾 Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default XeManagement
