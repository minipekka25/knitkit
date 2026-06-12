import { Suspense, type ComponentType, type ReactElement, type ReactNode } from "react";
import { lazyRemote } from "./lazyRemote.js";
import { RemoteErrorBoundary } from "./errorBoundary.js";

export interface RemoteComponentProps {
  /** "<remoteName>/<exposeKey>", e.g. "checkout/CartWidget". */
  name: string;
  /** Rendered while the remote module loads. */
  fallback?: ReactNode;
  /** Rendered if loading or rendering the remote fails. A function receives the error. */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Called when an error is caught. */
  onError?: (error: Error) => void;
  /** Any other props are forwarded to the remote component. */
  [key: string]: unknown;
}

/**
 * Load and render a federated remote component by name, with Suspense and an error
 * boundary wired up. The remote's exposed module must default-export a React component.
 *
 * ```tsx
 * <RemoteComponent name="checkout/CartWidget" fallback={<Spinner />} sku="ABC" />
 * ```
 */
export function RemoteComponent(props: RemoteComponentProps): ReactElement {
  const { name, fallback = null, errorFallback = null, onError, ...rest } = props;
  const Lazy = lazyRemote(name) as ComponentType<Record<string, unknown>>;
  return (
    <RemoteErrorBoundary fallback={errorFallback} onError={onError}>
      <Suspense fallback={fallback}>
        <Lazy {...rest} />
      </Suspense>
    </RemoteErrorBoundary>
  );
}
