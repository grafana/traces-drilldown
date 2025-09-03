import React, { useState } from 'react';
import { SelectableValue } from '@grafana/data';
import {
  GroupBySelector,
  createDefaultGroupBySelectorConfig,
  FilterConfig,
  DomainType,
} from './';

/**
 * Comprehensive examples showing GroupBySelector with different domain configurations
 */
export const DomainExamples: React.FC = () => {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  const handleAttributeChange = (domain: string) => (attribute: string, ignore?: boolean) => {
    console.log(`${domain} attribute changed:`, attribute, 'ignore:', ignore);
    setSelectedAttributes(prev => ({ ...prev, [domain]: attribute }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      <h1>GroupBySelectorV2 Domain Examples</h1>

      {/* Traces Domain */}
      <section style={{ marginBottom: '60px', border: '1px solid #e1e4e8', padding: '20px', borderRadius: '8px' }}>
        <h2>🔍 Traces Domain</h2>
        <p>Optimized for distributed tracing with OpenTelemetry attributes</p>

        <TracesExample
          selectedAttribute={selectedAttributes.traces || ''}
          onAttributeChange={handleAttributeChange('traces')}
        />
      </section>

      {/* Logs Domain */}
      <section style={{ marginBottom: '60px', border: '1px solid #e1e4e8', padding: '20px', borderRadius: '8px' }}>
        <h2>📝 Logs Domain</h2>
        <p>Configured for log analysis with structured logging attributes</p>

        <LogsExample
          selectedAttribute={selectedAttributes.logs || ''}
          onAttributeChange={handleAttributeChange('logs')}
        />
      </section>

      {/* Metrics Domain */}
      <section style={{ marginBottom: '60px', border: '1px solid #e1e4e8', padding: '20px', borderRadius: '8px' }}>
        <h2>📊 Metrics Domain</h2>
        <p>Designed for Prometheus-style metrics with labels</p>

        <MetricsExample
          selectedAttribute={selectedAttributes.metrics || ''}
          onAttributeChange={handleAttributeChange('metrics')}
        />
      </section>

      {/* Custom Domain */}
      <section style={{ marginBottom: '60px', border: '1px solid #e1e4e8', padding: '20px', borderRadius: '8px' }}>
        <h2>⚙️ Custom Domain</h2>
        <p>Flexible configuration for custom use cases</p>

        <CustomExample
          selectedAttribute={selectedAttributes.custom || ''}
          onAttributeChange={handleAttributeChange('custom')}
        />
      </section>

      {/* Configuration Comparison */}
      <section style={{ marginBottom: '60px', border: '1px solid #e1e4e8', padding: '20px', borderRadius: '8px' }}>
        <h2>🔧 Configuration Comparison</h2>
        <ConfigurationComparison />
      </section>

      {/* Selection Summary */}
      <section style={{ padding: '20px', backgroundColor: '#f6f8fa', borderRadius: '8px' }}>
        <h3>Current Selections</h3>
        <ul>
          {Object.entries(selectedAttributes).map(([domain, attribute]) => (
            <li key={domain}>
              <strong>{domain}:</strong> {attribute || 'None'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const TracesExample: React.FC<{
  selectedAttribute: string;
  onAttributeChange: (attribute: string, ignore?: boolean) => void;
}> = ({ selectedAttribute, onAttributeChange }) => {
  const traceOptions: Array<SelectableValue<string>> = [
    { label: 'Service Name', value: 'resource.service.name' },
    { label: 'Service Namespace', value: 'resource.service.namespace' },
    { label: 'Service Version', value: 'resource.service.version' },
    { label: 'Operation Name', value: 'name' },
    { label: 'Span Kind', value: 'kind' },
    { label: 'Status', value: 'status' },
    { label: 'HTTP Method', value: 'span.http.method' },
    { label: 'HTTP Status Code', value: 'span.http.status_code' },
    { label: 'Root Service Name', value: 'rootServiceName' },
    { label: 'Root Operation Name', value: 'rootName' },
    { label: 'Duration', value: 'duration' }, // Will be ignored
  ];

  const radioAttributes = [
    'resource.service.name',
    'name',
    'kind',
    'status',
    'rootServiceName',
  ];

  const activeFilters: FilterConfig[] = [
    { key: 'status', operator: '=', value: 'error' },
    { key: 'resource.service.name', operator: '!=', value: 'test-service' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4>Standard Configuration</h4>
        <GroupBySelector
          options={traceOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={onAttributeChange}
          showAll={true}
          filters={activeFilters}
          currentMetric="duration"
          {...createDefaultGroupBySelectorConfig('traces')}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4>With Rate Metric (excludes status from radio buttons)</h4>
        <GroupBySelector
          options={traceOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={onAttributeChange}
          filters={activeFilters}
          currentMetric="rate"
          {...createDefaultGroupBySelectorConfig('traces')}
        />
      </div>

      <ConfigurationDisplay domain="traces" />
    </div>
  );
};

const LogsExample: React.FC<{
  selectedAttribute: string;
  onAttributeChange: (attribute: string, ignore?: boolean) => void;
}> = ({ selectedAttribute, onAttributeChange }) => {
  const logOptions: Array<SelectableValue<string>> = [
    { label: 'Log Level', value: 'log.level' },
    { label: 'Logger Name', value: 'log.logger' },
    { label: 'Service Name', value: 'resource.service.name' },
    { label: 'Service Version', value: 'resource.service.version' },
    { label: 'Environment', value: 'resource.deployment.environment' },
    { label: 'Container Name', value: 'resource.container.name' },
    { label: 'Host Name', value: 'resource.host.name' },
    { label: 'Source File', value: 'log.file.name' },
    { label: 'Timestamp', value: 'timestamp' }, // Will be ignored
  ];

  const radioAttributes = [
    'log.level',
    'resource.service.name',
    'resource.deployment.environment',
  ];

  const activeFilters: FilterConfig[] = [
    { key: 'log.level', operator: '=', value: 'ERROR' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <GroupBySelector
          options={logOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={onAttributeChange}
          filters={activeFilters}
          fieldLabel="Group logs by"
          selectPlaceholder="Select log attribute"
          {...createDefaultGroupBySelectorConfig('logs')}
        />
      </div>

      <ConfigurationDisplay domain="logs" />
    </div>
  );
};

const MetricsExample: React.FC<{
  selectedAttribute: string;
  onAttributeChange: (attribute: string, ignore?: boolean) => void;
}> = ({ selectedAttribute, onAttributeChange }) => {
  const metricOptions: Array<SelectableValue<string>> = [
    { label: 'Job', value: 'job' },
    { label: 'Instance', value: 'instance' },
    { label: 'Service Name', value: 'resource.service.name' },
    { label: 'Environment', value: 'resource.deployment.environment' },
    { label: 'HTTP Method', value: 'method' },
    { label: 'HTTP Status Code', value: 'status_code' },
    { label: 'Handler', value: 'handler' },
    { label: 'Metric Name', value: '__name__' }, // Will be ignored
  ];

  const radioAttributes = [
    'job',
    'instance',
    'method',
    'status_code',
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <GroupBySelector
          options={metricOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={onAttributeChange}
          fieldLabel="Group metrics by"
          selectPlaceholder="Select metric label"
          {...createDefaultGroupBySelectorConfig('metrics')}
        />
      </div>

      <ConfigurationDisplay domain="metrics" />
    </div>
  );
};

const CustomExample: React.FC<{
  selectedAttribute: string;
  onAttributeChange: (attribute: string, ignore?: boolean) => void;
}> = ({ selectedAttribute, onAttributeChange }) => {
  const customOptions: Array<SelectableValue<string>> = [
    { label: 'Business Unit', value: 'business.unit' },
    { label: 'Team', value: 'business.team' },
    { label: 'Application', value: 'app.name' },
    { label: 'Component', value: 'app.component' },
    { label: 'Feature Flag', value: 'feature.flag' },
    { label: 'User Type', value: 'user.type' },
    { label: 'Region', value: 'geo.region' },
  ];

  const radioAttributes = [
    'business.unit',
    'app.name',
    'user.type',
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4>Custom Domain with Business Logic</h4>
        <GroupBySelector
          options={customOptions}
          radioAttributes={radioAttributes}
          value={selectedAttribute}
          onChange={onAttributeChange}
          fieldLabel="Group by business dimension"
          selectPlaceholder="Select business attribute"
          attributePrefixes={{
            business: 'business.',
            app: 'app.',
            user: 'user.',
            geo: 'geo.',
            feature: 'feature.',
          }}
          filteringRules={{
            excludeFilteredFromRadio: true,
            customAttributeFilter: (attribute: string, context: any) => {
              // Custom business logic: exclude sensitive attributes in production
              if (context.filters.some((f: any) => f.key === 'environment' && f.value === 'production')) {
                return !['user.type', 'feature.flag'].includes(attribute);
              }
              return true;
            },
          }}
          ignoredAttributes={['internal.id', 'debug.info']}
          layoutConfig={{
            additionalWidthPerItem: 60, // More space for business terms
            widthOfOtherAttributes: 220,
            enableResponsiveRadioButtons: true,
          }}
          searchConfig={{
            enabled: true,
            maxOptions: 50, // Smaller list for focused business attributes
            caseSensitive: false,
          }}
        />
      </div>

      <ConfigurationDisplay domain="custom" />
    </div>
  );
};

const ConfigurationDisplay: React.FC<{ domain: DomainType }> = ({ domain }) => {
  const config = createDefaultGroupBySelectorConfig(domain);

  return (
    <details style={{ marginTop: '10px' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
        View {domain} configuration
      </summary>
      <pre style={{
        backgroundColor: '#f6f8fa',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '12px',
        overflow: 'auto'
      }}>
        {JSON.stringify(config, null, 2)}
      </pre>
    </details>
  );
};

const ConfigurationComparison: React.FC = () => {
  const domains: DomainType[] = ['traces', 'logs', 'metrics', 'custom'];
  const configs = domains.map(domain => ({
    domain,
    config: createDefaultGroupBySelectorConfig(domain)
  }));

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Feature</th>
            {domains.map(domain => (
              <th key={domain} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                {domain.charAt(0).toUpperCase() + domain.slice(1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Prefixes</td>
            {configs.map(({ domain, config }) => (
              <td key={domain} style={{ border: '1px solid #ddd', padding: '8px' }}>
                {Object.keys(config.attributePrefixes || {}).join(', ') || 'None'}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Ignored Count</td>
            {configs.map(({ domain, config }) => (
              <td key={domain} style={{ border: '1px solid #ddd', padding: '8px' }}>
                {config.ignoredAttributes?.length || 0}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Filter Rules</td>
            {configs.map(({ domain, config }) => (
              <td key={domain} style={{ border: '1px solid #ddd', padding: '8px' }}>
                {config.filteringRules?.excludeFilteredFromRadio ? '✓' : '✗'} Exclude Filtered
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Max Options</td>
            {configs.map(({ domain, config }) => (
              <td key={domain} style={{ border: '1px solid #ddd', padding: '8px' }}>
                {config.searchConfig?.maxOptions || 'N/A'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DomainExamples;
