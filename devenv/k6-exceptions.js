import { sleep } from 'k6';
import tracing from 'k6/x/tracing';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  vus: 1,
  duration: '12h',
};

const endpoint = __ENV.ENDPOINT || 'tempo:4317';
const client = new tracing.Client({
  endpoint,
  exporter: tracing.EXPORTER_OTLP,
  tls: {
    insecure: true,
  },
});

// Status must be >= 500 so the templated generator marks the span as an error.
// The Exceptions tab only selects spans where status = error.
function errorSpan(service, name, exception) {
  return {
    defaults: {
      attributeSemantics: tracing.SEMANTICS_HTTP,
      resource: { attributes: { namespace: 'shop' } },
    },
    spans: [
      {
        service,
        name,
        attributes: { 'http.status_code': 500 },
        events: [
          {
            name: 'exception',
            attributes: {
              'exception.type': exception.type,
              'exception.message': exception.message,
              'exception.stacktrace': exception.stacktrace,
              'exception.escaped': true,
            },
          },
        ],
      },
    ],
  };
}

const traceTemplates = [
  errorSpan('checkout-service', 'charge-card', {
    type: 'PaymentDeclinedError',
    message: 'card was declined by the issuer',
    stacktrace: [
      'PaymentDeclinedError: card was declined by the issuer',
      '    at chargeCard (checkout.js:88:11)',
      '    at processPayment (checkout.js:41:5)',
      '    at Checkout.handleSubmit (checkout.js:19:3)',
    ].join('\n'),
  }),
  errorSpan('article-service', 'select-articles', {
    type: 'QueryError',
    message: 'database connection failed: connection refused',
    stacktrace: [
      'QueryError: database connection failed: connection refused',
      '    at Client.query (pg/client.js:526:17)',
      '    at selectArticles (articles.js:64:20)',
      '    at listArticles (articles.js:22:12)',
    ].join('\n'),
  }),
  errorSpan('auth-service', 'authenticate', {
    type: 'TypeError',
    message: "Cannot read properties of undefined (reading 'token')",
    stacktrace: [
      "TypeError: Cannot read properties of undefined (reading 'token')",
      '    at verifySession (auth.js:73:29)',
      '    at authenticate (auth.js:31:16)',
      '    at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)',
    ].join('\n'),
  }),
  errorSpan('billing-service', 'payment', {
    type: 'TimeoutError',
    message: 'upstream timed out after 3000ms',
    stacktrace: [
      'TimeoutError: upstream timed out after 3000ms',
      '    at Gateway.request (billing/gateway.js:112:15)',
      '    at collectPayment (billing/payment.js:47:18)',
      '    at async Billing.charge (billing/payment.js:21:5)',
    ].join('\n'),
  }),
];

export default function () {
  for (const template of traceTemplates) {
    const gen = new tracing.TemplatedGenerator(template);
    client.push(gen.traces());
  }

  sleep(randomIntBetween(1, 3));
}

export function teardown() {
  client.shutdown();
}
