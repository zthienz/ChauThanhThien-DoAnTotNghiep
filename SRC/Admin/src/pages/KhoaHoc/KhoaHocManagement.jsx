import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'

const KhoaHocManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [viewItem, setViewItem]   = useState(null)   // modal xem chi tiết
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ten_khoa:'', loai_bang:'B2', hoc_phi:'', so_buoi_ly_thuyet_toi_thieu:'', so_km_toi_thieu:'', si_so_toi_da:30, so_hv_mo_lop:15, mo_ta:'' })
  const headers = { Authorization: `Bearer ${token}` }

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/khoa-hoc`, { headers })
      if (res.data.success) setList(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetch() }, [])

  const openAdd = () => { setEditing(null); setForm({ ten_khoa:'', loai_bang:'B2', hoc_phi:'', so_buoi_ly_thuyet_toi_thieu:'', so_km_toi_thieu:'', si_so_toi_da:30, so_hv_mo_lop:15, mo_ta:'' }); setShowModal(true) }
  const openEdit = (k) => { setEditing(k); setForm({...k}); setShowModal(true) }

  const handleSave = async e => {
    e.preventDefault()
    try {
      const res = editing
        ? await axios.put(`${backendUrl}/api/admin/khoa-hoc/${editing.id}`, form, { headers })
        : await axios.post(`${backendUrl}/api/admin/khoa-hoc`, form, { headers })
      if (res.data.success) { toast.success(editing ? 'Cập nhật thành công' : 'Tạo thành công'); setShowModal(false); fetch() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa khóa học này?')) return
    const res = await axios.delete(`${backendUrl}/api/admin/khoa-hoc/${id}`, { headers })
    if (res.data.success) { toast.success('Đã xóa'); fetch() }
  }

  return (
    <div>
      <div className="page-header">
        <div><h2>📚 Khóa Học</h2><p>Quản lý các khóa đào tạo lái xe</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Thêm khóa học</button>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          {loading ? <div className="loading-wrap"><div className="spinner"/></div> : (
            <table className="data-table">
              <thead><tr><th>#</th><th>Tên khóa</th><th>Hạng</th><th>Học phí</th><th>LT tối thiểu</th><th>Km tối thiểu</th><th>Sĩ số</th><th>Thao tác</th></tr></thead>
              <tbody>
                {list.map((k,i) => (
                  <tr key={k.id}>
                    <td>{i+1}</td>
                    <td><strong>{k.ten_khoa}</strong></td>
                    <td><span className="badge badge-blue">Hạng {k.loai_bang}</span></td>
                    <td>{Number(k.hoc_phi).toLocaleString('vi-VN')} VNĐ</td>
                    <td>{k.so_buoi_ly_thuyet_toi_thieu} buổi</td>
                    <td>{k.so_km_toi_thieu} km</td>
                    <td>{k.si_so_toi_da} HV</td>
                    <td><div className="action-cell">
                      <button className="btn btn-info btn-sm" onClick={() => setViewItem(k)}>👁️ Xem</button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(k)}>✏️ Sửa</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(k.id)}>🗑️</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa khóa học' : 'Thêm khóa học'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label>Tên khóa *</label><input value={form.ten_khoa} onChange={e=>setForm({...form,ten_khoa:e.target.value})} required /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div className="form-group"><label>Loại bằng *</label>
                    <select value={form.loai_bang} onChange={e=>setForm({...form,loai_bang:e.target.value})}>
                      {['A1','A','B1','B2','C1','C','C2','D','E','CE'].map(b => <option key={b} value={b}>Hạng {b}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Học phí (VNĐ) *</label><input type="number" value={form.hoc_phi} onChange={e=>setForm({...form,hoc_phi:e.target.value})} required /></div>
                  <div className="form-group"><label>Buổi LT tối thiểu *</label><input type="number" value={form.so_buoi_ly_thuyet_toi_thieu} onChange={e=>setForm({...form,so_buoi_ly_thuyet_toi_thieu:e.target.value})} required /></div>
                  <div className="form-group"><label>Km tối thiểu *</label><input type="number" value={form.so_km_toi_thieu} onChange={e=>setForm({...form,so_km_toi_thieu:e.target.value})} required /></div>
                  <div className="form-group"><label>Sĩ số tối đa</label><input type="number" value={form.si_so_toi_da} onChange={e=>setForm({...form,si_so_toi_da:e.target.value})} /></div>
                  <div className="form-group"><label>HV tối thiểu mở lớp</label><input type="number" value={form.so_hv_mo_lop} onChange={e=>setForm({...form,so_hv_mo_lop:e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Mô tả</label><textarea rows={3} value={form.mo_ta} onChange={e=>setForm({...form,mo_ta:e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo mới'}</button>
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
              <h3>📋 Chi tiết khóa học</h3>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Tên & hạng bằng */}
              <div style={{textAlign:'center', marginBottom:20}}>
                <div style={{fontSize:36, marginBottom:6}}>📚</div>
                <h2 style={{margin:0, fontSize:20}}>{viewItem.ten_khoa}</h2>
                <span className="badge badge-blue" style={{marginTop:6, display:'inline-block', fontSize:14}}>
                  Hạng {viewItem.loai_bang}
                </span>
                <span style={{
                  marginLeft:8, display:'inline-block',
                  padding:'2px 10px', borderRadius:12, fontSize:13,
                  background: viewItem.is_active ? '#d1fae5' : '#fee2e2',
                  color: viewItem.is_active ? '#065f46' : '#991b1b'
                }}>
                  {viewItem.is_active ? '✅ Đang hoạt động' : '🚫 Ngừng hoạt động'}
                </span>
              </div>

              {/* Thông tin chính */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16}}>
                <div style={detailBox}>
                  <div style={detailLabel}>💰 Học phí</div>
                  <div style={detailValue}>{Number(viewItem.hoc_phi).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                <div style={detailBox}>
                  <div style={detailLabel}>🏫 Số lớp đang có</div>
                  <div style={detailValue}>{viewItem.lop_hoc_count ?? 0} lớp</div>
                </div>
                <div style={detailBox}>
                  <div style={detailLabel}>📖 Buổi LT tối thiểu</div>
                  <div style={detailValue}>{viewItem.so_buoi_ly_thuyet_toi_thieu} buổi</div>
                </div>
                <div style={detailBox}>
                  <div style={detailLabel}>🚗 Km thực hành tối thiểu</div>
                  <div style={detailValue}>{viewItem.so_km_toi_thieu} km</div>
                </div>
                <div style={detailBox}>
                  <div style={detailLabel}>👥 Sĩ số tối đa / lớp</div>
                  <div style={detailValue}>{viewItem.si_so_toi_da} học viên</div>
                </div>
                <div style={detailBox}>
                  <div style={detailLabel}>🔑 HV tối thiểu để mở lớp</div>
                  <div style={detailValue}>{viewItem.so_hv_mo_lop} học viên</div>
                </div>
              </div>

              {/* Mô tả */}
              <div style={detailBox}>
                <div style={detailLabel}>📝 Mô tả</div>
                <div style={{marginTop:4, color:'#374151', lineHeight:1.6, whiteSpace:'pre-wrap'}}>
                  {viewItem.mo_ta || <span style={{color:'#9ca3af', fontStyle:'italic'}}>Chưa có mô tả</span>}
                </div>
              </div>

              {/* Ngày tạo / cập nhật */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
                <div style={{...detailBox, background:'#f9fafb'}}>
                  <div style={detailLabel}>🗓️ Ngày tạo</div>
                  <div style={{marginTop:4, fontSize:13, color:'#6b7280'}}>
                    {viewItem.created_at ? new Date(viewItem.created_at).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
                <div style={{...detailBox, background:'#f9fafb'}}>
                  <div style={detailLabel}>🔄 Cập nhật lần cuối</div>
                  <div style={{marginTop:4, fontSize:13, color:'#6b7280'}}>
                    {viewItem.updated_at ? new Date(viewItem.updated_at).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewItem(null)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}>✏️ Chỉnh sửa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Style helpers cho detail box
const detailBox = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '10px 14px',
}
const detailLabel = {
  fontSize: 12,
  color: '#6b7280',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
}
const detailValue = {
  fontSize: 16,
  fontWeight: 700,
  color: '#111827',
}

export default KhoaHocManagement
