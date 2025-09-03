import React, { useState } from 'react';
import { SelectableValue } from '@grafana/data';
import {
  GroupBySelector,
  createDefaultGroupBySelectorConfig,
  FilterConfig,
} from './';

/**
 * Example usage of GroupBySelector component
 * This demonstrates how to use the new stateless component
 */
export const GroupBySelectorExample: React.FC = () => {
  const [selectedAttribute, setSelectedAttribute] = useState<string>('');
  const [currentFilters] = useState<FilterConfig[]>([
    { key: 'status', operator: '=', value: 'error' },
  ]);

  // Sample attribute options
  const attributeOptions: Array<SelectableValue<string>> = [
    { label: 'Service Name', value: 'resource.service.name' },
    { label: 'Service Namespace', value: 'resource.service.namespace' },
    { label: 'Operation Name', value: 'name' },
    { label: 'Span Kind', value: 'kind' },
    { label: 'Status', value: 'status' },
    { label: 'HTTP Status Code', value: 'span.http.status_code' },
    { label: 'Root Service Name', value: 'rootServiceName' },
    { label: 'Duration', value: 'duration' },
  ];

  // Radio button attributes (most commonly used)
  const radioAttributes = [
    'resource.service.name',
    'name',
    'kind',
    'status',
  ];

  const handleAttributeChange = (attribute: string, ignore?: boolean) => {
    console.log('Attribute changed:', attribute, 'ignore:', ignore);
    setSelectedAttribute(attribute);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>GroupBySelector Examples</h2>

      <div style={{ marginBottom: '40px' }}>
        <h3>Basic Usage</h3>
        <GroupBySelector
          options={attributeOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={handleAttributeChange}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>With Show All Option</h3>
        <GroupBySelector
          options={attributeOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={handleAttributeChange}
          showAll={true}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>With Traces Domain Configuration</h3>
        <GroupBySelector
          options={attributeOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={handleAttributeChange}
          filters={currentFilters}
          currentMetric="rate"
          {...createDefaultGroupBySelectorConfig('traces')}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Custom Configuration</h3>
        <GroupBySelector
          options={attributeOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={handleAttributeChange}
          fieldLabel="Custom Group By"
          selectPlaceholder="Select custom attribute"
          attributePrefixes={{
            span: 'span.',
            resource: 'resource.',
            custom: 'custom.',
          }}
          filteringRules={{
            excludeFilteredFromRadio: true,
            excludeAttributesForMetrics: {
              'rate': ['status'],
              'errors': ['status'],
            },
          }}
          ignoredAttributes={['duration', 'span:id']}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3>Logs Domain Example</h3>
        <GroupBySelector
          options={[
            { label: 'Log Level', value: 'log.level' },
            { label: 'Service Name', value: 'resource.service.name' },
            { label: 'Message', value: 'log.message' },
            { label: 'Source', value: 'log.source' },
          ]}
          radioAttributes={['log.level', 'resource.service.name']}
          value={selectedAttribute}
          onChange={handleAttributeChange}
          {...createDefaultGroupBySelectorConfig('logs')}
        />
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <strong>Selected Attribute:</strong> {selectedAttribute || 'None'}
      </div>
    </div>
  );
};

export default GroupBySelectorExample;
