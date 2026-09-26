import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-screen">
          <h1>Knowledge Portal could not load</h1>
          <p>{this.state.error.message}</p>
          <button
            className="primary"
            onClick={() => {
              localStorage.removeItem("taskiq-user");
              localStorage.removeItem("taskiq-token");
              window.location.reload();
            }}
          >
            Reset session
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
