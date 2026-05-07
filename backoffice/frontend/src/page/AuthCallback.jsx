import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setAccessToken } from "../auth/tokenStore";
import http from "../auth/authClient";
import { useAuth } from "../auth/AuthProvider";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setMe } = useAuth();
  // 언마운트 후 비동기 작업이 완료됐을 때 navigate/setMe 호출을 방지한다.
  // AbortController로 진행 중인 axios 요청을 취소하고, mounted flag로 state 변경을 차단한다.
  const mountedRef = useRef(true);

  useEffect(() => {
    const controller = new AbortController();

    // 백엔드가 code를 해시 프래그먼트(#code=...)로 전달한다.
    // 해시는 HTTP 요청에 포함되지 않으므로 서버 액세스 로그에 기록되지 않는다.
    // useSearchParams(쿼리 파라미터)에서 window.location.hash 읽기로 변경.
    const hash = window.location.hash.slice(1); // '#' 제거
    const hashParams = new URLSearchParams(hash);
    const code = hashParams.get("code");

    // 코드를 URL에서 즉시 제거해 브라우저 히스토리에 잔류하지 않도록 한다.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (!code) {
      navigate("/?reason=missing_code");
      return;
    }

    axios
      .post(
        `${BASE_URL}/bo/auth/token-exchange`,
        { code },
        { withCredentials: true, signal: controller.signal }
      )
      .then(async (res) => {
        if (!mountedRef.current) return;
        setAccessToken(res.data.accessToken);

        const meRes = await http.get("/bo/auth/me", { signal: controller.signal });
        if (!mountedRef.current) return;
        setMe(meRes.data);

        // RequireAuth에서 저장해둔 접근 시도 URL로 복귀한다.
        // 없으면 기본 페이지(/recruitDB)로 이동한다.
        const redirectTo = sessionStorage.getItem("bo_redirect_after_login") || "/recruitDB";
        sessionStorage.removeItem("bo_redirect_after_login");
        navigate(redirectTo);
      })
      .catch((err) => {
        // 언마운트로 인한 abort는 무시한다.
        if (axios.isCancel(err) || !mountedRef.current) return;
        // token-exchange 실패: 서버는 UNAUTHORIZED만 반환한다.
        // OAuth 인증 단계의 상세 실패(초대 만료, 이메일 불일치 등)는
        // /google/callback에서 passport 커스텀 콜백이 처리하여 /?reason=... 으로 직접 리다이렉트한다.
        navigate("/?reason=auth_failed");
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [navigate, setMe]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <p>인증 처리 중...</p>
    </div>
  );
}
