const H5_BASE = 'https://greatday4yole.github.io/daychemo-smart-care/#/patient'

Page({
  data: { url: H5_BASE },
  onLoad(query) {
    // 支持通过小程序参数透传患者标识（生产环境应从后端换取，不可直接信任明文）
    const pid = query && query.pid
    const url = pid ? `${H5_BASE}?pid=${encodeURIComponent(pid)}` : H5_BASE
    this.setData({ url })
  },
  onShareAppMessage() {
    return { title: '日间化疗智慧照护 · 我的居家照护', path: '/pages/web/index' }
  },
})
