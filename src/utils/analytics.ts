import { reportInteraction } from '@grafana/runtime';
import pluginJson from '../plugin.json';

// Helper function to create a unique interaction name for analytics
const createInteractionName = (page: UserEventPagesType, action: string) => {
  return `${pluginJson.id.replace(/-/g, '_')}_${page}_${action}`;
};

// Runs reportInteraction with a standardized interaction name
export const reportAppInteraction = (
  page: UserEventPagesType,
  action: UserEventActionType,
  properties?: Record<string, unknown>
) => {
  reportInteraction(createInteractionName(page, action), properties);
};

export const USER_EVENTS_PAGES = {
  analyse_traces: 'analyse_traces',
  home: 'home',
  common: 'common',
} as const;

export type UserEventPagesType = keyof typeof USER_EVENTS_PAGES;
type UserEventActionType =
  | keyof (typeof USER_EVENTS_ACTIONS)['analyse_traces']
  | keyof (typeof USER_EVENTS_ACTIONS)['home']
  | keyof (typeof USER_EVENTS_ACTIONS)['common'];

export const USER_EVENTS_ACTIONS = {
  [USER_EVENTS_PAGES.analyse_traces]: {
    action_view_changed: 'action_view_changed',
    breakdown_group_by_changed: 'breakdown_group_by_changed',
    breakdown_add_to_filters_clicked: 'breakdown_add_to_filters_clicked',
    comparison_add_to_filters_clicked: 'comparison_add_to_filters_clicked',
    select_attribute_in_comparison_clicked: 'select_attribute_in_comparison_clicked',
    layout_type_changed: 'layout_type_changed',
    start_investigation: 'start_investigation',
    stop_investigation: 'stop_investigation',
    open_trace: 'open_trace',
    open_in_explore_clicked: 'open_in_explore_clicked',
    add_to_investigation_clicked: 'add_to_investigation_clicked',
    add_to_investigation_trace_view_clicked: 'add_to_investigation_trace_view_clicked',
    span_list_columns_changed: 'span_list_columns_changed',
    toggle_bookmark_clicked: 'toggle_bookmark_clicked',
    primary_signal_changed: 'primary_signal_changed',
    exception_message_clicked: 'exception_message_clicked',
  },
  [USER_EVENTS_PAGES.home]: {
    homepage_initialized: 'homepage_initialized',
    panel_row_clicked: 'panel_row_clicked',
    explore_traces_clicked: 'explore_traces_clicked',
    read_documentation_clicked: 'read_documentation_clicked',
    filter_changed: 'filter_changed',
    go_to_bookmark_clicked: 'go_to_bookmark_clicked',
  },
  [USER_EVENTS_PAGES.common]: {
    metric_changed: 'metric_changed',
    new_filter_added_manually: 'new_filter_added_manually',
    app_initialized: 'app_initialized',
    global_docs_link_clicked: 'global_docs_link_clicked',
    metric_docs_link_clicked: 'metric_docs_link_clicked',
    feedback_link_clicked: 'feedback_link_clicked',
    go_to_full_app_clicked: 'go_to_full_app_clicked',
  },
} as const;
