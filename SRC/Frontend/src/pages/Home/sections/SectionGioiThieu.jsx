import './SectionGioiThieu.css'

const SectionGioiThieu = () => (
  <section className="section-gt">
    <div className="container gt-grid">
      {/* Ảnh trái */}
      <div className="gt-images">
        <img src="/gioithieu.png" alt="Trung tâm Sao Việt" className="gt-img-main" />
      </div>

      {/* Nội dung phải */}
      <div className="gt-content">
        <h2>Giới thiệu Trung Tâm Dạy Lái Xe Sao Việt</h2>
        <p>
          Trung Tâm Dạy Lái Xe Sao Việt xin gửi lời chào và cảm ơn Quý khách đã ghé thăm website
          chính thức của chúng tôi. Sự tin tưởng và đồng hành của Quý học viên chính là động lực để
          Sao Việt không ngừng phát triển và hoàn thiện mỗi ngày.
        </p>
        <p>
          Trung Tâm Dạy Lái Xe Sao Việt chuyên đào tạo và thi bằng lái xe các hạng A1, A, B2 số sàn,
          B1 tự động, C1, C. Là một trong những trung tâm đào tạo lái xe uy tín tại TP.HCM, chúng tôi
          luôn đặt chất lượng đào tạo lên hàng đầu, hướng đến sự chuyên nghiệp, minh bạch và hiệu
          quả cho từng học viên.
        </p>
        <p>
          Với phương châm lấy học viên làm trung tâm, Sao Việt luôn lắng nghe và tiếp thu mọi ý kiến
          đóng góp để không ngừng nâng cao chất lượng dịch vụ, tối ưu trải nghiệm học tập và cam
          kết mang đến kết quả tốt nhất cho từng học viên.
        </p>
      </div>
    </div>

  </section>
)

export default SectionGioiThieu
