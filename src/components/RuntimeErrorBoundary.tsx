import { Component, Fragment } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { stateManager } from '../core/stateManager';
import { downloadSaveText } from './recovery/saveFile';

interface RuntimeErrorBoundaryProps {
  children: ReactNode;
  onExportSave?: () => void;
}

interface RuntimeErrorBoundaryState {
  error: Error | null;
  retryKey: number;
  exportFeedback: string;
}

function stamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Catches React render/lifecycle failures while leaving the persistent save untouched. */
export class RuntimeErrorBoundary extends Component<RuntimeErrorBoundaryProps, RuntimeErrorBoundaryState> {
  state: RuntimeErrorBoundaryState = { error: null, retryKey: 0, exportFeedback: '' };

  static getDerivedStateFromError(error: Error): Partial<RuntimeErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('暗潮界面渲染异常', error, info.componentStack);
  }

  private retry = () => this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));

  private exportSave = () => {
    try {
      if (this.props.onExportSave) {
        this.props.onExportSave();
        this.setState({ exportFeedback: '导出操作已开始。' });
        return;
      }
      let allDownloadsStarted = downloadSaveText(stateManager.exportSave(), `暗潮-调查记录-${stamp()}.json`);
      const original = stateManager.exportOriginalSave();
      if (original) allDownloadsStarted = downloadSaveText(original, `暗潮-原始调查记录-${stamp()}.json`) && allDownloadsStarted;
      const protectedOriginal = stateManager.exportProtectedOriginalSave();
      if (protectedOriginal && protectedOriginal !== original) {
        allDownloadsStarted = downloadSaveText(protectedOriginal, `暗潮-已保留原始记录-${stamp()}.json`) && allDownloadsStarted;
      }
      this.setState({ exportFeedback: allDownloadsStarted ? '调查记录副本已开始下载。' : '暂时无法导出调查记录，请稍后再试。' });
    } catch (error) {
      console.error('导出调查记录失败', error);
      this.setState({ exportFeedback: '暂时无法导出调查记录，请稍后再试。' });
    }
  };

  render() {
    if (!this.state.error) return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
    return <main role="alert" aria-labelledby="runtime-error-title" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 12, padding: 24, color: '#20242b', background: '#f4f5f6', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ width: 'min(560px, 100%)', padding: 24, border: '1px solid #d3d8df', borderRadius: 12, background: '#fff', boxShadow: '0 16px 48px rgb(0 0 0 / 12%)' }}>
        <h1 id="runtime-error-title" style={{ marginTop: 0 }}>界面暂时没有显示出来</h1>
        <p>这次界面异常不会清空现有进度。你可以导出当前记录作为副本，或重新尝试显示界面。</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={this.exportSave}>导出调查记录</button>
          <button type="button" onClick={this.retry}>重新尝试</button>
        </div>
        {this.state.exportFeedback && <p role="status" aria-live="polite">{this.state.exportFeedback}</p>}
      </section>
    </main>;
  }
}
