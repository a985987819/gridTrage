import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界: 捕获渲染异常, 防止白屏
 * 任何子组件渲染时抛出异常都会被捕获, 显示友好的错误界面
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 渲染异常:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // 刷新页面以确保彻底恢复
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] p-6">
          <div className="bg-white rounded-[12px] shadow-lg p-8 max-w-[480px] w-full text-center">
            <div className="text-4xl mb-4">⚠</div>
            <h1 className="text-xl font-semibold text-[#2c3e50] mb-3">
              应用出现异常
            </h1>
            <p className="text-sm text-[#666] mb-4">
              渲染过程中发生了未预期的错误，请尝试刷新页面恢复。
            </p>
            {this.state.error && (
              <pre className="bg-[#f8f9fa] rounded-[6px] p-3 text-left text-xs text-[#e74c3c] mb-4 overflow-auto max-h-[120px] whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="bg-[#3498db] text-white px-6 py-2 rounded-[6px] cursor-pointer text-sm hover:bg-[#2980b9] transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
