import * as XLSX from "xlsx";
import React, { useState, useEffect, useCallback } from "react";
import "../style/recruitDB.css";
import {
  fetchMemberData,
  fetchAndSavePortfolio,
  recruitStateCheck,
  recruitStateChange,
} from "../api/recruitDB_api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import toast from "../hook/toastUtil";
import { TbReload } from "react-icons/tb";
import { MdOutlineFileDownload } from "react-icons/md";

function RecruitDB() {
  const [norordev, setNorordev] = useState("개발");
  const [generalData, setGeneralData] = useState([]);
  const [devData, setDevData] = useState([]);
  const [data, setData] = useState([]);
  const [highlightedRowIndex, setHighlightedRowIndex] = useState(0); // 모달이 닫힌 후에도 색상이 유지되도록 저장
  const [selectedRowIndex, setSelectedRowIndex] = useState(0); // 클릭된 행을 표시
  const [recruitState, setRecruitState] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchMemberData();
        setGeneralData(data);
        setDevData(data);
        setData(data);
        setNorordev("개발");
        setHighlightedRowIndex(0); // 첫 번째 행을 하이라이트
        setSelectedRowIndex(0); // 첫 번째 행을 선택된 상태로 설정
      } catch (error) {
        console.error("Error fetchData", error);
        navigate("/");
      }
    };

    const getRcruitState = async () => {
      try {
        const response = await recruitStateCheck();
        setRecruitState(response.data.is_enabled);
      } catch (error) {
        console.error("Error getRcruitState", error);
        navigate("/");
      }
    };

    fetchData();
    getRcruitState();
  }, [navigate]);

  const handleLoadDataClick = () => {
    window.location.reload();
  };

  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0); // 선택한 학생의 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);

  // 전화번호 셀 클릭 시 클립보드에 복사
  const handlePhoneNumberClick = (phoneNumber) => {
    navigator.clipboard
      .writeText(phoneNumber)
      .then(() => {
        toast.success("전화번호가 클립보드에 복사되었습니다.");
      })
      .catch((err) => {
        console.error("클립보드 복사를 실패하였습니다.: ", err);
      });
  };

  // 이름 셀 클릭 시 모달창 구현
  const handleNameClick = (student, index) => {
    setSelectedStudent(student);
    setSelectedIndex(index);
    setCurrentIndex(index); // 클릭된 학생의 인덱스 저장
    setShowModal(true);
    setHighlightedRowIndex(index); // 모달을 열었을 때 색상 유지
    setSelectedRowIndex(index); // 클릭된 행 색상 유지
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const nextStudent = useCallback(() => {
    const newIndex = (currentIndex + 1) % data.length;
    setCurrentIndex(newIndex);
    setSelectedStudent(data[newIndex]);
    setHighlightedRowIndex(newIndex); // 모달이 이동할 때도 색상 유지
    setSelectedRowIndex(newIndex); // 선택된 행 색상 유지
  }, [currentIndex, data]);

  const prevStudent = useCallback(() => {
    const newIndex = (currentIndex - 1 + data.length) % data.length;
    setCurrentIndex(newIndex);
    setSelectedStudent(data[newIndex]);
    setHighlightedRowIndex(newIndex); // 모달이 이동할 때도 색상 유지
    setSelectedRowIndex(newIndex); // 선택된 행 색상 유지
  }, [currentIndex, data]);

  // 키보드 이벤트 핸들러 추가
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowUp") {
        const newIndex = (selectedRowIndex - 1 + data.length) % data.length;
        setSelectedRowIndex(newIndex);
        setHighlightedRowIndex(newIndex);
      } else if (event.key === "ArrowDown") {
        const newIndex = (selectedRowIndex + 1) % data.length;
        setSelectedRowIndex(newIndex);
        setHighlightedRowIndex(newIndex);
      } else if (event.key === "Enter") {
        handleNameClick(data[selectedRowIndex], selectedRowIndex);
      } else if (showModal) {
        if (event.key === "ArrowLeft") {
          prevStudent();
        } else if (event.key === "ArrowRight") {
          nextStudent();
        } else if (
          event.key === "p" ||
          event.key === "P" ||
          event.key === "ㅔ"
        ) {
          handlePhoneNumberClick(selectedStudent.phone_number);
        } else if (event.keyCode === 27) {
          closeModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedRowIndex,
    showModal,
    currentIndex,
    nextStudent,
    prevStudent,
    selectedStudent,
    data,
  ]);

  // AuthProvider.logout: accessToken 제거 + BroadcastChannel LOGOUT 전파 + navigate("/?reason=logged_out")
  // logout_api.jsx 직접 호출은 HTTP만 처리하고 tokenStore/BroadcastChannel 정리를 누락하므로 사용하지 않는다.
  const onClickLogout = logout;

  const handleRecruitState = async () => {
    toast.confirm(
      "모집 여부를 변경하시겠습니까?",
      async () => {
        try {
          const response = await recruitStateChange();
          if (response.status === 200) {
            setRecruitState(response.data.is_enabled);
          }
        } catch (error) {
          console.error("change recruit chance 실패", error);
        }
      },
      null,
      "네",
      "아니요",
      "error"
    );
  };

  return (
    <div className="db-container">
      <div className="db-logo">
        <span> Quipu </span>
        <button className="db-logout" onClick={onClickLogout}>
          logout
        </button>
      </div>
      <div className="bottombox">
        <div className="buttonlist">
          {/* 모집 기간 on/off 버튼 */}
          <div className="radio-buttons">
            <label>
              <input
                type="radio"
                checked={recruitState === true}
                onChange={handleRecruitState}
              />
              모집 ON
            </label>
            <label>
              <input
                type="radio"
                checked={recruitState === false}
                onChange={handleRecruitState}
              />
              모집 OFF
            </label>
          </div>
          <div className="upload-buttons">
            <ExcelExporter generalData={generalData} devData={devData} />
            <button onClick={handleLoadDataClick}>
              <TbReload />
            </button>
          </div>
        </div>

        <div className="dbbox">
          <table>
            <thead>
              <tr>
                <th>번호</th>
                <th>이름</th>
                <th>학번</th>
                <th>학년</th>
                <th>학과</th>
                <th>전화번호</th>
                <th>제출시간</th>
              </tr>
            </thead>
            <tbody>
              {data.map((student, index) => (
                <tr
                  key={index}
                  className={`table-row ${
                    highlightedRowIndex === index ? "highlighted" : ""
                  }`}
                  onClick={() => {
                    setHighlightedRowIndex(index);
                    setSelectedRowIndex(index);
                  }}
                >
                  <td>
                    <p>{index + 1}</p>
                  </td>
                  <td onClick={() => handleNameClick(student, index)}>
                    <p className="name">{student.name}</p>
                  </td>
                  <td>
                    <p>{student.student_id}</p>
                  </td>
                  <td>
                    <p>{student.grade}</p>
                  </td>
                  <td>
                    <p>{student.major}</p>
                  </td>
                  <td
                    className="phonenumber"
                    onClick={() => handlePhoneNumberClick(student.phone_number)}
                  >
                    <p>{student.phone_number}</p>
                  </td>
                  <td>
                    <p>
                      {new Date(student.createdAt).toLocaleDateString("ko-KR", {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                      })}{" "}
                      {new Date(student.createdAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={closeModal}>
          <h6
            className="prev-button"
            onClick={(e) => {
              e.stopPropagation();
              prevStudent();
            }}
          >
            &#60;
          </h6>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h6 className="closebutton" onClick={closeModal}>
              x
            </h6>
            <h2>{selectedStudent.name}</h2>
            <p className="category">학년</p>
            <p className="content">{selectedStudent.grade}</p>
            <p className="category">학번</p>
            <p className="content">{selectedStudent.student_id}</p>
            <p className="category">학과</p>
            <p className="content">{selectedStudent.major}</p>
            <p className="category">전화번호</p>
            <p
              className="click-value"
              onClick={() =>
                handlePhoneNumberClick(selectedStudent.phone_number)
              }
            >
              {selectedStudent.phone_number}
            </p>
            {norordev === "개발" &&
              selectedIndex !== null &&
              selectedStudent.semina && (
                <>
                  <p className="category">세미나 활동</p>
                  <p className="content">{selectedStudent.motivation_semina}</p>
                </>
              )}
            {norordev === "개발" &&
              selectedIndex !== null &&
              selectedStudent.dev && (
                <>
                  <p className="category">개발 분야</p>
                  <p className="content">{selectedStudent.field_dev}</p>
                  <p className="category">포트폴리오 PDF</p>
                  <p
                    className="click-value"
                    onClick={() =>
                      fetchAndSavePortfolio(selectedStudent.portfolio_pdf)
                    }
                  >
                    {selectedStudent.portfolio_pdf}
                  </p>
                  <p className="category">깃허브 프로필 URL</p>
                  <p className="content">
                    <a href={selectedStudent.github_profile}>
                      {selectedStudent.github_profile}
                    </a>
                  </p>
                </>
              )}
            {norordev === "개발" &&
              selectedIndex !== null &&
              selectedStudent.study && (
                <>
                  <p className="category">스터디 활동</p>
                  <p className="content">{selectedStudent.motivation_study}</p>
                </>
              )}
            {norordev === "개발" &&
              selectedIndex !== null &&
              selectedStudent.external && (
                <>
                  <p className="category">대외 활동</p>
                  <p className="content">
                    {selectedStudent.motivation_external}
                  </p>
                </>
              )}
            <p className="category">제출시간</p>
            <p className="content">
              {new Date(selectedStudent.createdAt).toLocaleDateString("ko-KR", {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
              })}{" "}
              {new Date(selectedStudent.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <h6
            className="next-button"
            onClick={(e) => {
              e.stopPropagation();
              nextStudent();
            }}
          >
            &#62;
          </h6>
        </div>
      )}
    </div>
  );
}

export default RecruitDB;

// 엑셀 파일로 내보내기
function ExcelExporter({ generalData, devData }) {
  const [fileName, setFileName] = useState("퀴푸 지원 명단.xlsx");

  const exportToExcel = () => {
    const newFileName = window.prompt("저장할 파일명을 입력하세요.", fileName);
    if (newFileName) {
      setFileName(newFileName);

      const generalWorksheet = XLSX.utils.json_to_sheet(generalData);
      const devWorksheet = XLSX.utils.json_to_sheet(devData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, generalWorksheet, "GeneralData"); // GeneralData 시트 추가
      XLSX.utils.book_append_sheet(workbook, devWorksheet, "DevData"); // DevData 시트 추가

      XLSX.writeFile(workbook, newFileName);
    }
  };

  return (
    <div>
      <button onClick={exportToExcel}>
        <MdOutlineFileDownload />
      </button>
    </div>
  );
}
