import { createDataFrame, FieldType, getDefaultTimeRange, LoadingState } from '@grafana/data';
import { SceneCSSGridLayout, SceneDataNode, SceneFlexItem } from '@grafana/scenes';
import {
  ByFrameRepeater,
  doesQueryMatchDataFrameLabels,
  hasNonZeroValues,
  PAGE_SIZE,
} from 'components/Explore/ByFrameRepeater';

const frame = (name: string, value: number) =>
  createDataFrame({
    name,
    fields: [
      { name: 'time', type: FieldType.time, values: [1] },
      { name: 'value', type: FieldType.number, values: [value] },
    ],
  });

const buildRepeater = (count: number) => {
  const repeater = new ByFrameRepeater({
    $data: new SceneDataNode({
      data: {
        state: LoadingState.Done,
        series: Array.from({ length: count }, (_, i) => frame(`svc-${i}`, 1)),
        timeRange: getDefaultTimeRange(),
      },
    }),
    body: new SceneCSSGridLayout({ children: [] }),
    getLayoutChild: () => new SceneFlexItem({ body: undefined }),
  });
  repeater.activate();
  return repeater;
};

describe('ByFrameRepeater pagination', () => {
  it('should mount only the first page of frames', () => {
    expect(buildRepeater(30).state.body.state.children).toHaveLength(24);
  });

  it('should mount the next page on show more', () => {
    const repeater = buildRepeater(30);
    repeater.onShowMore();
    expect(repeater.state.body.state.children).toHaveLength(30);
  });

  it('should report the total number of non-empty frames', () => {
    expect(buildRepeater(30).state.totalCount).toBe(30);
  });

  it('should not grow past the total on show more', () => {
    const repeater = buildRepeater(10);
    repeater.onShowMore();
    expect(repeater.state.visibleCount ?? PAGE_SIZE).toBe(24);
  });

  it('should load the next page when the hint comes into view', () => {
    const repeater = buildRepeater(30);
    repeater.onHintInViewChange(true);
    expect(repeater.state.body.state.children).toHaveLength(30);
  });

  it('should not load the next page when the hint leaves view', () => {
    const repeater = buildRepeater(30);
    repeater.onHintInViewChange(false);
    expect(repeater.state.body.state.children).toHaveLength(24);
  });
});

describe('hasNonZeroValues', () => {
  it('should be false for a frame with only zeros', () => {
    expect(hasNonZeroValues(frame('a', 0))).toBe(false);
  });

  it('should be true for a frame with a non-zero value', () => {
    expect(hasNonZeroValues(frame('a', 2))).toBe(true);
  });
});

const DATA_FRAME_FIELDS = [
  {
    type: FieldType.number,
    config: {},
    values: [],
    name: '{resource.service.name="mythical-requester", status="error"}',
    labels: { 'resource.service.name': '"mythical-requester"', status: '"error"' },
  },
  {
    type: FieldType.number,
    config: {},
    values: [],
    name: '{resource.service.name="mythical-requester", status="ok"}',
    labels: { 'resource.service.name': '"mythical-requester"', status: '"ok"' },
  },
];

describe('doesQueryMatchDataFrameLabels', () => {
  describe('when there are no fields in the data frame', () => {
    test('returns false', () => {
      expect(doesQueryMatchDataFrameLabels('needle')({ fields: [], length: 0 })).toBe(false);
    });
  });

  describe('when there are fields in the data frame', () => {
    test.each([
      [
        'no labels in the fields',
        'requester',
        false,
        [
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="mythical-requester", status="error"}',
            labels: undefined,
          },
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="mythical-requester", status="ok"}',
            labels: undefined,
          },
        ],
      ],
      ['labels in the fields & an empty search query', '', true, DATA_FRAME_FIELDS],
      ['labels in the fields & a search match', 'requester', true, DATA_FRAME_FIELDS],
      ['labels in the fields & a search query with spaces around', '  requester  ', true, DATA_FRAME_FIELDS],
      [
        'labels in the fields & a case-sensitive search match (#1)',
        'MYTHICAL',
        true,
        [
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="mythical-requester", status="error"}',
            labels: { 'resource.service.name': '"mythical-requester"', status: '"error"' },
          },
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="MYTHICAL-requester", status="ok"}',
            labels: { 'resource.service.name': '"MYTHICAL-requester"', status: '"ok"' },
          },
        ],
      ],
      [
        'labels in the fields & a case-sensitive search match (#2)',
        'mythical',
        true,
        [
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="MYTHICAL-requester", status="error"}',
            labels: { 'resource.service.name': '"MYTHICAL-requester"', status: '"error"' },
          },
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="MYTHICAL-requester", status="ok"}',
            labels: { 'resource.service.name': '"MYTHICAL-requester"', status: '"ok"' },
          },
        ],
      ],
    ])('%s, "%s" → %s', (_, searchQuery, expectedOutput, fields) => {
      expect(doesQueryMatchDataFrameLabels(searchQuery)({ fields, length: 42 })).toBe(expectedOutput);
    });
  });
});
