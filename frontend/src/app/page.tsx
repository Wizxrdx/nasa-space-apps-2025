'use client';

import React, { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import HeroSection from '@/components/sections/HeroSection';
import LearnSection from '@/components/sections/LearnSection';
import TryItYourselfSection from '@/components/sections/TryItYourselfSection';
import AiExplainSection from '@/components/sections/AiExplainSection';
import QuickStartFooterSection from '@/components/sections/QuickStartSection';

export default function HomePage() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const animatingRef = useRef(false);
  const prevSnapRef = useRef<string>('y mandatory');

  // Smooth snap animation (0.8s)
  function animateScroll(container: HTMLElement, to: number, duration = 800, onComplete?: () => void) {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const target = Math.round(to);
    if (prefersReduced || duration <= 0) {
      container.scrollTop = target;
      onComplete?.();
      return;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Temporarily disable CSS snap to allow smooth animation
    prevSnapRef.current = container.style.scrollSnapType || 'y mandatory';
    container.style.scrollSnapType = 'none';

    const start = container.scrollTop;
    const change = target - start;
    const startTime = performance.now();
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      container.scrollTop = start + change * easeInOutCubic(progress);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        container.scrollTop = target;
        rafRef.current = null;
        container.style.scrollSnapType = prevSnapRef.current || 'y mandatory';
        onComplete?.();
      }
    }
    rafRef.current = requestAnimationFrame(step);
  }

  const scrollToSection = (id: string) => {
    const container = wrapperRef.current;
    if (!container) return;
    const targetEl = container.querySelector<HTMLElement>(`#${id}`);
    if (!targetEl) return;
    const to = container.scrollTop + (targetEl.getBoundingClientRect().top - container.getBoundingClientRect().top);
    animatingRef.current = true;
    animateScroll(container, to, 800, () => (animatingRef.current = false));
  };

  // Ensure we start at the top
  useEffect(() => {
    wrapperRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Unified wheel/keyboard/touch handling with inner-scroll threshold
  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;

    const sectionSize = () => container.clientHeight; // each section 100svh
    const currentIndex = () => Math.round(container.scrollTop / sectionSize());
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const sectionCount = 5; // hero + learn + try + explain + combined quick-start+footer
    const thresholdPx = 80;

    const snapToIndex = (idx: number) => {
      const target = idx * sectionSize();
      animatingRef.current = true;
      animateScroll(container, target, 800, () => (animatingRef.current = false));
    };

    const onWheel = (e: WheelEvent) => {
      if (animatingRef.current) {
        e.preventDefault();
        return;
      }
      const targetEl = e.target as Element | null;
      const scroller = targetEl?.closest('[data-scrollable="true"]') as HTMLElement | null;

      if (scroller) {
        const atTop = scroller.scrollTop <= thresholdPx;
        const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - thresholdPx;
        // allow normal inner scroll when not near edges
        if ((!atTop && e.deltaY < 0) || (!atBottom && e.deltaY > 0)) return;
        // near edge: snap
        e.preventDefault();
        const idx = currentIndex();
        const next = clamp(idx + (e.deltaY > 0 ? 1 : -1), 0, sectionCount - 1);
        if (next !== idx) snapToIndex(next);
        return;
      }

      // Outside inner scrollables: one section per wheel gesture
      if (Math.abs(e.deltaY) < 5 || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      const idx = currentIndex();
      const next = clamp(idx + (e.deltaY > 0 ? 1 : -1), 0, sectionCount - 1);
      if (next !== idx) snapToIndex(next);
    };

    const onKey = (e: KeyboardEvent) => {
      if (animatingRef.current) {
        e.preventDefault();
        return;
      }
      let delta = 0;
      if (e.key === 'PageDown' || e.key === 'ArrowDown' || (e.key === ' ' && !e.shiftKey)) delta = 1;
      if (e.key === 'PageUp' || e.key === 'ArrowUp' || (e.key === ' ' && e.shiftKey)) delta = -1;
      if (delta === 0) return;
      e.preventDefault();
      const idx = currentIndex();
      const next = clamp(idx + delta, 0, sectionCount - 1);
      if (next !== idx) snapToIndex(next);
    };

    const onTouchEnd = () => {
      // Snap to nearest section after touch scroll
      const idx = currentIndex();
      snapToIndex(idx);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey, { passive: false });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('wheel', onWheel as any);
      window.removeEventListener('keydown', onKey as any);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <Box
      ref={wrapperRef}
      style={{ height: '100svh', overflowY: 'auto', scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain' }}
    >
      <HeroSection
        onLearnClick={() => scrollToSection('learn')}
        onStartClick={() => scrollToSection('quick-start')}
      />
      <LearnSection />
      <TryItYourselfSection />
      <AiExplainSection />
      <QuickStartFooterSection />
    </Box>
  );
}