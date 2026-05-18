"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";

const BO_API_URL = process.env.NEXT_PUBLIC_BO_API_URL || "";

interface CommentItem {
  _id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function Comment() {
  // ── 목록 상태
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  // ── 폼 상태
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<"success" | "error" | "rate_limit" | null>(null);

  // ── 승인된 코멘트 목록 불러오기
  const loadComments = useCallback(async (page: number) => {
    setListLoading(true);
    try {
      const res = await fetch(
        `${BO_API_URL}/comments?page=${page}&limit=20`
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setComments(data.data);
      setPagination(data.pagination);
    } catch {
      // 불러오기 실패 시 목록 유지
    } finally {
      setListLoading(false);
    }
  }, []);

  const isFirstRender = useRef(true);

  useEffect(() => {
    loadComments(listPage);
    // 초기 로드가 아닌 페이지 변경 시에만 목록 상단으로 부드럽게 스크롤
    if (!isFirstRender.current) {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    isFirstRender.current = false;
  }, [listPage, loadComments]);

  // ── 코멘트 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedAuthor = author.trim();
    const trimmedContent = content.trim();

    if (!trimmedAuthor || !trimmedContent) return;

    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch(`${BO_API_URL}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: trimmedAuthor, content: trimmedContent, website: "" }),
      });

      if (res.status === 201) {
        setSubmitResult("success");
        setAuthor("");
        setContent("");
      } else if (res.status === 429) {
        setSubmitResult("rate_limit");
      } else {
        setSubmitResult("error");
      }
    } catch {
      setSubmitResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <Wrapper>
      <Inner>
        <Title>Comments</Title>
        <Subtitle>퀴푸에 대한 한 마디를 남겨주세요.</Subtitle>

        {/* 제출 폼 */}
        <Form onSubmit={handleSubmit}>
          {/* 허니팟: CSS로 숨겨진 필드 — 사람은 비워두고 봇만 채움 */}
          <input
            type="text"
            name="website"
            defaultValue=""
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <FormRow>
            <AuthorInput
              type="text"
              placeholder="이름 (최대 20자)"
              value={author}
              onChange={(e) => { setAuthor(e.target.value); setSubmitResult(null); }}
              maxLength={20}
              disabled={submitting}
              required
            />
          </FormRow>
          <FormRow>
            <ContentTextarea
              placeholder="코멘트를 입력해주세요. (최대 200자)"
              value={content}
              onChange={(e) => { setContent(e.target.value); setSubmitResult(null); }}
              maxLength={200}
              disabled={submitting}
              rows={3}
              required
            />
          </FormRow>
          <FormFooter>
            <CharCount>{content.length} / 200</CharCount>
            <SubmitButton type="submit" disabled={submitting || !author.trim() || !content.trim()}>
              {submitting ? "등록 중..." : "등록"}
            </SubmitButton>
          </FormFooter>

          {submitResult === "success" && (
            <ResultMessage $type="success">
              코멘트가 등록되었습니다. 검토 후 공개됩니다.
            </ResultMessage>
          )}
          {submitResult === "rate_limit" && (
            <ResultMessage $type="error">
              요청이 너무 많습니다. 1분 후 다시 시도해주세요.
            </ResultMessage>
          )}
          {submitResult === "error" && (
            <ResultMessage $type="error">
              등록에 실패했습니다. 잠시 후 다시 시도해주세요.
            </ResultMessage>
          )}
        </Form>

        {/* 승인된 코멘트 목록 */}
        <ListSection ref={listRef}>
          {listLoading ? (
            <EmptyState>불러오는 중...</EmptyState>
          ) : comments.length === 0 ? (
            <EmptyState>아직 등록된 코멘트가 없습니다.</EmptyState>
          ) : (
            comments.map((c) => (
              <CommentCard key={c._id}>
                <CardHeader>
                  <AuthorName>{c.author}</AuthorName>
                  <CardDate>{formatDate(c.createdAt)}</CardDate>
                </CardHeader>
                <CardContent>{c.content}</CardContent>
              </CommentCard>
            ))
          )}
        </ListSection>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <PaginationRow>
            <PageArrow
              onClick={() => setListPage((p) => p - 1)}
              disabled={listPage <= 1}
              aria-label="이전 페이지"
            >
              &#8592;
            </PageArrow>

            {buildPageNumbers(listPage, pagination.totalPages).map((item, i) =>
              item === "..." ? (
                <PageEllipsis key={`ellipsis-${i}`}>…</PageEllipsis>
              ) : (
                <PageNumber
                  key={item}
                  $active={item === listPage}
                  onClick={() => setListPage(item as number)}
                >
                  {item}
                </PageNumber>
              )
            )}

            <PageArrow
              onClick={() => setListPage((p) => p + 1)}
              disabled={listPage >= pagination.totalPages}
              aria-label="다음 페이지"
            >
              &#8594;
            </PageArrow>
          </PaginationRow>
        )}
      </Inner>
    </Wrapper>
  );
}

// ── 페이지 번호 배열 생성
// 현재 페이지 기준 앞뒤 2개 + 첫/마지막 페이지를 항상 표시, 그 사이 간격이 2 초과이면 "..." 삽입
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  const delta = 2;
  const pages: (number | "...")[] = [];
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  pages.push(1);

  if (rangeStart > 2) pages.push("...");

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < total - 1) pages.push("...");

  if (total > 1) pages.push(total);

  return pages;
}

// ── 스타일
const Wrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 60px 24px;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 640px;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  color: #888;
  font-size: 0.95rem;
  margin-bottom: 32px;
`;

const Form = styled.form`
  margin-bottom: 40px;
`;

const FormRow = styled.div`
  margin-bottom: 10px;
`;

const AuthorInput = styled.input`
  width: 100%;
  background: #111;
  border: 1px solid #2a2a2a;
  color: #f0f0f0;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus {
    border-color: #555;
  }

  &::placeholder {
    color: #444;
  }
`;

const ContentTextarea = styled.textarea`
  width: 100%;
  background: #111;
  border: 1px solid #2a2a2a;
  color: #f0f0f0;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.15s;
  font-family: inherit;

  &:focus {
    border-color: #555;
  }

  &::placeholder {
    color: #444;
  }
`;

const FormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
`;

const CharCount = styled.span`
  font-size: 0.78rem;
  color: #555;
`;

const SubmitButton = styled.button`
  background: #f0f0f0;
  color: #0d0d0d;
  border: none;
  padding: 8px 22px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const ResultMessage = styled.p<{ $type: "success" | "error" | "rate_limit" }>`
  margin-top: 10px;
  font-size: 0.85rem;
  color: ${({ $type }) => ($type === "success" ? "#4caf50" : "#ef5350")};
`;

const ListSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EmptyState = styled.p`
  text-align: center;
  color: #444;
  font-size: 0.9rem;
  padding: 40px 0;
`;

const CommentCard = styled.div`
  background: #111;
  border: 1px solid #1e1e1e;
  border-radius: 10px;
  padding: 14px 18px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const AuthorName = styled.span`
  font-weight: 600;
  font-size: 0.9rem;
`;

const CardDate = styled.span`
  font-size: 0.78rem;
  color: #555;
`;

const CardContent = styled.p`
  font-size: 0.9rem;
  color: #ccc;
  line-height: 1.6;
  word-break: break-all;
`;

const PaginationRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 28px;
  flex-wrap: wrap;
`;

const PageArrow = styled.button`
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #888;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s;

  &:disabled {
    opacity: 0.25;
    cursor: default;
  }

  &:hover:not(:disabled) {
    border-color: #555;
    color: #eee;
  }
`;

const PageNumber = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => ($active ? "#f0f0f0" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "#f0f0f0" : "#2a2a2a")};
  color: ${({ $active }) => ($active ? "#0d0d0d" : "#888")};
  width: 34px;
  height: 34px;
  border-radius: 6px;
  cursor: ${({ $active }) => ($active ? "default" : "pointer")};
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? "700" : "400")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s, background 0.15s;

  &:hover:not(:disabled) {
    border-color: ${({ $active }) => ($active ? "#f0f0f0" : "#555")};
    color: ${({ $active }) => ($active ? "#0d0d0d" : "#eee")};
  }
`;

const PageEllipsis = styled.span`
  color: #444;
  font-size: 0.85rem;
  width: 24px;
  text-align: center;
  line-height: 34px;
`;
