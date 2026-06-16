/**
 * 构建后清理：删除 dist 中的调试/文档/敏感文件
 * 确保发布目录干净、安全
 */
import { readdirSync, statSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

// 要删除的目录名（递归删除整个目录）
const REMOVE_DIRS = ['.git', '.github', '.vscode', '.svn', '.hg'];
// 要删除的文件名（精确匹配，不区分大小写）
const REMOVE_FILES = ['.gitignore', '.gitmodules', '.gitattributes', '.editorconfig', '.npmrc', '.DS_Store', 'Thumbs.db'];
// 要删除的文件扩展名
const REMOVE_EXT = ['.map', '.gz', '.d.ts', '.d.cts', '.d.mts'];
// 要删除的文件名模式（不区分大小写）
const REMOVE_NAMES = ['CHANGELOG', 'CHANGELOG.md', 'LICENSE', 'LICENSE.txt', 'LICENSE-MIT', 'LICENSE-MIT.txt', 'README', 'README.md', 'History.md', 'HISTORY.md'];

let removed = 0;
let savedBytes = 0;

function clean(dir) {
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    const stat = statSync(fp);

    if (stat.isDirectory()) {
      // 删除敏感目录
      if (REMOVE_DIRS.includes(name)) {
        const size = dirSize(fp);
        rmSync(fp, { recursive: true, force: true });
        savedBytes += size;
        removed++;
        continue;
      }
      // 递归清理子目录
      clean(fp);
    } else {
      const lower = name.toLowerCase();
      const shouldRemove =
        REMOVE_FILES.some(f => f.toLowerCase() === lower) ||
        REMOVE_EXT.some(ext => lower.endsWith(ext)) ||
        REMOVE_NAMES.some(n => n.toLowerCase() === lower);
      if (shouldRemove) {
        savedBytes += stat.size;
        unlinkSync(fp);
        removed++;
      }
    }
  }
}

function dirSize(dir) {
  let size = 0;
  for (const name of readdirSync(dir)) {
    const fp = join(dir, name);
    const stat = statSync(fp);
    size += stat.isDirectory() ? dirSize(fp) : stat.size;
  }
  return size;
}

clean(DIST);
console.log(`✓ 已清理 ${removed} 项，释放 ${(savedBytes / 1024).toFixed(1)} KB`);
