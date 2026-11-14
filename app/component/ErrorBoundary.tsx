'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** The last line of defence: a calm page instead of a blank one. */
export default class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.handleReset);

      return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-4 text-ink">
          <div className="grid w-full max-w-md gap-6">
            <p className="font-serif text-3xl font-medium italic tracking-tighter">
              Blackhand<span className="text-mute">.</span>
            </p>
            <div className="grid gap-3 border-t border-ink pt-4">
              <h1 className="font-sans text-3xl font-bold uppercase tracking-[-0.02em]">Terjadi kesalahan</h1>
              <p className="font-sans text-sm leading-relaxed text-mute">
                Halaman ini gagal ditampilkan. Coba lagi; kalau masih terjadi, kembali ke beranda dan hubungi kami.
              </p>
            </div>

            <details className="font-sans text-xs text-mute">
              <summary className="cursor-pointer py-2">Detail kesalahan</summary>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words border border-line bg-sheet p-3">
                {this.state.error.message}
              </pre>
            </details>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={this.handleReset}>Coba lagi</Button>
              <Button variant="secondary" href="/">
                Ke beranda
              </Button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
