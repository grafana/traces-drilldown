import { dateTime } from '@grafana/data';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import {
  SuspendedEmbeddedTraceExceptions,
  SuspendedEmbeddedTraceExploration,
  SuspendedOpenInExploreTracesButton,
} from './index';

const initPluginI18n = jest.fn();

jest.mock('i18n/initPluginI18n', () => ({
  initPluginI18n: (...args: unknown[]) => initPluginI18n(...args),
}));

jest.mock('featureFlags/openFeature', () => ({
  OpenFeaturePluginScope: ({ children }: { children: React.ReactNode }) => children,
}));

const embeddedRender = jest.fn(() => <div>embedded-exploration</div>);
jest.mock('exposedComponents/EmbeddedTraceExploration/EmbeddedTraceExploration', () => ({
  __esModule: true,
  default: () => embeddedRender(),
}));

const buttonRender = jest.fn(() => <div>open-in-explore-button</div>);
jest.mock('exposedComponents/OpenInExploreTracesButton/OpenInExploreTracesButton', () => ({
  __esModule: true,
  default: () => buttonRender(),
}));

const exceptionsRender = jest.fn(() => <div>embedded-trace-exceptions</div>);
jest.mock('exposedComponents/EmbeddedTraceExceptions/EmbeddedTraceExceptions', () => ({
  __esModule: true,
  default: () => exceptionsRender(),
}));

const initialTimeRange = {
  from: dateTime(1000),
  to: dateTime(3000),
  raw: { from: dateTime(1000), to: dateTime(3000) },
};

describe('exposed component i18n init', () => {
  let resolveInit: () => void;

  beforeEach(() => {
    embeddedRender.mockClear();
    buttonRender.mockClear();
    exceptionsRender.mockClear();
    initPluginI18n.mockReset();
    initPluginI18n.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        })
    );
  });

  it('does not mount EmbeddedTraceExploration until i18n init finishes', async () => {
    render(<SuspendedEmbeddedTraceExploration initialTimeRange={initialTimeRange} />);

    expect(initPluginI18n).toHaveBeenCalled();
    expect(embeddedRender).not.toHaveBeenCalled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    resolveInit();

    await waitFor(() => {
      expect(screen.getByText('embedded-exploration')).toBeInTheDocument();
    });
    expect(embeddedRender).toHaveBeenCalled();
  });

  it('does not mount EmbeddedTraceExceptions until i18n init finishes', async () => {
    render(<SuspendedEmbeddedTraceExceptions initialTimeRange={initialTimeRange} />);

    expect(initPluginI18n).toHaveBeenCalled();
    expect(exceptionsRender).not.toHaveBeenCalled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    resolveInit();

    await waitFor(() => {
      expect(screen.getByText('embedded-trace-exceptions')).toBeInTheDocument();
    });
    expect(exceptionsRender).toHaveBeenCalled();
  });

  it('does not mount OpenInExploreTracesButton until i18n init finishes', async () => {
    render(<SuspendedOpenInExploreTracesButton matchers={[]} />);

    expect(initPluginI18n).toHaveBeenCalled();
    expect(buttonRender).not.toHaveBeenCalled();

    resolveInit();

    await waitFor(() => {
      expect(screen.getByText('open-in-explore-button')).toBeInTheDocument();
    });
    expect(buttonRender).toHaveBeenCalled();
  });
});
