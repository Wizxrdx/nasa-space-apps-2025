'use client';

import { Paper, Title, Divider } from '@mantine/core';
import React from 'react';

export default function InputGroup({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={5}>{title}</Title>
      <Divider my="sm" />
      {children}
    </Paper>
  );
}