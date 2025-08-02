// ==UserScript==
// @name         SIAM章节PDF批量下载-章节名命名-延时下载+aria2c批量命令
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  批量下载PDF并自动用章节名命名，支持延时间隔+导出aria2c脚本（epubs-siam-org.ezp1.lib.umn.edu）
// @author       yorfir
// @match        *://epubs-siam-org.ezp1.lib.umn.edu/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 获取所有“PDF”按钮
    let pdfBtns = Array.from(document.querySelectorAll('a,button')).filter(
        el => el.textContent.trim().toUpperCase() === 'PDF' || /pdf/i.test(el.textContent)
    );

    // 保存 章节名-PDF直链
    let chapterPdfPairs = [];

    pdfBtns.forEach(pdfBtn => {
        // 向上查找对应章节标题
        let section = pdfBtn.closest('div,li,tr');
        let titleEl = null;

        if(section){
            titleEl = section.querySelector('b, strong, h2, h3, .chapter-title, .chapter, [role=heading]');
        }
        if(!titleEl && section){
            let prev = section.previousElementSibling;
            while(prev) {
                if(/chapter|front matter|section/i.test(prev.textContent)) {
                    titleEl = prev;
                    break;
                }
                prev = prev.previousElementSibling;
            }
        }
        if(!titleEl) {
            let cur = pdfBtn;
            for(let i=0;i<4;i++){
                cur = cur.parentElement;
                if(!cur) break;
                let h = cur.querySelector('b, strong, h2, h3, .chapter-title, .chapter, [role=heading]');
                if(h) { titleEl = h; break; }
            }
        }
        let title = titleEl ? titleEl.textContent.trim().replace(/\s+/g,' ') : '未知章节';

        // 获取PDF直链
        let pdfUrl = pdfBtn.href || pdfBtn.getAttribute('data-href') || '';
        if(!pdfUrl) return;

        if(/\/doi\/epdf\//.test(pdfUrl)){
            pdfUrl = pdfUrl.replace(/\/doi\/epdf\/([^?#]+)/i, '/doi/pdf/$1').replace(/([?#].*)?$/, '?download=true');
        }

        // 去重
        if(!chapterPdfPairs.some(x=>x.url === pdfUrl)){
            chapterPdfPairs.push({title, url: pdfUrl});
        }
    });

    if (chapterPdfPairs.length === 0) return;

    // 浮窗UI
    let container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '80px';
    container.style.right = '0';
    container.style.width = '410px';
    container.style.maxHeight = '62vh';
    container.style.overflowY = 'auto';
    container.style.background = 'rgba(255,255,255,0.97)';
    container.style.border = '1px solid #ccc';
    container.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    container.style.zIndex = '99999';
    container.style.padding = '18px 14px 16px 20px';
    container.style.fontSize = '14px';
    container.style.borderRadius = '8px 0 0 8px';

    let titleDiv = document.createElement('div');
    titleDiv.textContent = '章节名 + PDF 直链';
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.fontSize = '16px';
    titleDiv.style.marginBottom = '8px';
    titleDiv.style.textAlign = 'center';
    container.appendChild(titleDiv);

    let closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.color = '#888';
    closeBtn.title = '关闭';
    closeBtn.onclick = () => container.remove();
    container.appendChild(closeBtn);

    let btnBox = document.createElement('div');
    btnBox.style.display = 'flex';
    btnBox.style.justifyContent = 'center';
    btnBox.style.gap = '18px';
    btnBox.style.marginBottom = '10px';

    // 合法化文件名：去除特殊字符、过长截断
    function safeFileName(str) {
        return str.replace(/[\\\/:*?"<>|]/g,'_').replace(/\s+/g,'_').substring(0,80);
    }

    // 延时函数
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 批量下载（支持间隔下载，默认700ms，可自行调整）
    let dlBtn = document.createElement('button');
    dlBtn.textContent = '批量延时下载所有PDF';
    dlBtn.style.background = '#2176ff';
    dlBtn.style.color = '#fff';
    dlBtn.style.border = 'none';
    dlBtn.style.borderRadius = '5px';
    dlBtn.style.padding = '6px 18px';
    dlBtn.style.fontWeight = 'bold';
    dlBtn.style.cursor = 'pointer';
    dlBtn.onmouseover = () => dlBtn.style.background = '#175ac8';
    dlBtn.onmouseout = () => dlBtn.style.background = '#2176ff';

    dlBtn.onclick = async () => {
        dlBtn.disabled = true;
        dlBtn.textContent = '下载中...';
        for (let i = 0; i < chapterPdfPairs.length; i++) {
            let pair = chapterPdfPairs[i];
            let num = String(i+1).padStart(2,'0');
            let a = document.createElement('a');
            a.href = pair.url;
            a.download = num + '_' + safeFileName(pair.title) + '.pdf';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 3000);
            await sleep(700); // 每次间隔 700 毫秒，酌情调整
        }
        dlBtn.textContent = '批量延时下载所有PDF';
        dlBtn.disabled = false;
    };
    btnBox.appendChild(dlBtn);

    // 复制全部
    let copyBtn = document.createElement('button');
    copyBtn.textContent = '一键复制全部（章节名+直链）';
    copyBtn.style.background = '#12b886';
    copyBtn.style.color = '#fff';
    copyBtn.style.border = 'none';
    copyBtn.style.borderRadius = '5px';
    copyBtn.style.padding = '6px 18px';
    copyBtn.style.fontWeight = 'bold';
    copyBtn.style.cursor = 'pointer';
    copyBtn.onmouseover = () => copyBtn.style.background = '#098b5c';
    copyBtn.onmouseout = () => copyBtn.style.background = '#12b886';

    copyBtn.onclick = () => {
        let allText = chapterPdfPairs.map((x,i)=>{
            let num = String(i+1).padStart(2,'0');
            return `${num}_${safeFileName(x.title)}.pdf\n${x.url}`;
        }).join('\n\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(allText).then(() => {
                copyBtn.textContent = '已复制!';
                setTimeout(()=>copyBtn.textContent='一键复制全部（章节名+直链）', 1200);
            }, () => {
                window.prompt('复制失败，请手动复制：', allText);
            });
        } else {
            window.prompt('请手动复制全部内容：', allText);
        }
    };
    btnBox.appendChild(copyBtn);

    // 增加导出 aria2c 脚本按钮
    let aria2Btn = document.createElement('button');
    aria2Btn.textContent = '导出 aria2c 批量脚本';
    aria2Btn.style.background = '#ff9500';
    aria2Btn.style.color = '#fff';
    aria2Btn.style.border = 'none';
    aria2Btn.style.borderRadius = '5px';
    aria2Btn.style.padding = '6px 18px';
    aria2Btn.style.fontWeight = 'bold';
    aria2Btn.style.cursor = 'pointer';
    aria2Btn.onmouseover = () => aria2Btn.style.background = '#d97d00';
    aria2Btn.onmouseout = () => aria2Btn.style.background = '#ff9500';

    aria2Btn.onclick = () => {
        let aria2cmds = chapterPdfPairs.map((x, i) => {
            let num = String(i+1).padStart(2, '0');
            let fname = `${num}_${safeFileName(x.title)}.pdf`;
            return `aria2c -c -s 16 -x 16 -o "${fname}" "${x.url}"`;
        }).join('\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(aria2cmds).then(() => {
                aria2Btn.textContent = '已复制!';
                setTimeout(()=>aria2Btn.textContent='导出 aria2c 批量脚本', 1200);
            }, () => {
                window.prompt('复制失败，请手动复制：', aria2cmds);
            });
        } else {
            window.prompt('请手动复制aria2c批量命令：', aria2cmds);
        }
    };
    btnBox.appendChild(aria2Btn);

    container.appendChild(btnBox);

    // 展示列表
    chapterPdfPairs.forEach((pair,i) => {
        let item = document.createElement('div');
        item.style.marginBottom = '10px';
        item.style.borderBottom = '1px solid #ececec';

        let titleSpan = document.createElement('span');
        let num = String(i+1).padStart(2,'0');
        titleSpan.textContent = num + '_' + pair.title;
        titleSpan.style.fontWeight = 'bold';
        titleSpan.style.marginRight = '10px';
        item.appendChild(titleSpan);

        let link = document.createElement('a');
        link.href = pair.url;
        link.textContent = '[PDF直链]';
        link.target = '_blank';
        link.style.color = '#d06';
        link.style.textDecoration = 'underline';
        link.style.wordBreak = 'break-all';
        link.style.marginLeft = '6px';
        link.title = pair.title;

        item.appendChild(link);

        container.appendChild(item);
    });

    document.body.appendChild(container);
})();
