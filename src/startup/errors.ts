export type StartupErrorKind = 'network' | 'timeout' | 'http' | 'integrity' | 'manifest' | 'version' | 'entry';

export class StartupLoadError extends Error {
  constructor(public readonly kind: StartupErrorKind, public readonly path: string, message: string, public readonly status?: number) {
    super(message);
    this.name = 'StartupLoadError';
  }
}
export class StartupVersionError extends StartupLoadError {
  constructor() { super('version', 'anchao-preload-manifest.json', 'Page version changed'); }
}

export function loadError(error: unknown, path: string): StartupLoadError {
  return error instanceof StartupLoadError ? error : new StartupLoadError('network', path, 'Connection interrupted');
}

export function describeStartupError(error: StartupLoadError): string {
  let path = error.path;
  try { path = decodeURIComponent(path); } catch { /* Retain a safe relative filename. */ }
  path = path.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240);
  const reason = {
    network: '网络连接中断', timeout: '连续60秒未收到数据，连接已超时', http: `服务器返回 HTTP ${error.status ?? 0}`,
    integrity: '资源版本或文件内容不一致，大小或 SHA-256 校验未通过',
    manifest: '资源清单格式无效或文件信息不完整', version: '页面与资源清单版本不同，需要刷新页面',
    entry: '入口脚本或样式未能完整加载，需要刷新页面',
  }[error.kind];
  return `${reason}。文件：${path}`;
}
