// Vietnamese provinces and districts data
export interface District {
  id: string;
  label: string;
}

export interface Province {
  id: string;
  label: string;
  districts: District[];
}

export const VIETNAM_PROVINCES: Province[] = [
  {
    id: 'hanoi',
    label: 'Hà Nội',
    districts: [
      { id: 'ba-dinh', label: 'Ba Đình' },
      { id: 'hoan-kiem', label: 'Hoàn Kiếm' },
      { id: 'dong-da', label: 'Đống Đa' },
      { id: 'hai-ba-trung', label: 'Hai Bà Trưng' },
      { id: 'cau-giay', label: 'Cầu Giấy' },
      { id: 'thanh-xuan', label: 'Thanh Xuân' },
      { id: 'hoang-mai', label: 'Hoàng Mai' },
      { id: 'long-bien', label: 'Long Biên' },
      { id: 'nam-tu-liem', label: 'Nam Từ Liêm' },
      { id: 'bac-tu-liem', label: 'Bắc Từ Liêm' },
      { id: 'ha-dong', label: 'Hà Đông' },
      { id: 'tay-ho', label: 'Tây Hồ' },
    ]
  },
  {
    id: 'hcm',
    label: 'Hồ Chí Minh',
    districts: [
      { id: 'quan-1', label: 'Quận 1' },
      { id: 'quan-2', label: 'Quận 2' },
      { id: 'quan-3', label: 'Quận 3' },
      { id: 'quan-4', label: 'Quận 4' },
      { id: 'quan-5', label: 'Quận 5' },
      { id: 'quan-6', label: 'Quận 6' },
      { id: 'quan-7', label: 'Quận 7' },
      { id: 'quan-8', label: 'Quận 8' },
      { id: 'quan-9', label: 'Quận 9' },
      { id: 'quan-10', label: 'Quận 10' },
      { id: 'quan-11', label: 'Quận 11' },
      { id: 'quan-12', label: 'Quận 12' },
      { id: 'binh-thanh', label: 'Bình Thạnh' },
      { id: 'go-vap', label: 'Gò Vấp' },
      { id: 'phu-nhuan', label: 'Phú Nhuận' },
      { id: 'tan-binh', label: 'Tân Bình' },
      { id: 'tan-phu', label: 'Tân Phú' },
      { id: 'binh-tan', label: 'Bình Tân' },
      { id: 'thu-duc', label: 'Thủ Đức' },
    ]
  },
  {
    id: 'da-nang',
    label: 'Đà Nẵng',
    districts: [
      { id: 'hai-chau', label: 'Hải Châu' },
      { id: 'thanh-khe', label: 'Thanh Khê' },
      { id: 'son-tra', label: 'Sơn Trà' },
      { id: 'ngu-hanh-son', label: 'Ngũ Hành Sơn' },
      { id: 'lien-chieu', label: 'Liên Chiểu' },
      { id: 'cam-le', label: 'Cẩm Lệ' },
    ]
  },
  {
    id: 'hai-phong',
    label: 'Hải Phòng',
    districts: [
      { id: 'hong-bang', label: 'Hồng Bàng' },
      { id: 'ngo-quyen', label: 'Ngô Quyền' },
      { id: 'le-chan', label: 'Lê Chân' },
      { id: 'hai-an', label: 'Hải An' },
      { id: 'kien-an', label: 'Kiến An' },
      { id: 'do-son', label: 'Đồ Sơn' },
      { id: 'duong-kinh', label: 'Dương Kinh' },
    ]
  },
  {
    id: 'can-tho',
    label: 'Cần Thơ',
    districts: [
      { id: 'ninh-kieu', label: 'Ninh Kiều' },
      { id: 'binh-thuy', label: 'Bình Thủy' },
      { id: 'cai-rang', label: 'Cái Răng' },
      { id: 'o-mon', label: 'Ô Môn' },
      { id: 'thot-not', label: 'Thốt Nốt' },
    ]
  },
  // Add more provinces as needed
  { id: 'dong-nai', label: 'Đồng Nai', districts: [{ id: 'bien-hoa', label: 'Biên Hòa' }, { id: 'long-khanh', label: 'Long Khánh' }] },
  { id: 'binh-duong', label: 'Bình Dương', districts: [{ id: 'thu-dau-mot', label: 'Thủ Dầu Một' }, { id: 'di-an', label: 'Dĩ An' }] },
  { id: 'ba-ria-vung-tau', label: 'Bà Rịa - Vũng Tàu', districts: [{ id: 'vung-tau', label: 'Vũng Tàu' }, { id: 'ba-ria', label: 'Bà Rịa' }] },
  { id: 'khanh-hoa', label: 'Khánh Hòa', districts: [{ id: 'nha-trang', label: 'Nha Trang' }, { id: 'cam-ranh', label: 'Cam Ranh' }] },
  { id: 'lam-dong', label: 'Lâm Đồng', districts: [{ id: 'da-lat', label: 'Đà Lạt' }, { id: 'bao-loc', label: 'Bảo Lộc' }] },
];
