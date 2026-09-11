import { CustomVariable } from '@grafana/scenes';
import { AttributesBreakdownScene } from './AttributesBreakdownScene';
import { getGroupByVariable } from 'utils/utils';
import { reportAppInteraction } from 'utils/analytics';

jest.mock('utils/utils', () => ({
  getGroupByVariable: jest.fn(),
  getAttributesAsOptions: jest.fn(),
  getPercentilesVariable: jest.fn(),
  getPrimarySignalVariable: jest.fn(),
  getTraceByServiceScene: jest.fn(),
  getTraceExplorationScene: jest.fn(),
}));

jest.mock('utils/analytics', () => ({
  ...jest.requireActual('utils/analytics'),
  reportAppInteraction: jest.fn(),
}));

describe('AttributesBreakdownScene', () => {
  let mockVariable: { getValueText: jest.Mock; changeValueTo: jest.Mock };
  let scene: AttributesBreakdownScene;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVariable = {
      getValueText: jest.fn(() => ''),
      changeValueTo: jest.fn(),
    };
    jest.mocked(getGroupByVariable).mockReturnValue(mockVariable as unknown as CustomVariable);

    scene = new AttributesBreakdownScene({});
  });

  describe('onChange', () => {
    it('should replace state and skip analytics when ignore is true', () => {
      scene.onChange('span.http.method', true);

      expect(mockVariable.changeValueTo).toHaveBeenCalledWith('span.http.method', undefined, false);
      expect(reportAppInteraction).not.toHaveBeenCalled();
    });

    it('should push state and report analytics when ignore is omitted', () => {
      scene.onChange('span.http.method');

      expect(mockVariable.changeValueTo).toHaveBeenCalledWith('span.http.method', undefined, true);
      expect(reportAppInteraction).toHaveBeenCalledWith('analyse_traces', 'breakdown_group_by_changed', {
        groupBy: 'span.http.method',
      });
    });
  });
});
