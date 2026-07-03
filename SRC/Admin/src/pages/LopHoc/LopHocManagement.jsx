import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import '../KhoaHocDaoTao/KhoaHocDaoTao.css'

const TS_MAP   = { chuan_bi:'badge-info', dang_hoc:'badge-success', da_ket_thuc:'badge-gray' }
const TS_LABEL = { chuan_bi:'Chuẩn bị', dang_hoc:'Đang học', da_ket_thuc:'Đã kết thúc' }
const HV_MAP = {
  cho_dong_hoc_phi:      'badge-warning',
  cho_mo_lop:            'badge-info',
  chuan_bi_hoc:          'badge-info',
  dang_hoc:              'badge-success',
  du_dieu_kien_thi_tn:   'badge-blue',
  chuan_bi_thi:          'badge-warning',
  dang_thi_tn:           'badge-warning',
  hoan_thanh_tn:         'badge-success',
  du_dieu_kien_sat_hanh: 'badge-blue',
  dang_thi_sat_hanh:     'badge-warning',
  dau_sat_hanh:          'badge-success',
  da_cap_bang:           'badge-success',
}
const HV_LABEL = {
  cho_dong_hoc_phi:      'Chờ đóng HP',
  cho_mo_lop:            'Chờ mở lớp',
  chuan_bi_hoc:          'Chuẩn bị học',
  dang_hoc:              'Đang học',
  du_dieu_kien_thi_tn:   'Đủ ĐK thi TN',
  chuan_bi_thi:          'Chuẩn bị thi',
  dang_thi_tn:           'Đang thi TN',
  hoan_thanh_tn:         'Hoàn thành TN',
  du_dieu_kien_sat_hanh: 'Chờ thi sát hạch',
  dang_thi_sat_hanh:     'Đang thi sát hạch',
  dau_sat_hanh:          'Đậu sát hạch',
  da_cap_bang:           'Đã cấp bằng',
}

