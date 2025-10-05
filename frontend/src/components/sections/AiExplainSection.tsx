'use client';

import { useState } from 'react';
import {
  Container, Stack, Title, Text, Grid, Card, Group, Badge, Space,
  Progress, Button, Collapse, ScrollArea, Box, Tooltip, ActionIcon
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { FEATURE_GROUPS } from '@/lib/csvColumns';

export default function AiExplainSection() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (key: string) => setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  return (
    <Container
      size="lg"
      py="xl"
      id="ai-explain"
      style={{
        height: '100svh',
        display: 'flex',
        alignItems: 'center',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
    >
      <Box
        data-scrollable="true"
        style={{
          height: '100%',
          width: '100%',
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          paddingRight: 8,
        }}
      >
        <Stack gap="md" style={{ width: '100%' }}>
          <Title order={2}>What the AI Looks At (Beyond the Transit)</Title>
          <Text size="sm" c="dimmed">How the AI Makes Its Decision</Text>
          <Text c="dimmed">
            Feature groups with their relative influence. Expand a group to view the raw columns.
          </Text>

          <Grid gutter="lg">
            {FEATURE_GROUPS.map((g) => (
              <Grid.Col key={g.key} span={{ base: 12, md: 6 }}>
                <Card withBorder padding="lg">
                  <Group justify="space-between" align="start">
                    <div>
                      <Group gap="xs">
                        <Title order={5}>{g.displayName}</Title>
                        <Tooltip label={g.noviceTip} withArrow>
                          <ActionIcon variant="subtle" color="gray" aria-label="info">
                            <IconInfoCircle size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      <Text size="xs" c="dimmed">{g.formalTitle}</Text>
                      <Text size="sm" c="dimmed" mt={4}>{g.purpose}</Text>
                    </div>
                    <Badge color="blue" variant="light">{g.influence}%</Badge>
                  </Group>

                  <Space h="sm" />
                  <Progress value={g.influence} size="lg" />
                  <Space h="sm" />

                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">Columns in this group</Text>
                    <Button size="xs" variant="light" onClick={() => toggleGroup(g.key)}>
                      {openGroups[g.key] ? 'Hide columns' : 'Expand'}
                    </Button>
                  </Group>

                  <Collapse in={!!openGroups[g.key]}>
                    <ScrollArea.Autosize mah={180} mt="sm">
                      <Stack gap={6}>
                        {g.columns.map((c) => (
                          <Badge key={c} variant="outline" color="gray">
                            {c}
                          </Badge>
                        ))}
                      </Stack>
                    </ScrollArea.Autosize>
                  </Collapse>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      </Box>
    </Container>
  );
}