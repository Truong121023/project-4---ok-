import { Component } from "react";
import { Link } from "react-router-dom";
import { ui } from "../ui";

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }

  componentDidCatch(error) {
    console.error("RouteErrorBoundary caught an error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className={ui.page}>
          <section className={`${ui.panel} text-center`}>
            <p className={ui.eyebrow}>Route error</p>
            <h1 className="mx-auto max-w-[14ch] text-4xl font-bold leading-none tracking-tight text-tea-900 sm:text-5xl">
              This page hit an error while rendering.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
              {this.state.message}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                className={ui.secondaryButton}
                type="button"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
              <Link className={ui.primaryButton} to="/">
                Back to home
              </Link>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
