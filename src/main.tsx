import React from "react";
import ReactDOM from "react-dom/client";
import { Component, ErrorInfo, ReactNode } from "react";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur d’affichage Vidéor", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error">
          <div>
            <span>ERREUR D’AFFICHAGE</span>
            <h1>Vidéor a rencontré un problème</h1>
            <p>{this.state.error.message}</p>
            <button onClick={() => window.location.reload()}>
              Recharger l’application
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
