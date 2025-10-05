'use client';

import { MantineProvider } from '@mantine/core';
import { Global } from '@emotion/react';
import { Notifications } from '@mantine/notifications';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="light">
      <Global
        styles={{
          html: { minHeight: '100%' },
          body: {
            minHeight: '100%',
            margin: 0,
            // Readable text on cosmic background
            color: 'rgba(255, 255, 255, 0.92)',
            colorScheme: 'dark',
            // Cosmic background
            background:
              'radial-gradient(80rem 80rem at 16% 8%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.0) 55%),' +
              'radial-gradient(60rem 60rem at 18% 10%, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.0) 60%),' +
              'radial-gradient(40rem 40rem at 78% 65%, transparent 62%, rgba(255,255,255,0.06) 63%, transparent 64%),' +
              'radial-gradient(34rem 34rem at 26% 78%, transparent 68%, rgba(255,215,0,0.06) 69%, transparent 70%),' +
              'radial-gradient(1px 1px at 12% 22%, rgba(255,255,255,0.55) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 28% 76%, rgba(255,255,255,0.40) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 44% 18%, rgba(255,255,255,0.45) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 63% 30%, rgba(255,255,255,0.35) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 71% 82%, rgba(255,255,255,0.50) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 86% 12%, rgba(255,255,255,0.38) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 91% 48%, rgba(255,255,255,0.42) 1px, transparent 1.2px),' +
              'radial-gradient(1px 1px at 35% 52%, rgba(255,255,255,0.30) 1px, transparent 1.2px),' +
              'linear-gradient(180deg, #030616 0%, #0b1b48 50%, #1a1033 100%)',
            backgroundAttachment:
              'fixed, fixed, fixed, fixed, fixed, fixed, fixed, fixed, fixed, fixed, fixed, fixed, fixed',
            backgroundColor: '#030616',
          },
          // Links on dark background
          a: {
            color: '#cfe3ff',
            textDecoration: 'none',
          },
          'a:hover': {
            textDecoration: 'underline',
          },
          // Keep content inside light Papers readable (Mantine default Paper is light in light scheme)
          '.mantine-Paper-root': {
            color: '#1A1B1E',
          },
          // Optional: dimmed text color override outside Papers (inherits inside unless Paper overrides)
          '.dimmed, [data-mantine-color="dimmed"]': {
            color: 'rgba(255, 255, 255, 0.65)',
          },
          '::selection': {
            backgroundColor: 'rgba(255, 215, 0, 0.35)',
            color: '#0b1026',
          },

          /* Dropdown panel (Select/Combobox) */
          '.mantine-Select-dropdown, .mantine-Combobox-dropdown': {
            background: '#ffffff',
            color: '#111827', // black-ish text
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
          /* Make sure items are black */
          '.mantine-Option-root, .mantine-Combobox-option': {
            color: '#111827',
          },
          /* Hover/selected states readable */
          '.mantine-Option-root[data-hovered="true"], .mantine-Combobox-option[data-hovered="true"]': {
            background: '#f1f5f9',
            color: '#111827',
          },
          '.mantine-Option-root[aria-selected="true"], .mantine-Combobox-option[aria-selected="true"]': {
            background: '#e2e8f0',
            color: '#111827',
          },

          /* If the dropdown is portaled alongside a Modal, enforce colors there too */
          '.mantine-Modal-root ~ .mantine-Portal .mantine-Combobox-dropdown': {
            background: '#ffffff',
            color: '#111827',
          },
          '.mantine-Modal-root ~ .mantine-Portal .mantine-Combobox-option': {
            color: '#111827',
          },

          /* CSV table: force light theme inside */
          '.csvTableWrap': {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid var(--mantine-color-gray-4)',
            borderRadius: 8,
          },
          '.csvTable th, .csvTable td': {
            color: '#111827',
          },
          '.csvTable thead tr th': {
            background: '#f8fafc', // slate-50 like
          },
          '.csvTable tbody tr': {
            background: '#ffffff',
          },
          '.csvTable tbody tr:nth-of-type(odd)': {
            background: '#fafafa',
          },
          '.csvTable tbody tr:hover': {
            background: '#f1f5f9',
          },
        }}
      />
      <Notifications position="top-right" zIndex={1000} />
      {children}
    </MantineProvider>
  );
}