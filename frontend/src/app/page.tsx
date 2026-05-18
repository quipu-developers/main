"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import Navbar from "@/components/Navbar";
import Home from "@/components/sections/Home";
import About from "@/components/sections/About";
import Activity from "@/components/sections/Activity";
import Technique from "@/components/sections/Technique";
import Interview from "@/components/sections/Interview";
import Recruit from "@/components/sections/Recruit";
import Comment from "@/components/sections/Comment";

export default function MainPage() {
  const [navPosition, setNavPosition] = useState("bottom-0");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const sections = [
      "home",
      "about",
      "activity",
      "technique",
      "interview",
      "recruit",
    ];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const homeSection = document.getElementById("home");
      const homeHeight = homeSection?.offsetHeight || 0;

      // home 섹션의 일정 범위보다 스크롤이 올라갔는지에 따라 네비게이션 위치 변경
      if (scrollY < homeHeight - 70) {
        setNavPosition("sticky bottom-0");
      } else {
        setNavPosition("fixed top-0");
      }

      // 현재 스크롤 위치에 따라 활성화할 섹션 결정
      let currentSection = null;
      for (const id of sections) {
        const section = document.getElementById(id);
        if (section) {
          const { top, bottom } = section.getBoundingClientRect();
          if (
            top <= window.innerHeight * 0.5 &&
            bottom >= window.innerHeight * 0.5
          ) {
            currentSection = id;
            break;
          }
        }
      }
      setActiveSection(currentSection);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative">
      {/* 홈 섹션 */}
      <Section id="home" className="pd-0">
        <Home />
        <Navbar position={navPosition} activeSection={activeSection} />
      </Section>

      {/* 어바웃 섹션 */}
      <Section id="about">
        <About />
      </Section>

      {/* 액티비티 섹션 */}
      <Section id="activity">
        <Activity />
      </Section>

      {/* 테크닉 섹션 */}
      <Section id="technique">
        <Technique />
      </Section>

      {/* 인터뷰 섹션 */}
      <Section id="interview">
        <Interview />
      </Section>

      {/* 리크루트 섹션 */}
      <Section id="recruit">
        <Recruit />
      </Section>

      {/* 코멘트 섹션 */}
      <Section id="comment">
        <Comment />
      </Section>
    </div>
  );
}

const Section = styled.section`
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 50px;
  scroll-snap-align: start;
  scroll-snap-stop: always;

  @media (max-width: 900px) {
    padding: 50px 0;
  }

  &.pd-0 {
    padding: 0 !important;

    @media (max-width: 900px) {
      padding: 0 !important;
    }
  }
`;
