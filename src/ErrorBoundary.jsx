import React from 'react';
export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error(e, info); }
  render() {
    return this.state.error
      ? <pre style={{ padding:16, color:'red', whiteSpace:'pre-wrap' }}>{String(this.state.error)}</pre>
      : this.props.children;
  }
}
