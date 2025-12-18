import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // También puedes registrar el error en un servicio de reporte de errores
    console.error("Error capturado por el Airbag:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier interfaz de repuesto personalizada
      return (
        <div style={{ padding: '20px', backgroundColor: 'black', color: 'red', height: '100vh', overflow: 'auto' }}>
          <h1>💀 La App Crasheó</h1>
          <h3>Error:</h3>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <h3>Detalles:</h3>
          <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;