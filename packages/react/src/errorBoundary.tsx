import { Component, type ReactNode } from "react";

export interface RemoteErrorBoundaryProps {
  /** Rendered when a child throws. A function receives the error. */
  fallback?: ReactNode | ((error: Error) => ReactNode);
  /** Called once when an error is caught (logging, telemetry). */
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** A minimal error boundary used to contain remote load/render failures. */
export class RemoteErrorBoundary extends Component<RemoteErrorBoundaryProps, State> {
  constructor(props: RemoteErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(error);
  }

  override render(): ReactNode {
    if (this.state.error) {
      const fb = this.props.fallback;
      return typeof fb === "function" ? fb(this.state.error) : (fb ?? null);
    }
    return this.props.children;
  }
}
