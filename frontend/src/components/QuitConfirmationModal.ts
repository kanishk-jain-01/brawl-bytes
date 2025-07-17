export interface QuitConfirmationModalOptions {
  isInMatch?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export class QuitConfirmationModal {
  private container: HTMLDivElement | null = null;

  private options: QuitConfirmationModalOptions;

  constructor(options: QuitConfirmationModalOptions) {
    this.options = options;
  }

  show(): void {
    this.hide(); // Ensure we don't duplicate

    const { isInMatch = false, onConfirm, onCancel } = this.options;

    const title = isInMatch ? 'Quit Match?' : 'Leave Room?';
    const message = isInMatch
      ? 'Are you sure you want to quit the match? This will count as a forfeit and you will lose rating points.'
      : 'Are you sure you want to leave the room?';

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      color: #fff;
      font-family: Arial, sans-serif;
      text-align: center;
    `;

    // Create title
    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: bold;
    `;

    // Create message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin: 0 0 24px 0;
      color: #ccc;
      line-height: 1.5;
    `;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // Create confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = isInMatch ? 'Yes, Quit Match' : 'Yes, Leave';
    confirmBtn.style.cssText = `
      padding: 12px 24px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: background-color 0.2s;
    `;
    confirmBtn.onmouseover = () => {
      confirmBtn.style.background = '#c82333';
    };
    confirmBtn.onmouseout = () => {
      confirmBtn.style.background = '#dc3545';
    };

    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 12px 24px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: background-color 0.2s;
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = '#5a6268';
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = '#6c757d';
    };

    // Event handlers
    confirmBtn.onclick = () => {
      this.hide();
      onConfirm();
    };

    cancelBtn.onclick = () => {
      this.hide();
      onCancel();
    };

    backdrop.onclick = e => {
      if (e.target === backdrop) {
        this.hide();
        onCancel();
      }
    };

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Store reference for cleanup
    (backdrop as any).handleEscape = handleEscape;

    // Assemble modal
    buttonContainer.appendChild(confirmBtn);
    buttonContainer.appendChild(cancelBtn);
    modal.appendChild(titleEl);
    modal.appendChild(messageEl);
    modal.appendChild(buttonContainer);
    backdrop.appendChild(modal);

    // Add to DOM
    document.body.appendChild(backdrop);
    this.container = backdrop;
  }

  hide(): void {
    if (this.container) {
      // Cleanup escape handler
      const { handleEscape } = this.container as any;
      if (handleEscape) {
        document.removeEventListener('keydown', handleEscape);
      }

      document.body.removeChild(this.container);
      this.container = null;
    }
  }

  isVisible(): boolean {
    return this.container !== null;
  }
}
