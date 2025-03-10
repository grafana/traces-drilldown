# Grafana Traces Drilldown

Use Rate, Errors, and Duration (RED) metrics derived from traces to investigate and understand errors and latency issues within complex distributed systems.

We love accepting contributions!
If your change is minor, please feel free submit
a [pull request](https://help.github.com/articles/about-pull-requests/).
If your change is larger, or adds a feature, please file an issue beforehand so
that we can discuss the change. You're welcome to file an implementation pull
request immediately as well, although we generally lean towards discussing the
change and then reviewing the implementation separately.

## Contribute to documentation

Have a great new feature you want to contribute? Add docs for it!
Find something missing in the docs? Update the docs!

Use the [Writer's Toolkit](https://grafana.com/docs/writers-toolkit/writing-guide/contribute-documentation/) for information on creating good documentation.
The toolkit also provides [document templates](https://github.com/grafana/writers-toolkit/tree/main/docs/static/templates) to help get started.

When you create a PR for documentation, add the `type/doc` label to identify the PR as contributing documentation.

To preview the documentation locally, run `make docs` from the root folder of the Explore Traces repository. This uses
the `grafana/docs` image which internally uses Hugo to generate the static site. The site is available on `localhost:3002/docs/`.

> **Note** The `make docs` command uses a lot of memory. If it is crashing, make sure to increase the memory allocated to Docker
> and try again.
