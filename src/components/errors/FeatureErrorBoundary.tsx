"use client";

import { Component, type ReactNode } from "react";

import { ShellError } from "@/components/shell";
import type { GlowFeatureArea } from "@/lib/monitoring/feature-areas";
import { reportUnexpectedException } from "@/lib/monitoring/report-error";

type FeatureErrorBoundaryProps = {
  children: ReactNode;
  featureArea: GlowFeatureArea;
  title?: string;
  message?: string;
};

type FeatureErrorBoundaryState = {
  error: Error | null;
};

export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  state: FeatureErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    reportUnexpectedException(error, {
      featureArea: this.props.featureArea,
      route:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ShellError
          title={this.props.title}
          message={this.props.message}
          reset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
