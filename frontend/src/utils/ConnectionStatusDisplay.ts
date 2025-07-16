import { ConnectionState, ConnectionStatus, ReconnectionInfo } from './socket';

export interface ConnectionStatusDisplayConfig {
  container?: HTMLElement;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoHide?: boolean;
  autoHideDelay?: number;
  showOnlyOnProblems?: boolean;
}

export class ConnectionStatusDisplay {
  private config: Required<ConnectionStatusDisplayConfig>;

  private statusElement: HTMLElement | null = null;

  private autoHideTimeout: NodeJS.Timeout | null = null;

  // private currentStatus: ConnectionStatus | null = null; // Unused for now

  constructor(config: ConnectionStatusDisplayConfig = {}) {
    this.config = {
      container: config.container || document.body,
      position: config.position || 'top-right',
      autoHide: config.autoHide ?? true,
      autoHideDelay: config.autoHideDelay || 5000,
      showOnlyOnProblems: config.showOnlyOnProblems || false,
    };

    this.createStatusElement();
  }

  private createStatusElement(): void {
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'connection-status-display';
    this.statusElement.style.cssText = this.getBaseStyles();
    this.statusElement.style.display = 'none';

    this.config.container.appendChild(this.statusElement);
  }

  private getBaseStyles(): string {
    const position = this.config.position;
    let positionStyles = '';

    switch (position) {
      case 'top-left':
        positionStyles = 'top: 20px; left: 20px;';
        break;
      case 'top-right':
        positionStyles = 'top: 20px; right: 20px;';
        break;
      case 'bottom-left':
        positionStyles = 'bottom: 20px; left: 20px;';
        break;
      case 'bottom-right':
        positionStyles = 'bottom: 20px; right: 20px;';
        break;
    }

    return `
      position: fixed;
      ${positionStyles}
      z-index: 10000;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      max-width: 300px;
      min-width: 200px;
    `;
  }

  public updateStatus(status: ConnectionStatus): void {
    // this.currentStatus = status; // Store for potential future use

    if (!this.statusElement) {
      return;
    }

    // Clear auto-hide timeout
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }

    const shouldShow = this.shouldShowStatus(status);

    if (!shouldShow) {
      this.hide();
      return;
    }

    this.updateContent(status);
    this.updateStyles(status);
    this.show();

