import { usePluginComponent as realUsePluginComponent } from '@grafana/runtime';

export function usePluginComponent<T extends object>(
  id: string
): {
  isLoading: boolean;
  component: React.ComponentType<T> | null | undefined;
} {
  if (realUsePluginComponent) {
    return realUsePluginComponent<T>(id);
  } else {
    return { isLoading: false, component: null };
  }
}
