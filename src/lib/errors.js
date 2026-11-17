const MESSAGES = {
  NOT_AUTHENTICATED: 'Phiên làm bài đã hết hạn. Tải lại trang để tiếp tục.',
  NAME_REQUIRED: 'Vui lòng nhập họ và tên đầy đủ.',
  CODE_INVALID: 'Mã bài thi không đúng. Kiểm tra lại mã giáo viên gửi.',
  NAME_TAKEN: 'Tên này đã có trong buổi thi. Nếu bạn vừa đổi máy hoặc lỡ xoá trình duyệt, nhờ giáo viên bấm "Cho vào lại" rồi nhập lại đúng tên.',
  SESSION_FULL: 'Buổi thi đã đủ số học viên.',
  SESSION_FINISHED: 'Buổi thi đã kết thúc.',
  ATTEMPT_NOT_FOUND: 'Không tìm thấy bài làm của bạn. Nếu cô vừa bấm "Cho vào lại", hãy vào lại bằng đúng họ tên.',
  PHASE_CLOSED: 'Phần thi này đã hết giờ, không lưu thêm được.',
  ALREADY_SUBMITTED: 'Bài đã nộp, không sửa được nữa.',
  SUBMIT_NOT_YET: 'Chỉ nộp bài được khi đã đến phần Schreiben.',
  NO_NEXT: 'Đây là phần cuối, hãy bấm "Nộp bài".',
  WRONG_SECTION: 'Câu này không thuộc phần đang thi.',
  NOT_ADMIN: 'Tài khoản này không có quyền giáo viên.',
  CODE_TAKEN: 'Mã này đã được dùng cho buổi thi khác.',
  CODE_FORMAT: 'Mã chỉ gồm chữ in hoa và số, 4–12 ký tự.',
  NO_RUNNING_PHASE: 'Chưa có phần thi nào đang chạy.',
};

export function isNetworkError(err) {
  const m = String(err?.message || err || '');
  return err?.name === 'TypeError' || /fetch|network|Failed to fetch|Load failed|NetworkError|timeout/i.test(m) || err?.status === 0 || (err?.status >= 500);
}

export function errorCode(err) {
  return String(err?.message || '').trim();
}

export function friendly(err) {
  if (!err) return '';
  if (isNetworkError(err)) return 'Mất kết nối mạng. Đang thử lại…';
  return MESSAGES[errorCode(err)] || 'Có lỗi xảy ra: ' + (err.message || String(err));
}
