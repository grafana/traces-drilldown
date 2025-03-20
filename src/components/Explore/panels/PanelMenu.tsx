import { PanelMenuItem, toURLRange, urlUtil } from '@grafana/data';
import {
  SceneObjectBase,
  VizPanelMenu,
  SceneObject,
  SceneComponentProps,
  sceneGraph,
  SceneObjectState,
} from '@grafana/scenes';
import React from 'react';
import { AddToInvestigationButton } from '../actions/AddToInvestigationButton';
import { config, getPluginLinkExtensions } from '@grafana/runtime';
import { reportAppInteraction, USER_EVENTS_PAGES, USER_EVENTS_ACTIONS } from 'utils/analytics';
import { getCurrentStep, getDataSource, getTraceExplorationScene } from 'utils/utils';

const ADD_TO_INVESTIGATION_MENU_TEXT = 'Add to investigation';
const extensionPointId = 'grafana-exploretraces-app/investigation/v1';
const ADD_TO_INVESTIGATION_MENU_DIVIDER_TEXT = 'investigations_divider'; // Text won't be visible
const ADD_TO_INVESTIGATION_MENU_GROUP_TEXT = 'Investigations';

interface PanelMenuState extends SceneObjectState {
  body?: VizPanelMenu;
  query?: string;
  labelValue?: string;
  addToInvestigationButton?: AddToInvestigationButton;
}

export class PanelMenu extends SceneObjectBase<PanelMenuState> implements VizPanelMenu, SceneObject {
  constructor(state: Partial<PanelMenuState>) {
    super(state);
    this.addActivationHandler(() => {
      const items: PanelMenuItem[] = [
        {
          text: 'Navigation',
          type: 'group',
        },
        {
          text: 'Explore',
          iconClassName: 'compass',
          href: getExploreHref(this),
          onClick: () => onExploreClick(),
        },
      ];

      this.setState({
        body: new VizPanelMenu({
          items,
        }),
      });

      const addToInvestigationButton = new AddToInvestigationButton({
        query: this.state.query,
        labelValue: this.state.labelValue,
      });
      this._subs.add(
        addToInvestigationButton?.subscribeToState(() => {
          subscribeToAddToInvestigation(this);
        })
      );
      this.setState({
        addToInvestigationButton: addToInvestigationButton,
      });

      this.state.addToInvestigationButton?.activate();
    });
  }

  addItem(item: PanelMenuItem): void {
    if (this.state.body) {
      this.state.body.addItem(item);
    }
  }

  setItems(items: PanelMenuItem[]): void {
    if (this.state.body) {
      this.state.body.setItems(items);
    }
  }

  public static Component = ({ model }: SceneComponentProps<PanelMenu>) => {
    const { body } = model.useState();

    if (body) {
      return <body.Component model={body} />;
    }

    return <></>;
  };
}

const getExploreHref = (model: SceneObject<PanelMenuState>) => {
  const traceExploration = getTraceExplorationScene(model);
  const datasource = getDataSource(traceExploration);
  const timeRange = sceneGraph.getTimeRange(model).state.value;
  const step = getCurrentStep(model);

  const exploreState = JSON.stringify({
    ['traces-explore']: {
      range: toURLRange(timeRange.raw),
      queries: [{ refId: 'A', datasource, query: model.state.query, step }],
    },
  });
  const subUrl = config.appSubUrl ?? '';
  const exploreUrl = urlUtil.renderUrl(`${subUrl}/explore`, { panes: exploreState, schemaVersion: 1 });
  return exploreUrl;
};

const onExploreClick = () => {
  reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.open_in_explore_clicked);
};

const getInvestigationLink = (addToInvestigations: AddToInvestigationButton) => {
  const links = getPluginLinkExtensions({
    extensionPointId,
    context: addToInvestigations.state.context,
  });

  return links.extensions[0];
};

const onAddToInvestigationClick = (event: React.MouseEvent, addToInvestigationButton: AddToInvestigationButton) => {
  const link = getInvestigationLink(addToInvestigationButton);
  if (link && link.onClick) {
    link.onClick(event);
  }

  reportAppInteraction(
    USER_EVENTS_PAGES.analyse_traces,
    USER_EVENTS_ACTIONS.analyse_traces.add_to_investigation_clicked
  );
};

function subscribeToAddToInvestigation(menu: PanelMenu) {
  const addToInvestigationButton = menu.state.addToInvestigationButton;
  if (addToInvestigationButton) {
    const link = getInvestigationLink(addToInvestigationButton);
    const existingMenuItems = menu.state.body?.state.items ?? [];
    const existingAddToInvestigationLink = existingMenuItems.find((item) => item.text === ADD_TO_INVESTIGATION_MENU_TEXT);

    if (link) {
      if (!existingAddToInvestigationLink) {
        menu.state.body?.addItem({
          text: ADD_TO_INVESTIGATION_MENU_DIVIDER_TEXT,
          type: 'divider',
        });
        menu.state.body?.addItem({
          text: ADD_TO_INVESTIGATION_MENU_GROUP_TEXT,
          type: 'group',
        });
        menu.state.body?.addItem({
          text: ADD_TO_INVESTIGATION_MENU_TEXT,
          iconClassName: 'plus-square',
          onClick: (e) => onAddToInvestigationClick(e, addToInvestigationButton),
        });
      } else {
        if (existingAddToInvestigationLink) {
          menu.state.body?.setItems(
            existingMenuItems.filter(
              (item) =>
                [
                  ADD_TO_INVESTIGATION_MENU_DIVIDER_TEXT,
                  ADD_TO_INVESTIGATION_MENU_GROUP_TEXT,
                  ADD_TO_INVESTIGATION_MENU_TEXT,
                ].includes(item.text) === false
            )
          );
        }
      }
    }
  }
}
