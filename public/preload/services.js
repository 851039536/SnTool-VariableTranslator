const fs = require('node:fs')
const path = require('node:path')
const archiver = require('archiver')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  // 压缩文件夹
  compressFolder (sourcePath, targetPath) {
    return new Promise((resolve, reject) => {
      try {
        // 获取源文件夹名称
        const folderName = path.basename(sourcePath)
        // 生成目标文件名：文件夹名-YYMMDD.zip
        const now = new Date()
        const dateStr = now.getFullYear().toString().slice(-2) + 
                        String(now.getMonth() + 1).padStart(2, '0') + 
                        String(now.getDate()).padStart(2, '0')
        const fileName = `${folderName}-${dateStr}.zip`
        const outputPath = path.join(targetPath, fileName)

        // 创建文件输出流
        const output = fs.createWriteStream(outputPath)
        const archive = archiver('zip', {
          zlib: { level: 9 } // 最高压缩级别
        })

        // 监听完成事件
        output.on('close', () => {
          resolve({
            success: true,
            fileName: fileName,
            path: outputPath,
            size: archive.pointer()
          })
        })

        // 监听错误事件
        archive.on('error', (err) => {
          reject({ success: false, error: err.message })
        })

        // 连接输出流
        archive.pipe(output)

        // 添加文件夹到压缩包（默认包含子目录）
        archive.directory(sourcePath, false)

        // 完成压缩
        archive.finalize()
      } catch (error) {
        reject({ success: false, error: error.message })
      }
    })
  },
  // 复制文件或文件夹
  copyFileOrFolder (sourcePath, targetPath) {
    return new Promise((resolve, reject) => {
      try {
        // 检查源路径是否存在
        if (!fs.existsSync(sourcePath)) {
          return reject({ success: false, error: '源路径不存在' })
        }

        // 获取源文件/文件夹名称
        const itemName = path.basename(sourcePath)
        const stats = fs.statSync(sourcePath)
        
        // 生成目标文件名：文件名-YYMMDD
        const now = new Date()
        const dateStr = now.getFullYear().toString().slice(-2) + 
                        String(now.getMonth() + 1).padStart(2, '0') + 
                        String(now.getDate()).padStart(2, '0')
        
        let finalName, destPath
        
        if (stats.isDirectory()) {
          // 文件夹：文件夹名-YYMMDD
          finalName = `${itemName}-${dateStr}`
          destPath = path.join(targetPath, finalName)
        } else {
          // 文件：保留扩展名
          const ext = path.extname(itemName)
          const nameWithoutExt = path.basename(itemName, ext)
          finalName = `${nameWithoutExt}-${dateStr}${ext}`
          destPath = path.join(targetPath, finalName)
        }

        // 处理目标路径已存在的情况
        let counter = 1
        let checkPath = destPath
        while (fs.existsSync(checkPath)) {
          if (stats.isDirectory()) {
            checkPath = path.join(targetPath, `${itemName}-${dateStr}(${counter})`)
          } else {
            const ext = path.extname(itemName)
            const nameWithoutExt = path.basename(itemName, ext)
            checkPath = path.join(targetPath, `${nameWithoutExt}-${dateStr}(${counter})${ext}`)
          }
          counter++
        }
        destPath = checkPath
        finalName = path.basename(destPath)

        // 递归复制函数
        const copyRecursive = (src, dest) => {
          const stat = fs.statSync(src)
          
          if (stat.isDirectory()) {
            // 创建目标文件夹
            if (!fs.existsSync(dest)) {
              fs.mkdirSync(dest, { recursive: true })
            }
            
            // 读取文件夹内容
            const items = fs.readdirSync(src)
            items.forEach(item => {
              const srcPath = path.join(src, item)
              const destPath = path.join(dest, item)
              copyRecursive(srcPath, destPath)
            })
          } else {
            // 复制文件
            fs.copyFileSync(src, dest)
          }
        }

        // 执行复制
        copyRecursive(sourcePath, destPath)

        resolve({
          success: true,
          name: finalName,
          path: destPath,
          type: stats.isDirectory() ? 'folder' : 'file'
        })
      } catch (error) {
        reject({ success: false, error: error.message })
      }
    })
  }
}

// uTools 插件功能配置
window.exports = {
  'translator': {
    mode: 'none',
    args: {
      enter: (action) => {
        // 将搜索框的文本传递给 Vue 组件
        if (action.payload) {
          window.translatorPayload = action.payload
        }
      }
    }
  }
}