const sectionTitle = { fontSize:13, fontWeight:700, color:'#0d47a1', textTransform:'uppercase', letterSpacing:'0.05em', paddingBottom:8, borderBottom:'2px solid #e0ecff', marginBottom:12 }
const grid2  = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }
const dBox   = { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 14px' }
const dLabel = { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }
const dVal   = { fontSize:14, fontWeight:600, color:'#111827' }

const LopHocManagement = () => {
  const { token, backendUrl } = useAdmin()
  const headers = { Authorization: `Bearer ${token}` }

  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterTT, setFilterTT]     = useState('')
  const [filterBang, setFilterBang] = useState('')
  const [filterThang, setFilterThang] = useState('')
  const [filterNam, setFilterNam]   = useState('')

  // Modal tạo/sửa lớp
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [khoaList, setKhoaList]   = useState([])
  const [gvList, setGvList]       = useState([])
  const [form, setForm] = useState({
    ten_lop:'', khoa_hoc_id:'', giang_vien_ly_thuyet_id:'',
    giang_vien_thuc_hanh_id:'', ngay_khai_giang:'', si_so_toi_da:30, ghi_chu:''
  })

  // Modal xem chi tiết
  const [viewItem, setViewItem]       = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [detailTab, setDetailTab]     = useState('info') // 'info' | 'hocvien'

  // Modal thêm học viên vào lớp
  const [showAddHV, setShowAddHV]   = useState(false)
  const [targetLop, setTargetLop]   = useState(null)
  const [hvList, setHvList]         = useState([])
  const [hvLoading, setHvLoading]   = useState(false)
  const [hvSearch, setHvSearch]     = useState('')
  const [hvSelected, setHvSelected] = useState([])

  // ── Fetch ──
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/lop-hoc`, { headers }),
        axios.get(`${backendUrl}/api/admin/khoa-hoc-dao-tao`, { headers }),
        axios.get(`${backendUrl}/api/admin/giang-vien`, { headers }),
      ])
      if (r1.data.success) setList(r1.data.data)
      if (r2.data.success) setKhoaList(r2.data.data)
      if (r3.data.success) setGvList(r3.data.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi kết nối server') }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [])

  // ── Tạo / Sửa lớp ──
  const openAdd = () => {
    setEditing(null)
    setForm({ ten_lop:'', khoa_hoc_id:'', giang_vien_ly_thuyet_id:'', giang_vien_thuc_hanh_id:'', ngay_khai_giang:'', si_so_toi_da:30, ghi_chu:'' })
    setShowModal(true)
  }

  const openEdit = lop => {
    setEditing(lop)
    setForm({
      ten_lop:                  lop.ten_lop || '',
      khoa_hoc_id:              lop.khoa_hoc_id || '',
      giang_vien_ly_thuyet_id:  lop.giang_vien_ly_thuyet_id || '',
      giang_vien_thuc_hanh_id:  lop.giang_vien_thuc_hanh_id || '',
      ngay_khai_giang:          lop.ngay_khai_giang?.split('T')[0] || '',
      si_so_toi_da:             lop.si_so_toi_da || 30,
      ghi_chu:                  lop.ghi_chu || '',
    })
    setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    try {
      const res = editing
        ? await axios.put(`${backendUrl}/api/admin/lop-hoc/${editing.id}`, form, { headers })
        : await axios.post(`${backendUrl}/api/admin/lop-hoc`, form, { headers })
      if (res.data.success) {
        toast.success(editing ? 'Cập nhật lớp thành công!' : 'Tạo lớp học thành công!')
        setShowModal(false)
        fetchAll()
        // Refresh viewItem chỉ khi đang sửa (editing !== null) và đang xem đúng lớp đó
        if (editing && viewItem?.id === editing.id) openView({ id: editing.id })
      } else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDelete = async lop => {
    if (!confirm(`Xóa lớp "${lop.ten_lop}"?\nHành động này không thể hoàn tác.`)) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/lop-hoc/${lop.id}`, { headers })
      if (res.data.success) { toast.success('Đã xóa lớp học'); fetchAll() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  // ── Xem chi tiết ──
  const openView = async lop => {
    setViewLoading(true)
    setViewItem({})
    setDetailTab('info')
    try {
      const res = await axios.get(`${backendUrl}/api/admin/lop-hoc/${lop.id}`, { headers })
      if (res.data.success) setViewItem(res.data.data)
    } catch { toast.error('Không tải được chi tiết lớp học') }
    finally { setViewLoading(false) }
  }

  // ── Đồng bộ trạng thái học viên theo lớp ──
  const dongBoTrangThai = async lop => {
    try {
      const res = await axios.post(`${backendUrl}/api/admin/lop-hoc/${lop.id}/dong-bo`, {}, { headers })
      if (res.data.success) {
        toast.success(res.data.message)
        if (res.data.dong_lop) {
          // Lớp vừa được đóng → đóng modal và refresh danh sách
          setViewItem(null)
          fetchAll()
        } else {
          openView(lop)
          fetchAll()
        }
      }
    } catch { toast.error('Đồng bộ thất bại') }
  }

  // ── Xóa học viên khỏi lớp ──
  const xoaHocVienKhoiLop = async (lop, hvl) => {
    const ten = hvl.ho_so?.ho_ten || 'học viên này'
    if (!confirm(`Xóa "${ten}" khỏi lớp "${lop.ten_lop}"?\nHọc viên sẽ được chuyển về trạng thái chờ xếp lớp.`)) return
    try {
      const res = await axios.delete(
        `${backendUrl}/api/admin/lop-hoc/${lop.id}/hoc-vien/${hvl.ho_so_id}`,
        { headers }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        if (res.data.dong_lop) {
          // Lớp vừa tự đóng sau khi xóa HV → đóng modal, refresh danh sách
          setViewItem(null)
          fetchAll()
        } else {
          openView({ id: lop.id })
          fetchAll()
        }
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại')
    }
  }

  // ── Thêm học viên vào lớp ──
  const openAddHV = async lop => {
    setTargetLop(lop)
    setHvSelected([])
    setHvSearch('')
    setHvLoading(true)
    setShowAddHV(true)
    try {
      // Lấy học viên đủ điều kiện: đã đóng HP, chờ mở lớp, đúng hạng bằng của lớp
      const loaiBang = lop.khoa_hoc?.loai_bang
      const res = await axios.get(`${backendUrl}/api/admin/ho-so`, {
        headers,
        params: { trang_thai: 'cho_mo_lop', per_page: 200 }
      })
      if (res.data.success) {
        // Lọc theo hạng bằng của lớp
        const filtered = res.data.data.filter(hv =>
          hv.trang_thai_hoc_phi === 'da_dong' &&
          hv.trang_thai === 'cho_mo_lop' &&
          (!loaiBang || hv.khoa_hoc?.loai_bang === loaiBang)
        )
        setHvList(filtered)
      }
    } catch { toast.error('Lỗi tải danh sách học viên') }
    finally { setHvLoading(false) }
  }

  const handleAddHV = async () => {
    if (hvSelected.length === 0) { toast.warning('Chưa chọn học viên nào'); return }
    try {
      // Xếp từng học viên vào lớp
      let success = 0
      for (const hoSoId of hvSelected) {
        try {
          await axios.post(`${backendUrl}/api/admin/ho-so/${hoSoId}/xep-lop`,
            { lop_hoc_id: targetLop.id }, { headers })
          success++
        } catch {}
      }
      toast.success(`Đã thêm ${success} học viên vào lớp`)
      setShowAddHV(false)
      fetchAll()
      if (viewItem?.id === targetLop.id) openView({ id: targetLop.id })
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const toggleHV = id => setHvSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const filteredHV = hvList.filter(hv =>
    !hvSearch ||
    hv.ho_ten?.toLowerCase().includes(hvSearch.toLowerCase()) ||
    hv.so_cccd?.includes(hvSearch) ||
    hv.so_dien_thoai?.includes(hvSearch)
  )

  // ── Lọc bảng ──
  const filtered = list.filter(l => {
    const matchSearch = !search ||
      l.ten_lop?.toLowerCase().includes(search.toLowerCase()) ||
      l.khoa_hoc?.ten_khoa?.toLowerCase().includes(search.toLowerCase()) ||
      l.giang_vien_ly_thuyet?.user?.ho_ten?.toLowerCase().includes(search.toLowerCase()) ||
      l.giang_vien_thuc_hanh?.user?.ho_ten?.toLowerCase().includes(search.toLowerCase())
    const matchTT    = !filterTT    || l.trang_thai === filterTT
    const matchBang  = !filterBang  || l.khoa_hoc?.loai_bang === filterBang || l.khoa_hoc?.hang_bang === filterBang
    const matchThang = !filterThang || String(l.khoa_hoc?.thang) === filterThang
    const matchNam   = !filterNam   || String(l.khoa_hoc?.nam)   === filterNam
    return matchSearch && matchTT && matchBang && matchThang && matchNam
  })

  // Danh sách hạng bằng và tháng/năm từ dữ liệu hiện có
  const hangList  = [...new Set(list.map(l => l.khoa_hoc?.loai_bang || l.khoa_hoc?.hang_bang).filter(Boolean))].sort()
  const thangList = [...new Set(list.map(l => l.khoa_hoc?.thang).filter(Boolean))].sort((a,b) => a-b)
  const namList   = [...new Set(list.map(l => l.khoa_hoc?.nam).filter(Boolean))].sort((a,b) => b-a)

  // Khóa học được chọn trong form (để lọc GV theo hạng)
  const selectedKhoa = khoaList.find(k => String(k.id) === String(form.khoa_hoc_id))
  // Thông tin hiển thị: dùng ten_khoa_dao_tao và hang_bang (từ API khoa-hoc-dao-tao)
  const khoaTenHien  = selectedKhoa?.ten_khoa_dao_tao || selectedKhoa?.ten_khoa || ''
  const khoaHang     = selectedKhoa?.hang_bang || selectedKhoa?.loai_bang || ''

  return (
    <div>
      <div className="page-header">
        <div><h2>🏫 Lớp Học</h2><p>Quản lý các lớp học và phân công giảng viên</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Tạo lớp học</button>
      </div>

      {/* ── THẺ THỐNG KÊ ── */}
      <div className="khdt-stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="khdt-stat-card">
          <span className="khdt-stat-icon">🏫</span>
          <div>
            <p className="khdt-stat-value">{list.length}</p>
            <p className="khdt-stat-label">Tổng lớp học</p>
          </div>
        </div>
        <div className="khdt-stat-card" onClick={() => setFilterTT(filterTT==='chuan_bi' ? '' : 'chuan_bi')}
          style={{cursor:'pointer', outline: filterTT==='chuan_bi' ? '2px solid #2563eb' : 'none'}}>
          <span className="khdt-stat-icon">🔵</span>
          <div>
            <p className="khdt-stat-value">{list.filter(l => l.trang_thai === 'chuan_bi').length}</p>
            <p className="khdt-stat-label">Chuẩn bị</p>
          </div>
        </div>
        <div className="khdt-stat-card green" onClick={() => setFilterTT(filterTT==='dang_hoc' ? '' : 'dang_hoc')}
          style={{cursor:'pointer', outline: filterTT==='dang_hoc' ? '2px solid #16a34a' : 'none'}}>
          <span className="khdt-stat-icon">🟢</span>
          <div>
            <p className="khdt-stat-value">{list.filter(l => l.trang_thai === 'dang_hoc').length}</p>
            <p className="khdt-stat-label">Đang học</p>
          </div>
        </div>
        <div className="khdt-stat-card gray" onClick={() => setFilterTT(filterTT==='da_ket_thuc' ? '' : 'da_ket_thuc')}
          style={{cursor:'pointer', outline: filterTT==='da_ket_thuc' ? '2px solid #9ca3af' : 'none'}}>
          <span className="khdt-stat-icon">⚫</span>
          <div>
            <p className="khdt-stat-value">{list.filter(l => l.trang_thai === 'da_ket_thuc').length}</p>
            <p className="khdt-stat-label">Đã kết thúc</p>
          </div>
        </div>
      </div>

      <div className="search-bar">
        <input className="search-input" placeholder="🔍 Tìm theo tên lớp, khóa học, giảng viên..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="search-input" style={{maxWidth:150}} value={filterBang} onChange={e => setFilterBang(e.target.value)}>
          <option value="">Tất cả hạng</option>
          {hangList.map(h => <option key={h} value={h}>Hạng {h}</option>)}
        </select>
        <select className="search-input" style={{maxWidth:130}} value={filterThang} onChange={e => setFilterThang(e.target.value)}>
          <option value="">Tất cả tháng</option>
          {thangList.map(t => <option key={t} value={t}>Tháng {t}</option>)}
        </select>
        <select className="search-input" style={{maxWidth:110}} value={filterNam} onChange={e => setFilterNam(e.target.value)}>
          <option value="">Tất cả năm</option>
          {namList.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="search-input" style={{maxWidth:160}} value={filterTT} onChange={e => setFilterTT(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="chuan_bi">Chuẩn bị</option>
          <option value="dang_hoc">Đang học</option>
          <option value="da_ket_thuc">Đã kết thúc</option>
        </select>
      </div>

      <div className="card">
        <div className="card-body" style={{padding:0}}>
          {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Tên lớp</th><th>Khóa học</th><th>GV Lý thuyết</th><th>GV Thực hành</th><th>Khai giảng</th><th>Sĩ số</th><th>Trạng thái</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9} style={{textAlign:'center',padding:'40px',color:'#a0aec0'}}>Không có dữ liệu</td></tr>
                  : filtered.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i+1}</td>
                      <td><strong>{l.ten_lop}</strong></td>
                      <td>
                        <p style={{fontWeight:600,fontSize:13}}>{l.khoa_hoc?.ten_khoa || '—'}</p>
                        {l.khoa_hoc?.loai_bang && <span className="badge badge-blue" style={{fontSize:11}}>Hạng {l.khoa_hoc.loai_bang}</span>}
                      </td>
                      <td>{l.giang_vien_ly_thuyet?.user?.ho_ten || '—'}</td>
                      <td>{l.giang_vien_thuc_hanh?.user?.ho_ten || '—'}</td>
                      <td style={{fontSize:12}}>{l.ngay_khai_giang ? new Date(l.ngay_khai_giang).toLocaleDateString('vi-VN') : '—'}</td>
                      <td>
                        <span style={{fontWeight:600}}>{l.hoc_vien_count || 0}</span>
                        <span style={{color:'#9ca3af'}}>/{l.si_so_toi_da}</span>
                      </td>
                      <td><span className={`badge ${TS_MAP[l.trang_thai]||'badge-gray'}`}>{TS_LABEL[l.trang_thai]||l.trang_thai}</span></td>
                      <td>
                        <div className="action-cell">
                          <button className="btn btn-info btn-sm" onClick={() => openView(l)}>👁️ Xem</button>
                          <button className="btn btn-warning btn-sm" onClick={() => openEdit(l)}>✏️ Sửa</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── MODAL TẠO / SỬA LỚP ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? `✏️ Sửa Lớp — ${editing.ten_lop}` : '🏫 Tạo Lớp Học Mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên lớp *</label>
                  <input value={form.ten_lop} onChange={e=>setForm({...form,ten_lop:e.target.value})} required placeholder="VD: B2-03/2026-A" />
                </div>
                <div className="form-group">
                  <label>Khóa học *</label>
                  <select value={form.khoa_hoc_id} onChange={e=>setForm({...form,khoa_hoc_id:e.target.value,giang_vien_ly_thuyet_id:'',giang_vien_thuc_hanh_id:''})} required>
                    <option value="">-- Chọn khóa học --</option>
                    {khoaList.map(k => <option key={k.id} value={k.id}>{k.ten_khoa_dao_tao} (Hạng {k.hang_bang})</option>)}
                  </select>
                  {selectedKhoa && (
                    <p style={{fontSize:12,color:'#0d47a1',marginTop:4}}>
                      ℹ️ Hạng bằng: <strong>{khoaHang}</strong>
                      {selectedKhoa.thang && <> — Tháng <strong>{selectedKhoa.thang}/{selectedKhoa.nam}</strong></>}
                    </p>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group">
                    <label>📖 GV Lý thuyết</label>
                    <select value={form.giang_vien_ly_thuyet_id} onChange={e=>setForm({...form,giang_vien_ly_thuyet_id:e.target.value})}>
                      <option value="">-- Chọn GV --</option>
                      {gvList.filter(g => g.chuyen_mon !== 'thuc_hanh').map(g => (
                        <option key={g.id} value={g.id}>{g.ho_ten} ({g.chuyen_mon === 'ca_hai' ? 'Cả hai' : 'LT'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>🚗 GV Thực hành</label>
                    <select value={form.giang_vien_thuc_hanh_id} onChange={e=>setForm({...form,giang_vien_thuc_hanh_id:e.target.value})}>
                      <option value="">-- Chọn GV --</option>
                      {gvList.filter(g => g.chuyen_mon !== 'ly_thuyet').map(g => (
                        <option key={g.id} value={g.id}>{g.ho_ten} ({g.chuyen_mon === 'ca_hai' ? 'Cả hai' : 'TH'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>📅 Ngày khai giảng</label>
                    <input type="date" value={form.ngay_khai_giang} onChange={e=>setForm({...form,ngay_khai_giang:e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>👥 Sĩ số tối đa</label>
                    <input type="number" min={1} max={100} value={form.si_so_toi_da} onChange={e=>setForm({...form,si_so_toi_da:e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea rows={2} value={form.ghi_chu} onChange={e=>setForm({...form,ghi_chu:e.target.value})}
                    style={{width:'100%',padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:8,resize:'vertical'}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editing ? '💾 Cập nhật' : '➕ Tạo lớp'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL XEM CHI TIẾT ── */}
      {viewItem !== null && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
            <div className="modal-header">
              <h3>🏫 Chi Tiết Lớp Học — {viewItem.ten_lop}</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>

            {viewLoading ? (
              <div className="modal-body"><div className="loading-wrap"><div className="spinner"/></div></div>
            ) : (
              <>
                {/* Tabs */}
                <div style={{display:'flex',borderBottom:'2px solid #e2e8f0',padding:'0 24px'}}>
                  {[
                    { key:'info',    label:`📋 Thông tin` },
                    { key:'hocvien', label:`👥 Học viên (${viewItem.hoc_vien_lop?.length || 0})` },
                  ].map(t => (
                    <button key={t.key}
                      style={{padding:'12px 18px',border:'none',background:'none',cursor:'pointer',fontSize:14,fontWeight:600,
                        color: detailTab===t.key ? '#0d47a1' : '#718096',
                        borderBottom: detailTab===t.key ? '3px solid #0d47a1' : '3px solid transparent',
                        marginBottom:-2}}
                      onClick={() => setDetailTab(t.key)}>{t.label}</button>
                  ))}
                </div>

                <div className="modal-body" style={{overflowY:'auto',flex:1,padding:'20px 24px'}}>

                  {/* Tab: Thông tin */}
                  {detailTab === 'info' && (
                    <>
                      <div style={sectionTitle}>📋 Thông Tin Lớp</div>
                      <div style={grid2}>
                        <div style={dBox}><div style={dLabel}>Khóa học</div><div style={dVal}>{viewItem.khoa_hoc?.ten_khoa || '—'}</div></div>
                        <div style={dBox}><div style={dLabel}>Hạng bằng</div><div style={dVal}><span className="badge badge-blue">Hạng {viewItem.khoa_hoc?.loai_bang || '—'}</span></div></div>
                        <div style={dBox}><div style={dLabel}>Sĩ số</div><div style={dVal}>{viewItem.hoc_vien_lop?.length || 0} / {viewItem.si_so_toi_da} học viên</div></div>
                        <div style={dBox}><div style={dLabel}>Trạng thái</div><div style={dVal}><span className={`badge ${TS_MAP[viewItem.trang_thai]||'badge-gray'}`}>{TS_LABEL[viewItem.trang_thai]||viewItem.trang_thai}</span></div></div>
                        <div style={dBox}><div style={dLabel}>Ngày khai giảng</div><div style={dVal}>{viewItem.ngay_khai_giang ? new Date(viewItem.ngay_khai_giang).toLocaleDateString('vi-VN') : '—'}</div></div>
                        <div style={dBox}><div style={dLabel}>Ngày kết thúc</div><div style={dVal}>{viewItem.ngay_ket_thuc ? new Date(viewItem.ngay_ket_thuc).toLocaleDateString('vi-VN') : '—'}</div></div>
                      </div>

                      <div style={{...sectionTitle,marginTop:16}}>👨‍🏫 Giảng Viên</div>
                      <div style={grid2}>
                        <div style={dBox}><div style={dLabel}>📖 GV Lý thuyết</div>
                          <div style={dVal}>{viewItem.giang_vien_ly_thuyet?.user?.ho_ten || <span style={{color:'#9ca3af',fontStyle:'italic'}}>Chưa phân công</span>}</div>
                        </div>
                        <div style={dBox}><div style={dLabel}>🚗 GV Thực hành</div>
                          <div style={dVal}>{viewItem.giang_vien_thuc_hanh?.user?.ho_ten || <span style={{color:'#9ca3af',fontStyle:'italic'}}>Chưa phân công</span>}</div>
                        </div>
                      </div>

                      {viewItem.ghi_chu && (
                        <>
                          <div style={{...sectionTitle,marginTop:16}}>📝 Ghi Chú</div>
                          <div style={{...dBox,whiteSpace:'pre-wrap',color:'#374151',lineHeight:1.6}}>{viewItem.ghi_chu}</div>
                        </>
                      )}
                    </>
                  )}

                  {/* Tab: Học viên */}
                  {detailTab === 'hocvien' && (
                    <>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                        <span style={{fontWeight:600,color:'#374151'}}>
                          {viewItem.hoc_vien_lop?.length || 0} / {viewItem.si_so_toi_da} học viên
                        </span>
                        <button className="btn btn-primary btn-sm"
                          onClick={() => { setViewItem(null); openAddHV(viewItem) }}>
                          ➕ Thêm học viên
                        </button>
                      </div>
                      {(!viewItem.hoc_vien_lop || viewItem.hoc_vien_lop.length === 0) ? (
                        <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>
                          <p>Chưa có học viên nào trong lớp này</p>
                          <button className="btn btn-primary btn-sm" style={{marginTop:12}}
                            onClick={() => { setViewItem(null); openAddHV(viewItem) }}>
                            ➕ Thêm học viên đầu tiên
                          </button>
                        </div>
                      ) : (
                        <table className="data-table">
                          <thead><tr><th>#</th><th>Họ tên</th><th>CCCD</th><th>SĐT</th><th>Trạng thái</th><th></th></tr></thead>
                          <tbody>
                            {viewItem.hoc_vien_lop.map((hvl, i) => {
                              // Chỉ cho phép xóa khi học viên chưa đến giai đoạn thi
                              const coTheXoa = ['cho_mo_lop', 'chuan_bi_hoc', 'dang_hoc'].includes(hvl.ho_so?.trang_thai)
                              return (
                                <tr key={hvl.id}>
                                  <td>{i+1}</td>
                                  <td><strong>{hvl.ho_so?.ho_ten || '—'}</strong></td>
                                  <td><code style={{fontSize:11}}>{hvl.ho_so?.so_cccd || '—'}</code></td>
                                  <td style={{fontSize:12}}>{hvl.ho_so?.so_dien_thoai || '—'}</td>
                                  <td><span className={`badge ${HV_MAP[hvl.ho_so?.trang_thai]||'badge-gray'}`}>{HV_LABEL[hvl.ho_so?.trang_thai]||hvl.ho_so?.trang_thai||'—'}</span></td>
                                  <td>
                                    {coTheXoa ? (
                                      <button
                                        className="btn btn-danger btn-sm"
                                        title="Xóa học viên khỏi lớp"
                                        onClick={() => xoaHocVienKhoiLop(viewItem, hvl)}
                                      >🗑️</button>
                                    ) : (
                                      <button
                                        className="btn btn-sm"
                                        style={{background:'#f1f5f9',color:'#94a3b8',cursor:'not-allowed',border:'1px solid #e2e8f0'}}
                                        title="Không thể xóa: học viên đã vào giai đoạn thi"
                                        disabled
                                      >🔒</button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
                  <button className="btn btn-warning" onClick={() => { const l = viewItem; setViewItem(null); openEdit(l) }}>✏️ Sửa</button>
                  {viewItem.trang_thai === 'dang_hoc' && (
                    <button className="btn btn-outline" style={{borderColor:'#06b6d4',color:'#06b6d4'}}
                      onClick={() => dongBoTrangThai(viewItem)}
                      title="Đồng bộ trạng thái học viên — tự động đóng lớp nếu tất cả đã đậu sát hạch">
                      🔄 Đồng bộ HV
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={() => { setViewItem(null); openAddHV(viewItem) }}>➕ Thêm học viên</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL THÊM HỌC VIÊN VÀO LỚP ── */}
      {showAddHV && targetLop && (
        <div className="modal-overlay" onClick={() => setShowAddHV(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>➕ Thêm Học Viên — {targetLop.ten_lop}</h3>
                <p style={{fontSize:12,color:'#718096',marginTop:3}}>
                  Hạng bằng: <strong>{targetLop.khoa_hoc?.loai_bang || '—'}</strong>
                  &nbsp;·&nbsp; Còn trống: <strong>{targetLop.si_so_toi_da - (targetLop.hoc_vien_count || 0)} chỗ</strong>
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowAddHV(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Thông báo điều kiện */}
              <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#92400e',marginBottom:12}}>
                ℹ️ Chỉ hiển thị học viên đã đóng học phí, đang chờ mở lớp và đăng ký học <strong>Hạng {targetLop.khoa_hoc?.loai_bang || '—'}</strong>.
                Đã chọn: <strong>{hvSelected.length}</strong> học viên
              </div>
              {/* Cảnh báo khi lớp đã kết thúc */}
              {targetLop.trang_thai === 'da_ket_thuc' && (
                <div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#9a3412',marginBottom:12}}>
                  ⚠️ Lớp này đang ở trạng thái <strong>Đã kết thúc</strong>. Khi thêm học viên mới, lớp sẽ tự động chuyển về trạng thái <strong>Đang học</strong>.
                </div>
              )}

              <input className="search-input" style={{marginBottom:12,width:'100%'}}
                placeholder="🔍 Tìm theo tên, CCCD, SĐT..."
                value={hvSearch} onChange={e => setHvSearch(e.target.value)} />

              {hvLoading ? (
                <div className="loading-wrap"><div className="spinner"/></div>
              ) : filteredHV.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px',color:'#9ca3af'}}>
                  <p>Không có học viên nào đủ điều kiện</p>
                  <small>Học viên cần: đã đóng học phí + đang chờ mở lớp + đăng ký hạng {targetLop.khoa_hoc?.loai_bang}</small>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:360,overflowY:'auto'}}>
                  {/* Chọn tất cả */}
                  <label style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#f0f4ff',borderRadius:8,cursor:'pointer',fontWeight:600,fontSize:13}}>
                    <input type="checkbox"
                      checked={hvSelected.length === filteredHV.length && filteredHV.length > 0}
                      onChange={e => setHvSelected(e.target.checked ? filteredHV.map(hv => hv.id) : [])} />
                    Chọn tất cả ({filteredHV.length} học viên)
                  </label>
                  {filteredHV.map(hv => (
                    <label key={hv.id}
                      style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                        border:`1px solid ${hvSelected.includes(hv.id) ? '#0d47a1' : '#e2e8f0'}`,
                        borderRadius:8,cursor:'pointer',transition:'all .15s',
                        background: hvSelected.includes(hv.id) ? '#e0ecff' : '#fff'}}>
                      <input type="checkbox" checked={hvSelected.includes(hv.id)} onChange={() => toggleHV(hv.id)} />
                      <div style={{flex:1}}>
                        <strong style={{fontSize:13}}>{hv.ho_ten}</strong>
                        <div style={{fontSize:12,color:'#718096',marginTop:2}}>
                          CCCD: {hv.so_cccd} &nbsp;·&nbsp; SĐT: {hv.so_dien_thoai || '—'}
                        </div>
                        <div style={{fontSize:11,color:'#0d47a1',marginTop:2}}>
                          {hv.khoa_hoc?.ten_khoa || '—'}
                        </div>
                      </div>
                      <span className="badge badge-success" style={{fontSize:11}}>✅ Đủ điều kiện</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddHV(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleAddHV} disabled={hvSelected.length === 0}>
                ✅ Thêm {hvSelected.length} học viên vào lớp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default LopHocManagement
