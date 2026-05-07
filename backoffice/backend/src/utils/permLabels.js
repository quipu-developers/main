const { Permission, WRITE_ALL_MASK } = require("../config/permissions");

// 유효한 permission label 집합. PATCH /:id/perm validation에서 참조한다.
// Set을 사용해 .has() 조회를 O(1)로 처리한다.
const VALID_PERM_LABELS = new Set([
  "read/all",
  "write/activity",
  "write/recruit-form",
  "write/club-info",
  "write/all",
]);

function permToLabels(perm) {
  const labels = [];
  if (perm & Permission.READ) labels.push("read/all");

  const hasAllWrite = (perm & WRITE_ALL_MASK) === WRITE_ALL_MASK;
  if (hasAllWrite) {
    labels.push("write/all");
    return labels;
  }

  if (perm & Permission.WRITE_ACTIVITY) labels.push("write/activity");
  if (perm & Permission.WRITE_RECRUIT_FORM) labels.push("write/recruit-form");
  if (perm & Permission.WRITE_CLUB_INFO) labels.push("write/club-info");

  return labels;
}

/**
 * label 배열을 permission 비트마스크로 변환한다.
 * @guarantee 반환값은 항상 Permission.READ 비트를 포함한다.
 *            호출부에서 | Permission.READ를 추가할 필요가 없다.
 */
function labelsToPerm(labels = []) {
  let perm = 0;
  if (labels.includes("read/all")) perm |= Permission.READ;
  if (labels.includes("write/activity")) perm |= Permission.WRITE_ACTIVITY;
  if (labels.includes("write/recruit-form")) perm |= Permission.WRITE_RECRUIT_FORM;
  if (labels.includes("write/club-info")) perm |= Permission.WRITE_CLUB_INFO;
  if (labels.includes("write/all")) perm |= WRITE_ALL_MASK;
  if ((perm & Permission.READ) === 0) perm |= Permission.READ;
  return perm;
}

module.exports = { permToLabels, labelsToPerm, VALID_PERM_LABELS };
