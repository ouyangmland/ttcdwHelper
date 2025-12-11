// ==UserScript==
// @name         学习公社云自动播放
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  自动学习网课，完成未完成章节，支持3倍速播放
// @author       yantianyv
// @match        https://www.ttcdw.cn/p/uc/myClassroom/*
// @match        https://www.ttcdw.cn/p/course/videorevision/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getValues
// @grant        GM_openInTab
// @grant        window.close
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 初始化日志系统
    const log = (message, type = 'info') => {
        const timestamp = new Date().toLocaleString();
        const logEntry = `${timestamp} [${type}] ${message}`;
        console.log(logEntry);

        // 保存最近的100条日志
        const logs = GM_getValue('logs', []);
        logs.push(logEntry);
        if (logs.length > 100) logs.shift();
        GM_setValue('logs', logs);

        // 更新日志面板
        updateLogPanel(logEntry);
    };

    // 创建页面弹窗
    const showAlert = (message, type = 'error') => {
        const alertId = 'auto-learner-alert-' + Date.now();
        GM_addStyle(`
            #${alertId} {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 20px;
                background: ${type === 'error' ? '#ffebee' : '#e8f5e9'};
                color: ${type === 'error' ? '#c62828' : '#2e7d32'};
                border: 1px solid ${type === 'error' ? '#ef9a9a' : '#a5d6a7'};
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 99999;
                max-width: 80%;
                text-align: center;
            }
            /* 新增炫酷进度条样式 */
            .cool-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
                position: relative;
                overflow: hidden;
                transition: width 0.5s ease;
            }
            .cool-progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0) 0%,
                    rgba(255, 255, 255, 0.3) 50%,
                    rgba(255, 255, 255, 0) 100%
                );
                animation: shine 2s infinite;
            }
            @keyframes shine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            /* 倒计时样式 */
            .countdown {
                font-size: 24px;
                font-weight: bold;
                color: #FF5722;
                text-align: center;
                text-shadow: 0 0 5px rgba(255, 87, 34, 0.5);
                animation: pulse 1s infinite alternate;
            }
            @keyframes pulse {
                from { transform: scale(1); }
                to { transform: scale(1.1); }
            }
            /* 当前课程的进度条样式 */
            .current-course .el-progress-bar__inner {
                background: linear-gradient(90deg, #4CAF50, #8BC34A) !important;
                border-radius: 10px !important;
                box-shadow: 0 0 5px rgba(76, 175, 80, 0.5) !important;
                position: relative !important;
                overflow: hidden !important;
                transition: width 0.5s ease !important;
            }
            .current-course .el-progress-bar__inner::after {
                content: '' !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0) 0%,
                    rgba(255, 255, 255, 0.3) 50%,
                    rgba(255, 255, 255, 0) 100%
                ) !important;
                animation: shine 2s infinite !important;
            }
            #auto-learner-container {
                z-index: 99999;
            }
            #auto-learner-log-panel {
                background: rgba(0,0,0,0.85);
                color: #fff;
                font-family: 'Consolas', 'Monaco', monospace;
                padding: 10px;
                overflow: auto;
                border-radius: 5px;
                font-size: 12px;
                line-height: 1.5;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                max-height: 150px;
            }
            #auto-learner-log-toggle {
                padding: 5px;
                background: rgba(0,0,0,0.7);
                color: #fff;
                border-radius: 5px;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s ease;
            }
            #auto-learner-log-toggle:hover {
                background: rgba(0,0,0,0.8);
            }
            #auto-learner-log-panel::-webkit-scrollbar {
                width: 6px;
            }
            #auto-learner-log-panel::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }
            #auto-learner-log-panel::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.3);
                border-radius: 3px;
            }
            #auto-learner-log-panel::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.4);
            }
            /* 视频页面的日志容器样式 */
            #auto-learner-video-container {
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 99998;
                width: 320px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #auto-learner-video-log-panel {
                background: rgba(0,0,0,0.85);
                color: #fff;
                font-family: 'Consolas', 'Monaco', monospace;
                padding: 10px;
                overflow: auto;
                border-radius: 5px;
                font-size: 12px;
                line-height: 1.5;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                max-height: 150px;
                display: block !important;
            }
            #auto-learner-video-log-toggle {
                padding: 5px;
                background: rgba(0,0,0,0.7);
                color: #fff;
                border-radius: 5px;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s ease;
            }
            #auto-learner-video-log-toggle:hover {
                background: rgba(0,0,0,0.8);
            }
            #auto-learner-video-log-panel::-webkit-scrollbar {
                width: 6px;
            }
            #auto-learner-video-log-panel::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }
            #auto-learner-video-log-panel::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.3);
                border-radius: 3px;
            }
            #auto-learner-video-log-panel::-webkit-scrollbar-thumb:hover {
                background: rgba(255,255,255,0.4);
            }
        `);

        const alertDiv = document.createElement('div');
        alertDiv.id = alertId;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        // 5秒后自动消失
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);

        return alertDiv;
    };

    // 创建日志面板（课程列表页）
    const createLogPanel = () => {
        let panel = document.getElementById('auto-learner-log-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'auto-learner-log-panel';
            panel.style.display = 'none';
        }
        return panel;
    };

    // 创建视频页日志面板
    const createVideoLogPanel = () => {
        let panel = document.getElementById('auto-learner-video-log-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'auto-learner-video-log-panel';
            panel.style.display = 'block';
        }
        return panel;
    };

    // 更新日志面板
    const updateLogPanel = (message) => {
        let panel = document.getElementById('auto-learner-log-panel');
        if (!panel) {
            panel = createLogPanel();
        }
        panel.innerHTML += message + '<br>';
        panel.scrollTop = panel.scrollHeight;

        // 同时更新视频页日志面板（如果存在）
        let videoPanel = document.getElementById('auto-learner-video-log-panel');
        if (videoPanel) {
            videoPanel.innerHTML += message + '<br>';
            videoPanel.scrollTop = videoPanel.scrollHeight;
        }
    };

    // 工具函数：等待元素出现
    const waitForElement = (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    };

    // 工具函数：等待元素可点击
    const waitForClickableElement = (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                const element = document.querySelector(selector);
                if (element && !element.disabled && element.offsetParent !== null) {
                    resolve(element);
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Clickable element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    };

    // 工具函数：等待指定时间
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 工具函数：等待页面变化
    const waitForPageChange = (originalUrl, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (window.location.href !== originalUrl) {
                    resolve();
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error('页面未发生变化'));
                } else {
                    setTimeout(check, 200);
                }
            };
            check();
        });
    };

    // 工具函数：安全点击元素
    const safeClick = async (selector) => {
        const element = await waitForClickableElement(selector);
        element.click();
        return element;
    };

    // 从URL中提取用户ID
    const extractUserId = () => {
        // 从当前URL提取用户ID
        const url = window.location.href;
        const match = url.match(/\/p\/uc\/myClassroom\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }

        // 从iframe的src中提取
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.src) {
            const iframeMatch = iframe.src.match(/\/p\/uc\/myClassroom\/(\d+)/);
            if (iframeMatch && iframeMatch[1]) {
                return iframeMatch[1];
            }
        }

        // 从页面中的链接提取
        const links = document.querySelectorAll('a[href*="/p/uc/myClassroom/"]');
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href) {
                const linkMatch = href.match(/\/p\/uc\/myClassroom\/(\d+)/);
                if (linkMatch && linkMatch[1]) {
                    return linkMatch[1];
                }
            }
        }

        return null;
    };

    // 获取课程列表URL
    const getCourseListUrl = () => {
        // 首先尝试从GM存储中获取
        let courseListUrl = GM_getValue('courseListUrl', '');

        // 如果GM存储中没有，尝试从当前页面提取
        if (!courseListUrl) {
            const userId = extractUserId();
            if (userId) {
                courseListUrl = `https://www.ttcdw.cn/p/uc/myClassroom/${userId}`;
                GM_setValue('courseListUrl', courseListUrl);
                log(`提取到用户ID: ${userId}，课程列表URL: ${courseListUrl}`);
            } else {
                courseListUrl = 'https://www.ttcdw.cn/p/uc/myClassroom';
                log('无法提取用户ID，使用默认课程列表URL');
            }
        }

        return courseListUrl;
    };

    // 保存课程列表URL
    const saveCourseListUrl = () => {
        const userId = extractUserId();
        if (userId) {
            const courseListUrl = `https://www.ttcdw.cn/p/uc/myClassroom/${userId}`;
            GM_setValue('courseListUrl', courseListUrl);
            log(`保存课程列表URL: ${courseListUrl}`);
            return courseListUrl;
        }
        return null;
    };

    // 主逻辑
    const main = async () => {
        log('脚本启动...');

        try {
            // 如果是课程列表页面，保存课程列表URL
            if (window.location.href.includes('/p/uc/myClassroom/')) {
                const savedUrl = saveCourseListUrl();
                if (savedUrl) {
                    log(`已保存课程列表URL: ${savedUrl}`);
                }
            }

            log(`当前URL: ${window.location.href}`);

            if (window.location.href.includes('/p/uc/myClassroom/')) {
                log('检测到课程列表页');
                await handleCourseListPage();
            } else if (window.location.href.includes('/p/course/v/') || window.location.href.includes('/p/course/videorevision/')) {
                log('检测到视频播放页');
                await handleVideoPage();
            } else {
                log('不支持的页面类型');
            }
        } catch (error) {
            log(`主逻辑出错: ${error.message}`, 'error');
            showAlert(`脚本运行出错: ${error.message}`);
        }
    };

    // 处理课程列表页
    const handleCourseListPage = async () => {
        log('开始处理课程列表页...');
        let retryCount = 0;
        const maxRetries = 3;

        log('准备检查课程列表');

        while (retryCount < maxRetries) {
            try {
                await waitForElement('.el-table__body');
                log('课程表格加载完成');

                // 检查容器是否已存在
                let container = document.getElementById('auto-learner-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'auto-learner-container';
                    container.style.position = 'fixed';
                    container.style.bottom = '20px';
                    container.style.left = '20px';
                    container.style.zIndex = '99999';
                    container.style.width = '320px';
                    container.style.display = 'flex';
                    container.style.flexDirection = 'column';
                    container.style.gap = '10px';
                    document.body.appendChild(container);
                }

                // 添加红包按钮
                let redPacketBtn = document.getElementById('red-packet-btn');
                if (!redPacketBtn) {
                    redPacketBtn = document.createElement('div');
                    redPacketBtn.id = 'red-packet-btn';
                    redPacketBtn.textContent = '🧧 饿了么天天领红包 🧧';
                    redPacketBtn.style.cursor = 'pointer';
                    redPacketBtn.style.textAlign = 'center';
                    redPacketBtn.style.padding = '10px';
                    redPacketBtn.style.backgroundColor = 'rgba(22, 119, 255, 1)';
                    redPacketBtn.style.color = 'hsla(0, 0%, 100%, 1.00)';
                    redPacketBtn.style.borderRadius = '5px';
                    redPacketBtn.style.marginBottom = '15px';
                    redPacketBtn.style.fontWeight = 'bold';
                    redPacketBtn.style.fontSize = '16px';
                    redPacketBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                    redPacketBtn.onclick = () => {
                        GM_openInTab('https://h5.ele.me/adminiappsub/pages/h5/index?configKey=BDLM_ELE_H5_DG_TC&scene=59c780f481ff45b096f427b2312ec45a');
                    };
                    container.insertBefore(redPacketBtn, container.firstChild);
                }

                // 创建日志面板
                const logPanel = createLogPanel();
                if (!logPanel.parentNode) {
                    logPanel.style.backgroundColor = 'rgba(0,0,0,0.85)';
                    logPanel.style.color = '#fff';
                    logPanel.style.padding = '10px';
                    logPanel.style.borderRadius = '5px';
                    logPanel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                    logPanel.style.maxHeight = '150px';
                    logPanel.style.overflow = 'auto';
                    logPanel.style.fontFamily = 'Consolas, Monaco, monospace';
                    logPanel.style.fontSize = '12px';
                    logPanel.style.lineHeight = '1.5';
                    container.appendChild(logPanel);
                }

                // 检查切换按钮是否已存在
                let logToggle = document.getElementById('auto-learner-log-toggle');
                if (!logToggle) {
                    logToggle = document.createElement('div');
                    logToggle.id = 'auto-learner-log-toggle';
                    logToggle.textContent = '隐藏日志 ▲';
                    logToggle.style.cursor = 'pointer';
                    logToggle.style.textAlign = 'center';
                    logToggle.style.padding = '5px';
                    logToggle.style.backgroundColor = 'rgba(0,0,0,0.7)';
                    logToggle.style.color = '#fff';
                    logToggle.style.borderRadius = '5px';
                    logToggle.onclick = () => {
                        logPanel.style.display = logPanel.style.display === 'none' ? 'block' : 'none';
                        logToggle.textContent = logPanel.style.display === 'none' ? '显示日志 ▲' : '隐藏日志 ▼';
                    };
                    container.appendChild(logToggle);
                }

                // 检查进度条容器是否已存在
                let progressContainer = document.getElementById('auto-learner-progress-container');
                if (!progressContainer) {
                    progressContainer = document.createElement('div');
                    progressContainer.id = 'auto-learner-progress-container';
                    progressContainer.style.backgroundColor = 'rgba(255,255,255,0.9)';
                    progressContainer.style.padding = '10px';
                    progressContainer.style.borderRadius = '5px';
                    progressContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                    container.appendChild(progressContainer);
                }

                // 添加初始等待和提示
                showAlert('脚本正在初始化', 'info');
                await delay(500);

                // ============ 改进的未完成课程检查逻辑 ============
                const allRows = Array.from(document.querySelectorAll('.el-table__row'));
                log(`共找到 ${allRows.length} 个课程`);

                const unfinishedCourses = allRows.filter(row => {
                    const progressTextElement = row.querySelector('.el-progress__text');
                    if (!progressTextElement) {
                        log(`课程 ${row.querySelector('.course-name')?.textContent || '未知'} 没有进度信息，视为未完成`);
                        return true; // 没有进度信息视为未完成
                    }

                    const progressText = progressTextElement.textContent.trim();
                    const match = progressText.match(/(\d+)/);
                    if (!match) {
                        log(`课程 ${row.querySelector('.course-name')?.textContent || '未知'} 进度文本无法解析: ${progressText}，视为未完成`);
                        return true; // 无法解析进度视为未完成
                    }

                    const progress = parseInt(match[1], 10);
                    const isUnfinished = progress < 100;

                    log(`课程: ${row.querySelector('.course-name')?.textContent || '未知'}, 进度: ${progressText} (${progress}%), 是否未完成: ${isUnfinished}`);
                    return isUnfinished; // 进度小于100%视为未完成
                });

                log(`找到 ${unfinishedCourses.length} 个未完成课程`);

                if (unfinishedCourses.length > 0) {
                    // 移除之前可能存在的current-course类
                    document.querySelectorAll('.el-table__row.current-course').forEach(row => {
                        row.classList.remove('current-course');
                    });

                    const course = unfinishedCourses[0];
                    const courseName = course.querySelector('.course-name')?.textContent || '未知课程';
                    const durationCell = course.querySelector('.el-table_1_column_2 .cell');
                    const duration = durationCell ? durationCell.firstElementChild?.textContent?.trim() : '未知时长';
                    const progressText = course.querySelector('.el-progress__text')?.textContent.trim() || '0%';

                    // 双重检查进度
                    const match = progressText.match(/(\d+)/);
                    const progressPercent = match ? parseInt(match[1], 10) : 0;

                    if (progressPercent >= 100) {
                        log(`警告：选择的课程进度已经是 ${progressPercent}%，可能存在显示延迟`);
                        log('刷新页面重新检查...');
                        await delay(2000);
                        location.reload();
                        return;
                    }

                    course.classList.add('current-course'); // 标记当前课程
                    log(`开始学习未完成课程: ${courseName}, 时长: ${duration}, 当前进度: ${progressText}`);

                    // 初始化剩余时间(默认30分钟)
                    let remainingSeconds = 30 * 60;

                    // 计算剩余时间
                    const timeMatch = duration.match(/(\d+):(\d+):(\d+)/) || duration.match(/(\d+):(\d+)/);
                    if (timeMatch) {
                        const totalSeconds = timeMatch[3]
                            ? parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3])
                            : parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
                        remainingSeconds = Math.round(totalSeconds * (1 - progressPercent / 100));

                        // 重要修改：由于视频页使用3倍速播放，剩余时间需要除以3
                        const originalRemainingSeconds = remainingSeconds; // 保存原始剩余时间用于日志
                        const adjustedRemainingSeconds = Math.round(remainingSeconds / 3); // 3倍速下的实际剩余时间

                        log(`原始剩余时间: ${Math.floor(originalRemainingSeconds / 60)}分${originalRemainingSeconds % 60}秒`);
                        log(`3倍速后剩余时间: ${Math.floor(adjustedRemainingSeconds / 60)}分${adjustedRemainingSeconds % 60}秒`);
                        remainingSeconds = adjustedRemainingSeconds; // 使用调整后的时间

                        // 创建动态进度条
                        progressContainer.innerHTML = `
                            <div style="margin-bottom: 5px; font-weight: bold;">${courseName}</div>
                            <div id="remaining-time" style="margin-bottom: 5px;">剩余时间: ${Math.floor(remainingSeconds / 60)}分${remainingSeconds % 60}秒（3倍速预估）</div>
                            <div style="font-size: 10px; color: #666; margin-bottom: 5px;">原始时长: ${duration} | 3倍速播放</div>
                            <div style="width: 300px; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; position: relative; display: flex; align-items: center;">
                                <div id="progress-bar" class="cool-progress-bar" style="width: ${progressPercent}%; height: 100%;"></div>
                                <div id="progress-text" style="position: absolute; right: 10px; font-size: 12px; font-weight: bold; color: #333;">
                                    ${progressText}
                                </div>
                            </div>
                        `;

                        // 动态更新进度条
                        const progressBar = document.getElementById('progress-bar');
                        const remainingTimeEl = document.getElementById('remaining-time');
                        const startTime = Date.now();
                        const endTime = startTime + remainingSeconds * 1000;

                        const updateInterval = setInterval(() => {
                            const now = Date.now();
                            if (now >= endTime) {
                                clearInterval(updateInterval);
                                progressBar.style.width = '100%';
                                progressBar.textContent = '100%';
                                remainingTimeEl.textContent = '剩余时间: 0分0秒';

                                // 启动60秒倒计时
                                progressContainer.innerHTML = `
                                    <div style="margin-bottom: 10px; font-weight: bold; font-size: 16px; color: #FF5722;">${courseName}</div>
                                    <div class="countdown" id="countdown-timer" style="font-size: 28px; margin-bottom: 15px;">60</div>
                                    <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                                        <div style="width: 300px; height: 30px; background: #f0f0f0; border-radius: 15px; overflow: hidden; box-shadow: 0 0 10px rgba(255,87,34,0.3);">
                                            <div class="cool-progress-bar" style="width: 100%; background: linear-gradient(90deg, #FF5722, #FF9800);
                                                display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">
                                                已完成!
                                            </div>
                                        </div>
                                    </div>
                                    <div style="text-align: center; color: #888; font-size: 12px;">倒计时结束后将自动刷新页面</div>
                                `;

                                let countdown = 60;
                                const countdownEl = document.getElementById('countdown-timer');
                                const countdownInterval = setInterval(() => {
                                    countdown--;
                                    countdownEl.textContent = countdown;
                                    countdownEl.style.color = countdown <= 10 ? '#FF0000' : '#FF5722';
                                    countdownEl.style.textShadow = countdown <= 10 ? '0 0 10px rgba(255,0,0,0.7)' : '0 0 5px rgba(255,87,34,0.5)';
                                    countdownEl.style.transform = countdown <= 10 ? 'scale(1.2)' : 'scale(1)';

                                    if (countdown <= 0) {
                                        clearInterval(countdownInterval);
                                        countdownEl.textContent = '正在刷新...';
                                        location.reload();
                                    }
                                }, 1000);
                                return;
                            }

                            const elapsed = now - startTime;
                            const newProgress = progressPercent + (elapsed / (remainingSeconds * 1000)) * (100 - progressPercent);
                            const newRemaining = Math.max(0, remainingSeconds - Math.floor(elapsed / 1000));

                            progressBar.style.width = `${newProgress}%`;
                            document.getElementById('progress-text').textContent = `${Math.round(newProgress)}%`;
                            remainingTimeEl.textContent = `剩余时间: ${Math.floor(newRemaining / 60)}分${newRemaining % 60}秒（3倍速预估）`;

                            // 同步更新原生进度条
                            const currentCourse = document.querySelector('.el-table__row.current-course');
                            if (currentCourse) {
                                const nativeProgress = currentCourse.querySelector('.el-progress-bar__inner');
                                if (nativeProgress) {
                                    nativeProgress.style.width = `${newProgress}%`;
                                }
                                const nativeProgressText = currentCourse.querySelector('.el-progress__text');
                                if (nativeProgressText) {
                                    nativeProgressText.textContent = `${Math.round(newProgress)}%`;
                                }
                            }
                        }, 1000);
                    }

                    const studyBtn = course.querySelector('.study-btn');
                    if (studyBtn) {
                        studyBtn.click();
                        log('已点击学习按钮');

                        // 延迟6秒后开始计时
                        await delay(6000);
                        log('开始学习时长计时');
                        if (window.studyTimeInterval) {
                            clearInterval(window.studyTimeInterval);
                        }

                        // 添加页面卸载时的清理
                        window.addEventListener('beforeunload', () => {
                            if (window.studyTimeInterval) {
                                clearInterval(window.studyTimeInterval);
                            }
                        });

                        if (remainingSeconds > 0) {
                            // 等待课程剩余时长
                            log(`等待课程剩余时长(3倍速): ${Math.floor(remainingSeconds / 60)}分${remainingSeconds % 60}秒`);
                            await delay((remainingSeconds + 54) * 1000);

                            // 刷新页面
                            log('课程时长等待完成，刷新页面');
                            clearInterval(window.studyTimeInterval);
                            location.reload();
                        } else {
                            log('无需等待，立即刷新');
                            location.reload();
                        }
                        return;
                    } else {
                        log('未找到学习按钮，尝试刷新页面', 'error');
                        location.reload();
                    }
                }

                // ============ 改进的翻页检查逻辑 ============
                const allCourses = Array.from(document.querySelectorAll('.el-table__row'));
                let allFinished = true;

                for (const row of allCourses) {
                    const progressTextElement = row.querySelector('.el-progress__text');
                    if (progressTextElement) {
                        const progressText = progressTextElement.textContent.trim();
                        const match = progressText.match(/(\d+)/);
                        if (match) {
                            const progress = parseInt(match[1], 10);
                            if (progress < 100) {
                                allFinished = false;
                                log(`发现未完成课程: ${row.querySelector('.course-name')?.textContent || '未知'}, 进度: ${progress}%`);
                                break;
                            }
                        } else {
                            allFinished = false;
                            break;
                        }
                    } else {
                        allFinished = false;
                        break;
                    }
                }

                if (!allFinished) {
                    log('当前页还有未完成课程，不进行翻页');
                    // 如果发现未完成课程但不是第一个，重新处理
                    await delay(2000);
                    await handleCourseListPage();
                    return;
                }

                // 检查下一页按钮
                try {
                    const nextPageBtn = await waitForClickableElement('.btn-next:not([disabled])', 5000).catch(() => null);
                    if (nextPageBtn) {
                        log('跳转到下一页...');
                        await safeClick('.btn-next:not([disabled])');
                        await waitForElement('.el-table__body', 5000);
                        log('下一页加载完成');
                        retryCount = 0; // 重置重试计数
                        continue;
                    }

                    // 只有当前页所有课程完成且没有下一页时，才显示完成信息
                    progressContainer.innerHTML = '<div style="color: #4CAF50; font-weight: bold;">所有课程已完成</div>';
                    log('所有课程已完成');
                    showAlert('所有课程已完成', 'success');
                    clearInterval(updateInterval); // 停止定时更新
                    return;
                } catch (error) {
                    log(`翻页失败: ${error.message}`, 'error');
                    throw error;
                }
            } catch (error) {
                retryCount++;
                log(`处理出错 (${retryCount}/${maxRetries}): ${error.message}`, 'error');
                if (retryCount >= maxRetries) {
                    showAlert('处理失败: ' + error.message);
                    return;
                }
                await delay(3000);
            }
        }
    };

    // 处理视频播放页
    const handleVideoPage = async () => {
        log('开始处理视频播放页...');

        // 创建视频页日志容器
        const createVideoLogContainer = () => {
            if (document.getElementById('auto-learner-video-container')) return;

            const container = document.createElement('div');
            container.id = 'auto-learner-video-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 99998;
                width: 320px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);

            // 创建日志面板
            const logPanel = createVideoLogPanel();
            if (!logPanel.parentNode) {
                logPanel.style.backgroundColor = 'rgba(0,0,0,0.85)';
                logPanel.style.color = '#fff';
                logPanel.style.padding = '10px';
                logPanel.style.borderRadius = '5px';
                logPanel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                logPanel.style.maxHeight = '150px';
                logPanel.style.overflow = 'auto';
                logPanel.style.fontFamily = 'Consolas, Monaco, monospace';
                logPanel.style.fontSize = '12px';
                logPanel.style.lineHeight = '1.5';
                container.appendChild(logPanel);
            }

            // 创建切换按钮
            let logToggle = document.getElementById('auto-learner-video-log-toggle');
            if (!logToggle) {
                logToggle = document.createElement('div');
                logToggle.id = 'auto-learner-video-log-toggle';
                logToggle.textContent = '隐藏日志 ▲';
                logToggle.style.cursor = 'pointer';
                logToggle.style.textAlign = 'center';
                logToggle.style.padding = '5px';
                logToggle.style.backgroundColor = 'rgba(0,0,0,0.7)';
                logToggle.style.color = '#fff';
                logToggle.style.borderRadius = '5px';
                logToggle.onclick = () => {
                    logPanel.style.display = logPanel.style.display === 'none' ? 'block' : 'none';
                    logToggle.textContent = logPanel.style.display === 'none' ? '显示日志 ▲' : '隐藏日志 ▼';
                };
                container.appendChild(logToggle);
            }

            return container;
        };

        // 创建一个模拟用户交互的函数 - 修复版本
        const simulateUserInteraction = async () => {
            log('尝试模拟用户交互...');

            try {
                // 方法1: 使用简单的点击方法，避免复杂的MouseEvent
                const body = document.body || document.documentElement;

                // 创建一个简单的点击事件（不设置view属性）
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: 100,
                    clientY: 100
                });

                // 直接调用元素的click方法
                if (body) {
                    body.click();
                    log('已点击页面');
                }

                // 方法2: 直接调用video区域的click方法
                const videoContainer = document.querySelector('.videoBox') ||
                                      document.querySelector('.xgplayer') ||
                                      document.querySelector('#video-Player');

                if (videoContainer) {
                    videoContainer.click();
                    log('已点击视频区域');
                }

                // 方法3: 使用更简单的KeyboardEvent
                try {
                    const spaceEvent = new KeyboardEvent('keydown', {
                        key: ' ',
                        code: 'Space',
                        keyCode: 32,
                        bubbles: true
                    });
                    document.dispatchEvent(spaceEvent);
                    log('已模拟空格键');
                } catch (e) {
                    // 如果创建复杂事件失败，尝试简单方式
                    log(`键盘事件失败，使用简单方式: ${e.message}`, 'warning');
                }

                log('已模拟用户交互');
                await delay(1000);

            } catch (error) {
                log(`模拟用户交互失败: ${error.message}`, 'error');
                // 即使失败也不中断流程
            }
        };

        // 增强的视频播放函数
        const tryPlayVideoEnhanced = async () => {
            log('开始尝试播放视频...');

            // 先模拟用户交互
            await simulateUserInteraction();

            let success = false;
            let attempts = 0;
            const maxAttempts = 5;

            while (!success && attempts < maxAttempts) {
                attempts++;
                log(`播放尝试 ${attempts}/${maxAttempts}`);

                try {
                    // 查找视频元素
                    const videoElement = document.querySelector('#video-Player video') || document.querySelector('video');

                    if (!videoElement) {
                        log('未找到video元素', 'error');
                        await delay(2000);
                        continue;
                    }

                    // 设置静音（浏览器更可能允许静音播放）
                    videoElement.muted = true;
                    log('已设置视频静音');

                    // 尝试播放 - 使用try-catch包装
                    try {
                        await videoElement.play();
                        log('视频播放成功');
                        success = true;
                    } catch (playError) {
                        log(`直接播放失败: ${playError.message}`, 'error');

                        // 尝试点击播放按钮
                        const playBtn = document.querySelector('.xgplayer-play') ||
                                      document.querySelector('.xgplayer-start') ||
                                      document.querySelector('.xgplayer-play .xgplayer-icon') ||
                                      document.querySelector('.xgplayer-start .xgplayer-icon');

                        if (playBtn) {
                            log('尝试点击播放按钮');

                            // 直接调用click方法，避免复杂事件
                            playBtn.click();

                            // 再次尝试播放
                            await delay(1500);

                            try {
                                await videoElement.play();
                                log('点击播放按钮后播放成功');
                                success = true;
                            } catch (retryError) {
                                log(`重试播放失败: ${retryError.message}`, 'error');
                            }
                        }
                    }

                } catch (error) {
                    log(`播放尝试出错: ${error.message}`, 'error');
                }

                if (!success) {
                    // 等待一段时间后重试
                    await delay(2000);

                    // 每次重试前再次模拟用户交互
                    await simulateUserInteraction();
                }
            }

            if (!success) {
                log(`经过${maxAttempts}次尝试后，无法播放视频`, 'error');

                // 创建手动播放提示
                showAlert('需要手动点击播放按钮开始学习', 'error');
            }

            return success;
        };

        // 切换到指定索引的视频并尝试播放
        const switchToVideoAndPlay = async (index) => {
            const allVideos = Array.from(document.querySelectorAll('.videorevision-catalogue-single'));

            if (index >= 0 && index < allVideos.length) {
                const videoElement = allVideos[index];
                const videoName = videoElement.querySelector('.videorevision-catalogue-single-name')?.textContent || `视频${index + 1}`;

                log(`尝试切换到视频: ${videoName}`);

                // 首先检查是否已经是当前选中的视频
                if (videoElement.classList.contains('on')) {
                    log('已经是当前视频，尝试直接播放');
                } else {
                    // 移除当前选中状态
                    const currentSelected = document.querySelector('.videorevision-catalogue-single.on');
                    if (currentSelected) {
                        currentSelected.classList.remove('on');
                    }

                    // 点击新视频 - 直接调用click方法
                    try {
                        videoElement.click();
                        videoElement.classList.add('on');
                        log(`已点击切换到: ${videoName}`);

                        // 等待视频加载
                        await delay(4000);
                    } catch (error) {
                        log(`切换视频失败: ${error.message}`, 'error');
                        return false;
                    }
                }

                // 尝试播放视频
                return await tryPlayVideoEnhanced();
            }

            return false;
        };

        // 更新状态函数
        const updateStatus = (message) => {
            const statusEl = document.getElementById('video-status');
            if (statusEl) statusEl.textContent = `状态: ${message}`;
        };

        // 返回课程列表的改进函数
        const returnToCourseList = async () => {
            log('准备返回课程列表...');
            updateStatus('返回课程列表...');

            try {
                // 获取课程列表URL
                const courseListUrl = getCourseListUrl();
                log(`返回课程列表URL: ${courseListUrl}`);

                // 直接跳转到课程列表页面
                window.location.href = courseListUrl;
            } catch (error) {
                log(`返回课程列表时出错: ${error.message}`, 'error');

                // 最后尝试直接跳转到默认课程列表
                showAlert('自动返回失败，将手动跳转到课程列表', 'warning');
                await delay(2000);
                window.location.href = 'https://www.ttcdw.cn/p/uc/myClassroom';
            }
        };

        // 创建简化控制面板
        const createSimpleControlPanel = () => {
            if (document.getElementById('video-control-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'video-control-panel';
            panel.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: rgba(0,0,0,0.85);
                color: white;
                padding: 10px;
                border-radius: 8px;
                z-index: 100000;
                width: 300px;
                font-family: Arial, sans-serif;
                border: 2px solid #4CAF50;
            `;

            // 获取课程列表URL
            const courseListUrl = getCourseListUrl();

            panel.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">视频控制</div>
                <div style="font-size: 12px; margin-bottom: 8px;" id="video-status">状态: 初始化...</div>
                <div style="font-size: 10px; color: #ccc; margin-bottom: 8px; word-break: break-all;">
                    课程列表: ${courseListUrl}
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button id="manual-play-btn" style="flex: 1; background: #4CAF50; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        手动播放
                    </button>
                    <button id="refresh-page-btn" style="flex: 1; background: #2196F3; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        刷新页面
                    </button>
                    <button id="mute-btn" style="flex: 1; background: #FF9800; color: white; border: none; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        静音/取消
                    </button>
                </div>
                <div style="margin-top: 8px;">
                    <button id="return-course-btn" style="width: 100%; background: #9C27B0; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
                        返回课程列表
                    </button>
                </div>
                <div style="font-size: 10px; color: #ccc; margin-top: 8px; border-top: 1px solid #444; padding-top: 5px;">
                    提示: 如果自动播放失败，请手动点击"播放"按钮
                </div>
            `;

            document.body.appendChild(panel);

            // 添加事件监听
            document.getElementById('manual-play-btn').addEventListener('click', async () => {
                log('手动播放按钮被点击');
                await tryPlayVideoEnhanced();
            });

            document.getElementById('refresh-page-btn').addEventListener('click', () => {
                location.reload();
            });

            document.getElementById('mute-btn').addEventListener('click', () => {
                const video = document.querySelector('#video-Player video') || document.querySelector('video');
                if (video) {
                    video.muted = !video.muted;
                    log(`已${video.muted ? '静音' : '取消静音'}视频`);
                    showAlert(`已${video.muted ? '静音' : '取消静音'}视频`, 'info');
                }
            });

            document.getElementById('return-course-btn').addEventListener('click', async () => {
                log('手动返回课程列表按钮被点击');
                await returnToCourseList();
            });
        };

        try {
            // 创建视频页日志容器
            createVideoLogContainer();

            // 等待播放器加载
            log('等待视频播放器加载...');
            await waitForElement('#video-Player', 15000);
            log('视频播放器加载完成');

            // 创建控制面板
            createSimpleControlPanel();

            // 先模拟一次用户交互
            updateStatus('模拟用户交互...');
            await simulateUserInteraction();

            // 获取所有视频
            const allVideos = Array.from(document.querySelectorAll('.videorevision-catalogue-single'));
            log(`共找到 ${allVideos.length} 个视频章节`);

            // 查找第一个未完成的视频
            let targetVideoIndex = -1;

            for (let i = 0; i < allVideos.length; i++) {
                const video = allVideos[i];
                const progressText = video.querySelector('.videorevision-catalogue-single-progress-text')?.textContent;
                const match = progressText ? progressText.match(/(\d+)%/) : null;
                const progress = match ? parseInt(match[1]) : 0;

                if (progress < 100) {
                    targetVideoIndex = i;
                    log(`找到未完成视频: 索引 ${i}, 进度 ${progress}%`);
                    break;
                }
            }

            if (targetVideoIndex === -1) {
                log('所有视频都已完成，返回课程列表');
                updateStatus('所有视频已完成');
                showAlert('所有视频学习完成，即将返回课程列表', 'success');
                await delay(3000);
                await returnToCourseList();
                return;
            }

            // 切换到未完成的视频并尝试播放
            updateStatus(`切换到视频 ${targetVideoIndex + 1}...`);
            const playSuccess = await switchToVideoAndPlay(targetVideoIndex);

            if (playSuccess) {
                updateStatus(`视频 ${targetVideoIndex + 1} 播放中`);
                log('视频开始播放，开始监控进度');
            } else {
                updateStatus('播放失败，请手动操作');
                log('自动播放失败，等待手动操作', 'warning');
            }

            // 设置监控间隔
            let checkCount = 0;
            const monitorInterval = setInterval(async () => {
                try {
                    checkCount++;

                    // 检查视频是否在播放
                    const videoElement = document.querySelector('#video-Player video') || document.querySelector('video');
                    const isPlaying = videoElement && !videoElement.paused;

                    // 确保视频静音
                    if (videoElement && !videoElement.muted) {
                        videoElement.muted = true;
                        log('检测到视频未静音，已重新设置静音');
                    }

                    if (!isPlaying && checkCount % 3 === 0) {
                        // 每3次检查尝试重新播放
                        log('检测到视频未播放，尝试重新播放');
                        updateStatus('尝试重新播放...');
                        await tryPlayVideoEnhanced();
                    }

                    // 检查当前视频进度
                    const currentVideo = document.querySelector('.videorevision-catalogue-single.on');
                    if (currentVideo) {
                        const progressText = currentVideo.querySelector('.videorevision-catalogue-single-progress-text')?.textContent;
                        const match = progressText ? progressText.match(/(\d+)%/) : null;
                        const progress = match ? parseInt(match[1]) : 0;

                        if (progress >= 100) {
                            log(`当前视频完成 (${progress}%)，准备下一个`);
                            updateStatus(`视频完成 ${progress}%`);

                            const currentIndex = Array.from(allVideos).indexOf(currentVideo);
                            if (currentIndex < allVideos.length - 1) {
                                // 切换到下一个视频
                                const nextIndex = currentIndex + 1;
                                const nextPlaySuccess = await switchToVideoAndPlay(nextIndex);
                                if (nextPlaySuccess) {
                                    // 新视频开始播放后，确保静音
                                    const nextVideoElement = document.querySelector('#video-Player video') || document.querySelector('video');
                                    if (nextVideoElement) {
                                        nextVideoElement.muted = true;
                                        log('切换到新视频，已设置静音');
                                    }
                                }
                            } else {
                                log('所有视频已完成，返回课程列表');
                                updateStatus('所有视频完成');
                                clearInterval(monitorInterval);

                                showAlert('所有视频学习完成，即将返回课程列表', 'success');
                                await delay(3000);
                                await returnToCourseList();
                            }
                        } else {
                            updateStatus(`播放中 (${progress}%)`);
                        }
                    }

                    // 设置倍速为3.0
                    const video = document.querySelector('video') || document.querySelector('#video-Player video');
                    if (video && video.playbackRate !== 3.0 && !isNaN(video.duration)) {
                        video.playbackRate = 3.0;
                        if (checkCount === 1) {
                            log('已设置3倍速播放');
                        }
                    }

                } catch (error) {
                    log(`监控出错: ${error.message}`, 'error');
                }
            }, 10000);

        } catch (error) {
            log(`初始化视频页出错: ${error.message}`, 'error');
            showAlert('初始化视频页失败');
            await delay(5000);
            location.reload();
        }
    };

    // 确保DOM加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
