import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAdmin } from '../../context/AdminContext'
import './BaiThiManagement.css'

const LOAI_BANG_ORDER = ['A1', 'A', 'B1', 'B2', 'C1', 'C', 'D', 'E', 'CE', 'C2']

const emptyForm = {
  khoa_hoc_id: '',
  ten_bai_thi: '',
  loai: 'tot_nghiep',
  diem_dat: '',
  diem_toi_da: '',
  phi_thi_lai: '',
  thu_tu: 1,
}

const BaiThiManagement = () => {
  const { token, backendUrl } = useAdmin()
  const [grouped, setGrouped] = useState([])
  const [khoaList, setKhoaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLoaiBang, setFilterLoaiBang] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const headers = { Authorization: `Bearer ${token}` }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/bai-thi/by-loai-bang`, { headers }),
        axios.get(`${backendUrl}/api/admin/khoa-hoc`, { headers }),
      ])
      if (r1.data.success) {
        const sorted = r1.data.data.sort((a, b) => {
          const ia = LOAI_BANG_ORDER.indexOf(a.loai_bang)
          const ib = LOAI_BANG_ORDER.indexOf(b.loai_bang)
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        })
        setGrouped(sorted)
      }
      if (r2.data.success) setKhoaList(r2.data.data.filter(k => !k.ma_khoa))
    } catch { toast.error('Lỗi kết nối server') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = (khoaHocId = '', loaiGoi = 'tot_nghiep') => {
    setEditing(null)
    setForm({ ...emptyForm, khoa_hoc_id: String(khoaHocId), loai: loaiGoi })
    setShowModal(true)
  }

  const openEdit = (b) => {
    setEditing(b)
    setForm({ khoa_hoc_id: String(b.khoa_hoc_id), ten_bai_thi: b.ten_bai_thi, loai: b.loai, diem_dat: b.diem_dat, diem_toi_da: b.diem_toi_da, phi_thi_lai: b.phi_thi_lai, thu_tu: b.thu_tu })
    setShowModal(true)
  }

  const handleSave = async e => {
    e.preventDefault()
    if (parseFloat(form.diem_dat) > parseFloat(form.diem_toi_da)) { toast.error('Điểm đạt không thể lớn hơn điểm tối đa!'); return }
    try {
      const res = editing
        ? await axios.put(`${backendUrl}/api/admin/bai-thi/${editing.id}`, form, { headers })
        : await axios.post(`${backendUrl}/api/admin/bai-thi`, form, { headers })
      if (res.data.success) { toast.success(editing ? 'Cập nhật thành công' : 'Thêm bài thi thành công'); setShowModal(false); fetchData() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Loi') }
  }

  const handleDelete = async (b) => {
    if (!confirm('Xóa bài thi này?')) return
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/bai-thi/${b.id}`, { headers })
      if (res.data.success) { toast.success('Đã xóa'); fetchData() }
      else toast.error(res.data.message)
    } catch (err) { toast.error(err.response?.data?.message || 'Loi') }
  }

  const f = v => setForm(prev => ({ ...prev, ...v }))
  const filteredGrouped = grouped.filter(g => !filterLoaiBang || g.loai_bang === filterLoaiBang)
  const totalBaiThi = grouped.reduce((acc, g) => acc + (g.tot_nghiep?.length || 0) + (g.sat_hanh?.length || 0), 0)

  const renderTable = (list) => (
    <table className="data-table bt-table">
      <thead><tr>
        <th>TT</th><th>Tên bài thi</th>
        <th style={{ textAlign: 'center' }}>Điểm tối đa</th>
        <th style={{ textAlign: 'center' }}>Điểm đạt</th>
        <th style={{ textAlign: 'center' }}>Tỷ lệ</th>
        <th style={{ textAlign: 'right' }}>Phí thi lại</th>
        <th style={{ textAlign: 'center' }}>Thao tác</th>
      </tr></thead>
      <tbody>
        {list.map(b => (
          <tr key={b.id}>
            <td style={{ textAlign: 'center', width: 40 }}><span className="bt-order-badge">{b.thu_tu}</span></td>
            <td><strong>{b.ten_bai_thi}</strong></td>
            <td style={{ textAlign: 'center' }}><span className="bt-score bt-score-max">{Number(b.diem_toi_da)} điểm</span></td>
            <td style={{ textAlign: 'center' }}><span className="bt-score bt-score-pass">≥ {Number(b.diem_dat)} điểm</span></td>
            <td style={{ textAlign: 'center' }}><span className="bt-percent">{b.diem_toi_da > 0 ? Math.round((b.diem_dat / b.diem_toi_da) * 100) : 0}%</span></td>
            <td style={{ textAlign: 'right' }}>{Number(b.phi_thi_lai) > 0 ? <span className="bt-fee">{Number(b.phi_thi_lai).toLocaleString('vi-VN')} đ</span> : <span style={{ color: '#9ca3af' }}>-</span>}</td>
            <td style={{ textAlign: 'center' }}>
              <div className="action-cell" style={{ justifyContent: 'center' }}>
                <button className="btn btn-warning btn-sm" onClick={() => openEdit(b)}>Sửa</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b)}>Xóa</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="bai-thi-page">
      <div className="page-header">
        <div><h2>📋 Quản Lý Bài Thi</h2><p>Cấu hình điểm đạt, điểm tối đa và phí thi lại theo hạng bằng lái</p></div>
        <button className="btn btn-primary" onClick={() => openAdd()}>+ Thêm bài thi</button>
      </div>
      <div className="bt-stats">
        <div className="bt-stat-card"><div><p className="bt-stat-value">{totalBaiThi}</p><p className="bt-stat-label">Tổng bài thi</p></div></div>
        <div className="bt-stat-card blue"><div><p className="bt-stat-value">{grouped.length}</p><p className="bt-stat-label">Hạng bằng có cấu hình</p></div></div>
        <div className="bt-stat-card green"><div><p className="bt-stat-value">{grouped.reduce((a, g) => a + (g.tot_nghiep?.length || 0), 0)}</p><p className="bt-stat-label">Bài Tốt Nghiệp</p></div></div>
        <div className="bt-stat-card purple"><div><p className="bt-stat-value">{grouped.reduce((a, g) => a + (g.sat_hanh?.length || 0), 0)}</p><p className="bt-stat-label">Bài Sát Hạch</p></div></div>
      </div>
      <div className="search-bar">
        <select className="search-input" style={{ maxWidth: 200 }} value={filterLoaiBang} onChange={e => setFilterLoaiBang(e.target.value)}>
          <option value="">Tất cả hạng bằng</option>
          {LOAI_BANG_ORDER.map(h => <option key={h} value={h}>Hạng {h}</option>)}
        </select>
        {filterLoaiBang && <button className="btn btn-outline btn-sm" onClick={() => setFilterLoaiBang('')}>✕ Bỏ lọc</button>}
      </div>
      {loading ? <div className="loading-wrap"><div className="spinner" /></div> : filteredGrouped.map(group => (
        <div key={group.loai_bang} className="bt-group-card card">
          <div className="bt-group-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="badge badge-blue" style={{ fontSize: 15, padding: '6px 14px' }}>Hạng {group.loai_bang}</span>
              <span style={{ color: '#374151', fontWeight: 600 }}>{group.ten_khoa}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-success btn-sm" onClick={() => openAdd(group.khoa_hoc_id, 'tot_nghiep')}>+ Thêm bài thi tốt nghiệp</button>
              <button className="btn btn-sm bt-btn-sh" onClick={() => openAdd(group.khoa_hoc_id, 'sat_hanh')}>+ Thêm bài thi sát hạch</button>
            </div>
          </div>
          <div className="bt-group-body">
            <div className="bt-loai-section">
              <div className="bt-loai-title bt-loai-tn">🎓 Tốt Nghiệp</div>
              {!group.tot_nghiep?.length ? <div className="bt-empty-loai">Chưa có bài thi Tốt Nghiệp cho Hạng {group.loai_bang}</div> : renderTable(group.tot_nghiep)}
            </div>
            <div className="bt-loai-section" style={{ marginTop: 16 }}>
              <div className="bt-loai-title bt-loai-sh">🏛️ Sát Hạch (BCA)</div>
              {!group.sat_hanh?.length ? <div className="bt-empty-loai">Chưa có bài thi Sát Hạch cho Hạng {group.loai_bang}</div> : renderTable(group.sat_hanh)}
            </div>
          </div>
        </div>
      ))}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Sửa Bài Thi' : '➕ Thêm Bài Thi Mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Hạng bằng lái *</label>
                  <select value={form.khoa_hoc_id} onChange={e => f({ khoa_hoc_id: e.target.value })} required disabled={!!editing}>
                    <option value="">-- Chọn hạng bằng --</option>
                    {khoaList.map(k => <option key={k.id} value={String(k.id)}>Hạng {k.loai_bang} - {k.ten_khoa}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Tên bài thi *</label>
                    <input value={form.ten_bai_thi} onChange={e => f({ ten_bai_thi: e.target.value })} required placeholder="VD: Lý thuyết, Mô phỏng, Sa hình, Đường trường" />
                  </div>
                  <div className="form-group">
                    <label>Loại thi *</label>
                    <select value={form.loai} onChange={e => f({ loai: e.target.value })} required>
                      <option value="tot_nghiep">🎓 Tốt Nghiệp</option>
                      <option value="sat_hanh">Sát hạch (BCA)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Thứ tự</label>
                    <input type="number" min="1" value={form.thu_tu} onChange={e => f({ thu_tu: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Điểm tối đa *</label>
                    <input type="number" step="0.01" min="1" value={form.diem_toi_da} onChange={e => f({ diem_toi_da: e.target.value })} required placeholder="VD: 30, 50, 100" />
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>LT A1/A: 25 | LT B1/B2: 30 | LT C1: 35 | LT C: 40 | LT D/E/CE: 45 | Mô phỏng: 50 | Sa hình/Đường trường: 100</p>
                  </div>
                  <div className="form-group">
                    <label>Điểm đạt tối thiểu *</label>
                    <input type="number" step="0.01" min="0" value={form.diem_dat} onChange={e => f({ diem_dat: e.target.value })} required placeholder="VD: 27, 35, 80" />
                    {form.diem_dat && form.diem_toi_da && (
                      parseFloat(form.diem_dat) > parseFloat(form.diem_toi_da)
                        ? <p style={{ fontSize: 12, color: '#dc2626', marginTop: 3, fontWeight: 600 }}>Điểm đạt không thể lớn hơn điểm tối đa!</p>
                        : <p style={{ fontSize: 12, color: '#16a34a', marginTop: 3 }}>Tỷ lệ đạt: {Math.round((form.diem_dat / form.diem_toi_da) * 100)}%</p>
                    )}
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Phí thi lại (VND)</label>
                    <input type="number" min="0" value={form.phi_thi_lai} onChange={e => f({ phi_thi_lai: e.target.value })} placeholder="0 = miễn phí" />
                  </div>
                </div>
                {form.ten_bai_thi && form.diem_dat && form.diem_toi_da && parseFloat(form.diem_dat) <= parseFloat(form.diem_toi_da) && (
                  <div className="bt-preview-box">
                    <strong style={{ color: '#1e40af' }}>Preview:</strong>{' '}
                    <strong>{form.ten_bai_thi}</strong>{' '}&mdash;{' '}
                    <span style={{ color: '#0369a1' }}>Đạt ≥ {form.diem_dat}/{form.diem_toi_da} điểm</span>
                    {Number(form.phi_thi_lai) > 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>| Phí: {Number(form.phi_thi_lai).toLocaleString('vi-VN')} đ</span>}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm bài thi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BaiThiManagement