    // Set auto-hide if enabled
    if (this.config.autoHide && this.isSuccessState(status)) {
      this.autoHideTimeout = setTimeout(() => {
        this.hide();
      }, this.config.autoHideDelay);
    }
  }

  private shouldShowStatus(status: ConnectionStatus): boolean {
    if (this.config.showOnlyOnProblems) {
      return (
        status.state === ConnectionState.DISCONNECTED ||
        status.state === ConnectionState.ERROR ||
        status.state === ConnectionState.CONNECTING ||
        Boolean(status.reconnectionInfo && status.reconnectionInfo.isReconnecting)
      );
    }

    return true;
  }

  private isSuccessState(status: ConnectionStatus): boolean {
    return (
      status.state === ConnectionState.CONNECTED ||
      status.state === ConnectionState.AUTHENTICATED
    );
  }

  private updateContent(status: ConnectionStatus): void {
    if (!this.statusElement) return;

    const content = this.generateContent(status);
    this.statusElement.innerHTML = content;
  }

  private generateContent(status: ConnectionStatus): string {
    const { state, reconnectionInfo } = status;

    let title = '';
    let message = '';
    let icon = '';

    switch (state) {
      case ConnectionState.CONNECTING:
        icon = '🔄';
        title = 'Connecting...';
        message = 'Establishing connection to game server';
        break;

      case ConnectionState.CONNECTED:
        icon = '✅';
        title = 'Connected';
        message = 'Connected to game server';
        break;

      case ConnectionState.AUTHENTICATED:
        icon = '🎮';
        title = 'Ready to Play';
        message = `Connected and authenticated${
          status.metrics.connectionQuality !== 'excellent'
            ? ` (${status.metrics.connectionQuality} connection)`
            : ''
        }`;
        break;

      case ConnectionState.DISCONNECTED:
        icon = '⚠️';
        title = 'Disconnected';
        message = reconnectionInfo?.isReconnecting
          ? this.getReconnectionMessage(reconnectionInfo)
          : 'Connection lost. Attempting to reconnect...';
        break;

      case ConnectionState.ERROR:
        icon = '❌';
        title = 'Connection Failed';
        message =
          status.lastDisconnectReason === 'RECONNECT_FAILED'
            ? 'Unable to reconnect. Please refresh the page.'
            : 'Connection error. Please check your internet connection.';
        break;
    }

    return `
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
        <strong>${title}</strong>
      </div>
      <div style="color: rgba(255, 255, 255, 0.9); line-height: 1.4;">
        ${message}
      </div>
      ${this.generateProgressBar(reconnectionInfo)}
      ${this.generateMetrics(status)}
    `;
  }

  private getReconnectionMessage(info: ReconnectionInfo): string {
    const nextAttemptSeconds = Math.ceil(info.nextAttemptIn / 1000);
    const downtimeSeconds = Math.ceil(info.totalDowntime / 1000);

    return `
      Reconnecting... (${info.attempt}/${info.maxAttempts})<br>
      <small>Next attempt in ${nextAttemptSeconds}s • Downtime: ${downtimeSeconds}s</small>
    `;
  }

  private generateProgressBar(info: ReconnectionInfo | undefined): string {
    if (!info || !info.isReconnecting) {
      return '';
    }

    const progress = (info.attempt / info.maxAttempts) * 100;

    return `
      <div style="margin-top: 8px;">
        <div style="background: rgba(255, 255, 255, 0.2); height: 4px; border-radius: 2px; overflow: hidden;">
          <div style="background: #4CAF50; height: 100%; width: ${progress}%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }

  private generateMetrics(status: ConnectionStatus): string {
    if (
      status.state !== ConnectionState.AUTHENTICATED ||
      !status.metrics.latency
    ) {
      return '';
    }

    const { latency, connectionQuality } = status.metrics;
    const qualityColor = this.getQualityColor(connectionQuality);

    return `
      <div style="margin-top: 8px; font-size: 12px; color: rgba(255, 255, 255, 0.7);">
        Ping: ${latency}ms • 
        <span style="color: ${qualityColor};">${connectionQuality}</span>
      </div>
    `;
  }

  private getQualityColor(quality: string): string {
    switch (quality) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FFC107';
      case 'poor':
        return '#FF5722';
      default:
        return '#9E9E9E';
    }
  }

  private updateStyles(status: ConnectionStatus): void {
    if (!this.statusElement) return;

    let backgroundColor = '';
    let color = 'white';

    switch (status.state) {
      case ConnectionState.CONNECTING:
        backgroundColor = 'rgba(33, 150, 243, 0.9)';
        break;
      case ConnectionState.CONNECTED:
      case ConnectionState.AUTHENTICATED:
        backgroundColor = 'rgba(76, 175, 80, 0.9)';
        break;
      case ConnectionState.DISCONNECTED:
        backgroundColor = 'rgba(255, 152, 0, 0.9)';
        break;
      case ConnectionState.ERROR:
        backgroundColor = 'rgba(244, 67, 54, 0.9)';
        break;
    }

    this.statusElement.style.backgroundColor = backgroundColor;
    this.statusElement.style.color = color;
  }

  public show(): void {
    if (this.statusElement) {
      this.statusElement.style.display = 'block';
      // Trigger animation
      setTimeout(() => {
        if (this.statusElement) {
          this.statusElement.style.opacity = '1';
          this.statusElement.style.transform = 'translateY(0)';
        }
      }, 10);
    }
  }

  public hide(): void {
    if (this.statusElement) {
      this.statusElement.style.opacity = '0';
      this.statusElement.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (this.statusElement) {
          this.statusElement.style.display = 'none';
        }
      }, 300);
    }
  }

  public destroy(): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }

    if (this.statusElement && this.statusElement.parentNode) {
      this.statusElement.parentNode.removeChild(this.statusElement);
    }

    this.statusElement = null;
    // this.currentStatus = null;
  }

  public setConfig(newConfig: Partial<ConnectionStatusDisplayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Factory function for easy setup
export function createConnectionStatusDisplay(
  socketManager: any,
  config?: ConnectionStatusDisplayConfig
): ConnectionStatusDisplay {
  const display = new ConnectionStatusDisplay(config);

  // Set up automatic status updates
  const updateDisplay = () => {
    const status = socketManager.getConnectionStatus();
    display.updateStatus(status);
  };

  // Listen to socket events
  socketManager.addNotificationCallback('statusDisplay', updateDisplay);

  // Listen to connection state changes
  socketManager.on('connectionStateChanged', updateDisplay);
  socketManager.on('reconnecting', updateDisplay);
  socketManager.on('reconnected', updateDisplay);
  socketManager.on('reconnect_failed', updateDisplay);
  socketManager.on('connectionMetricsUpdated', updateDisplay);

  // Initial update
  updateDisplay();

  return display;
}