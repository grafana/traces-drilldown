import React from 'react';
import { render, screen } from '@testing-library/react';
import { SpanListScene } from './SpanListScene';
import { testIds } from 'utils/testIds';

jest.mock('../../../../../utils/utils', () => ({
  getSpanListColumnsVariable: () => ({ getValue: () => [] }),
  getTraceByServiceScene: () => ({ useState: () => ({ attributes: [] }) }),
}));
jest.mock('components/Explore/AttributesSidebar', () => ({ AttributesSidebar: () => null }));

describe('trace list highlight anchor', () => {
  it('anchors the list content on an element with a layout box', () => {
    const panel = { Component: () => <div>Trace table</div> };
    const model = { useState: () => ({ panel }) } as unknown as SpanListScene;
    render(<SpanListScene.Component model={model} />);

    const anchor = screen.getByTestId(testIds.tracesContainer);
    expect(anchor).toContainElement(screen.getByText('Trace table'));
    expect(getComputedStyle(anchor).display).not.toBe('contents');
    expect(screen.getAllByTestId(testIds.tracesContainer)).toHaveLength(1);
  });
});
