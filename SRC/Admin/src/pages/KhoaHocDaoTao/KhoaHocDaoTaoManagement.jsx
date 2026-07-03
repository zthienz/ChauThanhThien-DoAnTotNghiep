import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './KhoaHocDaoTao.css'

const THANG_LIST = [1,2,3,4,5,6,7,8,9,10,11,12]
const NAM_LIST   = [2024,2025,2026,2027,2028]

const genMaKhoa = (thang, nam, hang) =>
  String(thang).padStart(2,'0') + String(nam) + hang

const TRANG_THAI_MAP = {
  chuan_bi:    { label: 'Chuẩn bị',  cls: 'badge-info' },
  dang_hoc:    { label: 'Đang học',   cls: 'badge-success' },
  da_ket_thuc: { label: 'Đã kết thúc', cls: 'badge-gray' },
}

const emptyKhoa = {
  ten_khoa_dao_tao: '',
  thang: new Date().getMonth() + 1,
  nam: new Date().getFullYear(),
  hang_bang: '',
  ghi_chu: ''
}

const KhoaHocDaoTaoManagement = () => {
  const { token, backendUrl } = useAdmin()
  const headers = { Authorization: `Bearer ${token}` }

  const [khoaList, setKhoaList]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [hangBangList, setHangBangList] = useState([])
  const [filterHang, setFilterHang] = useState('')
  const [filterNam, setFilterNam]   = useState('')
  const [filterThang, setFilterThang] = useState('')
  const [filterTT, setFilterTT]     = useState('')
  const [searchKhoa, setSearchKhoa] = useState('')

  // Modal tạo/sửa khóa
  const [showKhoaModal, setShowKhoaModal] = useState(false)
  const [editingKhoa, setEditingKhoa]     = useState(null)
  const [khoaForm, setKhoaForm]           = useState(emptyKhoa)

  // Modal xem chi tiết
  const [viewItem, setViewItem]       = useState(null)
  const [khoaDetail, setKhoaDetail]   = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab]     = useState('lop')

  // Modal lớp học
  const [showLopModal, setShowLopModal] = useState(false)
  const [editingLop, setEditingLop]     = useState(null)
  const [gvList, setGvList]             = useState([])
  const [lopForm, setLopForm]           = useState({
    ten_lop: '', giang_vien_ly_thuyet_id: '', giang_vien_thuc_hanh_id: '',
    ngay_khai_giang: '', si_so_toi_da: 30, trang_thai: 'chuan_bi', ghi_chu: ''
  })

  // Modal phân học viên
  const [showPhanHVModal, setShowPhanHVModal] = useState(false)
  const [targetLop, setTargetLop]             = useState(null)
  const [hvChoMoLop, setHvChoMoLop]           = useState([])
  const [hvSelected, setHvSelected]           = useState([])
  const [hvSearch, setHvSearch]               = useState('')

  // Modal phân xe
  const [showPhanXeModal, setShowPhanXeModal] = useState(false)
  const [targetLopXe, setTargetLopXe]         = useState(null)
  const [xeSanSang, setXeSanSang]             = useState([])
  const [xeSelectedIds, setXeSelectedIds]     = useState([])

  // Fetch danh sách hạng bằng từ API (lấy từ bảng khoa_hoc)
  useEffect(() => {
    const fetchHangBang = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc`, { headers })
        if (res.data.success) {
          const hangs = [...new Set(res.data.data.map(k => k.loai_bang).filter(Boolean))]
          hangs.sort()
          setHangBangList(hangs)
        }
      } catch {
        // fallback nếu API lỗi
        setHangBangList(['A1', 'A', 'B1', 'B2', 'C1', 'C', 'C2', 'CE', 'D', 'E'])
      }
    }
    fetchHangBang()
  }, [token])

  const fetchKhoa = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterHang)  params.hang_bang = filterHang
      if (filterNam)   params.nam       = filterNam
      if (filterThang) params.thang     = filterThang
      const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc-dao-tao`, { headers, params })
      if (res.data.success) setKhoaList(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tải danh sách khóa học')
    } finally { setLoading(false) }
  }, [filterHang, filterNam, filterThang, token])

  useEffect(() => { fetchKhoa() }, [fetchKhoa])

  const fetchKhoaDetail = async (khoa) => {
    setViewItem(khoa)
    setKhoaDetail(null)
    setDetailLoading(true)
    setDetailTab('lop')
    try {
      const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc-dao-tao/${khoa.id}`, { headers })
      if (res.data.success) setKhoaDetail(res.data.data)
    } catch { toast.error('Không tải được chi tiết khóa học') }
    finally { setDetailLoading(false) }
  }

  const fetchGv = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/giang-vien`, { headers })
      if (res.data.success) setGvList(res.data.data)
    } catch {}
  }

  const handleSaveKhoa = async e => {
    e.preventDefault()
    const ma_khoa = genMaKhoa(khoaForm.thang, khoaForm.nam, khoaForm.hang_bang)
    const payload = { ...khoaForm, ma_khoa }
    try {
      const res = editingKhoa
        ? await axios.put(`${backendUrl}/api/admin/khoa-hoc-dao-tao/${editingKhoa.id}`, payload, { headers })
        : await axios.post(`${backendUrl}/api/admin/khoa-hoc-dao-tao`, payload, { headers })
      if (res.data.success) {
        toast.success(editingKhoa ? 'Cập nhật khóa học thành công' : 'Tạo khóa học thành công')
        setShowKhoaModal(false)
        fetchKhoa()
        if (viewItem && editingKhoa?.id === viewItem.id) fetchKhoaDetail(viewItem)
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDeleteKhoa = async (id) => {
    if (!confirm('Xóa khóa học này?\nTất cả lớp học bên trong cũng sẽ bị xóa theo.\nHành động này không thể hoàn tác.')) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/khoa-hoc-dao-tao/${id}`, { headers })
      if (res.data.success) {
        toast.success(res.data.message || 'Đã xóa khóa học')
        if (viewItem?.id === id) setViewItem(null)
        fetchKhoa()
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const openAddLop = () => {
    setEditingLop(null)
    setLopForm({ ten_lop:'', giang_vien_ly_thuyet_id:'', giang_vien_thuc_hanh_id:'', ngay_khai_giang:'', si_so_toi_da:30, trang_thai:'chuan_bi', ghi_chu:'' })
    fetchGv()
    setShowLopModal(true)
  }

  const openEditLop = (lop) => {
    setEditingLop(lop)
    setLopForm({
      ten_lop: lop.ten_lop,
      giang_vien_ly_thuyet_id: lop.giang_vien_ly_thuyet_id || '',
      giang_vien_thuc_hanh_id: lop.giang_vien_thuc_hanh_id || '',
      ngay_khai_giang: lop.ngay_khai_giang?.split('T')[0] || '',
      si_so_toi_da: lop.si_so_toi_da,
      trang_thai: lop.trang_thai || 'chuan_bi',
      ghi_chu: lop.ghi_chu || '',
    })
    fetchGv()
    setShowLopModal(true)
  }

  const handleSaveLop = async e => {
    e.preventDefault()
    if (!viewItem) return
    try {
      const res = editingLop
        ? await axios.put(`${backendUrl}/api/admin/lop-hoc-dao-tao/${editingLop.id}`, lopForm, { headers })
        : await axios.post(`${backendUrl}/api/admin/khoa-hoc-dao-tao/${viewItem.id}/lop`, lopForm, { headers })
      if (res.data.success) {
        toast.success(editingLop ? 'Cập nhật lớp thành công' : 'Tạo lớp học thành công')
        setShowLopModal(false)
        fetchKhoaDetail(viewItem)
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDeleteLop = async (lopId) => {
    if (!confirm('Xóa lớp học này?')) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/lop-hoc-dao-tao/${lopId}`, { headers })
      if (res.data.success) { toast.success('Đã xóa lớp'); fetchKhoaDetail(viewItem) }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const openPhanHV = async (lop) => {
    setTargetLop(lop); setHvSelected([]); setHvSearch('')
    try {
      const res = await axios.get(`${backendUrl}/api/admin/hoc-vien-cho-mo-lop`, {
        headers, params: { hang_bang: viewItem?.hang_bang }
      })
      if (res.data.success) setHvChoMoLop(res.data.data)
    } catch { toast.error('Lỗi tải danh sách học viên') }
    setShowPhanHVModal(true)
  }

  const handlePhanHV = async () => {
    if (hvSelected.length === 0) { toast.warning('Chưa chọn học viên nào'); return }
    try {
      const res = await axios.post(`${backendUrl}/api/admin/lop-hoc-dao-tao/${targetLop.id}/phan-hoc-vien`, { ho_so_ids: hvSelected }, { headers })
      if (res.data.success) {
        toast.success(`Đã phân ${hvSelected.length} học viên vào lớp`)
        setShowPhanHVModal(false)
        fetchKhoaDetail(viewItem)
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const openPhanXe = async (lop) => {
    setTargetLopXe(lop); setXeSelectedIds(lop.xe_ids || [])
    try {
      const res = await axios.get(`${backendUrl}/api/admin/xe`, { headers, params: { hang_bang: viewItem?.hang_bang } })
      if (res.data.success) setXeSanSang(res.data.data)
    } catch { toast.error('Lỗi tải danh sách xe') }
    setShowPhanXeModal(true)
  }

  const handlePhanXe = async () => {
    try {
      const res = await axios.post(`${backendUrl}/api/admin/lop-hoc-dao-tao/${targetLopXe.id}/phan-xe`, { xe_ids: xeSelectedIds }, { headers })
      if (res.data.success) {
        toast.success('Đã cập nhật xe cho lớp')
        setShowPhanXeModal(false)
        fetchKhoaDetail(viewItem)
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const toggleHV  = (id) => setHvSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleXe  = (id) => setXeSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const filteredHV = hvChoMoLop.filter(hv =>
    hv.ho_ten?.toLowerCase().includes(hvSearch.toLowerCase()) ||
    hv.so_cccd?.includes(hvSearch) || hv.so_dien_thoai?.includes(hvSearch)
  )

  const filtered = khoaList.filter(k => {
    const matchSearch = !searchKhoa ||
      k.ten_khoa_dao_tao?.toLowerCase().includes(searchKhoa.toLowerCase()) ||
      k.ma_khoa?.toLowerCase().includes(searchKhoa.toLowerCase())
    const matchTT = !filterTT || k.trang_thai === filterTT
    return matchSearch && matchTT
  })

  return (
    <div className="khdt-page">
      {/* ── HEADER ── */}
      <div className="page-header">
        <div>
          <h2>📅 Quản Lý Khóa Học Đào Tạo</h2>
          <p>Tạo và quản lý các khóa học theo tháng — phân lớp, giảng viên, học viên và xe</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingKhoa(null); setKhoaForm(emptyKhoa); setShowKhoaModal(true) }}>
          + Tạo khóa học
        </button>
      </div>

      {/* ── BỘ LỌC ── */}
      <div className="search-bar">
        <input className="search-input" placeholder="🔍 Tìm theo tên khóa học, mã khóa..."
          value={searchKhoa} onChange={e => setSearchKhoa(e.target.value)} />
        <select className="search-input" style={{maxWidth:180}} value={filterHang} onChange={e => setFilterHang(e.target.value)}>
          <option value="">Tất cả hạng bằng</option>
          {hangBangList.map(h => <option key={h} value={h}>Hạng {h}</option>)}
        </select>
        <select className="search-input" style={{maxWidth:130}} value={filterThang} onChange={e => setFilterThang(e.target.value)}>
          <option value="">Tất cả tháng</option>
          {THANG_LIST.map(t => <option key={t} value={t}>Tháng {t}</option>)}
        </select>
        <select className="search-input" style={{maxWidth:120}} value={filterNam} onChange={e => setFilterNam(e.target.value)}>
          <option value="">Tất cả năm</option>
          {NAM_LIST.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* ── BẢNG DỮ LIỆU ── */}
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã khóa</th>
                  <th>Tên khóa học</th>
                  <th>Hạng</th>
                  <th>Tháng / Năm</th>
                  <th>Số lớp</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'#a0aec0'}}>Chưa có khóa học nào</td></tr>
                ) : filtered.map((k, i) => {
                  const tt = TRANG_THAI_MAP[k.trang_thai] || { label: k.trang_thai, cls: 'badge-gray' }
                  return (
                    <tr key={k.id}>
                      <td>{i + 1}</td>
                      <td>
                        <span className="khdt-ma-badge">{k.ma_khoa}</span>
                      </td>
                      <td><strong>{k.ten_khoa_dao_tao}</strong></td>
                      <td><span className="badge badge-blue">Hạng {k.hang_bang}</span></td>
                      <td>Tháng {k.thang}/{k.nam}</td>
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          <span style={{ fontWeight:600, fontSize:13 }}>🏫 {k.lop_count || 0} lớp</span>
                          {(k.lop_dang_hoc || 0) > 0 && (
                            <span style={{ fontSize:11, color:'#059669', fontWeight:600 }}>
                              ▶ {k.lop_dang_hoc} đang học
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-cell">
                          <button className="btn btn-info btn-sm" onClick={() => fetchKhoaDetail(k)}>👁️ Xem</button>
                          <button className="btn btn-warning btn-sm" onClick={() => {
                            setEditingKhoa(k)
                            setKhoaForm({ ten_khoa_dao_tao: k.ten_khoa_dao_tao, thang: k.thang, nam: k.nam, hang_bang: k.hang_bang, ghi_chu: k.ghi_chu || '' })
                            setShowKhoaModal(true)
                          }}>✏️ Sửa</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteKhoa(k.id)}>🗑️ Xóa</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODAL XEM CHI TIẾT KHÓA HỌC ── */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>📅 Chi Tiết Khóa Học</h3>
                <p style={{fontSize:12,color:'#718096',marginTop:2}}>{viewItem.ten_khoa_dao_tao}</p>
              </div>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Info header */}
              <div className="khdt-detail-info-bar">
                <span className="khdt-ma-badge">{viewItem.ma_khoa}</span>
                <span className="badge badge-blue">Hạng {viewItem.hang_bang}</span>
                <span className={`badge ${TRANG_THAI_MAP[viewItem.trang_thai]?.cls || 'badge-gray'}`}>
                  {TRANG_THAI_MAP[viewItem.trang_thai]?.label || viewItem.trang_thai}
                </span>
                <span style={{fontSize:13,color:'#718096'}}>📅 Tháng {viewItem.thang}/{viewItem.nam}</span>
                <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}} onClick={openAddLop}>+ Thêm lớp</button>
              </div>

              {/* Tabs — chỉ có tab Lớp học */}
              <div className="khdt-detail-tabs" style={{marginTop:16}}>
                <button className="khdt-detail-tab active">
                  🏫 Lớp học ({khoaDetail?.lop_hoc?.length || 0})
                </button>
              </div>

              {detailLoading ? (
                <div className="loading-wrap"><div className="spinner"/></div>
              ) : khoaDetail ? (
                <div className="khdt-lop-list" style={{marginTop:12}}>
                  {(!khoaDetail.lop_hoc || khoaDetail.lop_hoc.length === 0) ? (
                        <div className="khdt-empty">
                          <p>Chưa có lớp học nào trong khóa này</p>
                          <button className="btn btn-primary btn-sm" onClick={openAddLop}>+ Thêm lớp đầu tiên</button>
                        </div>
                      ) : khoaDetail.lop_hoc.map(lop => (
                        <div key={lop.id} className="khdt-lop-card">
                          <div className="khdt-lop-card-top">
                            <div>
                              <strong style={{fontSize:15}}>{lop.ten_lop}</strong>
                              <div style={{fontSize:12,color:'#718096',marginTop:2}}>
                                👥 {lop.hoc_vien_count||0}/{lop.si_so_toi_da} HV
                                {lop.ngay_khai_giang && <span style={{marginLeft:8}}>📅 {new Date(lop.ngay_khai_giang).toLocaleDateString('vi-VN')}</span>}
                              </div>
                            </div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              <button className="btn btn-outline btn-sm" onClick={() => openEditLop(lop)}>✏️ Sửa</button>
                              <button className="btn btn-info btn-sm" onClick={() => openPhanHV(lop)}>👥 Phân HV</button>
                              <button className="btn btn-warning btn-sm" onClick={() => openPhanXe(lop)}>🚗 Phân xe</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLop(lop.id)}>🗑️</button>
                            </div>
                          </div>
                          <div className="khdt-lop-card-info">
                            <div className="khdt-lop-info-item">
                              <span className="khdt-lop-info-label">📖 GV Lý thuyết</span>
                              <span>{lop.giang_vien_ly_thuyet?.user?.ho_ten || <em style={{color:'#9ca3af'}}>Chưa phân công</em>}</span>
                            </div>
                            <div className="khdt-lop-info-item">
                              <span className="khdt-lop-info-label">🚗 GV Thực hành</span>
                              <span>{lop.giang_vien_thuc_hanh?.user?.ho_ten || <em style={{color:'#9ca3af'}}>Chưa phân công</em>}</span>
                            </div>
                            <div className="khdt-lop-info-item">
                              <span className="khdt-lop-info-label">🚗 Xe thực hành</span>
                              <span>{lop.xe_lop?.length > 0 ? lop.xe_lop.map(x => x.xe?.bien_so).join(', ') : <em style={{color:'#9ca3af'}}>Chưa phân xe</em>}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
              <button className="btn btn-warning" onClick={() => {
                setEditingKhoa(viewItem)
                setKhoaForm({ ten_khoa_dao_tao: viewItem.ten_khoa_dao_tao, thang: viewItem.thang, nam: viewItem.nam, hang_bang: viewItem.hang_bang, ghi_chu: viewItem.ghi_chu || '' })
                setShowKhoaModal(true)
              }}>✏️ Sửa khóa học</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO / SỬA KHÓA HỌC ── */}
      {showKhoaModal && (
        <div className="modal-overlay" onClick={() => setShowKhoaModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingKhoa ? '✏️ Sửa Khóa Học' : '📅 Tạo Khóa Học Đào Tạo'}</h3>
              <button className="modal-close" onClick={() => setShowKhoaModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveKhoa}>
              <div className="modal-body">
                <div className="khdt-ma-preview">
                  <span>Mã khóa học:</span>
                  <strong className="khdt-ma-preview-value">{genMaKhoa(khoaForm.thang, khoaForm.nam, khoaForm.hang_bang)}</strong>
                </div>
                <div className="form-group">
                  <label>Tên khóa học *</label>
                  <input value={khoaForm.ten_khoa_dao_tao} onChange={e => setKhoaForm({...khoaForm, ten_khoa_dao_tao: e.target.value})} required placeholder="VD: Khóa học bằng lái B1 tháng 1/2026" />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label>Tháng *</label>
                    <select value={khoaForm.thang} onChange={e => setKhoaForm({...khoaForm, thang: Number(e.target.value)})}>
                      {THANG_LIST.map(t => <option key={t} value={t}>Tháng {t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Năm *</label>
                    <select value={khoaForm.nam} onChange={e => setKhoaForm({...khoaForm, nam: Number(e.target.value)})}>
                      {NAM_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Hạng bằng *</label>
                    <select value={khoaForm.hang_bang} onChange={e => setKhoaForm({...khoaForm, hang_bang: e.target.value})} required>
                      <option value="">-- Chọn hạng bằng --</option>
                      {hangBangList.map(h => <option key={h} value={h}>Hạng {h}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea rows={2} value={khoaForm.ghi_chu} onChange={e => setKhoaForm({...khoaForm, ghi_chu: e.target.value})} placeholder="Ghi chú thêm về khóa học..." style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,resize:'vertical'}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowKhoaModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingKhoa ? '💾 Cập nhật' : '➕ Tạo khóa học'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO / SỬA LỚP HỌC ── */}
      {showLopModal && (
        <div className="modal-overlay" onClick={() => setShowLopModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLop ? '✏️ Sửa Lớp Học' : '🏫 Thêm Lớp Học'}</h3>
              <button className="modal-close" onClick={() => setShowLopModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveLop}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên lớp *</label>
                  <input value={lopForm.ten_lop} onChange={e => setLopForm({...lopForm,ten_lop:e.target.value})} required placeholder="VD: B1-01/2026-A" />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label>📖 GV Lý thuyết</label>
                    <select value={lopForm.giang_vien_ly_thuyet_id} onChange={e => setLopForm({...lopForm,giang_vien_ly_thuyet_id:e.target.value})}>
                      <option value="">-- Chọn giảng viên --</option>
                      {gvList.filter(g => g.chuyen_mon !== 'thuc_hanh').map(g => (
                        <option key={g.id} value={g.id}>{g.ho_ten} ({g.chuyen_mon === 'ca_hai' ? 'Cả hai' : 'LT'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>🚗 GV Thực hành</label>
                    <select value={lopForm.giang_vien_thuc_hanh_id} onChange={e => setLopForm({...lopForm,giang_vien_thuc_hanh_id:e.target.value})}>
                      <option value="">-- Chọn giảng viên --</option>
                      {gvList.filter(g => g.chuyen_mon !== 'ly_thuyet').map(g => (
                        <option key={g.id} value={g.id}>{g.ho_ten} ({g.chuyen_mon === 'ca_hai' ? 'Cả hai' : 'TH'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>📅 Ngày khai giảng</label>
                    <input type="date" value={lopForm.ngay_khai_giang} onChange={e => setLopForm({...lopForm,ngay_khai_giang:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>👥 Sĩ số tối đa</label>
                    <input type="number" min={1} max={100} value={lopForm.si_so_toi_da} onChange={e => setLopForm({...lopForm,si_so_toi_da:e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea rows={2} value={lopForm.ghi_chu} onChange={e => setLopForm({...lopForm,ghi_chu:e.target.value})} style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,resize:'vertical'}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowLopModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingLop ? '💾 Cập nhật' : '➕ Tạo lớp'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL PHÂN HỌC VIÊN ── */}
      {showPhanHVModal && (
        <div className="modal-overlay" onClick={() => setShowPhanHVModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Phân Học Viên — {targetLop?.ten_lop}</h3>
              <button className="modal-close" onClick={() => setShowPhanHVModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="khdt-phan-hv-notice">
                ℹ️ Chỉ hiển thị học viên hạng <strong>{viewItem?.hang_bang}</strong>, đã đóng học phí và đang chờ mở lớp.
                Đã chọn: <strong>{hvSelected.length}</strong> học viên
              </div>
              <input className="search-input" style={{marginBottom:12}} placeholder="🔍 Tìm theo tên, CCCD, SĐT..." value={hvSearch} onChange={e => setHvSearch(e.target.value)} />
              {filteredHV.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px',color:'#9ca3af'}}>Không có học viên nào phù hợp</div>
              ) : (
                <div className="khdt-hv-select-list">
                  {filteredHV.map(hv => (
                    <label key={hv.id} className={`khdt-hv-select-item ${hvSelected.includes(hv.id)?'selected':''}`}>
                      <input type="checkbox" checked={hvSelected.includes(hv.id)} onChange={() => toggleHV(hv.id)} style={{marginRight:10}} />
                      <div style={{flex:1}}>
                        <strong>{hv.ho_ten}</strong>
                        <div style={{fontSize:12,color:'#718096'}}>{hv.so_cccd} · {hv.so_dien_thoai || '—'}</div>
                      </div>
                      <span className="badge badge-success" style={{fontSize:11}}>✅ Đã đóng HP</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowPhanHVModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handlePhanHV} disabled={hvSelected.length === 0}>
                ✅ Phân {hvSelected.length} học viên vào lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PHÂN XE ── */}
      {showPhanXeModal && (
        <div className="modal-overlay" onClick={() => setShowPhanXeModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚗 Phân Xe Thực Hành — {targetLopXe?.ten_lop}</h3>
              <button className="modal-close" onClick={() => setShowPhanXeModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="khdt-phan-hv-notice">
                ℹ️ Xe hạng <strong>{viewItem?.hang_bang}</strong>. Đã chọn: <strong>{xeSelectedIds.length}</strong> xe
              </div>
              {xeSanSang.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px',color:'#9ca3af'}}>Không có xe phù hợp</div>
              ) : (
                <div className="khdt-hv-select-list">
                  {xeSanSang.map(xe => (
                    <label key={xe.id} className={`khdt-hv-select-item ${xeSelectedIds.includes(xe.id)?'selected':''}`}>
                      <input type="checkbox" checked={xeSelectedIds.includes(xe.id)} onChange={() => toggleXe(xe.id)} style={{marginRight:10}} />
                      <div style={{flex:1}}>
                        <strong style={{color:'#0d47a1'}}>{xe.bien_so}</strong>
                        <div style={{fontSize:12,color:'#718096'}}>{xe.hang_xe} {xe.dong_xe} · {xe.loai_xe === 'so_san' ? 'Số sàn' : 'Số tự động'}</div>
                      </div>
                      <span className="badge badge-info" style={{fontSize:11}}>Hạng {xe.hang_bang}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowPhanXeModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handlePhanXe}>🚗 Lưu phân xe ({xeSelectedIds.length} xe)</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default KhoaHocDaoTaoManagement
